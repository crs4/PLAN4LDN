import sys, os, glob, json, subprocess
from pathlib import PurePath, Path
import numpy as np
from osgeo import ogr, osr, gdal
from osgeo_utils import gdal_calc as gc

# Enable GDAL/OGR exceptions
gdal.UseExceptions()
# GDAL & OGR memory drivers
GDAL_MEMORY_DRIVER = gdal.GetDriverByName('MEM')
OGR_MEMORY_DRIVER = ogr.GetDriverByName('Memory')

#File conf.json
#{
# 'roi' : polygon,
# 'roibbx' : [l1,l2,l3,l4],
# 'land_suitability_map' : [{
#   'lu_class' : value,
#   'lu_suitability_map_url': pathfile
# ]},
# 'base_lu' : not null  ---> calc, crop, save 
# 'base_ls' : not null  ---> for each calc, merge  ---> crop, save
# 'base_ld' : not null  ---> crop, save 
#}
# 

         
def cut_by_geojson(input_file, output_file, shape_geojson):

    ds = gdal.OpenEx(shape_geojson)
    layer = ds.GetLayer()
    bbox = layer.GetExtent()
    min_x, max_x, min_y, max_y = bbox[0], bbox[1], bbox[2], bbox[3]
    # Open original data as read only
    dataset = gdal.Open(input_file, gdal.GA_ReadOnly)
    bands = dataset.RasterCount
    # Getting georeference info
    transform = dataset.GetGeoTransform()
    projection = dataset.GetProjection()
    xOrigin = transform[0]
    yOrigin = transform[3]
    pixelWidth = transform[1]
    pixelHeight = -transform[5]
    # Getting spatial reference of input raster
    srs = osr.SpatialReference()
    srs.ImportFromWkt(projection)
    # WGS84 projection reference
    OSR_WGS84_REF = osr.SpatialReference()
    OSR_WGS84_REF.ImportFromEPSG(4326)
    # OSR transformation
    wgs84_to_image_trasformation = osr.CoordinateTransformation(OSR_WGS84_REF,srs)
    XYmin = wgs84_to_image_trasformation.TransformPoint(min_x, max_y)
    XYmax = wgs84_to_image_trasformation.TransformPoint(max_x, min_y)
    # Computing Point1(i1,j1), Point2(i2,j2)
    i1 = int((XYmin[0] - xOrigin) / pixelWidth)
    j1 = int((yOrigin - XYmin[1]) / pixelHeight)
    i2 = int((XYmax[0] - xOrigin) / pixelWidth)
    j2 = int((yOrigin - XYmax[1]) / pixelHeight)
    new_cols = i2 - i1 + 1
    new_rows = j2 - j1 + 1
    # New upper-left X,Y values
    new_x = xOrigin + i1 * pixelWidth
    new_y = yOrigin - j1 * pixelHeight
    new_transform = (new_x, transform[1], transform[2], new_y, transform[4],transform[5])
    wkt_geom = ogr.CreateGeometryFromJson(layer.getNextFeature().ExportToJson())
    wkt_geom.Transform(wgs84_to_image_trasformation)
    target_ds = GDAL_MEMORY_DRIVER.Create('', new_cols, new_rows, 1,gdal.GDT_Byte)
    target_ds.SetGeoTransform(new_transform)
    target_ds.SetProjection(projection)
    # Create a memory layer to rasterize from.
    ogr_dataset = OGR_MEMORY_DRIVER.CreateDataSource('shapemask')
    ogr_layer = ogr_dataset.CreateLayer('shapemask', srs=srs)
    ogr_feature = ogr.Feature(ogr_layer.GetLayerDefn())
    ogr_feature.SetGeometryDirectly(ogr.Geometry(wkt=wkt_geom.ExportToWkt()))
    ogr_layer.CreateFeature(ogr_feature)
    gdal.RasterizeLayer(target_ds, [1], ogr_layer, burn_values=[1],options=["ALL_TOUCHED=TRUE"])
    # Create output file
    driver = gdal.GetDriverByName('GTiff')
    outds = driver.Create(output_file, new_cols, new_rows, bands,gdal.GDT_Int16)
    # Read in bands and store all the data in bandList
    mask_array = target_ds.GetRasterBand(1).ReadAsArray()
    band_list = []
    for i in range(bands):
        band_list.append(dataset.GetRasterBand(i + 1).ReadAsArray(i1, j1,new_cols, new_rows))
    for j in range(bands):
        data = np.where(mask_array == 1, band_list[j], mask_array)
        outds.GetRasterBand(j + 1).SetNoDataValue(-32768)
        outds.GetRasterBand(j + 1).WriteArray(data)
    outds.SetProjection(projection)
    outds.SetGeoTransform(new_transform)
    target_ds = None
    dataset = None
    outds = None
    ogr_dataset = None
    
# input lu classes, ls and ld
# output 'base_ld','base_lu','base_ls'
prj_id = sys.argv[1]

try:
    error = 'conf'
    base_path = './storage/app/private/'
    with open(base_path+prj_id+'/conf1.json') as f:
        conf = json.load(f)
    ls_data = conf['land_suitability_map']
    lu_classes_nr = conf['lu_classes_nr'] 
    roi = conf['roi']
    roi_shape = json.dumps(roi)
    area = roi['area']
    codes = []
except: 
    print ("Erorr conf level: " + error )
    sys.exit()


try :    
    error = 'base_ld'
    ## it creates base_ld (crop to roi original file) 
    if ( conf['base_ld'] ) :
        cut_by_geojson( base_path+conf['base_ld'], 'base_ld.tif', roi_shape)
except: 
    print ("Erorr conf level: " + error )
    sys.exit() 

try :    
    error = 'base_lu'
    if ( conf['base_lu'] ) :
        ## it creates base_lu (crop to roi original file)
        lu_tif = gdal.Open(base_path+conf['base_lu'])
        xsize = lu_tif.RasterXSize
        ysize = lu_tif.RasterYSize
        gtpar = lu_tif.GetGeoTransform()
        minx = gtpar[0]
        maxy = gtpar[3]
        maxx = minx + gtpar[1] * xsize
        miny = maxy + gtpar[5] * ysize
        gdal_warp_kwargs = {
            'format': 'GTiff',
            'cutlineDSName' : json.dumps(roi),
            'cropToCutline' : True,
            'height' : ysize,
            'width' : xsize,
            'outputBounds' : [minx,miny,maxx,maxy],
            'srcNodata' : -32768.0,
            'dstNodata' : -32768.0,
            'creationOptions' : ['COMPRESS=LZW']
        }
        gdal.Warp(base_path+prj_id+'/base_lu.tif', base_path+conf['base_lu'],**gdal_warp_kwargs)
        rule =  '-32768*(A>=0)' 
        output  = base_path+prj_id+'/base_ls.tif'
        inputA  = base_path+prj_id+'/base_lu.tif'
        gc.Calc( [rule] , A=inputA, A_band=1, outfile=output, type=gdal.GDT_Int16, NoDataValue=-32768, overwrite=True )    
        ## it creates all ls tiff then merge files  
        merge_command = ['python', '/usr/bin/gdal_merge.py',  '-of', 'GTiff', '-o', base_path+prj_id+'/base_ls.tif', '-a_nodata', '-32768', '-n', '-32768' ]
        found = False
        for ls_class in ls_data:
            if ( ls_class['lu_suitability_map_url'] and ls_class['lu_suitability_map_url'] != '' ):
                lu_class = ls_class['lu_class']
                gdal.Warp(base_path+prj_id+'/base_prels_'+str(lu_class)+'.tif',base_path+ls_class['lu_suitability_map_url'],**gdal_warp_kwargs)
                rule =  '(A==' + str(lu_class) + ')*B - (A!=' + str(lu_class) + ')*32768' 
                output  = base_path+prj_id+'/base_ls_' + str(lu_class) + '.tif'
                inputA  = base_path+prj_id+'/base_lu.tif'
                inputB  = base_path+prj_id+'/base_prels_' + str(lu_class) + '.tif'
                gc.Calc( [rule] , A=inputA, A_band=1, B=inputB, B_band=1, outfile=output, type=gdal.GDT_Int16, NoDataValue=-32768, overwrite=True )    
                merge_command.append(base_path+prj_id+'/base_ls_' + str(lu_class) + '.tif')
                found = True
        if ( found ) :
           subprocess.call(merge_command,shell=False) 
    

        gdal.Warp(base_path+prj_id+'/base_ld.tif',base_path+prj_id+'/base_ld.tif',**gdal_warp_kwargs)
        gdal.Warp(base_path+prj_id+'/base_ls.tif',base_path+prj_id+'/base_ls.tif',**gdal_warp_kwargs)

        for ls_class in ls_data:
            lu_class = str(ls_class['lu_class'])
            path = '/var/www/' + base_path + prj_id + '/base_prels_' + lu_class + '.tif'
            if ( os.path.isfile(path) ):
                os.remove(path)
            path = '/var/www/' + base_path + prj_id + '/base_ls_' + lu_class + '.tif'
            if ( os.path.isfile(path) ):
                os.remove(path)
        
        output  = base_path+prj_id+'/base_ls.tif'
        inputA  = base_path+prj_id+'/base_lu.tif'
        inputB  = base_path+prj_id+'/base_ls.tif'
        rule =  '(A>=0)*B - (A<0)*32768'
        gc.Calc( [rule] , A=inputA, A_band=1, B=inputB, B_band=1, outfile=output, type=gdal.GDT_Int16, NoDataValue=-32768, overwrite=True )    
        gdal.Warp(base_path+prj_id+'/base_ls.tif',base_path+prj_id+'/base_ls.tif',**gdal_warp_kwargs)

except:
    print ("Error custom, level: " + error )
    
