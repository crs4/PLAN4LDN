<?php

namespace App\Utilities\PLAN4LDN;

use Http;
use Log;
use Exception;
use App\Models\Project;
use App\Models\ProjectFile;
use Illuminate\Support\Facades\Storage;
 

class LandCoverClassExtractor
{
    /**
     * The project to process.
     */
    protected $project_id;

    /**
     * For what ROI (polygon) do we need the classes 
     */
    protected $shape_id;

    /**
     * Total area of the ROI (polygon) do we need the classes 
     */
    protected $area;


    /**
     * The token to use for the request.
     */
    protected $token;

    /**
     * The maximum time in seconds to allow before the request times out.
     */
    protected $requestTimeout;

    public function __construct(Project $project, $shape_id = null, $area = 0)
    {
        $this->project_id = $project->id;
        $this->area = $area;
        if ( $shape_id != null ) 
        {
            $file = Storage::get(ProjectFile::find($shape_id)->path);
            if ($file !== null) {
                $this->shape_id = $shape_id;
            }
        }
        if ( $this->area === 0 || empty($this->project_id) || empty($this->shape_id)) {
            throw new Exception('You can\'t use LandCoverClassExtractor without a valid project or
                undefined ROI');
        }
        //$this->token = (new AWSTokenGenerator())->getToken();
        $this->requestTimeout = 120; // in seconds.
    }

     

    public function extractClasses()
    {
        try {
            $path = ProjectFile::find($this->shape_id)->path;
            
            $result = shell_exec("python3 ../gdal/classextractor.py " . $this->project_id . " " . $this->shape_id . " " . $this->area . " " . $path);
            
            $data = json_decode($result,true);
            return $data;
            
        } catch (Exception $ex) {
            throw $ex;
        }
        return [];
    }

    

}

