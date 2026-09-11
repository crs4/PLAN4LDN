<?php

use App\Models\User;
use App\Models\Project;
use App\Models\ProjectInvite;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class InitialSchema extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('indicators', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->boolean('transferable')->default(false);
            $table->foreignId('parent_indicator_id')->nullable()->default(null);
            $table->timestamps();
        });

        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('acronym')->nullable();
            $table->json('polygon')->nullable();
            $table->text('description')->nullable();
            $table->string('country_iso_code_3')->nullable();
            $table->string('administrative_level')->nullable();
            $table->boolean('uses_default_lu_classification')->default(true);
            $table->json('lu_classes')->nullable();
            $table->json('tif_images')->nullable();
            $table->string('step')->nullable();
            $table->foreignId('custom_land_degradation_map_file_id')->nullable();
            $table->foreignId('roi_file_id')->nullable();
            $table->string('status')->default(Project::STATUS_DRAFT);
            $table->timestamps();
        });

        Schema::create('project_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id');
            $table->foreignId('user_id');
            $table->string('role')->default(User::ROLE_USER);
            $table->timestamps();

            $table->unique(['project_id', 'user_id']);
        });

        Schema::create('project_invite', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id');
            $table->foreignId('user_id');
            $table->string('status')->default(ProjectInvite::STATUS_PENDING);
            $table->timestamps();

            $table->unique(['project_id', 'user_id']);
        });

        Schema::create('project_indicator', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id');
            $table->foreignId('indicator_id');
            $table->timestamps();

            $table->unique(['project_id', 'indicator_id']);
        });

        Schema::create('project_land_use_matrix', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id');
            $table->timestamps();
        });

        Schema::create('project_land_use_matrix_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_land_use_matrix_id');
            $table->string('row');
            $table->string('column');
            $table->string('value');
            $table->timestamps();

            $table->unique(
                ['project_land_use_matrix_id', 'row', 'column', 'value'],
                'uq_project_land_use_matrix_values'
            );
        });

        Schema::create('project_scenario', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id');
            $table->string('name');
            $table->string('from_year');
            $table->string('to_year');
            $table->json('content')->nullable();

            $table->timestamps();
        });

        Schema::create('project_wocat_slm_technology', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id');
            $table->foreignId('user_id');
            $table->string('technology_id');
            $table->timestamps();

            $table->unique(
                ['project_id', 'user_id', 'technology_id'],
                'project_wocat_slm_technology_unique'
            );
        });

        Schema::create('project_file', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->nullable();
            $table->foreignId('user_id');
            $table->string('filename');
            $table->string('path');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('project_file');
        Schema::dropIfExists('project_wocat_slm_technology');
        Schema::dropIfExists('project_scenario');
        Schema::dropIfExists('project_land_use_matrix_values');
        Schema::dropIfExists('project_land_use_matrix');
        Schema::dropIfExists('project_indicator');
        Schema::dropIfExists('project_invite');
        Schema::dropIfExists('project_user');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('projects');
        Schema::dropIfExists('users');
        Schema::dropIfExists('indicators');
        Schema::dropIfExists('cache');
        Schema::dropIfExists('cache_locks');
    }
}
