<?php

namespace App\Jobs;

use Http;
use Log;
use Exception;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

use App\Models\Project;
use App\Models\ProjectFile;
use App\Models\ProjectFocusArea;
use App\Models\ProjectFocusAreaEvaluation;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use Illuminate\Queue\InteractsWithQueue;
//use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Contracts\Queue\ShouldBeUnique;

class PreprocessProjectData implements ShouldQueue, ShouldBeUnique
{
    use /*Dispatchable,*/ InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The projects to preprocess.
     */
    protected $projects;

    /**
     * The token to use for the request.
     */
    protected $token;

    /**
     * The maximum time in seconds to allow before the request times out.
     */
    protected $requestTimeout;

    /**
     * geoserver WPS service url.
     */
    protected $geowps;

    /**
     * geonode API url.
     */
    protected $geonodeapi;

    /**
     * geoserver WCS service url.
     */
    protected $geowcs;

    /**
     * Create a new job instance.
     *
     * @return void
     */
    public function __construct() 
    {
        //$this->token = (new AWSTokenGenerator())->getToken();
        $this->requestTimeout = 360; // in seconds.
        //$geodataServicesUrl = 'http://localhost/';
        $geodataServicesUrl = 'https://soilgislab.crs4.it/';
        //env('GEODATA_SERVICES_URL');
        $this->geowps = $geodataServicesUrl . 'geoserver/geonode/wps?';
        $this->geonodeapi = $geodataServicesUrl . 'api/v2/';
        $this->geowcs = $geodataServicesUrl . "geoserver/geonode/ows?service=WCS&version=2.0.1&request=GetCoverage&height=512&width=512&";
        //$geodataServicesUrl = 'http://geoserver:8080/';
        //$geonodeServicesUrl = 'http://django:8088/';
        //$env_v = env('GEODATA_SERVICES_URL');
        //$this->geowps = $geodataServicesUrl . 'geoserver/geonode/wps?';
        //$this->geonodeapi = $geonodeServicesUrl . 'api/v2/';
        //$this->geowcs = $geodataServicesUrl . "geoserver/geonode/ows?service=WCS&version=2.0.1&request=GetCoverage&height=512&width=512&";
        
        //$geoserverwms = $geodataServicesUrl . 'https://soilgislab.crs4.it/geoserver/geonode/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&FEATURE_COUNT=1&X=50&Y=50&SRS=EPSG:4326&STYLES=&WIDTH=101&HEIGHT=101&FORMAT=application/json&TRANSPARENT=true&exceptions=application/vnd.ogc.se_inimage&INFO_FORMAT=application/json';
        
    }
 

    /**
     * Execute a data preprocess.
     * it crop 6 base raster from geonode and calc hectares for each class
     * files = ['base_lu','base_ls','base_ld','past_ld','bau_lu_newld','bau_lm_newld','bau_future_ld',
     *          'plan_newlu','plan_lu_future_ld','plan_lm_future_ld','overall_future_ld',
     *          'final_ldn_balance', 'bau_ldn_balance', 'past_ld_masked'] 
     * First step (no focus areas and no change use areas):
     * bau_lm_newld.tif === bau_lu_newld.tif
     * plan_lu_future_ld === bau_future_ld
     * plan_lm_future_ld === bau_future_ld
     * overall_future_ld.tif === bau_future_ld
     * planning_future_lu.tif === base_lu
     * final_ldn_balance.tif === bau_ldn_balance            
    * @return void
     */
    public function preprocess($project)
    { 
      try {
        Log::info('Starting preprocessing for project.', ['project' => $project->id]);
        // 1. get project info
        $ROI = json_decode($project->polygon, true); 
        $ROIbbox = $ROI['bbox'];  
        $plgarea = $ROI['area']; 
        $baseLayers = []; 
        $lu_classes_nr = 7;
        $conf = [];
        $userId = '';
        if ( !empty($project->tif_images) )
          $u = json_decode($project->tif_images);
        if ( $u[0] )
          $userId = $u[0]; 
        $conf["user_id"] = $userId; 
        $conf["project_id"] = $project->id; 
        $conf["roi"] = $ROI;
        //if ( !empty($project->country_iso_code_3) ) {
          $baseLayers = $this->getDefaultBaseLayers($ROIbbox);
        //} 
        // Use the custom land degradation file if it exists  (base_ld).
        if (!empty($project->custom_land_degradation_map_file_id)) 
        {
          /// case S3 AWS!!!!!!!
          $conf["base_ld"] = ProjectFile::find($project->custom_land_degradation_map_file_id)->path;
          ///$conf["base_ld"] = Storage::url(
          ///    ProjectFile::find($project->custom_land_degradation_map_file_id)->path
          ///);
        } 
        else {
          $this->cropAndSaveTiff ( $baseLayers["base_ld"], $ROIbbox, $project->id, "base_ld"); 
          $conf["base_ld"] = null; 
        } 
           
        // The project uses custom LU classification.
        if (!$project->uses_default_lu_classification) {
          Log::info('Project ' . $project->id . ' uses custom classification.');
          // Use the custom land use map file if it exists. (base_lu, base_ls)
          if (!empty($project->land_use_map_file_id)) {
            /// case S3 AWS!!!!!!!
            /*$baseLayers["base_lu"] = Storage::url(
              ProjectFile::find($project->land_use_map_file_id)->path
            );*/

            $conf["base_lu"] = ProjectFile::find($project->land_use_map_file_id)->path;
            $customClasses = json_decode($project->lu_classes);
            foreach ($customClasses as $luClass) {
              $pls = "";
              if (!empty($luClass->file_id)) {
                /// case S3 AWS!!!!!!!
                //$lsmUrl = Storage::url(ProjectFile::find($luClass->file_id)->path);
                $pls = ProjectFile::find($luClass->file_id)->path;
              }
              $conf['land_suitability_map'][] = [
                'lu_class' => $luClass->value,
                'lu_suitability_map_url' => $pls,
              ];
            }
            $conf["lu_classes_nr"] = count($customClasses);
            $lu_classes_nr = $conf["lu_classes_nr"];  
          }
            
        }  
        else {
          ///!!!!! crop to roi default data 
          /// case S3 AWS!!!!!!!
          $this->cropAndSaveTiff ( $baseLayers["base_ls"], $ROIbbox, $project->id, "base_ls");
          $this->cropAndSaveTiff ( $baseLayers["base_lu"], $ROIbbox, $project->id, "base_lu");
          $conf["base_ls"] = null;
          $conf["base_lu"] = null;
        }
        if ( $conf["base_lu"] !== null || $conf["base_ld"] !== null ) { 
          $content = json_encode($conf);
          $path = $project->id.'/conf1.json' ;
            
          if (Storage::put($path, $content)) 
            shell_exec("python3 gdal/gdalcustomwork.py ".$project->id);
          ///manage not cropped 
          /// $project->land_use_map_file_id <-- base_lu,
          /// $project->custom_land_degradation_map_file_id <-- base_ld,
        }
        if ( file_exists( storage_path( '/app/private/'.$project->id.'/base_ls.tif' ) ) && 
             file_exists( storage_path( '/app/private/'.$project->id.'/base_lu.tif' ) ) &&
             file_exists( storage_path( '/app/private/'.$project->id.'/base_ld.tif' ) ) && $userId != '' ) 
        {
          $preprocessingData['base_lu_geo'] = $project->id.'/base_lu.tif';
          $preprocessingData['base_ls'] = $project->id.'/base_ls.tif';
          $preprocessingData['base_lu'] = $project->id.'/base_lu.tif';
          $preprocessingData['base_ld'] = $project->id.'/base_ld.tif';
          $preprocessingData['total_roi_area'] = $plgarea; 
          $preprocessingData['lu_classes_nr'] = $lu_classes_nr;  
          $project->update([
            'preprocessing_data' => json_encode($preprocessingData),
          ]);
          $this->reprocess($project);        
        }
        else { 
          Log::error('Failed to preprocess project ', [
            'error' => 'data layers not created!!',
          ]);
          /// MANAGE ERROR prevent reprocess!! 
        }  
      } catch (Exception $ex) {
        Log::error('Failed to preprocess project ', [
          'project' => $project->id,
          'error' => $ex->getMessage(),
        ]);
        /// MANAGE ERROR prevent reprocess!!
      }  
    }

    /**
     * Execute a re-process, re-write all raster  
     * input:
     * A = base_lu from preprocess crop default_lu or custom lu [lu classes]
     * B = base_ls from preprocess [0,1,2,3] 
     *     crop default_ls or custom ls maps (=merge of all ls with mask by lu class )
     * C = base_ld from preprocess crop sdg [-1,0,1] -32768 no data
     * 
     * output gdal:
     * past_ld.tif [-1,0.1] -32768 no data
     * bau_lu_new_ld.tif  [0:No data,1,2,3]
     * bau_lm_new_ld.tif  [0,1,2,3]
     * bau_future_ld.tif  [0:No data,1:E0,2:E1,3:E3,4:D2,5:D1,6:C1,7:C2,8:B2,9:B1,10:A1,11;A2]
     * plan_lm_future_ld.tif [0:No data,1,2,3]
     * plan_lu_future_ld.tif [0:No data,1,2,3]
     * plan_future_ld.tif
     * plan_future_lu.tif  lu classes
     * bau_ldn_balance.tif  [0:No data,1,2,3,4]
     * final_ldn_balance.tif [0:No data,1,2,3,4]
     * past_ld_masked.tif [-1,0.1] -32768 no data           
     * + hectares tables
     * @return void
     */
    public function reprocess($project)
    {
      try {
        $error_level = 20;
        $conf = [];
        $userId = '';
        if ( !empty($project->tif_images) )
          $u = json_decode($project->tif_images);
        if ( $u[0] )
          $userId = $u[0]; 
        $ROI = json_decode($project->polygon, true);
        $preprocessingData = json_decode ($project->preprocessing_data ); 
        $conf["user_id"] = $userId; 
        $conf["project_id"] = $project->id; 
        $conf["roi"] = $ROI;
        $conf["evaluations"] = $this->getEvaluations($project);
        $conf["technologies"] = $this->getTechnologies($project);
        $conf["changeuse"] = $this->getChangeUse($project);
        $conf["lu_classes_nr"] = $preprocessingData->lu_classes_nr;
        $content = json_encode($conf);
        $path = $project->id.'/conf.json' ;
        if (Storage::put($path, $content)){
          $error_level = 15;
          shell_exec("python3 gdal/gdalwork.py ".$project->id); 
          
          $error_level = 14;
          $a = array('base_lu.tif','base_ls.tif','base_ld.tif','past_ld_masked.tif','past_ld.tif','bau_lu_newld.tif','bau_lm_newld.tif','bau_future_ld.tif','plan_newlu.tif','plan_lu_future_ld.tif');
          $b = array('plan_lm_future_ld.tif','overall_future_ld.tif','final_ldn_balance.tif', 'bau_ldn_balance.tif'); 
          $prj_files = array_merge($a,$b);
          foreach ( $prj_files as $file ) {
            $fna = substr($file, 0, -4);
            $path = $project->id.'/'.$file;
            if ( file_exists( storage_path( '/app/private/'.$path )) && $userId != '' ){
              $oldfile = ProjectFile::where('path', '=', $path)->first();
              if ( $oldfile ) {
                $oldfile->project_id = $project->id;
                $oldfile->user_id = $userId;
                $oldfile->filename = $file;
                $oldfile->save();
                $preprocessingData->$fna = $oldfile->id;
                $error_level += -1;
              }
              else {
                $created = ProjectFile::create([
                  'project_id' => $project->id,
                  'user_id' => $userId,
                  'path' => $path,
                  'filename' => $file,
                ]);
                if ( $created ) {
                  $preprocessingData->$fna = $created->id;
                  $error_level += -1;
                }
              }    
            }
          }
	  
	  
          if ( file_exists( storage_path( '/app/private/'.$project->id.'/hectares.json' ) ) ){
            $json = Storage::get($project->id.'/hectares.json');
            $hectares = json_decode($json);
            $preprocessingData->base_lu_hectares_per_class = $hectares->base_lu_hectares_per_class;
            $preprocessingData->base_ls_hectares_per_class = $hectares->base_ls_hectares_per_class;
            $preprocessingData->base_ld_hectares_per_class = $hectares->base_ld_hectares_per_class;
            $preprocessingData->past_ld_hectares_per_class = $hectares->past_ld_hectares_per_class;
            $preprocessingData->past_ld_mask_hectares_per_class = $hectares->past_ld_masked_hectares_per_class;
            $preprocessingData->bau_lu_newld_hectares_per_class = $hectares->bau_lu_newld_hectares_per_class;
            $preprocessingData->bau_lm_newld_hectares_per_class = $hectares->bau_lm_newld_hectares_per_class;
            $preprocessingData->bau_future_ld_hectares_per_class = $hectares->bau_future_ld_hectares_per_class;
            $preprocessingData->plan_newlu_hectares_per_class = $hectares->plan_newlu_hectares_per_class;
            $preprocessingData->plan_lu_future_ld_hectares_per_class = $hectares->plan_lu_future_ld_hectares_per_class;
            $preprocessingData->plan_lm_future_ld_hectares_per_class = $hectares->plan_lm_future_ld_hectares_per_class;
            $preprocessingData->overall_future_ld_hectares_per_class = $hectares->overall_future_ld_hectares_per_class;
            $preprocessingData->final_ldn_balance_hectares_per_class = $hectares->final_ldn_balance_hectares_per_class;
            $preprocessingData->bau_ldn_balance_hectares_per_class = $hectares->bau_ldn_balance_hectares_per_class;
            $one = '1'; 
            $minus = '-1';
            if ( !empty($preprocessingData->base_ld_hectares_per_class ) 
              && !empty($preprocessingData->base_ld_hectares_per_class->$one )
              && !empty($preprocessingData->base_ld_hectares_per_class->$minus ) )
                $preprocessingData->initial_roi_ld = $preprocessingData->base_ld_hectares_per_class->$one - $preprocessingData->base_ld_hectares_per_class->$minus;   
            $error_level = 0;
            Log::info('Successfully write hectares', ['project' => $project->id,]); 
          }
          else  
            Log::info('error writing hectares.', [
              'project' => $project->id,
            ]); 
          $project->update([
            'preprocessing_data' => json_encode($preprocessingData),
            'status' => Project::STATUS_PUBLISHED,
            'land_use_suitability_method' => 1,
            'land_management_sustainability_method' => 1,
          ]);
          Log::info('Successfully reprocessed and published project.', [
            'project' => $project->id,
          ]);
        }
        else {
          Log::error('Failed to reprocess project ', [
            'project' => $project->id,
            'Error Level' => 'error conf file',
          ]);
        }
      }   
      catch (Exception $ex) {
        Log::error('Failed to reprocess project ', [
            'project' => $project->id,
            'Error Level' => $error_level,
            'error' => $ex->getMessage(),
        ]);
      }   
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
      Log::info('Collect projects.');       
      $this->projects = Project::where('status', Project::STATUS_PREPROCESSING )
          ->orWhere('status', Project::STATUS_REPROCESSING )
          ->orderBy('id', 'asc')
          ->get();

      if (empty($this->projects)) {
        Log::info('No projects to preprocess, evaluate or elaborate.');
        return;
      }
      foreach ($this->projects as $project) {
        if ( $project->status === Project::STATUS_PREPROCESSING )
          $this->preprocess($project);
        else if ( $project->status === Project::STATUS_REPROCESSING )
          $this->reprocess($project);
      }     
    }       
  
    /**
     * Get Default Base Layers from geonode
     * SDG 1.5.3
     * Land Cover   ('ld_xxx_yyyy')
     * Land Suitability 
     * Land Use Based new LD ('lu_based_newld_xxx')  
     * @return void
     */
    public function getDefaultBaseLayers ( $bbox ) 
    {
      $url = $this->geonodeapi;
      $url = $url . 'datasets?extent='.$bbox[0].','.$bbox[1].','.$bbox[2].','.$bbox[3].'&page_size=30&format=json';
      $baseLayers = [
        "base_ls" => '',
        "base_ld" => '',
        "base_lu" => '',
      ];
      $year = 0;
      $response = Http::timeout($this->requestTimeout)
          ->asJson()
          ->get ($url);
      if ($response->ok()) {
        $layers = json_decode($response, true); /// geonode layers
        $total_count = 0;
        if (!empty($layers['datasets']))
        {
          foreach ($layers['datasets'] as $ds) {
            if ($ds['title'] === 'ls_world_pasture_rainfed_crops')
              $baseLayers["base_ls"] = $ds['alternate'] ;
            
            if ( str_starts_with ( $ds['title'] , 'lc_med_') )
            {
              $l_year = (int)(substr ( $ds['title'], -4 ));
              if ( $l_year > $year ) {
                $year = $l_year;
                $baseLayers['base_lu'] = $ds['alternate'] ;
              }  
            }
            
            if ( $ds['title'] === 'sdg1531_med') 
              $baseLayers['base_ld'] = $ds['alternate'] ;
          }
        }      
      }
      return $baseLayers;
    }        

    public function getHectares ( $geoLayer, $bbox, $polygon, $plgarea) 
    {
      try {
        $arrayData = [];
        $queryXMLBody = '<?xml version="1.0" encoding="UTF-8"?><wps:Execute version="1.0.0" service="WPS" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://www.opengis.net/wps/1.0.0" xmlns:wfs="http://www.opengis.net/wfs" xmlns:wps="http://www.opengis.net/wps/1.0.0" xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:gml="http://www.opengis.net/gml" xmlns:ogc="http://www.opengis.net/ogc" xmlns:wcs="http://www.opengis.net/wcs/1.1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 http://schemas.opengis.net/wps/1.0.0/wpsAll.xsd">
        <ows:Identifier>gs:RasterZonalStatistics</ows:Identifier>
        <wps:DataInputs>
          <wps:Input>
          <ows:Identifier>data</ows:Identifier>
          <wps:Reference mimeType="image/tiff" xlink:href="http://geoserver/wcs" method="POST">
                <wps:Body>
                  <wcs:GetCoverage service="WCS" version="1.1.1">
                    <ows:Identifier>' . $geoLayer . '</ows:Identifier>
                    <wcs:DomainSubset>
                      <ows:BoundingBox crs="http://www.opengis.net/gml/srs/epsg.xml#4326">
                        <ows:LowerCorner>' . $bbox[0] . ' ' . $bbox[1] .'</ows:LowerCorner>
                        <ows:UpperCorner>' . $bbox[2] . ' ' . $bbox[3] .'</ows:UpperCorner>
                      </ows:BoundingBox>
                    </wcs:DomainSubset>
                    <wcs:Output format="image/tiff"/>
                  </wcs:GetCoverage>
                </wps:Body>
          </wps:Reference>
          </wps:Input>
          <wps:Input>
          <ows:Identifier>zones</ows:Identifier>
          <wps:Data><wps:ComplexData mimeType="application/json"><![CDATA[' . json_encode($polygon) . ' ]]>
          </wps:ComplexData></wps:Data>
          </wps:Input>
          <wps:Input>
          <ows:Identifier>classification</ows:Identifier>
          <wps:Reference mimeType="image/tiff" xlink:href="http://geoserver/wcs" method="POST">
                <wps:Body>
                  <wcs:GetCoverage service="WCS" version="1.1.1">
                    <ows:Identifier>' . $geoLayer . '</ows:Identifier>
                    <wcs:DomainSubset>
                      <ows:BoundingBox crs="http://www.opengis.net/gml/srs/epsg.xml#4326">
                        <ows:LowerCorner>' . $bbox[0] . ' ' . $bbox[1] .'</ows:LowerCorner>
                        <ows:UpperCorner>' . $bbox[2] . ' ' . $bbox[3] .'</ows:UpperCorner>
                      </ows:BoundingBox>
                    </wcs:DomainSubset>
                    <wcs:Output format="image/tiff"/>
                  </wcs:GetCoverage>
                </wps:Body>
          </wps:Reference>
          </wps:Input>
        </wps:DataInputs>
        <wps:ResponseForm>
          <wps:RawDataOutput mimeType="application/json">
            <ows:Identifier>statistics</ows:Identifier>
          </wps:RawDataOutput>
        </wps:ResponseForm>
        </wps:Execute>';

        $response = Http::timeout($this->requestTimeout)
            //->withHeaders(['Content-type' => 'application/x-www-form-urlencoded'])
            //->withToken($this->token)
            ->asJson()
            ->withBody($queryXMLBody, 'text/xml; charset=UTF8')
            ->post($this->geowps)
            ->throw();
        if ($response->ok()) {
            $LC_statistic = json_decode($response, true); /// FeatureCollection
            $total_count = 0;
            
            foreach ($LC_statistic["features"] as $feature) {
              if (!empty($feature['properties'])) {
                $cl = (string)$feature['properties']['classification'];
                $val = $feature['properties']['count'];
                if ( array_key_exists($cl, $arrayData ) )
                  $arrayData[$cl] += $val;
                else {
                  $arrayData[$cl] = $val;
                }
                $total_count += $feature['properties']['count'];
              }
            }
            foreach ($arrayData as $classf => $value) {
              $arrayData[$classf] = ( $plgarea ) * $value / $total_count;
            }
            return $arrayData;        
        }
        else  {
          Log::error('Failed to calculate hectares '); 
        }
      } catch (Exception $ex) {
          Log::error('Failed to calculate hectares ', [
              'error' => $ex->getMessage(),
          ]);
      }
      return [];
      
    }
  
    public function cropAndSaveTiff ( $geoLayer, $bbox, $projectId, $name) 
    {
      try {
        $subset = '&subset=Lat('.$bbox[1].','.$bbox[3].')&subset=Long('.$bbox[0].','.$bbox[2].')';
        $url = $this->geowcs . "&coverageId=" . $geoLayer . $subset;
        
        $content = file_get_contents($url);
        if ( $content ) {
          $path = $projectId . '/' . $name . '.tif' ;
          if (Storage::put($path, $content)) {
            return true;
          }
        }    
      } catch (Exception $ex) {
        Log::error('Failed to crop file ', [
          'name' => $name,
          'error' => $ex->getMessage(),
        ]);
      }
      return false;
    }

    public function getEvaluations ( $project ) 
    {
      $result = [];
      try {
        $focusAreas = $project->focusAreas();
        $focusAreaIds = $focusAreas->pluck('id')->toArray();
        $result = array();
        foreach ( $focusAreaIds as $focusAreaId )
        {
          $evaluations = ProjectFocusAreaEvaluation::where('project_focus_area_id',$focusAreaId)->get();
          $ev = array();
          foreach ( $evaluations as $evaluation )
          {
            if ( !$evaluation->for_slm_proposal )
            {
              $value = 0;
              if (str_contains($evaluation->anticipated_ld_impact, "mproved"))
                $value = 1;
              if (str_contains($evaluation->anticipated_ld_impact, "educed"))
                $value = -1;   
              $ev[] = [
                "lu"  => $evaluation->lu_class, 
                "ld" => $value,
              ];
            }  
          }
          $file_id = ProjectFocusArea::find($focusAreaId)->file_id;
          $path = ProjectFile::find($file_id)->path;
          $result [] = [
            'code' => $focusAreaId,
            'values' => $ev,
            'polygon' => $path,
          ]; 
        }   
      } catch (Exception $ex) {
        Log::error('Failed to get evaluations ', [
            'project' => $project->id, 
            'error' => $ex->getMessage(),
        ]);
      }
      return $result;
    }

    public function getChangeUse ( $project ) 
    {
      $result = [];
      try {
        $scenarios = $project->scenarios()->get();
        $matrix = json_decode($project->transition_impact_matrix_data);
        foreach ( $scenarios as $scenario ) 
        {
          $content = json_decode($scenario->content);
          $landTypes = $content->landTypes;
          foreach ( $landTypes as $lt ) 
          {
            $from = $lt->landId;
            foreach ( $lt->breakDown as $entry )
            {
              if ( !empty($entry->landCoverage) && !empty($entry->landCoverage->file_id) ) 
              {
                $to = $entry->landId;
                $file_id = $entry->landCoverage->file_id;
                $ld = 0; 
                foreach ( $matrix as $row )
                {
                  foreach ( $row->row as $column )
                  {
                    if ( $column->id == $to && $row->id == $from )
                    {
                      if ( $column->value == '-' )
                        $ld = -1;
                      if ( $column->value == '+' )
                        $ld = 1;
                    }
                  }
                }
                $result[] = [
                  "code" => $file_id,
                  "polygon" => $path = ProjectFile::find($file_id)->path,
                  "from" => $from,
                  "to" => $to,
                  "ld" => $ld,
                ];      
              }
            }
          }
        } 
      }
      catch (Exception $ex) {
        Log::error('Failed to reprocess project ', [
            'project' => $project->id,
            'Error Level' => 'getchangeuse',
            'error' => $ex->getMessage(),
        ]);
      } 
      return $result;
    }

    public function getTechnologies ( $project ) 
    {
      $result = [];
      try {
        $technologies = $project->technologies();
        $techIds = $technologies->pluck('id')->toArray();
        $focusAreas = $project->focusAreas();
        $focusAreaIds = $focusAreas->pluck('id')->toArray();
        $result = array();
        foreach ( $focusAreaIds as $focusAreaId )
        {
          $evaluations = ProjectFocusAreaEvaluation::where('project_focus_area_id',$focusAreaId)->get();
          $ev = array();
          foreach ( $evaluations as $evaluation )
          {
            if ( $evaluation->for_slm_proposal )
            {
              $value = 0;
              if (str_contains($evaluation->anticipated_ld_impact, "mproved"))
                $value = 1;
              if (str_contains($evaluation->anticipated_ld_impact, "educed"))
                $value = -1;   
              $ev[] = [
                "lu"  => $evaluation->lu_class, 
                "ld" => $value,
              ];
              
            }
          }    
          $file_id = ProjectFocusArea::find($focusAreaId)->file_id;
          $path = ProjectFile::find($file_id)->path;
          $result [] = [
                'code' => $focusAreaId,
                'values' => $ev,
                'polygon' => $path,
          ];
        }      
      } catch (Exception $ex) {
        Log::error('Failed to get tech evaluations ', [
          'project' => $project->id, 
          'error' => $ex->getMessage(),
        ]);
      }
      return $result;
    }
}
