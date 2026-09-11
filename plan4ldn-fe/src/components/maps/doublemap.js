"use client"

import React, { useEffect, useRef, useMemo, useState, useContext } from 'react';
import L from 'leaflet';
import './leaflet-extensions/mask/leaflet.mask';
import { featureCollection } from '@turf/turf';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import chroma from 'chroma-js';
import { getGeoTiff } from '../../services/files';
import MapLegend from './legend'; 
import { UserContext } from '../../context/user';
import { Toast } from 'primereact/toast';
import GeoRasterLayer from "georaster-layer-for-leaflet";

const parseGeoraster = require("georaster");

const GeoRaster = ({ ref, raster }) => {
  const map = useMap();

  useEffect(() => {
    if (!map  ) 
      return;
    raster.addTo(map)
    if (ref)
      ref.current = raster
  }, [map, raster, ref]);// eslint-disable-line 
  return null  
};

const Mask = ({ maskRef, data }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !data  ) 
      return;
    if ( !maskRef.current )
      maskRef.current = L.mask(data, {
        map: map, fitBounds: true,
      }).addTo(map);
  }, [data, maskRef]); // eslint-disable-line 
  
  return null  
};

const SideBySide = ({ layersProps }) => {
  const [area, setArea] = useState(null);
  const [focusAreas, setFocusAreas] = useState(null);
  const [changeUse, setChangeUse] = useState(null);
  const [raster1, setRaster1] = useState(null);
  const [raster2, setRaster2] = useState(null);
  const [palette1, setPalette1] = useState(null);
  const [palette2, setPalette2] = useState(null);
  const jsonRef1 = useRef(null); 
  const jsoncuRef = useRef(null); 
  const jsonfaRef = useRef(null); 
  const jsonRef2 = useRef(null); 
  const legend1Ref = useRef(null); 
  const legend2Ref = useRef(null); 
  const mask1Ref = useRef(null); 
  const mask2Ref = useRef(null); 
  const raster1Ref = useRef(null); 
  const raster2Ref = useRef(null);
  const [zoom, setZoom] = useState(10)
  const [center, setCenter] = useState([39,9])
  const { token } = useContext(UserContext);
  const toast = useRef();
  const setStyleArea = ({ properties }) => {
    return {
      "color": "#2266ff",
      "weight": 3,
      "opacity": 1,
      "fillOpacity": 0,
    };
  };
  const setStyleCU = ({ properties }) => {
    return {
      "color": "#0628a3",
      "weight": 5,
      "opacity": 1,
      "fillOpacity": 0
    }
  };
  const setStyleFA = ({ properties }) => {
    return {
      "color": "#ff22cf",
      "weight": 5,
      "opacity": 1,
      "fillOpacity": 0
    }
  };
  function onEachFeature(feature, layer) {
    if (feature.properties && feature.properties.name) {
      const popup = '<div><h4>' + feature.properties.name + '</h4></div>';
      layer.bindPopup(popup);
    }
  }
  const loadLayers = async () => {
    toast.current.show({
              severity: 'info',
              summary: 'Loading', 
              detail: 'Loading data...., please wait',
              life: 10000
            }); 
    const options = layersProps.options
    const { left_layer } = options;
    const { right_layer } = options;
    const { area: poly } = options;
    const { polygons } = options;
    const { luClasses_nr } = options;
    setArea(poly);
    let _focusAreas = null;
    let _changeUse = null;
    if ( polygons ) {
      for ( let x = 0; x < polygons.length; x += 1 ){
        const pl = polygons[x];
        if ( pl.geojson && pl.geojson.features ){
          for ( let xp = 0; xp < pl.geojson.features.length; xp += 1 )
            pl.geojson.features[xp].properties['name'] = pl.name
          if ( pl.context === 'focusarea' ){
            if ( _focusAreas )
              _focusAreas = featureCollection(pl.geojson.features.concat(_focusAreas.features));
            else _focusAreas = pl.geojson
          }
          if ( pl.context === 'changeuse' ){
            if ( _changeUse )
              _changeUse = featureCollection(pl.geojson.features.concat(_changeUse.features));
            else _changeUse = pl.geojson
          }  
        }
      };
    } 
    setFocusAreas(_focusAreas)
    setChangeUse(_changeUse)
    if ( left_layer && left_layer.layer && left_layer.layer.type === 'geotiff' && left_layer.layer.data ) {
      try {
        const resp = await getGeoTiff(left_layer.layer.project,left_layer.layer.data,token)
        if (resp) {
          const georaster = await parseGeoraster(resp);
          if (georaster) {
            const pixelValuesLegend = [];
            const scale = chroma.scale('RdGy');
            let _raster1 = new GeoRasterLayer({
                georaster,
                opacity: 1,
                pixelValuesToColorFn(pixelValues) {
                  if (left_layer.layer.palette.type === 'LandCoverPalette') {
                    if (pixelValues[0] === 1) {
                      return '#42b05c';
                    } if (pixelValues[0] === 2) {
                      return '#a0dc67';
                    } if (pixelValues[0] === 3) {
                      return '#c67f5f';
                    } if (pixelValues[0] === 4) {
                      return '#12AAB5';
                    } if (pixelValues[0] === 5) {
                      return '#5D7F99';
                    } if (pixelValues[0] === 6) {
                      return '#f5d680';
                    } if (pixelValues[0] === 7) {
                      return '#67b7dc';
                    } 
                  } else if (left_layer.layer.palette.type === 'LandDegradationPalette') {
                    if (pixelValues[0] === -1) {
                      return '#d43333';
                    } if (pixelValues[0] === 0) {
                      return '#fcdd90';
                    } if (pixelValues[0] === 1) {
                      return '#398e3b';
                    } 
                  } else if (left_layer.layer.palette.type === 'LandSuitabilityPalette') {
                    if (pixelValues[0] === 0) {
                      return 'rgba(255,255,255,0.8)';
                      // eslint-disable-next-line
                    } 
                    if  (pixelValues[0] === 1) {
                      return '#398E3B';
                    } 
                    if (pixelValues[0] === 2) {
                      return '#FCDD90';
                    } 
                    if (pixelValues[0] === 3) {
                      return '#D43333';
                    } 
                  } else if (left_layer.layer.palette.type === 'FutureLandDegradationPalette') {
                    if (pixelValues[0] === 1 || pixelValues[0] === 2) {
                      return '#D43333'; // A1, A2
                    } 
                    if (pixelValues[0] === 3 || pixelValues[0] === 4) {
                      return '#EFA14C'; // B1, B2
                    } 
                    if (pixelValues[0] === 5 || pixelValues[0] === 6 || pixelValues[0] === 7) {
                      return '#DFDB15'; // C1, C2
                    } 
                    if (pixelValues[0] === 8 || pixelValues[0] === 9) {
                      return '#3A8E3B'; // D1, D2
                    }  
                    if (pixelValues[0] === 10 || pixelValues[0] === 11 || pixelValues[0] === 12 || pixelValues[0] === 0) {
                      return 'rgba(255,255,255,0.8)';  // E0, E1, E2
                      // eslint-disable-next-line
                    } 
                  } else if (left_layer.layer.palette.type === 'LULandDegradationPalette') {
                      if (pixelValues[0] === 0) { 
                        return 'rgba(255,255,255,0.8)';
                        // eslint-disable-next-line
                      } 
                      if (pixelValues[0] === 1) {
                        return '#3A8E3B';
                      } 
                      if (pixelValues[0] === 2) {
                        return '#ED8F2F';
                      } 
                      if (pixelValues[0] === 3) {
                        return '#D43433';
                      } 
                  } else if (left_layer.layer.palette.type === 'LMLandDegradationPalette') {
                      if (pixelValues[0] === 0) { 
                        return 'rgba(255,255,255,0.8)';
                        // eslint-disable-next-line
                      } 
                      if (pixelValues[0] === 1) {
                        return '#3A8E3B';
                      } 
                      if (pixelValues[0] === 2) {
                        return '#ED8F2F';
                      } 
                      if (pixelValues[0] === 3) {
                        return '#D43433';
                      } 
                  } else if (left_layer.layer.palette.type === 'LandUsePalette') {
                    if (pixelValues[0] === 1) {
                      return '#267300';
                    } 
                    if (pixelValues[0] === 2){
                      return '#A7E39D';
                    } 
                    if (pixelValues[0] === 3) {
                      return '#E66000';
                    } 
                    if (pixelValues[0] === 4) {
                      return '#FFAA01';
                    } 
                    if (pixelValues[0] === 5) {
                      return '#573A00';
                    } 
                    if (pixelValues[0] === 6) {
                      return '#A87001';
                    } 
                    if (pixelValues[0] === 7) {
                      return '#DF72FF';
                    } 
                    if (pixelValues[0] === 8) {
                      return '#343434';
                    } 
                    if (pixelValues[0] === 9) {
                      return '#12AAB5';
                    } 
                    if (pixelValues[0] === 10) {
                      return '#E7E600';
                    } 
                    if (pixelValues[0] === 11) {
                      return '#FEFF73';
                    } 
                    if (pixelValues[0] === 12) {
                      return '#C7960D';
                    } 
                    if (pixelValues[0] === 13) {
                      return '#F5D680';
                    } 
                    if (pixelValues[0] === 14) {
                      return '#67B7DC';
                    }
                  } else if (left_layer.layer.palette.type === 'LDNBalancePalette') {
                    let n = 7;
                    if ( luClasses_nr )
                      n = luClasses_nr;
                    if (pixelValues[0] === 0) { 
                      return 'rgba(255,255,255,0.8)';
                    } 
                    if (pixelValues[0] > 0 && pixelValues[0] <= n) {
                      return '#AFAFAF';
                    } 
                    if (pixelValues[0] > n && pixelValues[0] <= 2*n) {
                      return '#3A8E3B';
                    } 
                    if (pixelValues[0] > 2*n && pixelValues[0] <= 3*n) {
                      return '#FCDD90';
                    } 
                    if (pixelValues[0] > 3*n) {
                      return '#D43433';
                    } 
                  } else if (left_layer.layer.palette.type === 'PastLDMaskedPalette') {
                    let n = 7;
                    if ( luClasses_nr )
                      n = luClasses_nr;
                    if (pixelValues[0] === 0 ) { 
                      return 'rgba(255,255,255,0.8)';
                    } 
                    if (pixelValues[0] > 0 && pixelValues[0] <= n) {
                      return '#D43433';
                    } 
                    if (pixelValues[0] > n && pixelValues[0] <= n*2) {
                      return '#FCDD90';
                    } 
                    if (pixelValues[0] > 2*n ) {
                      return '#3A8E3B';
                    }  
                  } else if (left_layer.layer.palette.type === 'Custom') {
                    let coloridx = pixelValues[0];
                    if ( left_layer.layer.palette && left_layer.layer.palette.valuesIndex )
                        coloridx = left_layer.layer.palette.valuesIndex.indexOf(pixelValues[0]);
                    if ( coloridx === 0) {
                      return '#89E55B';
                      // eslint-disable-next-line
                    } 
                    if ( coloridx === 1) {
                      return '#007FFF';
                      // eslint-disable-next-line
                    } 
                    if (coloridx === 2) {
                      return '#FFD12A';
                    } 
                    if  (coloridx === 3) {
                      return '#ED872D';
                    } 
                    if (coloridx === 4) {
                      return '#A40000';
                    } 
                    if (coloridx === 5) {
                      return '#614051';
                    } 
                    if (coloridx === 6) {
                      return '#FC8EAC';
                    } 
                    if (coloridx === 7) {
                      return '#DAA520';
                    } 
                    if (coloridx === 8) {
                      return '#FFFFF0';
                    } 
                    if (coloridx === 9) {
                      return '#00A86B';
                    } 
                    if (coloridx === 10) {
                      return '#C3B091';
                    } 
                    if (coloridx === 11) {
                      return '#C4C3D0';
                    } 
                    if (coloridx === 12) {
                      return '#FFDB58';
                    } 
                    if (coloridx === 13) {
                      return '#000080';
                    } 
                    if (coloridx === 14) {
                      return '#808000';
                    } 
                    if (coloridx === 15) {
                      return '#CB99C9';
                    } 
                    if (coloridx === 16) {
                      return '#65000B';
                    } 
                    if (coloridx === 17) {
                      return '#FF8C69';
                    } 
                    if (coloridx === 18) {
                      return '#008080';
                    } 
                    if (coloridx === 19) {
                      return '#5B92E5';
                    } 
                    if (coloridx === 20) {
                      return '#8F00FF';
                    } 
                    if (coloridx === 21) {
                      return '#F5DEB3';
                    } 
                    if (coloridx === 22) {
                      return '#738678';
                    } 
                    if (coloridx === 23) {
                      return '#FFFF00';
                    } 
                    if (coloridx === 24) {
                      return '#00FFF7';
                    } 
                    if (coloridx === 25) {
                      return '#D8FF2A';
                    } 
                    if (coloridx === 26) {
                      return '#ED602D';
                    } 
                    if (coloridx === 27) {
                      return '#99A400';
                    } 
                    if (coloridx === 28) {
                      return '#504061';
                    } 
                    if (coloridx === 29) {
                      return 'rgb(252,142,172)';
                    } 
                    if (coloridx === 30) {
                      return 'rgb(218,165,32)';
                    } 
                    if (coloridx === 31) {
                      return 'rgb(255,255,240)';
                    } 
                    if (coloridx === 32) {
                      return 'rgb(0,168,107)';
                    } 
                    if (coloridx === 33) {
                      return 'rgb(195,176,145)';
                    } 
                    if (coloridx === 34) {
                      return '#432F96';
                    } 
                    if (coloridx === 35) {
                      return 'rgb(255,219,88)';
                    } 
                    if (coloridx === 36) {
                      return '#80007A';
                    } 
                    if (coloridx === 37) {
                      return 'rgb(128,128,0)';
                    } 
                    if (coloridx === 38) {
                      return '#25463B';
                    } 
                    if (coloridx === 39) {
                      return '#005665';
                    } 
                    if (coloridx === 40) {
                      return '#9B69FF';
                    } 
                    if (coloridx === 41) {
                      return 'rgb(0,128,128)';
                    } 
                    if (coloridx === 42) {
                      return '#E55B99';
                    } 
                    if (coloridx === 43) {
                      return 'rgb(0,255,89)';
                    } 
                    if (coloridx === 44) {
                      return '#B3F5D7';
                    } 
                    if (coloridx === 45) {
                      return '#867F73';
                    } 
                    if (coloridx === 46) {
                      return '#FF00CC';
                    } 
                    if (coloridx === 47) {
                      return '#89E55B';
                    } 
                    if (coloridx === 48) {
                      return 'rgb(0,119,255)';
                    } 
                    if (coloridx === 49) {
                      return 'rgb(205,179,245)';
                    } 
                    if (coloridx === 50) {
                      return '#868473';
                    } 
                  } else {
                    const min = georaster.mins[0];
                    const range = georaster.ranges[0];
                    const pixelValue = pixelValues[0]; // there's just one band in this raster
                    // if there's zero wind, don't return a color
                    if (pixelValue <= 0) return null;
                    // scale to 0 - 1 used by chroma
                    const scaledPixelValue = (pixelValue - min) / range;
                    const color = scale(scaledPixelValue).hex();
                    pixelValuesLegend.push(pixelValues);
                    return color;
                  }
                  return 'transparent';
                },
                resolution: 256, // optional parameter for adjusting display resolution
            });
            _raster1.key = "bottomleft"
            setRaster1(_raster1)
            setPalette1(left_layer.layer.palette);
          }
        }
      }
      catch (e){
        console.log(e)
      }
    }
    if (right_layer && right_layer.layer && right_layer.layer.type === 'geotiff' && right_layer.layer.data ) {
      try {
       
        const resp = await getGeoTiff(right_layer.layer.project,right_layer.layer.data,token)
        if (resp) {
            
          const georaster = await parseGeoraster(resp);
          if ( georaster ) {
            const pixelValuesLegend = []; // eslint-disable-line
            const scale = chroma.scale('RdGy'); // eslint-disable-line
            let _raster2 = new GeoRasterLayer({
              georaster,
              opacity: 1,
              pixelValuesToColorFn(pixelValues) {
                if (right_layer.layer.palette.type === 'LandCoverPalette') {
                  if (pixelValues[0] === 1) {
                    return '#42b05c';
                  } if (pixelValues[0] === 2) {
                    return '#a0dc67';
                  } if (pixelValues[0] === 3) {
                    return '#c67f5f';
                  } if (pixelValues[0] === 4) {
                    return '#12AAB5';
                  } if (pixelValues[0] === 5) {
                    return '#5D7F99';
                  } if (pixelValues[0] === 6) {
                    return '#f5d680';
                  } if (pixelValues[0] === 7) {
                    return '#67b7dc';
                  } 
                } else if (right_layer.layer.palette.type === 'LandDegradationPalette') {
                  if (pixelValues[0] === -1) {
                    return '#d43333';
                  } if (pixelValues[0] === 0) {
                    return '#fcdd90';
                  } if (pixelValues[0] === 1) {
                    return '#398e3b';
                  } 
                } else if (right_layer.layer.palette.type === 'LandSuitabilityPalette') {
                  if (pixelValues[0] === 0) {
                    return 'rgba(255,255,255,0.8)';
                    // eslint-disable-next-line
                  } 
                  if (pixelValues[0] === 1) {
                    return '#398E3B';
                  } 
                  if (pixelValues[0] === 2) {
                    return '#FCDD90';
                  } 
                  if (pixelValues[0] === 3) {
                    return '#D43333';
                  } 
                } else if (right_layer.layer.palette.type === 'FutureLandDegradationPalette') {
                  if (pixelValues[0] === 1 || pixelValues[0] === 2) {
                    return '#D43333'; // A1, A2
                  } 
                  if (pixelValues[0] === 3 || pixelValues[0] === 4) {
                    return '#EFA14C'; // B1, B2
                  } 
                  if (pixelValues[0] === 5 || pixelValues[0] === 6 || pixelValues[0] === 7) {
                    return '#DFDB15'; // C1, C2
                  } 
                  if (pixelValues[0] === 8 || pixelValues[0] === 9) {
                    return '#3A8E3B'; // D1, D2
                  } 
                  if (pixelValues[0] === 10 || pixelValues[0] === 11 || pixelValues[0] === 12 || pixelValues[0] === 0) {
                    return 'rgba(255,255,255,0.8)';  // E0, E1, E2
                    // eslint-disable-next-line
                  } 
                } else if (right_layer.layer.palette.type === 'LULandDegradationPalette') {
                  if (pixelValues[0] === 0) { 
                    return 'rgba(255,255,255,0.8)';
                    // eslint-disable-next-line
                  } 
                  if (pixelValues[0] === 1) {
                    return '#3A8E3B';
                  } 
                  if (pixelValues[0] === 2) {
                    return '#ED8F2F';
                  } 
                  if (pixelValues[0] === 3) {
                    return '#D43433';
                  } 
                } else if (right_layer.layer.palette.type === 'LMLandDegradationPalette') {
                  if (pixelValues[0] === 0) { 
                    return 'rgba(255,255,255,0.8)';
                    // eslint-disable-next-line
                  } 
                  if (pixelValues[0] === 1) {
                    return '#3A8E3B';
                  } 
                  if (pixelValues[0] === 2) {
                    return '#ED8F2F';
                  } 
                  if (pixelValues[0] === 3) {
                    return '#D43433';
                  } 
                } else if (right_layer.layer.palette.type === 'LandUsePalette') {
                  if (pixelValues[0] === 1) {
                    return '#267300';
                  } 
                  if (pixelValues[0] === 2){
                    return '#A7E39D';
                  } 
                  if (pixelValues[0] === 3) {
                    return '#E66000';
                  } 
                  if (pixelValues[0] === 4) {
                    return '#FFAA01';
                  } 
                  if (pixelValues[0] === 5) {
                    return '#573A00';
                  } 
                  if (pixelValues[0] === 6) {
                    return '#A87001';
                  } 
                  if (pixelValues[0] === 7) {
                    return '#DF72FF';
                  } 
                  if (pixelValues[0] === 8) {
                    return '#343434';
                  } 
                  if (pixelValues[0] === 9) {
                    return '#12AAB5';
                  } 
                  if (pixelValues[0] === 10) {
                    return '#E7E600';
                  } 
                  if (pixelValues[0] === 11) {
                    return '#FEFF73';
                  } 
                  if (pixelValues[0] === 12) {
                    return '#C7960D';
                  } 
                  if (pixelValues[0] === 13) {
                    return '#F5D680';
                  } 
                  if (pixelValues[0] === 14) {
                    return '#67B7DC';
                  }
                } else if (right_layer.layer.palette.type === 'LDNBalancePalette') {
                  let n = 7;
                  if ( luClasses_nr )
                    n = luClasses_nr;
                  if (pixelValues[0] === 0) { 
                    return 'rgba(255,255,255,0.8)';
                  } 
                  if (pixelValues[0] > 0 && pixelValues[0] <= n) {
                    return '#AFAFAF';
                  } 
                  if (pixelValues[0] > n && pixelValues[0] <= 2*n) {
                    return '#3A8E3B';
                  } 
                  if (pixelValues[0] > 2*n && pixelValues[0] <= 3*n) {
                    return '#FCDD90';
                  } 
                  if (pixelValues[0] > 3*n) {
                    return '#D43433';
                  } 
                } else if (right_layer.layer.palette.type === 'PastLDMaskedPalette') {
                  let n = 7;
                  if ( luClasses_nr )
                    n = luClasses_nr;
                  if (pixelValues[0] === 0 ) { 
                    return 'rgba(255,255,255,0.8)';
                  } 
                  if (pixelValues[0] > 0 && pixelValues[0] <= n) {
                    return '#D43433';
                  } 
                  if (pixelValues[0] > n && pixelValues[0] <= n*2) {
                    return '#FCDD90';
                  } 
                  if (pixelValues[0] > 2*n ) {
                    return '#3A8E3B';
                  }  
                } else if (right_layer.layer.palette.type === 'Custom') {
                  let coloridx = pixelValues[0];
                  if ( left_layer.layer.palette && left_layer.layer.palette.valuesIndex )
                      coloridx = left_layer.layer.palette.valuesIndex.indexOf(pixelValues[0]);
                  if ( coloridx === 0) {
                    return '#89E55B';
                    // eslint-disable-next-line
                  } 
                  if ( coloridx === 1) {
                    return '#007FFF';
                    // eslint-disable-next-line
                  } 
                  if (coloridx === 2) {
                    return '#FFD12A';
                  } 
                  if (coloridx === 3) {
                    return '#ED872D';
                  } 
                  if (coloridx === 4) {
                    return '#A40000';
                  } 
                  if (coloridx === 5) {
                    return '#614051';
                  } 
                  if (coloridx === 6) {
                    return '#FC8EAC';
                  } 
                  if (coloridx === 7) {
                    return '#DAA520';
                  } 
                  if (coloridx === 8) {
                    return '#FFFFF0';
                  } 
                  if (coloridx === 9) {
                    return '#00A86B';
                  } 
                  if (coloridx === 10) {
                    return '#C3B091';
                  } 
                  if (coloridx === 11) {
                    return '#C4C3D0';
                  } 
                  if (coloridx === 12) {
                    return '#FFDB58';
                  } 
                  if (coloridx === 13) {
                    return '#000080';
                  } 
                  if (coloridx === 14) {
                    return '#808000';
                  } 
                  if (coloridx === 15) {
                    return '#CB99C9';
                  } 
                  if (coloridx === 16) {
                    return '#65000B';
                  } 
                  if (coloridx === 17) {
                    return '#FF8C69';
                  } 
                  if (coloridx === 18) {
                    return '#008080';
                  } 
                  if (coloridx === 19) {
                    return '#5B92E5';
                  } 
                  if (coloridx === 20) {
                    return '#8F00FF';
                  } 
                  if (coloridx === 21) {
                    return '#F5DEB3';
                  } 
                  if (coloridx === 22) {
                    return '#738678';
                  } 
                  if (coloridx === 23) {
                    return '#FFFF00';
                  } 
                  if (coloridx === 24) {
                    return '#00FFF7';
                  } 
                  if (coloridx === 25) {
                    return '#D8FF2A';
                  } 
                  if (coloridx === 26) {
                    return '#ED602D';
                  } 
                  if (coloridx === 27) {
                    return '#99A400';
                  } 
                  if (coloridx === 28) {
                    return '#504061';
                  } 
                  if (coloridx === 29) {
                    return 'rgb(252,142,172)';
                  } 
                  if (coloridx === 30) {
                    return 'rgb(218,165,32)';
                  } 
                  if (coloridx === 31) {
                    return 'rgb(255,255,240)';
                  } 
                  if (coloridx === 32) {
                    return 'rgb(0,168,107)';
                  } 
                  if (coloridx === 33) {
                    return 'rgb(195,176,145)';
                  } 
                  if (coloridx === 34) {
                    return '#432F96';
                  } 
                  if (coloridx === 35) {
                    return 'rgb(255,219,88)';
                  } 
                  if (coloridx === 36) {
                    return '#80007A';
                  } 
                  if (coloridx === 37) {
                    return 'rgb(128,128,0)';
                  } 
                  if (coloridx === 38) {
                    return '#25463B';
                  } 
                  if (coloridx === 39) {
                    return '#005665';
                  } 
                  if (coloridx === 40) {
                    return '#9B69FF';
                  } 
                  if (coloridx === 41) {
                    return 'rgb(0,128,128)';
                  } 
                  if (coloridx === 42) {
                    return '#E55B99';
                  } 
                  if (coloridx === 43) {
                    return 'rgb(0,255,89)';
                  } 
                  if (coloridx === 44) {
                    return '#B3F5D7';
                  } 
                  if (coloridx === 45) {
                    return '#867F73';
                  } 
                  if (coloridx === 46) {
                    return '#FF00CC';
                  } 
                  if (coloridx === 47) {
                    return '#89E55B';
                  } 
                  if (coloridx === 48) {
                    return 'rgb(0,119,255)';
                  } 
                  if (coloridx === 49) {
                    return 'rgb(205,179,245)';
                  } 
                  if (coloridx === 50) {
                    return '#868473';
                  } 
                } else {
                  const min = georaster.mins[0];
                  const range = georaster.ranges[0];
                  const pixelValue = pixelValues[0]; // there's just one band in this raster
                  // if there's zero wind, don't return a color
                  if (pixelValue <= 0) return null;
                  // scale to 0 - 1 used by chroma
                  const scaledPixelValue = (pixelValue - min) / range;
                  const color = scale(scaledPixelValue).hex();
                  pixelValuesLegend.push(pixelValues);
                  return color;
                }
                return 'transparent';
              },
              resolution: 256, // optional parameter for adjusting display resolution
            });
            _raster2.key = "bottomright";
            setRaster2(_raster2)
            setPalette2(right_layer.layer.palette);
            console.log(right_layer.layer.palette)
          }
        } 
      }   
      catch (e){
        console.log(e)
      }
    }
  }
  
  useEffect(() => {
    if ( !token  ) 
      router.push(`/login`);
  }, [token]); // eslint-disable-line

  useEffect(() => {
    if ( token && layersProps ) 
      loadLayers(layersProps)
  }, [token, layersProps]); // eslint-disable-line
  
  return (
    <div className="grid">
      <Toast ref={toast} position="top-right" />
      <div className="col-6">        
        <MapContainer
          doubleClickZoom={false}
          zoom={zoom}
          center={center}
          style={{ height: '600px' }}
        >
          <TileLayer
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <Mask maskRef={mask1Ref} data={area} /> 
          { raster1 && (
            <>
            <GeoRaster ref={raster1Ref} raster={raster1} />
            </>
          )} 
          { area && (
             <>
            <GeoJSON
              key="Area1"
              ref={jsonRef1} 
              data={area}
              style={setStyleArea}
            />
            </>
          )}  
          { changeUse && (
            <>
            <GeoJSON
              key="ChangeUse"
              ref={jsoncuRef} 
              data={changeUse}
              style={setStyleCU}
              onEachFeature={onEachFeature}
            />
            </> 
          )} 
          
          { palette1 && (
            <MapLegend lref={legend1Ref} data={palette1}  position="bottomleft"/> 
          )}     
        </MapContainer>
      </div>
      <div className="col-6">
        <MapContainer
          doubleClickZoom={false}
          zoom={zoom}
          center={center}
          style={{ height: '600px' }}
        > 
          <TileLayer
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          /> 
          <Mask maskRef={mask2Ref} data={area} /> 
          { raster2 && (
          <>
          <GeoRaster ref={raster2Ref} raster={raster2} />
          </>
          )}
          { area && (
            <>
            <GeoJSON
              key="Area2"
              ref={jsonRef2} 
              data={area}
              style={setStyleArea}
            />
            </>
          )}  
          { focusAreas && (
            <>
            <GeoJSON
              key="FocusAreas"
              ref={jsonfaRef} 
              data={focusAreas}
              style={setStyleFA}
            />
            </> 
          )} 
          { palette2 && (
            <MapLegend lref={legend2Ref} data={palette2} position="bottomright"/> 
          )}        
        </MapContainer>
      </div>
    </div>
  );
};

          
export default SideBySide;