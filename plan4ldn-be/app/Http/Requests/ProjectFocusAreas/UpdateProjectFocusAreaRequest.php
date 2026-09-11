<?php

namespace App\Http\Requests\ProjectFocusAreas;

use Illuminate\Validation\Rule;
use App\Models\ProjectFocusArea;
use Illuminate\Foundation\Http\FormRequest;

class UpdateProjectFocusAreaRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return $this->focusArea->user_id === $this->user()->id;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'name' => 'string|required',
            'file_id' => 'required|exists:project_file,id',
            'area' => 'numeric|required'
        ]; 
    }
}
