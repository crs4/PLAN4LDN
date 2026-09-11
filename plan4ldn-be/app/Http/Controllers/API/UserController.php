<?php

namespace App\Http\Controllers\API;

use App\Models\User;
use App\Http\Controllers\Controller;
use App\Http\Resources\v1\UserResource;
use App\Http\Requests\Users\ShowUserRequest;
use App\Http\Requests\Users\ListUsersRequest;
use App\Http\Requests\Users\CreateUserRequest;
use App\Http\Requests\Users\UpdateUserRequest;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    /**
     * Display a listing of all the resources.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(ListUsersRequest $request)
    {
        $users = User::where('firstname', 'like', '%' . $request->name . '%')
            ->orWhere('lastname', 'like', '%' . $request->name . '%')
            ->orWhere('email', 'like', '%' . $request->name . '%')
            ->get();

        $users = collect($users)->filter(function ($user) use ($request) {
            if ($user->id == $request->user()->id) {
                return false;
            }
            return true;
        });

        return UserResource::collection($users);
    }

    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function show(ShowUserRequest $request, User $user)
    {
        return new UserResource($request->user());
    }



    public function store(CreateUserRequest $request)
    {    

        $user = User::create([
            'firstname' => $request->firstname,
            'lastname' => $request->lastname,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        
        if ( !$user )
            return $this->sendError('The provided data are incorrect.');

        $success['token'] =  $user->createToken('apitoken', ['*'], now()->addDay())->plainTextToken;
        $success['user'] =  new UserResource($user);

        return $this->sendResponse($success, 'User register successfully.');

    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function update(UpdateUserRequest $request, User $user)
    {
        // Filter null and falsy values.
        // TODO: Check for SQLi.
        $data = collect($request->except(['avatar_url']))->filter()->all();

        // Update the user details with the new ones.
        $request->user()->update($data);

        return new UserResource($request->user());
    }
}
