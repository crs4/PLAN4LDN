<?php

namespace App\Http\Controllers\API;

use Log;
use App\Models\Project;
use App\Models\ProjectFocusArea;
use App\Models\ProjectFile;
use App\Http\Controllers\Controller;
use App\Utilities\PLAN4LDN\LandCoverClassExtractor;
use Illuminate\Support\Facades\Storage;
use App\Http\Resources\v1\ProjectFocusAreaResource;
use App\Http\Resources\v1\ProjectFocusAreaPolygonsResource;
use App\Http\Requests\ProjectFocusAreas\ShowProjectFocusAreaRequest;
use App\Http\Requests\ProjectFocusAreas\ListProjectFocusAreasRequest;
use App\Http\Requests\ProjectFocusAreas\ListProjectFocusAreasPolygonsRequest;
use App\Http\Requests\ProjectFocusAreas\CreateProjectFocusAreaRequest;
use App\Http\Requests\ProjectFocusAreas\DeleteProjectFocusAreaRequest;

class ProjectFocusAreasController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(ListProjectFocusAreasRequest $request, Project $project)
    {
        $focusAreas = $project->focusAreas()->get();

        return ProjectFocusAreaResource::collection($focusAreas);
    }

    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function polygons(ListProjectFocusAreasPolygonsRequest $request, Project $project)
    {
        $focusAreas = $project->focusAreas()->get();
        foreach ($focusAreas as &$fa) { 
            $fa['geojson'] = Storage::get(ProjectFile::find($fa['file_id'])->path);
        }
        return ProjectFocusAreaPolygonsResource::collection($focusAreas);
    }
    

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(CreateProjectFocusAreaRequest $request, Project $project)
    {
        $data = $request->only('name', 'file_id');
        $faarea = $request->area;
        try {
            $result = (new LandCoverClassExtractor($project, $data['file_id'], $faarea))->extractClasses();
            if ( $result === null || count($result) === 0) {
                Storage::delete(ProjectFile::find($data['file_id'])->path);
                return response()->json([
                    'errors' => [
                        'error' => 'Could not find any land use types in the polygon provided.',
                    ]
                ], 422);
            }
            $data['extracted_classes'] = json_encode($result);
        } catch (\Exception $ex) {
            Log::error('During creation of focus area with file_id: ' . $data['file_id'] . ' an error
                occured while trying to extract land cover classses: ' . $ex->getMessage());
            return response()->json([
                'errors' => [
                    'error' => 'Could not find any land use types in the polygon provided.',
                ]], 500);
        }

        $data['user_id'] = $request->user()->id;

        $focusArea = $project->focusAreas()->create($data);

        return new ProjectFocusAreaResource($focusArea);
    }

    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show(
        ShowProjectFocusAreaRequest $request,
        Project $project,
        ProjectFocusArea $focusArea
    ) {
        return new ProjectFocusAreaResource($focusArea);
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy(
        DeleteProjectFocusAreaRequest $request,
        Project $project,
        ProjectFocusArea $focusArea
    ) {
        Storage::delete($focusArea->file->path);
        if ($focusArea->file()->delete() && $focusArea->delete()) {
            return response()->json(null, 204);
        }

        return response()->json(null, 500);
    }
}
