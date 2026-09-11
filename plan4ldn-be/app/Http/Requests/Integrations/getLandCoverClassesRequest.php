<?php

namespace App\Http\Requests\Integrations;

use Illuminate\Support\Facades\Auth;
use Illuminate\Foundation\Http\FormRequest;

class getLandCoverClassesRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        $isProjectOwner = $this->project->owner->id === $this->user()->id;
        
        return $isProjectOwner;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'polygon' => 'numeric|required',
            'area' => 'numeric|required',
        ];
    }
}
