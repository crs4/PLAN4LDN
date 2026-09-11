import sys, os, glob, json
from pathlib import PurePath, Path
import numpy as np
from osgeo import ogr, osr, gdal

dirname = os.path.dirname(__file__)
# Enable GDAL/OGR exceptions
gdal.UseExceptions()
# GDAL & OGR memory drivers
GDAL_MEMORY_DRIVER = gdal.GetDriverByName('MEM')
OGR_MEMORY_DRIVER = ogr.GetDriverByName('Memory')

prj_id = sys.argv[1]
polygon_id = sys.argv[2]
file_path = sys.argv[4]
area = sys.argv[3]

try: 
    base_path = '/var/www/storage/app/private/'
    a = int (float(area))
    lu_tif = gdal.Open(base_path+prj_id+'/base_lu.tif', gdal.GA_ReadOnly)
    with open(base_path+file_path) as geojson_file  :
      geojson = json.load(geojson_file)
      ds = gdal.OpenEx(json.dumps(geojson))
      layer = ds.GetLayer()
      bbox = layer.GetExtent()
      min_x, max_x, min_y, max_y = bbox[0], bbox[1], bbox[2], bbox[3]
      # Read LU tiff parameters
      transform = lu_tif.GetGeoTransform()
      projection = lu_tif.GetProjection()
      xOrigin = transform[0]
      yOrigin = transform[3]
      pixelWidth = transform[1]
      pixelHeight = -transform[5]
      # Getting spatial reference of lu raster
      srs = osr.SpatialReference()
      srs.ImportFromWkt(projection)
      # WGS84 projection reference and OSR transformation
      OSR_WGS84_REF = osr.SpatialReference()
      OSR_WGS84_REF.ImportFromEPSG(4326)
       
      wgs84_to_image_trasformation = osr.CoordinateTransformation(OSR_WGS84_REF,srs)
      XYmin = wgs84_to_image_trasformation.TransformPoint(min_x, max_y)
      XYmax = wgs84_to_image_trasformation.TransformPoint(max_x, min_y)
      i1 = int((XYmin[0] - xOrigin) / pixelWidth)
      j1 = int((yOrigin - XYmin[1]) / pixelHeight)
      i2 = int((XYmax[0] - xOrigin) / pixelWidth)
      j2 = int((yOrigin - XYmax[1]) / pixelHeight)
      new_cols = i2 - i1 + 1
      new_rows = j2 - j1 + 1
      new_x = xOrigin + i1 * pixelWidth
      new_y = yOrigin - j1 * pixelHeight
      new_transform = (new_x, transform[1], transform[2], new_y, transform[4],transform[5])
      ft = layer.GetNextFeature()
      geom = ft.geometry()
      #wkt_geom = ogr.CreateGeometryFromJson(json.dumps(ft.ExportToJson()))
      #wkt_geom.Transform(wgs84_to_image_trasformation)
      geom.Transform(wgs84_to_image_trasformation)
      # create in memory raster with the mask
      target_ds = GDAL_MEMORY_DRIVER.Create('', new_cols, new_rows, 1,gdal.GDT_Byte)
      target_ds.SetGeoTransform(new_transform)
      target_ds.SetProjection(projection)
      # Create a memory layer to rasterize from.
      ogr_dataset = OGR_MEMORY_DRIVER.CreateDataSource('shapemask')
      ogr_layer = ogr_dataset.CreateLayer('shapemask', srs=srs)
      ogr_feature = ogr.Feature(ogr_layer.GetLayerDefn())
      #ogr_feature.SetGeometryDirectly(ogr.Geometry(wkt=wkt_geom.ExportToWkt()))
      ogr_feature.SetGeometryDirectly(geom)
      ogr_layer.CreateFeature(ogr_feature)
      gdal.RasterizeLayer(target_ds, [1], ogr_layer, burn_values=[1],options=["ALL_TOUCHED=TRUE"])
      # Read in bands and store all the data in bandList
       
      mask_array = target_ds.GetRasterBand(1).ReadAsArray()
      band = lu_tif.GetRasterBand(1).ReadAsArray(i1, j1,new_cols, new_rows)
      data = np.where(mask_array == 1, band, mask_array)
      
      if ( area ) :
        unique, counts = np.unique(data, return_counts = True)
        total = np.sum(counts)
        total -= counts[0]   
        hectares = dict(zip([str(x) for x in unique],  [ (int(x)/total)*a for x in counts]))
        del hectares['0']
        print(json.dumps(hectares))
      else : print(json.dumps([]))
      target_ds = None
      ds = None 
except: 
  print(json.dumps([]))
exit 
