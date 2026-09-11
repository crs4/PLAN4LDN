<?php

namespace App\Utilities\PLAN4LDN;

use Http;
use Log;
use Illuminate\Support\Facades\Storage;

class WocatTransformer
{
    protected $data;
    protected $baseURI;
    protected $wocat_list;

    public function __construct($data, $token )
    {
        $this->data = $data;
        $this->baseURI = 'https://qcat.wocat.net';
        $this->token = $token;
        $this->requestTimeout = env('REQUEST_TIMEOUT_SECONDS', 60);
    }

    public function readFullItem($code)
    {
        $wocat_uri = "https://qcat.wocat.net/en/api/v2/questionnaires/".$code."/";
        $headers = [
            'Authorization'  => $this->token,
        ];
        $response = Http::timeout($this->requestTimeout)
            ->withHeaders($headers)
            ->acceptJson()
            ->get($wocat_uri);
        if ($response->ok()) {
            $data = $response->json();
            $sec1 = data_get($data, 'section_general_information');
            $sec2 = data_get($data, 'section_specifications');
            try {
                $x = data_get($sec1, 'children');
                $x = data_get($x, 'tech__1');
                $x = data_get($x, 'children');
                $y = data_get($x, 'tech__1__1');
                $y = data_get($y, 'children');
                $qg_location = data_get($y, 'qg_location');
                if ( $qg_location )  {
                    $qg_location = data_get($qg_location, 'children');
                    $qg_location = data_get($qg_location, 'country');
                    $qg_location = data_get($qg_location, 'value');
                    $qg_location = data_get($qg_location, '0');
                    $qg_location = data_get($qg_location, 'value');
                }
                else $qg_location = 'no location';
                $y = data_get($x, 'tech__0__1');
                $y = data_get($y, 'children');
                $qg_image = data_get($y, 'qg_image');
                if ( !empty($qg_image) )  {
                    $qg_image = data_get($qg_image, 'children');
                    $qg_image = data_get($qg_image, 'image');
                    $qg_image = data_get($qg_image, 'value');
                    $qg_image = data_get($qg_image, '0');
                    $qg_image = data_get($qg_image, 'preview_image');
                    if ( !empty($qg_image)&&(!($qg_image=='')) )
                        $qg_image = $this->baseURI . '/' . $qg_image;
                    else $qg_image = '';
                }
                else $qg_image = '';
                Log::info('Wocat2.', ['image' => $qg_image]);
                $x = data_get($sec2, 'children');
                $x = data_get($x, 'tech__2');
                $x = data_get($x, 'children');
                $x = data_get($x, 'tech__2__1');
                $x = data_get($x, 'children');
                $tech_qg_1 = data_get($x, 'tech_qg_1');
                if ( $tech_qg_1 )  {
                    $tech_qg_1 = data_get($tech_qg_1, 'children');
                    $tech_qg_1 = data_get($tech_qg_1, 'tech_definition');
                    $tech_qg_1 = data_get($tech_qg_1, 'value');
                    $tech_qg_1 = data_get($tech_qg_1, '0');
                    $tech_qg_1 = data_get($tech_qg_1, 'value');
                }
                else $tech_qg_1 = 'no description';
                return [ 'country' => $qg_location, 'image' => $qg_image, 'description' => $tech_qg_1 ];
            } 
            catch (\Exception $ex) {
                Log::info('Wocat2.', ['Exception' => $ex]);
                return [ 'country' => 'no data', 'image' => 'no image', 'description' => 'no description' ];
            }
        }
        return [ 'country' => 'no data', 'image' => 'no image', 'description' => 'no description' ];
    }

    public function getTransformedOutput()
    {
        $transformed = [];
        foreach ($this->data as $item) {
            $id = data_get($item, 'code');
            $coord = data_get($item, 'coordinates');
            $coord = data_get($coord, '0');
            
            $name = data_get($item, 'name');
            $fullitem = $this->readFullItem($id);
            $transformed[] = [
                'code' => $id,
                'url' => $this->baseURI . '/en/wocat/technologies/view/' . $id,
                'name' => data_get($item, 'name'),
                'created' => data_get($item, 'created'),
                'updated' => data_get($item, 'updated'),
                'edition' => data_get($item, 'edition'),
                'description' => data_get($fullitem, 'description'),
                'country' =>  data_get($fullitem, 'country'),
                'image' => data_get($fullitem, 'image'),
                'latitude' => data_get($coord, 'lat'),
                'longitude' => data_get($coord, 'lon'),
            ];
        }
        return $transformed;
    }
}
