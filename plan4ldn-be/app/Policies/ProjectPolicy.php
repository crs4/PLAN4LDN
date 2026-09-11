<?php

namespace App\Policies;

use App\Models\Project;

public function view(User $user, Project $project)
{
    return in_array ($user->id, $project->users);
}

public function update(User $user, Project $project)
{
    return $user->id === $project->user_id;
}

public function delete(User $user, Project $project)
{
    return $user->id === $project->user_id;
}