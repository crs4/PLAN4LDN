"use client"

import React, { useEffect, useContext, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import dynamic from 'next/dynamic';
import { getGeoTiff } from '../../services/files';
import { UserContext } from '../../context/user';
import { Toast } from 'primereact/toast';

const SideBySide = dynamic(() => import('./doublemap'), {ssr: false})

const SideBySideMap = ({ maps, customLuClasses }) => {

  const [layersProps, setLayersProps] = useState(null);
  const { token } = useContext(UserContext);
  const toast = useRef(null);

  useEffect(() => {
    
    const l = constructProps()
    if (l)
       setLayersProps(l); 
  }, [maps]); // eslint-disable-line 

  const constructLegends = (luClasses) =>
    luClasses.map(({ key, value },index) => ({ 'label': key, 'value': parseInt(value, 10), 'index': index }));
  const constructValuesIndex = (luClasses) =>
    luClasses.map(({ value }) => (value));

  const constructPaletteOptions = (options) => {
    let label = 'Unnamed'
    if ( options.label )
      label = options.label;
    let paletteToUse =  options.paletteType;
    if ( options.paletteType === 'LandCoverPalette' && options.customLuClasses ) {
      paletteToUse = 'Custom';
    }
    return {
      type: paletteToUse,
      label,
      legend: (customLuClasses === null) ? [] : constructLegends(customLuClasses),
      valuesIndex: (customLuClasses === null) ? [] : constructValuesIndex(customLuClasses),
    }
  };

  const constructProps = () => {
    // dragabble side-by-side map
    const polygons = [];
    if (maps && maps.length > 0 )  {
      if (maps.length > 3)  {
        maps.forEach ( m  =>  {
          if ( m.context && ( m.context === 'focusarea' || m.context === 'changeuse' ) )
            polygons.push({ type: 'geojson', context: m.context, name : m.label, geojson : m.geojson  });
        });
      }
      let luClasses_n = 7;
      if ( customLuClasses )
        luClasses_n = customLuClasses.length;
      
      return {
        layers: null,
        options: {
          mask: true,
          area: maps[2].geojson,
          polygons: polygons,
          luClasses_nr: luClasses_n, 
          left_layer: { 
            layer: {
              type: 'geotiff',
              project: maps[0].project,
              data: maps[0].link,
              palette: constructPaletteOptions(maps[0]),
            },
          },
          right_layer: {
            layer: {
              type: 'geotiff',
              project: maps[1].project,
              data: maps[1].link,
              palette: constructPaletteOptions(maps[1]),
            },
          },
        },
      }  
    } 
  };

  if (!maps || maps.length < 2) {
    return <div className="font-bold text-red-500">You need to provide at least two maps to display the side-by-side map.</div>;
  }

  // download result in CSV format
  const downloadTiff = async ( map ) => {
    // read the file
    const resp = await getGeoTiff( map.project, map.link, token )
    if ( resp ) {
      // createObjectURL
      const  file = window.URL.createObjectURL(new Blob([resp], {type: "image/tiff"}));
      // create <a> element dynamically
      let fileLink = document.createElement('a');
      fileLink.href = file;
      // suggest a name for the downloaded file
      if (map.label) {
         fileLink.download = map.label.toLowerCase().trim() + ".tif";
      }
      // simulate click
      fileLink.click();
      toast.current.show({severity:'success', summary: 'Success!', detail:'The file has been downloaded.', life: 3000});      
    }
    else
      toast.current.show({severity: 'error', summary: 'Errors!', detail: 'Error creating project!', life: 3000});        
  }
    
  return (
    <>
    { layersProps && (
      <>
      { maps && maps.length > 0 && (
        <div class="grid w-full">
          <Toast ref={toast} position="top-right" /> 
          <div class="col-6 flex flex-row-reverse">
            <Button 
              icon="pi pi-download"
              className="relative top-0 left-0  bg-primary w-20rem m-3 font-bold border-round"
              onClick={() => { downloadTiff(maps[0]) }}
              label={ maps[0].label ? 'Download ' + maps[0].label.toLowerCase().trim() + ".tif" : "raster.tif"  } 
            />
          </div>
          <div class="col-6 flex flex-row-reverse">
            <Button 
              icon="pi pi-download"
              className="relative top-0 right-0  bg-primary w-20rem m-3 font-bold border-round"
              onClick={() => { downloadTiff(maps[1]) }}
              label={ maps[0].label ? 'Download ' + maps[1].label.toLowerCase().trim() + ".tif" : "raster.tif"  } 
            />
          </div>  
        </div>
      )}
      <SideBySide layersProps={layersProps} />
      </>
    )}
    </>
  )    
};

export default SideBySideMap;
