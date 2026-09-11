<?php

namespace App\Http\Controllers\API\Integrations;

use Http;
use Cache;
use Storage;
use Log;
use Exception;
use App\Models\Project;
use App\Models\ProjectFile;
use App\Http\Controllers\Controller;
use App\Utilities\PLAN4LDN\WocatTransformer;
use App\Utilities\PLAN4LDN\LandCoverClassExtractor;
use App\Http\Requests\Integrations\ListLDNTargetsRequest;
use App\Http\Requests\Integrations\CalculateHectaresRequest;
use App\Http\Requests\Integrations\GetWocatTechnologiesRequest;
use App\Http\Requests\Integrations\GetWocatTechnologyRequest;
use App\Http\Requests\Integrations\PrepareLDNMapRequest;
use App\Http\Requests\Integrations\getLandCoverClassesRequest;
use App\Http\Requests\LandCover\GetLandCoverPercentagesRequest;
use App\Http\Requests\Polygons\GetPolygonsByBoxRequest;
use App\Http\Requests\Polygons\GetPolygonsByCoordinatesRequest;
use App\Http\Requests\Polygons\GetAdminLevelAreaPolygonsRequest;
use App\Http\Requests\Polygons\GetGeoTiffByBoxRequest;
use App\Http\Requests\Polygons\CropGeoTiffByWktRequest;

class PLAN4LDNController extends Controller
{
    protected $cacheTtl;
    protected $baseURI;
    protected $requestTimeout;
    protected $token;
    protected $geoserverwps;
    protected $geoserverwcs;
    protected $geoserverwms;
    protected $geoserverwfs;
    protected $geoserverurl;
    protected $siteurl;
    
    public function __construct(){
    
	    $this->requestTimeout = env('REQUEST_TIMEOUT_SECONDS', 60);
        $this->siteurl = env('SITE_URL', 'http://localhost/') 
        $this->token = env('WOCAT_TOKEN', '___this_is_a_wrong_token___') 
        $this->geoserverurl = $this->siteurl . 'geoserver/geonode/';;
	    $this->geoserverwfs = $this->geoserverurl . "ows?service=WFS&version=1.0.0&request=GetFeature&outputFormat=application%2Fjson&";
        $this->geoserverwms = $this->geoserverurl . "ows?service=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&FEATURE_COUNT=1&X=50&Y=50&SRS=EPSG:4326&STYLES=&WIDTH=101&HEIGHT=101&FORMAT=application/json&TRANSPARENT=true&exceptions=application/vnd.ogc.se_inimage&INFO_FORMAT=application/json";
		$this->geoserverwcs = $this->geoserverurl . "ows?service=WCS&version=2.0.1&request=GetCoverage&height=512&width=512&";
        $this->geoserverwps = $this->geoserverurl . "wps?";
        
    }

    /**
     * Get a Subset of a GeoTiff in Geonode
     *
     * @param getGeoTiffByBoxRequest $request
     * @return geotiff raster
     */
    public function getGeoTiffByBox(getGeoTiffByBoxRequest $request)
    {
        $url = $this->geoserverwcs . "&coverageId=" . $request->cover_id;
        $url = $url . "&subset=" . $request->subsetlat . "&subset=" . $request->subsetlon;
        $response = Http::timeout($this->requestTimeout)->get ( $url );
        if ($response->ok()) {
            return response($response->getBody()->getContents(), $response->getStatusCode());
        }
        if ($response->failed()) {
		    return response()->json([
		       	'error' => 'Failed to contact remote service for generating geotiff'
		    ], $response->status());
	    }
    }

    /**
     * Get a Subset of a GeoTiff in Geonode
     *
     * @param getGeoTiffByWktRequest $request
     * @return geotiff raster
     */
    public function cropGeoTiffByWkt(cropGeoTiffByWktRequest $request)
    {
        $queryXMLBody = $this->getWpsQueryXMLBody($request->$coverage_id,$request->wkt,$request->bbox); 
        $response = Http::timeout($this->requestTimeout)
            ->withBody($queryXMLBody, 'text/xml; charset=UTF8')
            ->post($geoserverwps)
            ->throw();
        if ($response->ok()) {
            return response($response->getBody()->getContents(), $response->getStatusCode());
        }
        if ($response->failed()) {
		    return response()->json([
		       	'error' => 'Failed to contact remote service for generating geotiff'
		    ], $response->status());
	    }
    }
    
    /**
     * Get the polygons for a given admin level area.
     *
     * @param GetAdminLevelAreaPolygonsRequest $request
     * @return void
     */
    public function getAdminLevelAreaPolygons(GetAdminLevelAreaPolygonsRequest $request)
    {
        $url = $this->geoserverwfs . "&typeName=geonode%3Agadm41_";
	    $url = $url . mb_strtolower($request->country) . "_" . $request->level;
        $response = Http::timeout($this->requestTimeout)
            ->acceptJson()
	        ->asJson()
    	    ->get ( $url . "&maxFeatures=50000");
        $features = $response->json();
        return response()->json($features, $response->status());
    }

    /**
     * Get the polygons for the given coordinates.
     *
     * @param GetPolygonsByCoordinatesRequest $request
     * @return void
     */
    public function getPolygonsByCoordinates(GetPolygonsByCoordinatesRequest $request)
    {
        $url = $this->geoserverwfs . "&typeName=geonode%3Agadm41_";
	    $url = $url . mb_strtolower($request->country) . "_" . $request->administrative_level;
        $pointx = $request->point["geometry"]["coordinates"][0];
	    $pointy = $request->point["geometry"]["coordinates"][1];
        $CQL = "&CQL_FILTER=INTERSECTS%28geometry,%20POINT%20%28".$pointx."%20".$pointy."%29%29";	        
        $response = Http::timeout($this->requestTimeout)
            ->acceptJson()
	        ->asJson()
            ->get ( $url.$CQL."&maxFeatures=1" );
        $features = $response->json();
        return response()->json($features, $response->status());
    }

    /**
     * Get the polygons for the given coordinates.
     *
     * @param GetPolygonsByBoxRequest $request
     * @return void
     */
    public function getPolygonsByBox(GetPolygonsByBoxRequest $request)
    {
        $url = $this->geoserverwfs . "&typeName=geonode%3Agadm41_";
	    $url = $url . mb_strtolower($request->country) . "_" . $request->administrative_level;
        
        $point1 = $request->box["geometry"]["coordinates"][0][0][0];
        $point2 = $request->box["geometry"]["coordinates"][0][0][1];
        $point3 = $request->box["geometry"]["coordinates"][0][2][0];
        $point4 = $request->box["geometry"]["coordinates"][0][2][1];
        $bbox = "&BBOX=$point1,$point2,$point3,$point4";
        $features = [];	        
        $response = Http::timeout($this->requestTimeout)
            ->acceptJson()
            ->asJson()
            ->get ( $url.$bbox );
        $features = $response->json();
        return response()->json($features, $response->status());
    }

    /**
     * Extract cover classes in a polygon .
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function getLandCoverClasses(getLandCoverClassesRequest $request, Project $project)
    {
        $extracted_classes = [];
        try {
            $extracted_classes = (new LandCoverClassExtractor($project, $request->polygon, $request->area))->extractClasses();
            if ( count($extracted_classes) === 0 ) {
                return response()->json([
                    'errors' => [
                        'error' => 'Could not find any land use types in the polygon provided.',
                    ]
                ], 422);
            }
            return response()->json(
                ['data' => $extracted_classes],
                200,
                [],
                JSON_UNESCAPED_SLASHES
	        );
            //$extracted_classes = json_encode($extracted_classes);
        } catch (\Exception $ex) {
            return response()->json(
                ['data' => [] ],
                404);
        }
        
    }
     
    public function getWocatTechnologies(GetWocatTechnologiesRequest $request)
    { 
        $filter = '';
        if ( !empty($request->luclass)&&($request->luclass != 'All') )
            $filter = "&q=".$request->luclass;
        
        $page = $request->page;
        $wocat_token = $this->token;
        // OLD API !!!! to do
        $wocat_uri = "https://qcat.wocat.net/en/api/v2/questionnaires/?type=technologies";
        $wocat_uri = $wocat_uri . $filter . '&page=' . $page ;
        $headers = [
            'Authorization'  => $wocat_token,
        ];
        $response = Http::timeout($this->requestTimeout)
            ->withHeaders($headers)
            ->acceptJson()
            ->get($wocat_uri);
        $items = [];
        $total = 0;
        if ($response->ok()) {
            $data = $response->json();
            $preitems = $data['results'];
            $total = $data['count'];
            $items = (new WocatTransformer($preitems, $wocat_token ))->getTransformedOutput();
        }

        return response()->json(
            ['data' => ['items' => $items, 'total' => $total]],
            200,
            [],
            JSON_UNESCAPED_SLASHES
	    );

    }
    
    public function getWocatTechnology(GetWocatTechnologyRequest $request, $techId)
    {
        $wocat_token = $this->token;
        // OLD API !!!! to do
        $wocat_uri = "https://qcat.wocat.net/en/api/v2/questionnaires/" . $techId ."/";
        
        $headers = [
            'Authorization'  => $wocat_token,
        ];
        $response = Http::timeout($this->requestTimeout)
            ->withHeaders($headers)
            ->acceptJson()
            ->get($wocat_uri);
        
        $item = null;
        if ($response->ok()) {
            $info = $response->json('section_general_information');
            $spec = $response->json('section_specifications');
            $country = data_get( $info,'children.tech__1.children.tech__1__1.children.qg_location.children.country.value.0.value');
            $year = data_get( $spec,'children.tech__2.children.tech__2__6.children.tech_qg_160.children.tech_implementation_year.value.0.value');
            $name = data_get( $info,'children.tech__1.children.tech__1__1.children.qg_name.children.name.value.0.value' );
            $image = data_get( $spec,'children.tech__2.children.tech__2__3.children.qg_photos.children.image.value.0.value' );
            $description = data_get( $spec,'children.tech__2.children.tech__2__1.children.tech_qg_1.children.tech_definition.value.0.value' );
            $ay = data_get( $spec,'children.tech__2.children.tech__2__6.children.tech_qg_160.children.tech_implementation_decades.value.0.values.0');
            if ( $year == null )
                $year = $ay;
            $URI = 'https://qcat.wocat.net';
            $item = [
                'id' => $techId,
                'url' => $URI . '/en/wocat/technologies/view/' . $techId,
                'name' => $name,
                'description' => $description,
                'country' => $country,
                'year' => $year,
                'image' => $URI . '/' . $image,
            ];
        };
        
        return response()->json(
            ['data' => ['item' => $item]],
            200,
            [],
            JSON_UNESCAPED_SLASHES
        );
    }

    
    /**
     * Prepares the LDN Map
     */
    public function prepareLDNMap(PrepareLDNMapRequest $request, Project $project)
    {
        $cacheKey = $project->id . '_ldn_map';


        // If there is a roi_file_id append it to data
        $roiFileUrl = null;
        if (!empty($project->roi_file_id)) {
            $roiFileUrl = Storage::url(
                ProjectFile::find($project->roi_file_id)->path
            );
        }
        
        $polygons_list = [];
        if (!empty($request->polygons_list)) {
            $polygons_list = collect($request->polygons_list)->map(function($elm) {
                /*$url = Storage::url(
                    ProjectFile::find($elm['file_id'])->path
                );*/
                $polygon = Storage::get('/'.ProjectFile::find($elm['file_id'])->path);
                return [
                    'value' => $elm['value'],
                    'polygon' => $polygon,
                //    'polygon_url' => $url,
                ];
            })->filter(function($elm) {
                return $elm['polygon'] !== null;
            })->toArray();
        }
        $preprocessedData = json_decode($project->preprocessing_data);
        $ldn_map = $preprocessedData->land_degradation;        
        
        Cache::put($cacheKey, $ldn_map, $this->cacheTtl);
        return response()->json([
            'data' => [
                'ldn_map' => $ldn_map,
                'polygons' => $polygons_list,
                'roi' => json_decode($project->polygon, true) 
            ]
        ]);
       
    }

    public function getWpsQueryXMLBody( $coverageID, $wkt, $bbox )
    {
     
        return '<?xml version="1.0" encoding="UTF-8"?><wps:Execute version="1.0.0" service="WPS" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://www.opengis.net/wps/1.0.0" xmlns:wfs="http://www.opengis.net/wfs" xmlns:wps="http://www.opengis.net/wps/1.0.0" xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:gml="http://www.opengis.net/gml" xmlns:ogc="http://www.opengis.net/ogc" xmlns:wcs="http://www.opengis.net/wcs/1.1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 http://schemas.opengis.net/wps/1.0.0/wpsAll.xsd">
        <ows:Identifier>ras:CropCoverage</ows:Identifier>
        <wps:DataInputs>
          <wps:Input>
            <ows:Identifier>coverage</ows:Identifier>
            <wps:Reference mimeType="image/tiff" xlink:href="http://geoserver/wcs" method="POST">
              <wps:Body>
                <wcs:GetCoverage service="WCS" version="1.1.1">
                  <ows:Identifier>'. $coverageID .'</ows:Identifier>
                  <wcs:DomainSubset>
                    <ows:BoundingBox crs="http://www.opengis.net/gml/srs/epsg.xml#4326">
                      <ows:LowerCorner>' . bbox[0] . ' ' . bbox[1] . '</ows:LowerCorner>
                      <ows:UpperCorner>' . bbox[2] . ' ' . bbox[3] . '</ows:UpperCorner>
                    </ows:BoundingBox>
                  </wcs:DomainSubset>
                  <wcs:Output format="image/tiff"/>
                </wcs:GetCoverage>
              </wps:Body>
            </wps:Reference>
          </wps:Input>
          <wps:Input>
            <ows:Identifier>cropShape</ows:Identifier>
            <wps:Data>
              <wps:ComplexData mimeType="application/wkt"><![CDATA[' . $wkt . ']]></wps:ComplexData>
            </wps:Data>
          </wps:Input>
        </wps:DataInputs>
        <wps:ResponseForm>
          <wps:RawDataOutput mimeType="image/tiff">
            <ows:Identifier>result</ows:Identifier>
          </wps:RawDataOutput>
        </wps:ResponseForm>
      </wps:Execute>'; 
    
    }
}
