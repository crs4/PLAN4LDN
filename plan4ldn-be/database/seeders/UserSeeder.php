<?php

namespace Database\Seeders;

use DB;
use Schema;
use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        Schema::disableForeignKeyConstraints();
        DB::table('users')->truncate();

        $email = 'test@example.com';
        $password = 'testMYpass32632_change_it';

        // Create the main user.
        User::create([
            'firstname' => 'Test ',
            'lastname' => 'User',
            'email' => $email,
            'password' => bcrypt($password),
            'identity_provider' => User::IDENTITY_PROVIDER_LOCAL,
        ]);


        Schema::enableForeignKeyConstraints();
    }
}
