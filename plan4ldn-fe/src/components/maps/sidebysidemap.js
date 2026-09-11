"use client"

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const SideBySide = dynamic(() => import('./doublemap'), {ssr: false})

const SideBySideMap = ({ maps, customLuClasses }) => {

  const [layersProps, setLayersProps] = useState(null);

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
  
  return (
    <>
    { layersProps && (
      <>
      <SideBySide layersProps={layersProps} />
      
      </>
    )}
    
    </>
  )    
};

export default SideBySideMap;
