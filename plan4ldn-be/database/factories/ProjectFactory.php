<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class ProjectFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array
     */
    public function definition()
    {
        return [
            'title' => 'default',
            'acronym' => 'DEF',
            'description' => 'empty',
            'country_iso_code_3' => 'TUN',
            'administrative_level' => 2,
            'tif_images' => '{}'
        ];
    }
}
