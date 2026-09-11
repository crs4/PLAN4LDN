<?php

namespace App\Models;

use Laravel\Sanctum\HasApiTokens;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    // The available roles within a project.
    public const ROLE_USER = 'user';
    public const ROLE_OWNER = 'owner';

    protected $hidden = ['password', 'remember_token'];

    protected $fillable = [
        'firstname',
        'lastname',
        'avatar_url',
        'email',
        'password',
    ];
    
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
        ];
    }

    public function projects()
    {
        return $this->belongsToMany(Project::class, 'project_user', 'user_id', 'project_id')
            ->withPivot('role');
    }

    public function invites()
    {
        return $this->hasMany(ProjectInvite::class)->where('status', ProjectInvite::STATUS_PENDING);
    }

    public function files()
    {
        return $this->hasMany(File::class);
    }
}
