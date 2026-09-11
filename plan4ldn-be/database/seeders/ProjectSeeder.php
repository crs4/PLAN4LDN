<?php

namespace Database\Seeders;

use App\Models\Project;
use Illuminate\Database\Seeder;

class ProjectSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        Project::truncate();

        $project1 = Project::create([
            'title' => 'Project 1',
            'acronym' => 'PRJCT1',
            'description' => 'A sample description.',
            'country_iso_code_3' => 'GRC',
        ]);

        $project1->setOwner(1);
        
    }
}
