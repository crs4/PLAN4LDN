"use client"

import React from 'react';
import MapComponent from './MapViewer';

const Map = ({
  type = 'single',
  layers,
  customLuClasses = null,
}) => {

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

  const constructPropsByType = () => {
    // dragabble side-by-side map
    const focusareas = [];
    if (type === 'side-by-side') {
      if (layers && layers.length && layers.length > 3)  {
        layers.forEach ( m  =>  {
          if ( m.contest && ( m.contest === 'focusarea' || m.contest === 'changeuse' ) )
            focusareas.push({ type: 'geojson', name : m.label, geojson : m.geojson  });
        });
      }
      let luClasses_n = 7;
      if ( customLuClasses )
        luClasses_n = customLuClasses.length;
      return {
        layers: null,
        options: {
          mode: 'sidebyside',
          mask: true,
          area: layers[2].geojson,
          polygons: focusareas,
          luClasses_nr: luClasses_n, 
          left_layer: { 
            layer: {
              type: 'geotiff',
              project: layers[0].project,
              data: layers[0].link,
              palette: constructPaletteOptions(layers[0]),
            },
          },
          right_layer: {
            layer: {
              type: 'geotiff',
              project: layers[1].project,
              data: layers[1].link,
              palette: constructPaletteOptions(layers[1]),
            },
          },
        },
      }
    }
  
    return {
      layers: [{
        layer: {
          type: 'geotiff',
          project: layers[0].project,
          data: layers[0].link,
          palette: constructPaletteOptions(layers[0].paletteType, layers[0].label),
        }}],
      options: {
        mode: 'view',
        mask: true,
        area: layers[1].geojson,
      },
    }  
  };

  if (!layers || layers.length < 1) {
    return <div>You need to provide at least one map entity to display the map.</div>;
  }

  if (type === 'side-by-side' && (!layers || layers.length < 2)) {
    return <div>You need to provide at two maps to display the side-by-side map.</div>;
  }

  return (
    <Lup4LDN_Map {...constructPropsByType(type)} />
  );
};

export default Map;
