<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Http\Resources\v1\UserResource;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    

    // Login (Issue Token)
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $user->createToken('apitoken')->plainTextToken;

        $success['token'] =  $token;
        $success['user'] =  new UserResource($user);
        return $this->sendResponse($success, 'Login successful!');
    }

    public function logout()
    {
        Auth::logout();
 
        $request->session()->invalidate();
 
        $request->session()->regenerateToken();

        return $this->sendResponse($success, 'User logged out successfully.');
    }

    public function getUser()
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return $this->sendError('User not found');
            }
            return $this->sendResponse($user, 'Ok');
        } catch (Exception $e) {
            return $this->sendError('Failed to fetch user profile');
        }
    }

    public function updateUser(Request $request)
    {
        try {
            $user = Auth::user();
            $user->update($request->only(['firstname','lastname','avatar_url','email']));
            return  $this->sendResponse($user, 'User data updated');
        } catch (Exception $e) {
            return $this->sendError('Failed to update user');
        }
    }
}
