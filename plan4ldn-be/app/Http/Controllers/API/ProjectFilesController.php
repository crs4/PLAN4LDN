<?php

namespace App\Http\Controllers\API;

use Storage;
use Log;
use App\Models\Project;
use App\Models\ProjectFile;
use App\Http\Controllers\Controller;
use App\Http\Resources\v1\ProjectFileResource;
use App\Http\Requests\ProjectFiles\ShowProjectFileRequest;
use App\Http\Requests\ProjectFiles\ListProjectFilesRequest;
use App\Http\Requests\ProjectFiles\CreateProjectFileRequest;
use App\Http\Requests\ProjectFiles\DeleteProjectFileRequest;
use App\Http\Requests\ProjectFiles\ContentProjectFileRequest;

class ProjectFilesController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(ListProjectFilesRequest $request, Project $project)
    {
        $files = $project->files()->get();

        return ProjectFileResource::collection($files);
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(CreateProjectFileRequest $request, Project $project)
    {
        $file = $request->file('file');
        $filename = $file->getClientOriginalName();
        $extension = $file->getClientOriginalExtension();
        $validExtensions = ['geotiff', 'geotif', 'tiff', 'tif', 'geojson', 'shp'];
        $name = $file->hashName($project->id);
        if (!in_array($extension, $validExtensions)) {
            return response()->json([
                'errors' => [
                    'error' => 'Invalid file extension. Τhe file must be a file of type: geotiff, geotif, tiff, tif, geojson, shp.',
                ],
            ], 422);
        }
        $created = null;
        $content = file_get_contents($file);
        if ( $extension == 'geojson' ) {
            if ( $request->get("newjson") ) 
                $content = $request->get("newjson");
        }    
        if (Storage::put($name, $content)) {
            $created = ProjectFile::create([
                'project_id' => $project->id,
                'user_id' => $request->user()->id,
                'path' => $name,
                'filename' => $filename,
            ]);
        }
        return new ProjectFileResource($created);
    }

    /**
     * Get Content.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function content( ContentProjectFileRequest $request, Project $project, ProjectFile $file)
    {
        $file = $project->files()->find($file->id);
        if ( empty($file) )
            return '';
        if ( str_ends_with($file->filename, 'json')){ 
             $content = Storage::json($file->path);
        }
        else $content = Storage::get($file->path);
	    return $content;
    }

    
    
    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show(ShowProjectFileRequest $request, Project $project, ProjectFile $file)
    {
        $file = $project->files()->find($file->id);
        return new ProjectFileResource($file);
    }
 
    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy(DeleteProjectFileRequest $request, Project $project, ProjectFile $file)
    {
        $isFileDeleted = Storage::delete('/'.$file->path);
        if ($isFileDeleted) {
            $isDbEntryDeleted = $file->delete();
            if ($isDbEntryDeleted) {
                return response()->json([], 204);
            }
        }
        return response()->json(['errors' => [
            'error' => 'Something went wrong'
        ]], 400);
    }


}
