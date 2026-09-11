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
# 'area' : hectares,
# 'bboxarea' : hectares,
# 'focusareas' : [{
#      'path' : pathfile,
#      'evaluations' : [{  
#         "lu_class" : id ,
#         "ld" : value -1,0.1 },
#         .....
#   ]},
#   ........
# ]
# 'changeuse' : [{
#      'path' : pathfile,
#      'from' : id,
#      'to' : id,
#      'ld' : value -1,0,1 },
#      .....
# ]}
def calc_area_pixels(input_file):
    try:
       t = gdal.Open(input_file)
       # values int16, -32768: the pixel is outside the polygon
       data_array = t.ReadAsArray()
       unique, counts = np.unique(data_array, return_counts = True)
       total = np.sum(counts)
       total -= counts[0] 
       if (total == 0) : total = 1   
       print(total)
       return total
    except Exception as e:
       print("errors calculating pixels for" + input_file + '- calc.')
       return None

def calc_hectares(input_file, area, pixels):
    try:
        t = gdal.Open(input_file)
        # values int16, -32768: the pixel is outside the polygon    
        data_array = t.ReadAsArray()
        unique, counts = np.unique(data_array, return_counts = True)
        total = np.sum(counts)
        total -= counts[0]
        if (total == 0): 
            total = 1 
        if (pixels == None) :
           factor = area/total
        else : 
            factor = area/pixels
        hectares = dict(zip([str(x) for x in unique],  [ (int(x)*factor) for x in counts]))
        del hectares['-32768']
        return hectares
    except Exception as e:
        print("errors calculating hectares for" + input_file + '- calc.')
        return None
         
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

# input 'base_ld','base_ls','base_lu',evaluations
# output 'past_ld','bau_lu_newld','bau_lm_newld','bau_future_ld'
#try:
prj_id = sys.argv[1]
#except:
print ("Start ")
#sys.exit()
try:
    base_path = './storage/app/private/'
    error = 'conf'
    
    with open(base_path+prj_id+'/conf.json') as f:
        conf = json.load(f)
    evaluations = conf['evaluations']
    lu_classes_nr = conf['lu_classes_nr']
    #ls_data = conf['land_suitability_map'] 
    roi = conf['roi']
    area = roi['area']
    codes = []
except: 
    print ("Erorr conf level: " + error )
    sys.exit()

print ("Start2")
try : 
    ## no calc if rasters have different configuration 
    error = 'lu,ls and ld' 
    lu_tif = gdal.Open(base_path+prj_id+'/base_lu.tif')
    xsize = lu_tif.RasterXSize
    ysize = lu_tif.RasterYSize
    gtpar = lu_tif.GetGeoTransform()
    minx = gtpar[0]
    maxy = gtpar[3]
    maxx = minx + gtpar[1] * xsize
    miny = maxy + gtpar[5] * ysize
    lu_tif = None
    ls_tif = gdal.Open(base_path+prj_id+'/base_ls.tif')
    to_change = ( ls_tif.RasterXSize != xsize ) | ( ls_tif.RasterYSize != ysize )  
    if ( xsize < ls_tif.RasterXSize | ysize < ls_tif.RasterYSize ) :
        final = 'ls'
        gtpar = ls_tif.GetGeoTransform()
        xsize = ls_tif.RasterXSize
        ysize = ls_tif.RasterYSize
        minx = gtpar[0]
        maxy = gtpar[3]
        maxx = minx + gtpar[1] * xsize
        miny = maxy + gtpar[5] * ysize
    ls_tif = None
    ld_tif = gdal.Open(base_path+prj_id+'/base_ld.tif')
    to_change = ( ld_tif.RasterXSize != xsize ) | ( ld_tif.RasterYSize != ysize )  
    if ( xsize < ld_tif.RasterXSize | ysize < ld_tif.RasterYSize ) :
        final = 'ld'
        gtpar = ld_tif.GetGeoTransform()
        xsize = ld_tif.RasterXSize
        ysize = ld_tif.RasterYSize
        minx = gtpar[0]
        maxy = gtpar[3]
        maxx = minx + gtpar[1] * xsize
        miny = maxy + gtpar[5] * ysize
    ld_tif = None
    
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
    gdal.Warp(base_path+prj_id+'/base_lu.tif',base_path+prj_id+'/base_lu.tif',**gdal_warp_kwargs)
    gdal.Warp(base_path+prj_id+'/base_ls.tif',base_path+prj_id+'/base_ls.tif',**gdal_warp_kwargs)
    gdal.Warp(base_path+prj_id+'/base_ld.tif',base_path+prj_id+'/base_ld.tif',**gdal_warp_kwargs)
except:
    print ("Erorr BAU level: " + error )
    sys.exit()


try :
## !lu classes order in base_lu: from 1 to lu_classes_nr
    ## past_ld: 
    ## n = cardinality of lu classes 
    ## PASTLD VALUES: [1..n]  -> -1
    ## PASTLD VALUES: [n+1..2n] -> 0
    ## PASTLD VALUES: [2n+1..3n] -> 1
    t = gdal.Open(base_path+prj_id+'/base_lu.tif')
    lu_classes_array = t.ReadAsArray()
    unique = np.sort( np.unique(lu_classes_array) )
    writeindex= ''
    idx = 0  #-32768
    for x in unique:
        if ( idx > 0 ):
            writeindex += ' + (A==' + str(x) + ')*' + str(idx)
            print (str(x))
        idx += 1  
    error = 'past_ld.tif'
    output  = base_path+prj_id+'/past_ld.tif'
    inputA  = base_path+prj_id+'/base_lu.tif'
    inputB  = base_path+prj_id+'/base_ld.tif'
    rule =  '(A==-32768)*-32768 + (B==-32768)*0 + (A!=-32768)*(B!=-32768)*( (B+1)*'+str(lu_classes_nr) + writeindex + " )"
    # rule =  '(B==-32768)*-32768 + (B!=-32768)*( (B+1)*'+str(lu_classes_nr) + writeindex + " )"
    gc.Calc( [rule] , A=inputA, A_band=1, B=inputB, B_band=1, outfile=output, type=gdal.GDT_Int16, NoDataValue=-32768, overwrite=True )    

    # bau_lu_newld: 3,2,1,0
    error = 'bau_lu_newld.tif'
    rule =  '( A > 0 ) * ( (A==2) + (A==3)*2 + 1 )'
    output  = base_path+prj_id+'/bau_lu_newld.tif'
    inputA  = base_path+prj_id+'/base_ls.tif'
    gc.Calc( [rule] , A=inputA, A_band=1, outfile=output, type=gdal.GDT_Int16, NoDataValue=-32768, overwrite=True )    
    rule = '0'
    output  = base_path+prj_id+'/bau_lm_newld.tif'
    inputA  = base_path+prj_id+'/base_ls.tif'
    gc.Calc( [rule] , A=inputA, A_band=1, outfile=output, type=gdal.GDT_Int16, NoDataValue=-32768, overwrite=True ) 

 
    error = 'bau_ls_newld'
    rule = '0'
    output = base_path+prj_id+'/nodatato0.tif'
    input  = base_path+prj_id+'/base_lu.tif'
    gc.Calc( [rule], A=input, A_band=1, outfile=output, type=gdal.GDT_Int16, NoDataValue=-32768, overwrite=True )    
    arg = ['', '-of', 'GTiff', '-o', base_path+prj_id+'/bau_lu_newld.tif', '-a_nodata', '-32768', '-n', '-32768' ]
    arg.append(base_path+prj_id+'/nodatato0.tif')
    arg.append(base_path+prj_id+'/bau_lu_newld.tif')
    error = 'bau_ls_newld'
    rule = '0'
    output = base_path+prj_id+'/nodatato0.tif'
    input  = base_path+prj_id+'/base_lu.tif'
    gc.Calc( [rule], A=input, A_band=1, outfile=output, type=gdal.GDT_Int16, NoDataValue=-32768, overwrite=True ) 
    gdal.Warp(base_path+prj_id+'/nodatato0.tif',base_path+prj_id+'/nodatato0.tif',**gdal_warp_kwargs)
    gdal.Warp(base_path+prj_id+'/bau_lu_newld.tif',base_path+prj_id+'/bau_lu_newld.tif',**gdal_warp_kwargs)   
    arg = ['', '-of', 'GTiff', '-o', base_path+prj_id+'/bau_lu_newld.tif', '-a_nodata', '-32768', '-n', '-32768' ]
    arg.append(base_path+prj_id+'/nodatato0.tif')
    arg.append(base_path+prj_id+'/bau_lu_newld.tif')
    
    merge_command = ['python', '/usr/bin/gdal_merge.py',  '-of', 'GTiff', '-o', base_path+prj_id+'/bau_lu_newld.tif', '-a_nodata', '-32768', '-n', '-32768' ]
    merge_command.append(base_path+prj_id+'/nodatato0.tif')
    merge_command.append(base_path+prj_id+'/bau_lu_newld.tif')
    subprocess.call(merge_command,shell=False)
  
    # bau_lm_newld: 3,2,1,0
    error = 'bau_lm_newld'

    rule = '0'
    input = base_path+prj_id+'/nodatato0.tif'
    output  = base_path+prj_id+'/bau_lm_newld.tif'
    gc.Calc( [rule], A=input, A_band=1, outfile=output, type=gdal.GDT_Int16, NoDataValue=-32768, overwrite=True )

    for evaluation in evaluations:
        code = evaluation["code"]
        with ( open(base_path+evaluation["polygon"]) as geojson_file ) :
            shape_geojson = json.dumps(json.load(geojson_file))
            input = base_path+prj_id+'/base_lu.tif'
            output = base_path+prj_id+'/fa_lu_'+str(code)+'.tif'
            cut_by_geojson(input, output, shape_geojson)
            gdal.Warp(base_path+prj_id+'/fa_lu_'+str(code)+'.tif',base_path+prj_id+'/fa_lu_'+str(code)+'.tif',**gdal_warp_kwargs)
            values = evaluation["values"]
            rule1 = '0'
            rule0 = '+'
            for value in values:
                v = 2 - int(value['ld']) 
                rule1 = rule1 + ' + (A=='+str(value['lu'])+')*' + str(v)
                rule0 = rule0 + '(A!='+str(value['lu'])+')*'
            rule = rule1 + rule0 + '-32768'
            output = base_path+prj_id+'/fa_newld_'+str(code)+'.tif'
            input  = base_path+prj_id+'/fa_lu_'+str(code)+'.tif'
            gc.Calc( [rule], A=input, A_band=1, outfile=output, type=gdal.GDT_Int16, NoDataValue=-32768, overwrite=True )    
        codes.append(code)
    
    merge_command = ['python', '/usr/bin/gdal_merge.py',  '-of', 'GTiff', '-o', base_path+prj_id+'/bau_lu_newld.tif', '-a_nodata', '-32768', '-n', '-32768' ]
    merge_command.append(base_path+prj_id+'/nodatato0.tif')
    merge_command.append(base_path+prj_id+'/bau_lu_newld.tif')
    for code in codes:
        merge_command.append(base_path+prj_id+'/fa_newld_'+str(code)+'.tif')
    
    subprocess.call(merge_command,shell=False)
  
    
    # bau_lu_newld: 3,2,1,0  -32768 in fa to 0

    gdal.Warp(base_path+prj_id+'/past_ld.tif',base_path+prj_id+'/past_ld.tif',**gdal_warp_kwargs)
    gdal.Warp(base_path+prj_id+'/bau_lm_newld.tif',base_path+prj_id+'/bau_lm_newld.tif',**gdal_warp_kwargs)
    gdal.Warp(base_path+prj_id+'/bau_lu_newld.tif',base_path+prj_id+'/bau_lu_newld.tif',**gdal_warp_kwargs)

    # bau_future_ld : A1=1;A2=2;B1=3;B2=4;C1=5;C2=7;D1=8;D2=9;E0=10;E1=11;E2=12
    error = 'bau_future_ld.tif'
    output = base_path+prj_id+'/bau_future_ld.tif'
    inputA  = base_path+prj_id+'/bau_lm_newld.tif'
    inputC  = base_path+prj_id+'/bau_lu_newld.tif'
    inputB  = base_path+prj_id+'/past_ld.tif'
    #
    rule =  '(A<0)*-32768 +'
    rule += '(A>=0)*(A>=C)*((B>0)*(B<'+ str(lu_classes_nr+1) +')*((A==3)*4+(A==2)*3+(A==1)*7+(A==0)*11) +'
    rule +=         '(B>'+ str(lu_classes_nr) +')*(B<'+ str(lu_classes_nr*2+1) +')*((A==3)*1+(A==2)*5+(A==1)*8+(A==0)*10) +'
    rule +=         '(B>'+ str(lu_classes_nr*2) +')*((A==3)*2+(A==2)*5+(A==1)*8+(A==0)*12)) +'
    rule += '(A>=0)*(A<C)*((B>0)*(B<'+ str(lu_classes_nr+1) +')*((C==3)*4+(C==2)*3+(C==1)*7+(C==0)*11) +'
    rule +=         '(B>'+ str(lu_classes_nr) +')*(B<'+ str(lu_classes_nr*2+1) +')*((C==3)*1+(C==2)*5+(C==1)*8+(C==0)*10) +'
    rule +=         '(B>'+ str(lu_classes_nr*2) +')*((C==3)*2+(C==2)*5+(C==1)*8+(C==0)*12))'
    ds = gc.Calc( [rule] , A=inputA, A_band=1, B=inputB, B_band=1, C=inputC, C_band=1, outfile=output, type=gdal.GDT_Int16,  overwrite=True )    
    ds = None
    
    gdal.Warp(base_path+prj_id+'/bau_future_ld.tif',base_path+prj_id+'/bau_future_ld.tif',**gdal_warp_kwargs)
        
    error = 'evaluations - purge'
    for code in codes:
        path = path = '/var/www/' + base_path + prj_id + '/fa_newld_'+str(code)+'.tif'
        if ( os.path.isfile(path) ):
            os.remove(path)
        path = path = '/var/www/' + base_path + prj_id + '/fa_lu_'+str(code)+'.tif'
        if ( os.path.isfile(path) ):
            os.remove(path)
    path = path = '/var/www/' + base_path + prj_id +'/nodatato0.tif'
    if ( os.path.isfile(path) ):
        os.remove(path)
        
    print ("Success BAU level")        
except:
    print ("BAU level error: pastLD or baunewLD" )
    sys.exit()

try :
    # plan_newlu: 1...lu_classes_nr
    # plan_lu_mask_newld 1, 0, -32768  
    error = 'changeuses'
    codes = []
    changeuse  = conf['changeuse']
    for cu in changeuse:
        code = cu["code"]    
        with ( open(base_path+cu["polygon"]) as geojson_file ) :
            shape_geojson = json.dumps(json.load(geojson_file))
            input  = base_path+prj_id+'/base_lu.tif'
            output = base_path+prj_id+'/pl_lu_'+str(code)+'.tif'
            cut_by_geojson(input, output, shape_geojson)
            rule_lu = '(A=='+str(cu['from'])+')*'+str(cu['to'])+'- (A!='+str(cu['from'])+')*32768'
            output = base_path+prj_id+'/pl_newlu_'+str(code)+'.tif'
            input  = base_path+prj_id+'/pl_lu_'+str(code)+'.tif'
            gc.Calc( [rule_lu] , A=input, A_band=1, outfile=output, type=gdal.GDT_Int16, NoDataValue=-32768, overwrite=True )    
            rule_ld = '(A=='+str(cu['from'])+')*1 - (A!='+str(cu['from'])+')*32768'
            output = base_path+prj_id+'/pl_newld_'+str(code)+'.tif'
            input  = base_path+prj_id+'/pl_lu_'+str(code)+'.tif'
            gc.Calc( [rule_ld] , A=input, A_band=1, outfile=output, type=gdal.GDT_Int16, NoDataValue=-32768, overwrite=True )    
        codes.append(code)
    error = 'merge changeuse'
    rule_lu = '(A>0)*A'
    output = base_path+prj_id+'/plan_newlu.tif'
    input  = base_path+prj_id+'/base_lu.tif'
    gc.Calc( [rule_lu] , A=input, A_band=1, outfile=output, type=gdal.GDT_Int16, NoDataValue=-32768, overwrite=True )    
    rule =  '(A>0)*0'
    output  = base_path+prj_id+'/plan_lu_mask_newld.tif'
    inputA  = base_path+prj_id+'/base_lu.tif'
    gc.Calc( [rule] , A=inputA, A_band=1, outfile=output, type=gdal.GDT_Int16, NoDataValue=-32768, overwrite=True )    
    if ( len(codes) > 0 ) :  
        merge_command = ['python', '/usr/bin/gdal_merge.py',  '-of', 'GTiff', '-o', base_path+prj_id+'/plan_newlu.tif' ]
        merge_command.append(base_path+prj_id+'/plan_newlu.tif')
        for code in codes:
            merge_command.append(base_path+prj_id+'/pl_newlu_'+str(code)+'.tif')
        subprocess.call(merge_command,shell=False)
        merge_command = ['python', '/usr/bin/gdal_merge.py', '-of', 'GTiff', '-o', base_path+prj_id+'/plan_lu_mask_newld.tif' , '-a_nodata', '-32768', '-n', '-32768']
        merge_command.append(base_path+prj_id+'/plan_lu_mask_newld.tif')
        for code in codes:
            merge_command.append(base_path+prj_id+'/pl_newld_'+str(code)+'.tif')
        subprocess.call(merge_command,shell=False)  
    # plan_lu_future_ld: A1=1;A2=2;B1=3;B2=4;C1=5;C2=7;D1=8;D2=9;E0=10;E1=11;E2=12
    # ((E0,E1,E2), (D1,C2,D2), (C1,B1,C1), (A1,B2,A2)) -> (D1,C2,D2)
    error = 'plan_lu_future_ld'
    rule = '(B<0)*-32768 + (B>=0)*((A!=1)*B + (A==1)*( ((B==10)+(B==8)+(B==5)+(B==1))*8 + ((B==11)+(B==7)+(B==3)+(B==4))*7 + ((B==12)+(B==9)+(B==6)+(B==2))*9 ))'
    output = base_path+prj_id+'/plan_lu_future_ld.tif'
    inputA  = base_path+prj_id+'/plan_lu_mask_newld.tif'
    inputB  = base_path+prj_id+'/bau_future_ld.tif'
    gc.Calc( [rule] , A=inputA, A_band=1, B=inputB, B_band=1, outfile=output, type=gdal.GDT_Int16, NoDataValue=-32768, overwrite=True )    
    
    error = 'changeuse - purge'
    for code in codes:
        path = '/var/www/' + base_path + prj_id + '/pl_lu_'+str(code)+'.tif'
        if ( os.path.isfile(path) ):
            os.remove(path)
        path = '/var/www/' + base_path + prj_id + '/pl_newld_'+str(code)+'.tif'
        if ( os.path.isfile(path) ):
            os.remove(path)
        path = '/var/www/' + base_path + prj_id + '/pl_newlu_'+str(code)+'.tif'
        if ( os.path.isfile(path) ):
            os.remove(path) 
    gdal.Warp(base_path+prj_id+'/plan_lu_future_ld.tif',base_path+prj_id+'/plan_lu_future_ld.tif',**gdal_warp_kwargs)
    gdal.Warp(base_path+prj_id+'/plan_newlu.tif',base_path+prj_id+'/plan_newlu.tif',**gdal_warp_kwargs)
              
except: 
    print ("Error ChangeUse Planning level: " + error )
    sys.exit()

try:
    # plan_lm_mask_newld: 1, 0, -32768              
    codes = []
    error = 'technologies'
    technologies  = conf['technologies']
    for tech in technologies:
        code = tech["code"]
        with ( open(base_path+tech["polygon"]) as geojson_file ) :
            shape_geojson = json.dumps(json.load(geojson_file))
            input = base_path+prj_id+'/base_lu.tif'
            output = base_path+prj_id+'/pl_lu_'+str(code)+'.tif'
            cut_by_geojson(input, output, shape_geojson)
            values = tech["values"]
            rule = ''
            for value in values:
                if ( rule != '' ):
                    rule = rule + '+'
                rule = rule + '(A=='+str(value['lu'])+')*1'
            output = base_path+prj_id+'/pl_newld_'+str(code)+'.tif'
            input  = base_path+prj_id+'/pl_lu_'+str(code)+'.tif'
            if ( rule != '' ):
                codes.append(code)
                gc.Calc( [rule], A=input, A_band=1, outfile=output, type=gdal.GDT_Int16, NoDataValue=-32768, overwrite=True )    
    error = 'merge technologies'
    rule =  '(A>0)*0'
    output  = base_path+prj_id+'/plan_lm_mask_newld.tif'
    inputA  = base_path+prj_id+'/base_lu.tif'
    gc.Calc( [rule] , A=inputA, A_band=1, outfile=output, type=gdal.GDT_Int16, NoDataValue=-32768, overwrite=True )    
    if ( len(codes) > 0 ) : 
        merge_command = ['python', '/usr/bin/gdal_merge.py', '-of', 'GTiff', '-o', base_path+prj_id+'/plan_lm_mask_newld.tif', '-a_nodata', '-32768', '-n', '-32768']
        for code in codes:
            merge_command.append(base_path+prj_id+'/pl_newld_'+str(code)+'.tif')
        subprocess.call(merge_command,shell=False) 

    # plan_lm_future_ld: A1=1;A2=2;B1=3;B2=4;C1=5;C2=7;D1=8;D2=9;E0=10;E1=11;E2=12
    # ((E0,E1,E2), (D1,C2,D2), (C1,B1,C1), (A1,B2,A2)) -> (D1,C2,D2)
    error = 'plan_lm_future_ld'
    rule = '(A!=1)*B + (A==1)*( ((B==10)+(B==8)+(B==5)+(B==1))*8 + ((B==11)+(B==7)+(B==3)+(B==4))*7 + ((B==12)+(B==9)+(B==6)+(B==2))*9 ) '
    output = base_path+prj_id+'/plan_lm_future_ld.tif'
    inputA  = base_path+prj_id+'/plan_lm_mask_newld.tif'
    inputB  = base_path+prj_id+'/bau_future_ld.tif'
    gc.Calc( [rule] , A=inputA, A_band=1, B=inputB, B_band=1, outfile=output, type=gdal.GDT_Int16, NoDataValue=-32768, overwrite=True )    
    
    # overall_future_ld : A1=1;A2=2;B1=3;B2=4;C1=5;C2=7;D1=8;D2=9;E0=10;E1=11;E2=12
    error = 'overall_future_ld'
    output = base_path+prj_id+'/overall_future_ld.tif'
    inputB  = base_path+prj_id+'/plan_lu_future_ld.tif'
    gc.Calc( [rule] , A=inputA, A_band=1, B=inputB, B_band=1, outfile=output, type=gdal.GDT_Int16, NoDataValue=-32768, overwrite=True )    
    
    
    error = 'technologies - purge'
    for code in codes:
        path = path = '/var/www/' + base_path + prj_id +'/pl_newld_'+str(code)+'.tif'
        if ( os.path.isfile(path) ):
            os.remove(path)
        path = '/var/www/' + base_path + prj_id +'/pl_lu_'+str(code)+'.tif'
        if ( os.path.isfile(path) ):
            os.remove(path)
    path = path = '/var/www/' + base_path + prj_id +'/plan_lu_mask_newld.tif'
    if ( os.path.isfile(path) ):
        os.remove(path)
    path = path = '/var/www/' + base_path + prj_id +'/plan_lm_mask_newld.tif'
    if ( os.path.isfile(path) ):
        os.remove(path)   
    gdal.Warp(base_path+prj_id+'/overall_future_ld.tif',base_path+prj_id+'/overall_future_ld.tif',**gdal_warp_kwargs)
    gdal.Warp(base_path+prj_id+'/plan_lm_future_ld.tif',base_path+prj_id+'/plan_lm_future_ld.tif',**gdal_warp_kwargs)
    
    print ("Success Planning level")        
except: 
    print ("Errorr Technologies Planning level: " + error )
    sys.exit()        
    
# input 'past_ld', 'overall_future_ld', 'bau_future_ld'
# output 'final_ldn_balance', 'bau_ldn_balance.tif'
try:
    error = 'balance future LDN'
    ## CARDINALITY OF LU CLASSES == n 
    ## LDN_BALANCE VALUES: [1..n]  -> 1
    ## LDN_BALANCE VALUES: [n+1..2n] -> 2
    ## LDN_BALANCE VALUES: [2n+1..3n] -> 3
    ## LDN_BALANCE VALUES: [3n+1..4n] -> 4
    ## PASTLD VALUES: [1..n]  -> -1
    ## PASTLD VALUES: [n+1..2n] -> 0
    ## PASTLD VALUES: [2n+1..3n] -> 1
    ## FUTURELD :  A1=1;A2=2;B1=3;B2=4;C1=5;C2=7;D1=8;D2=9;E0=10;E1=11;E2=12
    ## IF PASTLD == -1 AND ( FUTURELD == 'B1' OR FUTURELD == 'B2' ) THEN 4.PERSISTENT
    ## IF (PASTLD == 0 OR PASTLD == 1) AND ( FUTURELD == 'A1' OR FUTURELD == 'A2' ) THEN 3.RECENT
    ## IF (PASTLD == 0 OR PASTLD == -1) AND ( FUTURELD == 'D1' OR FUTURELD == 'C2' ) THEN 2.IMPROVEMENT
    ## IF PASTLD != -32768 AND ( FUTURELD == 'D2' OR FUTURELD == 'C1' ) THEN 1.NOT CHANGING
    ## OTHERWISE 0.NO DATA
    n = str(lu_classes_nr)
    output  = base_path+prj_id+'/final_ldn_balance.tif'
    inputA  = base_path+prj_id+'/past_ld.tif'
    inputB  = base_path+prj_id+'/overall_future_ld.tif'
    is_minus = '(A>0)*(A<='+n+')'
    is_zero = '(A>'+n+')*(A<=2*'+n+')'
    is_plus = '(A>2*'+n+')*(A<=3*'+n+')'
    rule = is_minus + '*((B==3)+(B==4))*(3*'+n+' + A) + ' 
    rule += is_zero + '*((B==1)+(B==2))*('+n+' + A ) +'
    rule += is_plus + '*((B==1)+(B==2))*A +' 
    rule += is_zero + '*((B==8)+(B==7))*A +' 
    rule += is_minus + '*((B==8)+(B==7))*('+n+' + A) +' 
    rule += is_minus + '*((B==9)+(B==5))*A +' 
    rule += is_zero  + '*((B==9)+(B==5))*(A - '+n+') +' 
    rule += is_plus  + '*((B==9)+(B==5))*(A - 2*'+n+')' 
    gc.Calc( [rule] , A=inputA, A_band=1, B=inputB, B_band=1, outfile=output, type=gdal.GDT_Int16, NoDataValue=-32768, overwrite=True )    

    output  = base_path+prj_id+'/bau_ldn_balance.tif'
    inputA  = base_path+prj_id+'/past_ld.tif'
    inputB  = base_path+prj_id+'/bau_future_ld.tif'
    gc.Calc( [rule] , A=inputA, A_band=1, B=inputB, B_band=1, outfile=output, type=gdal.GDT_Int16, NoDataValue=-32768, overwrite=True )    
    
    rule = '(B>0)*A'
    output  = base_path+prj_id+'/past_ld_masked.tif'
    inputA  = base_path+prj_id+'/past_ld.tif'
    inputB  = base_path+prj_id+'/final_ldn_balance.tif'
    gc.Calc( [rule] , A=inputA, A_band=1, B=inputB, B_band=1, outfile=output, type=gdal.GDT_Int16, NoDataValue=-32768, overwrite=True )    
    print ("Success Balance phase ")
    
    gdal.Warp(base_path+prj_id+'/past_ld_masked.tif',base_path+prj_id+'/past_ld_masked.tif',**gdal_warp_kwargs)
    gdal.Warp(base_path+prj_id+'/final_ldn_balance.tif',base_path+prj_id+'/final_ldn_balance.tif',**gdal_warp_kwargs)
    gdal.Warp(base_path+prj_id+'/bau_ldn_balance.tif',base_path+prj_id+'/bau_ldn_balance.tif',**gdal_warp_kwargs)
    gdal.Warp(base_path+prj_id+'/final_ldn_balance.tif',base_path+prj_id+'/final_ldn_balance.tif',**gdal_warp_kwargs)
except: 
    print ("Error Balance level: "+error)
    sys.exit()

try:
    ## TOTAL = HECTARES(SDG -1,0,1)
    ## BALANCE 1= HECTARES(SDG==-1) - HECTARES(PERSISTENT+RECENT)
    ## BALANCE 2= HECTARES(SDG==-1) - HECTARES(PERSISTENT+RECENT) + HECTARES(IMPROVEMENT) 
    error = 'hectares'
    hectares = {}
    pixels = calc_area_pixels(base_path+prj_id+"/base_lu.tif")
    
    files = ['base_lu','base_ls','base_ld','past_ld','bau_lu_newld','bau_lm_newld','bau_future_ld','plan_newlu','plan_lu_future_ld','plan_lm_future_ld','overall_future_ld','final_ldn_balance', 'bau_ldn_balance', 'past_ld_masked'] 
    for file in files :
        hectares[file+'_hectares_per_class'] = calc_hectares(base_path+prj_id+"/"+file+".tif", area, pixels)
    with open(base_path+prj_id+"/hectares.json", "w") as outfile:
        json.dump(hectares, outfile)
    print ("Successs in hectares phase" )
except: 
    print ("Error Hectares: " + error )
