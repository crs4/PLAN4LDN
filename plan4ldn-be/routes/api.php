<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\API\UserController;
use App\Http\Controllers\API\InvitesController;
use App\Http\Controllers\API\ProjectsController;
use App\Http\Controllers\API\IndicatorsController;
use App\Http\Controllers\API\UserAvatarController;
use App\Http\Controllers\API\ProjectFilesController;
use App\Http\Controllers\API\UserPasswordController;
use App\Http\Controllers\API\ProjectInvitesController;
use App\Http\Controllers\API\ProjectScenariosController;
use App\Http\Controllers\API\Integrations\PALN4LDNController;
use App\Http\Controllers\API\ProjectFocusAreasController;
use App\Http\Controllers\API\ProjectIndicatorsController;
use App\Http\Controllers\API\ProjectLandUseMatrixController;
use App\Http\Controllers\API\ProjectFocusAreaEvaluationsController;
 

    Route::post('/tokens/create', function (Request $request) {
        $token = $request->user()->createToken($request->token_name, ['*'], now()->addDay());
 
        return ['token' => $token->plainTextToken];
    });

    // Authenticate a user.
    Route::post('/login', [AuthController::class, 'login'])->name('login');

    // Register a new user.
    Route::post('/register', [UserController::class, 'store']);

    Route::middleware('auth:sanctum')->group(function () {
    // User management.
        Route::get('/user', [AuthController::class, 'getUser']);
        Route::put('/user', [AuthController::class, 'updateUser']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::apiResource('users', UserController::class)->only(['index', 'show', 'update']);
        Route::post('/users/{user}/avatar', [UserAvatarController::class, 'update']);
        Route::delete('/users/{user}/avatar', [UserAvatarController::class, 'destroy']);
        Route::put('/users/{user}/password', [UserPasswordController::class, 'update']);
    // Project land use matrix.
        Route::get('/projects/{project}/land_use_matrix', [
            ProjectLandUseMatrixController::class, 'index'
        ]);
        Route::put('/projects/{project}/land_use_matrix', [
            ProjectLandUseMatrixController::class, 'update'
        ]);
    // Finalise project.
        Route::post('/projects/{project}/finalise', [ProjectsController::class, 'finalise']);
    // Calculate polygon intersecting area in hectares.
        Route::post('/projects/{project}/polygons/intersecting_area', [
            PALN4LDNController::class, 'getIntersectingArea'
        ])->name('projects.polygons.intersecting_area');
    // Land cover.
        Route::post('/projects/{project}/land_cover_classes', [
            PALN4LDNController::class, 'getLandCoverClasses'
        ])->name('projects.land_cover_classes');
    // Project proposed or final wocat technologies.
        Route::get('/projects/{project}/wocat_technologies', [
            ProjectsController::class, 'getWocatTechnologies'
        ])->name('projects.wocat_technologies');
    // Propose a WOCAT technology.
        Route::post('/projects/{project}/propose_wocat_technology', [
            ProjectsController::class, 'proposeWocatTechnology'
        ])->name('projects.propose_wocat_technology');
    // Vote for a WOCAT technology.
        Route::post('/projects/{project}/vote_wocat_technology', [
            ProjectsController::class, 'voteWocatTechnology'
        ])->name('projects.vote_wocat_technology');
    // Reject a WOCAT technology.
        Route::post('/projects/{project}/reject_wocat_technology', [
            ProjectsController::class, 'rejectWocatTechnology'
        ])->name('projects.reject_wocat_technology');
    // Get the LDN Map for a project based on input polygons
        Route::post('/projects/{project}/prepare_ldn_map', [
            PALN4LDNController::class, 'prepareLDNMap'
        ])->name('projects.prepare_ldn_map');
    // Project management.
        Route::apiResource('projects', ProjectsController::class);
        // Project indicators.
        Route::get('/projects/{project}/indicators', [ProjectIndicatorsController::class, 'index']);
        Route::put('/projects/{project}/indicators', [ProjectIndicatorsController::class, 'update']);
        // Project scenarios management.
        Route::delete('/projects/{project}/scenarios', [
            ProjectScenariosController::class, 'clearScenarios'
        ]);
        Route::apiResource('projects.scenarios', ProjectScenariosController::class);
        // Project focus areas and  scenario polygons.
        Route::apiResource('projects.focus_areas', ProjectFocusAreasController::class)
            ->only(['index','store','destroy'])
            ->parameters(['focus_areas' => 'focusArea']);
        Route::get('/projects/{project}/focus_areas_polygons', [
            ProjectFocusAreasController::class, 'polygons'
            ])->name('project.focus_areas.polygons');
        Route::get('/projects/{project}/scenario_polygons', [
            ProjectScenariosController::class, 'polygons'
        ])->name('project.scenario.polygons');
        Route::apiResource('projects.focus_area_evaluations', ProjectFocusAreaEvaluationsController::class)
            ->only(['index', 'store', 'show', 'update'])
            ->parameters(['focus_area_evaluations' => 'focusAreaEvaluation']);
        // Project invites.
        Route::apiResource('projects.invites', ProjectInvitesController::class)
            ->only(['store', 'destroy']);
        Route::apiResource('invites', InvitesController::class)
            ->only(['index', 'update']);
        // Project files
        Route::apiResource('projects.files', ProjectFilesController::class);
        Route::get('/projects/{project}/files/{file}/content', [
            ProjectFilesController::class, 'content'
        ])->name('project.files.content');
        // Indicators.
        Route::apiResource('indicators', IndicatorsController::class)->only(['index', 'store']);
        // Admin level area polygons.
        Route::get('/polygons/admin_level_areas', [
            PALN4LDNController::class, 'getAdminLevelAreaPolygons'
        ])->name('polygons.admin_level_areas');
        // Polygons by coordinates.
        Route::post('/polygons/coordinates', [
            PALN4LDNController::class, 'getPolygonsByCoordinates'
        ])->name('polygons.coordinates');                
        // Polygons by box.
        Route::post('/polygons/box', [
            PALN4LDNController::class, 'getPolygonsByBox'
        ])->name('polygons.box');
        Route::get('/geotiff/box', [
            PALN4LDNController::class,'getGeotiffByBox'
        ])->name('geotiff.box');
        Route::post('/geotiff/crop', [
            PALN4LDNController::class, 'cropGeotiff'
        ])->name('geotiff.crop');
        // Wocat technologies
        Route::get('/wocat_technologies', [PALN4LDNController::class, 'getWocatTechnologies'])
            ->name('wocat_technologies');
        Route::get('/wocat_technologies/{techId}', [PALN4LDNController::class, 'getWocatTechnology'])
            ->name('wocat_technologies.show');
        
    });
