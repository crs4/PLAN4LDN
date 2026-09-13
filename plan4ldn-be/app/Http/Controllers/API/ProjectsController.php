<?php

namespace App\Http\Controllers\API;

use Http;
use Log;
use App\Models\Project;
use App\Models\ProjectWocatTechnology;
use App\Http\Controllers\Controller;
use App\Http\Resources\v1\ProjectResource;
use App\Http\Requests\Projects\ShowProjectRequest;
use App\Http\Requests\Projects\ListProjectsRequest;
use App\Http\Requests\Projects\CreateProjectRequest;
use App\Http\Requests\Projects\DeleteProjectRequest;
use App\Http\Requests\Projects\UpdateProjectRequest;
use App\Http\Requests\Projects\FinaliseProjectRequest;
use App\Http\Resources\v1\ProjectWocatTechnologyResource;
use App\Http\Requests\Projects\ProposeProjectTechnologyRequest;
use App\Http\Requests\Projects\ListProjectTechnologiesRequest;
use App\Http\Requests\Projects\VoteProjectTechnologyRequest;
use App\Http\Requests\Projects\RejectProjectTechnologyRequest;
use App\Models\ProjectFocusAreaEvaluation;
use App\Models\ProjectWocatTechnologyVote;

class ProjectsController extends Controller
{
    protected $cacheTtl;
    protected $geoserviceBaseURI;
    protected $requestTimeout; 
    
    public function __construct()
    {
        $this->siteurl = env('SITE_URL', 'http://localhost/'); 
        $this->geoserviceBaseURI = $this->siteurl . 'geoserver/geonode/';
	    $this->requestTimeout = env('REQUEST_TIMEOUT_SECONDS', 30);
    }

    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(ListProjectsRequest $request)
    {
        $projects = $request->user()->projects()->get();

        return ProjectResource::collection($projects);
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(CreateProjectRequest $request)
    {
        
        $project = Project::create(
            $request->only(
                'title',
                'acronym',
                'description',
            ),
        );

        $project->setOwner($request->user()->id);

        return new ProjectResource($project);
    }

    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show(ShowProjectRequest $request, Project $project)
    {
        $project = $request->user()->projects()->with('users')->findOrFail($project->id);

        return new ProjectResource($project);
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function update(UpdateProjectRequest $request, Project $project)
    {
        // Check if the project exists.
        $foundProject = $request->user()->projects()->findOrFail($project->id);

        // Check if the project is in a DRAFT state.
        if ($foundProject->status === Project::STATUS_DRAFT) {
            $foundProject->update($request->only(
                'title',
                'acronym',
                'description',
                'country_iso_code_3',
                'administrative_level',
                'uses_default_lu_classification',
                'step',
                'custom_land_degradation_map_file_id',
                'roi_file_id',
                'land_use_map_file_id',
            ));

            if (!empty($request->lu_classes)) {
                $foundProject->lu_classes = json_encode($request->lu_classes);
                $foundProject->save();
            }

            // If the user has sent a polygon.
            if (!empty($request->polygon)) {
                $roi = $request->polygon;
                $foundProject->setPolygon($roi);
                if (empty($foundProject->country_iso_code_3)) 
                try {
                    // It checks default data   
                    $geoserverwfs = $this->geoserviceBaseURI . "geoserver/geonode/ows?service=WFS&version=1.1.0&request=GetFeature&outputFormat=application%2Fjson&typeName=geonode%3A";
                    //$bbox = "&BBOX=".$roi['bbox'][0].",".$roi['bbox'][1].",".$roi['bbox'][2].",".$roi['bbox'][3];
                    $CQL = '&CQL_FILTER=WITHIN(geometry,'.str_replace(" ", "%20", $roi->wkt ).')'; 
                    $features = [];	 
                    $response = Http::timeout($this->requestTimeout)
                        ->acceptJson()
                        ->asJson()
                        ->get ( $geoserverwfs."countries".$CQL );
                    $data = $response->json();
                    if ( $data && $data['features'] && $data['features'][0] )                    
                    {
                        $foundProject->country_iso_code_3 = $data['features'][0]['properties']['gid_0'];
                        $foundProject->save();
                    } 
                } catch (\Exception $ex) {
                    Log::error('An error occured while trying to searc country iso3 code : ' . $foundProject->id . ', err: ' . $ex->getMessage());
                }
            }
        }

        if (   $foundProject->status != Project::STATUS_DRAFT
            && $foundProject->status !== Project::STATUS_PREPROCESSING ) {
            $foundProject->update($request->only(
                'status',
                'step',
                'has_edited_transition_matrix_data',
                'land_use_suitability_method',
                'land_management_sustainability_method'
            ));

            if (!empty($request->transition_impact_matrix_data)) {
                $foundProject->update([
                    'transition_impact_matrix_data' => json_encode($request->transition_impact_matrix_data)
                ]);
            }
        }

        return new ProjectResource($foundProject);
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function finalise(FinaliseProjectRequest $request, Project $project)
    {
        // Check if the project exists.
        $foundProject = $request->user()->projects()->findOrFail($project->id);

        // Check if the project is in a DRAFT state.
        if ($foundProject->status !== Project::STATUS_DRAFT) {
            return response()->json(['errors' => [
                'error' => 'The project is not in ' . Project::STATUS_DRAFT . ' state and cannot be finalised.'
            ]], 422);
        }

        $foundProject->update(['status' => Project::STATUS_PREPROCESSING]);
        $tif_images = [$request->user()->id];
        $foundProject->update(['tif_images' => json_encode( $tif_images ) ]); 
        return new ProjectResource($foundProject);
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy(DeleteProjectRequest $request, Project $project)
    {
        $foundProject = $request->user()->projects()->findOrFail($project->id);

        if (!$foundProject->delete()) {
            return response()->json(['errors' => [
                'error' => 'Failed to delete project.'
            ]], 422);
        }

        return response()->json(null, 204);
    }

    /**
     * Get the IDs of the WOCAT technologies of a project.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function getWocatTechnologies(ListProjectTechnologiesRequest $request, Project $project)
    {
        $technologies = $project->technologies()
                                ->with(['user', 'focusArea', 'evaluation']);

        if (!empty($request->status)) {
            $technologies = $technologies->where('status', $request->status);
        }

        if (!empty($request->project_focus_area_id)) {
            $technologies = $technologies->where('project_focus_area_id', $request->project_focus_area_id);
        }

        if (!empty($request->lu_class)) {
            $technologies = $technologies->where('lu_class', $request->lu_class);
        }

        $technologies = $technologies->get();

        return ProjectWocatTechnologyResource::collection($technologies);
    }

    /**
     * Propose WOCAT technology of a project for the specified focus area and lu class.
     */
    public function proposeWocatTechnology(ProposeProjectTechnologyRequest $request, Project $project)
    {
        $foundProject = $request->user()->projects()->findOrFail($project->id);

        $foundProposal = $foundProject->technologies()
                                      ->where('project_focus_area_id', $request->project_focus_area_id)
                                      ->where('lu_class', $request->lu_class)
                                      ->first();

        if ($foundProposal) {
            return response()->json(['errors' => [
                'error' => 'There\'s already a proposal for this focus area & land use.'
            ]], 422);
        }
        $status = ProjectWocatTechnology::STATUS_FINAL;
        
        
        $proposal = ProjectWocatTechnology::create([
            'user_id' => $request->user()->id,
            'project_id' => $project->id,
            'project_focus_area_id' => $request->project_focus_area_id,
            'lu_class' => $request->lu_class,
            'status' => $status,
            'technology_id' => $request->technology_id,
        ]);
        
        // Create the evaluation for this proposal
        ProjectFocusAreaEvaluation::create([
            'user_id' => $request->user()->id,
            'project_focus_area_id' => $request->project_focus_area_id,
            'lu_class' => $request->lu_class,
            'soil_value' => $request->soil_value,
            'water_value' => $request->water_value,
            'biodiversity_value' => $request->biodiversity_value,
            'climate_change_resilience_value' => $request->climate_change_resilience_value,
            'production_value' => $request->production_value,
            'economic_viability_value' => $request->economic_viability_value,
            'food_security_value' => $request->food_security_value,
            'equality_of_opportunity_value' => $request->equality_of_opportunity_value,
            'for_slm_proposal' => $proposal->id,
        ]);

        return response()->json($proposal, 201);
    }
    
    /**
     * Delete a WOCAT technology of a project
     */
    public function rejectWocatTechnology(RejectProjectTechnologyRequest $request, Project $project)
    {
        $foundProject = $request->user()->projects()->findOrFail($project->id);

        $foundProposal = $foundProject->technologies()
                                      ->with('evaluation')
                                      ->find($request->project_wocat_slm_technology_id);

        if (!$foundProposal) {
            return response()->json(['errors' => [
                'error' => 'Proposal Not Found.',
            ]], 422);
        }

        // We delete the proposal even if the rejection comes from 1 person:
        
        // 1. delete the relevant evaluation
        if ($foundProposal->evaluation) {
            $foundProposal->evaluation->delete();
        }

        // 2. delete the proposal
        $foundProposal->delete();
        
        return response()->json(null, 204);
    }

    /**
     * Vote for a WOCAT technology of a project
     */
    public function voteWocatTechnology(VoteProjectTechnologyRequest $request, Project $project)
    {
        $foundProject = $request->user()->projects()->findOrFail($project->id);

        $foundProposal = $foundProject->technologies()
                                      ->with('votes')
                                      ->find($request->project_wocat_slm_technology_id);

        if (!$foundProposal || $foundProposal->status === ProjectWocatTechnology::STATUS_FINAL) {
            return response()->json(['errors' => [
                'error' => 'Invalid proposal to vote for.'
            ]], 422);
        }

        $foundVote = ProjectWocatTechnologyVote::where('user_id', $request->user()->id)
            ->where('project_wocat_slm_technology_id', $request->project_wocat_slm_technology_id)
            ->first();

        if ($foundVote) {
            return response()->json(['errors' => [
                'error' => 'You have already voted for this WOCAT technology.'
            ]], 422);
        }

        ProjectWocatTechnologyVote::create([
            'user_id' => $request->user()->id,
            'project_wocat_slm_technology_id' => $request->project_wocat_slm_technology_id
        ]);

        // -1 because the person that proposed has already voted for it
        if (($foundProject->users()->count() - 1) === $foundProposal->votes()->count()) {
            // All members voted for this proposal so make it final
            $foundProposal->status = ProjectWocatTechnology::STATUS_FINAL;
            $foundProposal->save();

            // and delete the votes for this proposal since it's now final
            $foundProposal->votes()->delete();
        }

        return new ProjectWocatTechnologyResource($foundProposal);
    }
}
