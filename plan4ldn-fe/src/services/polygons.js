import doFetch  from '../utilities/api-client';

const geoserver = process.env.NEXT_PUBLIC_GEOSERVER_URL
const wfs = geoserver + "ows?service=WFS&version=1.0.0&request=GetFeature&outputFormat=application%2Fjson&";
const wms = geoserver + "ows?service=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&FEATURE_COUNT=1&X=50&Y=50&SRS=EPSG:4326&STYLES=&WIDTH=101&HEIGHT=101&FORMAT=application/json&TRANSPARENT=true&exceptions=application/vnd.ogc.se_inimage&INFO_FORMAT=application/json";
const wcs = geoserver + "ows?service=WCS&version=2.0.1&request=GetCoverage&height=512&width=512&";
const wps = geoserver + "wps?";

export const getCountryAdminLevelArea = async (country, adminLevel = 1) => {
  try  {
    if ( country ) {
      let url = wfs + "&typeName=geonode%3Agadm41_" + country.toLowerCase()  + "_" + adminLevel;
      let res = doFetch(url, "GET", null, null )
      return res;
    }
    else return { data: null, ok: false, status: null }
  }
  catch( error )  {
    console.log(error)
    return { data: null, ok: false, status: null }
  }
}

export const getByCoordinates = async (point, country, adminLevel = 1) => {
  try  {
    if ( country && adminLevel && point["geometry"] && point["geometry"]["coordinates"] && 
         point["geometry"]["coordinates"][0] && point["geometry"]["coordinates"][1] 
    ) {
      let url = wfs +  "&typeName=geonode%3Agadm41_" + country.toLowerCase() + "_" + adminLevel;
	    url += "&CQL_FILTER=INTERSECTS%28geometry,%20POINT%20%28"
      url += point["geometry"]["coordinates"][0];
	    url += "%20" + point["geometry"]["coordinates"][1] + "%29%29&maxFeatures=1";
      return doFetch(url, "GET", null, null )
    }
    else return { data: null, ok: false, status: null }
  }
  catch( error )  {
    console.log(error)
    return { data: null, ok: false, status: null }
  }
}

export const getByBox = async (box, country, adminLevel = 1) => {
  try  {
    if ( country && adminLevel && box["geometry"] && box["geometry"]["coordinates"] && 
         box["geometry"]["coordinates"][0][0][0] && box["geometry"]["coordinates"][0][0][1] && 
         box["geometry"]["coordinates"][0][2][0] && box["geometry"]["coordinates"][0][2][1]
    ) {
      let url = wfs + "&typeName=geonode%3Agadm41_" + country.toLowerCase() + "_" + adminLevel;
      url += "&BBOX=" + box["geometry"]["coordinates"][0][0][0] + "," + box["geometry"]["coordinates"][0][0][1] + ","; 
      url += box["geometry"]["coordinates"][0][2][0] + "," + box["geometry"]["coordinates"][0][2][1];
      return doFetch(url, "GET", null, null )
    }
    else return { data: null, ok: false, status: null }
  }
  catch( error )  {
    console.log(error)
    return { data: null, ok: false, status: null }
  }
}





