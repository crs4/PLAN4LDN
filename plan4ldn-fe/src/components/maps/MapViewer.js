"use client"

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer } from 'react-leaflet';
import chroma from 'chroma-js';
import { point, polygon, multiPolygon, booleanPointInPolygon, booleanIntersects } from '@turf/turf';
import {getGeoTiff} from '../../services/files';
import Loading from '../components/loading';

import './leaflet-extensions/mask/leaflet.mask';

// Slide Compare
import './leaflet-extensions/sidebyside/leaflet-side-by-side';

// Legends
import './leaflet-extensions/htmllegend/L.Control.HtmlLegend';

// Leaflet Basemap Providers
import 'leaflet-providers';
import { GeoJSON } from 'react-leaflet/GeoJSON';
import dynamic from "next/dynamic";

const parse_georaster = dynamic(() => import('georaster'));
const GeoRasterLayer = dynamic(() => import('georaster-layer-for-leaflet'));

const MapLegend = ({ legendRef }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || legendRef.current ) 
      return;
    let JSONlayer = null;
    map.eachLayer(function (layer) {
      if (layer.key = 'ROIs' ){
        JSONlayer = layer;
      }
    });
    if (JSONlayer) {
      legendRef.current = L.control.htmllegend({
        position: 'bottomleft',
        legends: [
          {
            name: 'Profiles Status',
            JSONlayer,
            opacity: 1,
            elements: [{
              label: 'boundaries',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#2266ff',
                'width': '20px',
                'height': '3px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            }]
          }
        ],
        collapseSimple: true,
        detectStretched: false,
        collapsedOnInit: false,
        defaultOpacity: 1.0,
      }).addTo(map);
    }
  }, [map, legendRef]);
  return null  
};

const Mask = ({ maskRef, data }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !data || maskRef.current ) 
      return;
    L.mask(data, {
        map: map, fitBounds: true,
    }).addTo(map);
  }, [map, data, maskRef]);
  return null  
};

const SideBySide = ({ sidebysideRef, leftLayer, rightLayer }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !leftLayer || !rightLayer || sidebysideRef.current ) 
      return;
    leftLayer.addTo(map);
    rightLayer.addTo(map);
    sidebysideRef.current = (L.control.sideBySide(leftLayer, rightLayer)).addTo(map);
  }, [map, sidebysideRef, leftLayer, rightLayer]);
  return null  
};



const SideBySideMap = ({ layers, mask }) => {
  const legendLeft = useRef(null);
  const legendRight = useRef(null);
  const sidebyside = useRef(null);
  const [leftLayer, setLeftLayer] = useState(null);
  const [rightLayer, setRightLayer] = useState(null);
  const position = [9.505, 39.09];
  const zoom = 7;
  const { left_layer } = layers;
  const { right_layer } = layers;
  const { area } = layers;
  const { polygons } = layers;
  const { luClasses_nr } = layers;

  let bounds = [38.5, 8.5, 39.5, 9.5];
  try  { 
    const bboxArray = bbox(area);
    bounds = [[bboxArray[1], bboxArray[0]], [bboxArray[3], bboxArray[2]]];  
  }
  catch (e) {
    console.log(e); 
  }


  /*
  const loadLayers = (layersArray) => {
    layersArray.forEach(
      (layerOptions) => {
        if (layerOptions.layer.type === 'geojson') {
          if (options.mask === true) {
            glowglobe.current.eachLayer((layer) => {
              // eslint-disable-next-line
              if (layer._bounds) {
                glowglobe.current.removeLayer(layer);
              }
            });
            checkPolygon.current = layerOptions.layer.data;
            L.mask(layerOptions.layer.data, {
              map: glowglobe.current, fitBounds: true,
            }).addTo(glowglobe.current);
          } else {
            const layer = L.geoJSON(layerOptions.layer.data);
            layer.addTo(glowglobe.current);
            glowglobe.current.fitBounds(layer.getBounds());
            glowglobe.current.setMaxBounds(layer.getBounds());
          }
        } else if (layerOptions.layer.type === 'geotiff' && layerOptions.layer.data ) {
          getGeoTiff(layerOptions.layer.project,layerOptions.layer.data)
            .then((response) => {
              parse_georaster(response).then((georaster) => {
                let colorsIndex = [];
                if ( layerOptions.layer.palette && layerOptions.layer.palette.valuesIndex )
                  colorsIndex = layerOptions.layer.palette.valuesIndex;
                const pixelValuesLegend = [];
                const scale = chroma.scale('RdGy');
                const layer = new GeoRasterLayer({
                  georaster,
                  opacity: 1,
                  pixelValuesToColorFn(pixelValues) {
                    if (layerOptions.layer.palette.type === 'LandCoverPalette') {
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
                    } else if (layerOptions.layer.palette.type === 'LandDegradationPalette') {
                      if (pixelValues[0] === -1) 
                        return '#d43333';
                      if (pixelValues[0] === 0) 
                        return '#fcdd90';
                      if (pixelValues[0] === 1) 
                        return '#398e3b';
                    } else if (layerOptions.layer.palette.type === 'LandSuitabilityPalette') {
                      if (pixelValues[0] === 0) 
                        return 'rgba(255,255,255,0.8)';
                      if (pixelValues[0] === 1) 
                        return '#398E3B';
                      if (pixelValues[0] === 2) 
                        return '#FCDD90';
                      if (pixelValues[0] === 3) 
                        return '#D43333';
                    } else if (layerOptions.layer.palette.type === 'FutureLandDegradationPalette') {
                      if (pixelValues[0] === 1 || pixelValues[0] === 2) 
                        return '#D43333'; // A1, A2
                      if (pixelValues[0] === 3 || pixelValues[0] === 4) 
                        return '#EFA14C'; // B1, B2
                      if (pixelValues[0] === 5 || pixelValues[0] === 6 || pixelValues[0] === 7) 
                        return '#DFDB15'; // C1, C2
                      if (pixelValues[0] === 8 || pixelValues[0] === 9) 
                        return '#3A8E3B'; // D1, D2
                      if (pixelValues[0] === 10 || pixelValues[0] === 11 || pixelValues[0] === 12 || pixelValues[0] === 0) 
                        return 'rgba(255,255,255,0.8)';  // E0, E1, E2 
                    } else if (layerOptions.layer.palette.type === 'LULandDegradationPalette') {
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
                    } else if (layerOptions.layer.palette.type === 'LMLandDegradationPalette') {
                        if (pixelValues[0] === 0) { 
                          return 'rgba(255,255,255,0.8)';
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
                    } else if (layerOptions.layer.palette.type === 'LandUsePalette') {
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
                    } else if (layerOptions.layer.palette.type === 'LDNBalancePalette') {
                      let n = 7;
                      if ( layerOptions.luClasses_nr )
                        n = layerOptions.luClasses_nr;
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
                    } else if (layerOptions.layer.palette.type === 'PastLDMaskedPalette') {
                      let n = 7;
                      if ( layerOptions.luClasses_nr )
                        n = layerOptions.luClasses_nr;
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
                    } else if (layerOptions.layer.palette.type === 'Custom') {
                      let coloridx = pixelValues[0];
                      if ( layerOptions.layer.palette && layerOptions.layer.palette.valuesIndex )
                        coloridx = layerOptions.layer.palette.valuesIndex.indexOf(pixelValues[0]);
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
                      if  (coloridx === 10) {
                        return '#C3B091';
                      } 
                      if  (coloridx === 11) {
                        return '#C4C3D0';
                      } 
                      if  (coloridx === 12) {
                        return '#FFDB58';
                      } 
                      if  (coloridx === 13) {
                        return '#000080';
                      } 
                      if  (coloridx === 14) {
                        return '#808000';
                      } 
                      if  (coloridx === 15) {
                        return '#CB99C9';
                      } 
                      if  (coloridx === 16) {
                        return '#65000B';
                      } 
                      if  (coloridx === 17) {
                        return '#FF8C69';
                      } 
                      if  (coloridx === 18) {
                        return '#008080';
                      } 
                      if  (coloridx === 19) {
                        return '#5B92E5';
                      } 
                      if  (coloridx === 20) {
                        return '#8F00FF';
                      } 
                      if  (coloridx === 21) {
                        return '#F5DEB3';
                      } 
                      if  (coloridx === 22) {
                        return '#738678';
                      } 
                      if  (coloridx === 23) {
                        return '#FFFF00';
                      } 
                      if  (coloridx === 24) {
                        return '#00FFF7';
                      } 
                      if  (coloridx === 25) {
                        return '#D8FF2A';
                      } 
                      if  (coloridx === 26) {
                        return '#ED602D';
                      } 
                      if  (coloridx === 27) {
                        return '#99A400';
                      } 
                      if  (coloridx === 28) {
                        return '#504061';
                      } 
                      if  (coloridx === 29) {
                        return 'rgb(252,142,172)';
                      } 
                      if  (coloridx === 30) {
                        return 'rgb(218,165,32)';
                      } 
                      if  (coloridx === 31) {
                        return 'rgb(255,255,240)';
                      } 
                      if  (coloridx === 32) {
                        return 'rgb(0,168,107)';
                      } 
                      if  (coloridx === 33) {
                        return 'rgb(195,176,145)';
                      } 
                      if  (coloridx === 34) {
                        return '#432F96';
                      } 
                      if  (coloridx === 35) {
                        return 'rgb(255,219,88)';
                      } 
                      if  (coloridx === 36) {
                        return '#80007A';
                      } 
                      if  (coloridx === 37) {
                        return 'rgb(128,128,0)';
                      } 
                      if  (coloridx === 38) {
                        return '#25463B';
                      } 
                      if  (coloridx === 39) {
                        return '#005665';
                      } 
                      if  (coloridx === 40) {
                        return '#9B69FF';
                      } 
                      if  (coloridx === 41) {
                        return 'rgb(0,128,128)';
                      } 
                      if  (coloridx === 42) {
                        return '#E55B99';
                      } 
                      if  (coloridx === 43) {
                        return 'rgb(0,255,89)';
                      } 
                      if  (coloridx === 44) {
                        return '#B3F5D7';
                      } 
                      if  (coloridx === 45) {
                        return '#867F73';
                      } 
                      if  (coloridx === 46) {
                        return '#FF00CC';
                      } 
                      if  (coloridx === 47) {
                        return '#89E55B';
                      } 
                      if  (coloridx === 48) {
                        return 'rgb(0,119,255)';
                      } 
                      if  (coloridx === 49) {
                        return 'rgb(205,179,245)';
                      } 
                      if  (coloridx === 50) {
                        return '#868473';
                      } 
                    } else {
                      const min = georaster.mins[0];
                      const range = georaster.ranges[0];
                      // there's just one band in this raster
                      const pixelValue = pixelValues[0];
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
                  resolution: 256,  // optional parameter for adjusting display resolution
                });
                layer.addTo(glowglobe.current);
                const corner1 = layer.getBounds()._northEast; // eslint-disable-line
                const corner2 = layer.getBounds()._southWest; // eslint-disable-line
                const bounds = L.latLngBounds(corner1, corner2);
                glowglobe.current.fitBounds(bounds);
                resolveLegend(layerOptions.layer.palette, layer, 'bottomright');
              });
            })
            .catch((response) => {
          // TODO: Properly handle errors
              console.error(response); // eslint-disable-line
            });
        }
    });
  };
  */

  const onEachFeaturePolygons = function (feature, layer) { // eslint-disable-line
      layer.bindPopup("Focus Area");
  }

  const setStylePolygons = function(feature) { // eslint-disable-line
    return {
      fillColor: '#ffffff',
      color: 'rgba(230, 244, 155, 1)',
      weight: 3,
      opacity: 1,
      fillOpacity: 0.1
    };
  }

  const setStyleArea = function(feature) { // eslint-disable-line
    return {
      fillColor: '#ffffff',
      color: 'rgba(0, 166, 255, 1)',
      weight: 3,
      opacity: 1,
      fillOpacity: 0
    };
  }

  
  
  const loadLayers = async  () => {
    
    const leaflet_focus_areas = [];
     /* 
    if (left_layer.layer.type === 'geotiff' && left_layer.layer.data ) {
      const response = await getGeoTiff(left_layer.layer.project,left_layer.layer.data)
      if ( response && response.ok ) {
        const georaster = await parse_georaster(response)
        if ( georaster ) {
          const pixelValuesLegend = [];
          const scale = chroma.scale('RdGy');
          let leafletLeftLayer = new GeoRasterLayer({
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
          setLeftLayer(leafletLeftLayer);
          resolveLegend(left_layer.layer.palette, leaflet_left_layer, 'bottomleft');
        }
        if (right_layer.layer.type === 'geotiff' && right_layer.layer.data ) {
          getGeoTiff(right_layer.layer.project,right_layer.layer.data)
          .then((response) => {
            parse_georaster(response).then(georaster => {
              const pixelValuesLegend = []; // eslint-disable-line
              const scale = chroma.scale('RdGy'); // eslint-disable-line
              leaflet_right_layer = new GeoRasterLayer({
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
              leaflet_right_layer.addTo(glowglobe.current);
              if (leaflet_focus_areas && leaflet_focus_areas.length ){
                leaflet_focus_areas.forEach ( fa  =>  { 
                  fa.addTo(glowglobe.current)
                });
              }  
              resolveLegend(right_layer.layer.palette, leaflet_right_layer, 'bottomright');
              L.control.sideBySide(leaflet_left_layer, leaflet_right_layer).addTo(glowglobe.current);
              if (leaflet_focus_areas && leaflet_focus_areas.length ){
                glowglobe.current.polygons = leaflet_focus_areas;
                glowglobe.current.polygons_i = 0;
                
                L.easyButton('fa-globe', function(btn, map){ // eslint-disable-line
                  if ( map.polygons && map.polygons.length ){
                    if ( map.polygons_i > map.polygons.length -1 )
                      map.polygons_i = 0;
                    map.fitBounds(map.polygons[map.polygons_i].getBounds());
                    map.polygons_i+=1;
                  }
                }).addTo( glowglobe.current );
              }    
            })
          }) 
        }   
      } // eslint-disable-line
    }*/
  }

  const resolveLegend = (palette, layer, legend_position = 'bottomright') => {
    if (palette.type === 'LandCoverPalette') {
      legend.current = L.control.htmllegend({
        position: legend_position,
        legends: [
          {
            name: palette.label,
            layer,
            opacity: 1,
            elements: [{
              label: 'Tree-covered',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#42b05c',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Grassland',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#a0dc67',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Cropland',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#c67f5f',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Wetland',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#12AAB5',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Artificial area',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#5D7F99',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Bare land',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#f5d680',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Water body',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#67b7dc',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            ],
          },
        ],
        collapseSimple: true,
        detectStretched: false,
        collapsedOnInit: false,
        defaultOpacity: 1.0,
      })
      glowglobe.current.addControl(legend.current);
    }
    else if (palette.type === 'LandDegradationPalette') {
      legend.current = L.control.htmllegend({
        position: legend_position,
        legends: [
          {
            name: palette.label,
            layer,
            opacity: 1,
            elements: [{
              label: 'Degradation (declining)',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#d43333',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Stable, unchanging (neutral)',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#fcdd90',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Improvement (improving)',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#398e3b',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            ],
          },
        ],
        collapseSimple: true,
        detectStretched: false,
        collapsedOnInit: false,
        defaultOpacity: 1.0,
      })
      glowglobe.current.addControl(legend.current);
    }
    else if (palette.type === 'LandSuitabilityPalette') {
      legend.current = L.control.htmllegend({
        position: legend_position,
        legends: [
          {
            name: palette.label,
            layer,
            opacity: 1,
            elements: [
              {
                label: 'Suitable',
                html: '',
                style: {
                  'text-align': 'left',
                  'background-color': '#398e3b',
                  'width': '20px',
                  'height': '20px',
                  'position': 'relative',
                  'margin': '3.75px 0',
                },
              },
              {
                label: 'Marginally suitable',
                html: '',
                style: {
                  'text-align': 'left',
                  'background-color': '#fcdd90',
                  'width': '20px',
                  'height': '20px',
                  'position': 'relative',
                  'margin': '3.75px 0',
                },
              },
              {
                label: 'Unsuitable',
                html: '',
                style: {
                  'text-align': 'left',
                  'background-color': '#d43333',
                  'width': '20px',
                  'height': '20px',
                  'position': 'relative',
                  'margin': '3.75px 0',
                },
              },
            ],
          },
        ],
        collapseSimple: true,
        detectStretched: false,
        collapsedOnInit: false,
        defaultOpacity: 1.0,
      })
      glowglobe.current.addControl(legend.current);
    }
    else if (palette.type === 'FutureLandDegradationPalette') {
      legend.current = L.control.htmllegend({
        position: legend_position,
        legends: [
          {
            name: palette.label,
            layer,
            opacity: 1,
            elements: [{
              label: 'E: No data on anticipated future changes',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#fcfcfc',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'D: No action needed',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#3a8e3b',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'C: Evaluate and monitor for possible future action',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#dfdb15',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'B: Reduce or revert degradation dynamics',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#efa14c',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'A: Avoid expected degradation of areas that were stable or improving',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#d43333',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            ],
          },
        ],
        collapseSimple: true,
        detectStretched: false,
        collapsedOnInit: false,
        defaultOpacity: 1.0,
      })
      glowglobe.current.addControl(legend.current);
    }
    else if (palette.type === 'LDNBalancePalette') {
      legend.current = L.control.htmllegend({
        position: legend_position,
        legends: [
          {
            name: palette.label,
            layer,
            opacity: 1,
            elements: [{
              label: '4.Persistent',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#d43433',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: '3.Recent',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#fcdd90',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: '2.Improved',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#3a8e3b',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: '1.Not-changing',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#afafaf',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            ],
          },
        ],
        collapseSimple: true,
        detectStretched: false,
        collapsedOnInit: false,
        defaultOpacity: 1.0,
      })
      glowglobe.current.addControl(legend.current);
    }
    else if (palette.type === 'PastLDMaskedPalette') {
      legend.current = L.control.htmllegend({
        position: legend_position,
        legends: [
          {
            name: palette.label,
            layer,
            opacity: 1,
            elements: [{
              label: '-1.Degradation',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#d43433',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: '0.Stable',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#fcdd90',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: '1.Improvement',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#3a8e3b',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'No Data',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#ffffff',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            ],
          },
        ],
        collapseSimple: true,
        detectStretched: false,
        collapsedOnInit: false,
        defaultOpacity: 1.0,
      })
      glowglobe.current.addControl(legend.current);
    }
    else if (palette.type === 'LULandDegradationPalette') {
      legend.current = L.control.htmllegend({
        position: legend_position,
        legends: [
          {
            name: palette.label,
            layer,
            opacity: 1,
            elements: [{
              label: '0, No Data',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#eeeeee',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: '1,No New LD; Land Suitable: Neutral/stable',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#3a8e3b',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: '2, New LD not expected; Land marginally suitable: LU improvement advised',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#ed8f2e',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: '3,New LD! Land Not suitable: LU change required ',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#d43433',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            ],
          },
        ],
        collapseSimple: true,
        detectStretched: false,
        collapsedOnInit: false,
        defaultOpacity: 1.0,
      })
      glowglobe.current.addControl(legend.current);
    }
    else if (palette.type === 'LMLandDegradationPalette') {
      legend.current = L.control.htmllegend({
        position: legend_position,
        legends: [
          {
            name: palette.label,
            layer,
            opacity: 1,
            elements: [{
              label: '0, No Data',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#eeeeee',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: '1,No New LD; improved ES provision ',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#3a8e3b',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: '2,No New LD; LM improvement advised',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#ed8f2e',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: '3,New LD!; overall ES provision reduced, or SDG indicator negative: LM improvement required ',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#d43433',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            ],
          },
        ],
        collapseSimple: true,
        detectStretched: false,
        collapsedOnInit: false,
        defaultOpacity: 1.0,
      })
      glowglobe.current.addControl(legend.current);
    }
    else if (palette.type === 'LandUsePalette') {
      legend.current = L.control.htmllegend({
        position: legend_position,
        legends: [
          {
            name: palette.label,
            layer,
            opacity: 1,
            elements: [{
              label: 'Forest virgin or protected',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#267300',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Forestry with ag. activities',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#a7e39d',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Grasslands unmanaged or protected',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#e66000',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Grasslands with ag. activities',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#ffaa01',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Shrub cover unmanaged or protected',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#573a00',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Shrub cover with ag. activities',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#a87001',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Agricultural activities',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#df72ff',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Urban areas',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#343434',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Wetland',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#12AAB5',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Sparse areas unmanaged or protected',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#e7e600',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Sparse areas with ag. activities',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#feff73',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Bare areas unmanaged or protected',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#c7960d',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Bare areas with ag. activities',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#f5d680',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Water body',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#67b7dc',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            ],
          },
        ],
        collapseSimple: true,
        detectStretched: false,
        collapsedOnInit: false,
        defaultOpacity: 1.0,
      })
      glowglobe.current.addControl(legend.current);
    }
    else if (palette.type === 'Custom') {
      const elements = palette.legend.map(
        (item) => {
          let localColor = '#FFFFF';
          if (item.index === 0) {
            localColor = '#89E55B';
          } else if (item.index === 1) {
            localColor = '#007FFF';
          } else if (item.index === 2) {
            localColor = '#FFD12A';
          } else if (item.index === 3) {
            localColor = '#ED872D';
          } else if (item.index === 4) {
            localColor = '#A40000';
          } else if (item.index === 5) {
            localColor = '#614051';
          } else if (item.index === 6) {
            localColor = '#FC8EAC';
          } else if (item.index === 7) {
            localColor = '#DAA520';
          } else if (item.index === 8) {
            localColor = '#FFFFF0';
          } else if (item.index === 9) {
            localColor = '#00A86B';
          } else if (item.index === 10) {
            localColor = '#C3B091';
          } else if (item.index === 11) {
            localColor = '#C4C3D0';
          } else if (item.index === 12) {
            localColor = '#FFDB58';
          } else if (item.index === 13) {
            localColor = '#000080';
          } else if (item.index === 14) {
            localColor = '#808000';
          } else if (item.index === 15) {
            localColor = '#CB99C9';
          } else if (item.index === 16) {
            localColor = '#65000B';
          } else if (item.index === 17) {
            localColor = '#FF8C69';
          } else if (item.index === 18) {
            localColor = '#008080';
          } else if (item.index === 19) {
            localColor = '#5B92E5';
          } else if (item.index === 20) {
            localColor = '#8F00FF';
          } else if (item.index === 21) {
            localColor = '#F5DEB3';
          } else if (item.index === 22) {
            localColor = '#738678';
          } else if (item.index === 23) {
            localColor = '#FFFF00';
          } else if (item.index === 24) {
            localColor = '#00fff7';
          } else if (item.index === 25) {
            localColor = '#d8ff2a';
          } else if (item.index === 26) {
            localColor = '#ed602d';
          } else if (item.index === 27) {
            localColor = '#99a400';
          } else if (item.index === 28) {
            localColor = '#504061';
          } else if (item.index === 29) {
            localColor = 'rgb(252,142,172)';
          } else if (item.index === 30) {
            localColor = 'rgb(218,165,32)';
          } else if (item.index === 31) {
            localColor = 'rgb(255,255,240)';
          } else if (item.index === 32) {
            localColor = 'rgb(0,168,107)';
          } else if (item.index === 33) {
            localColor = 'rgb(195,176,145)';
          } else if (item.index === 34) {
            localColor = '#432f96';
          } else if (item.index === 35) {
            localColor = 'rgb(255,219,88)';
          } else if (item.index === 36) {
            localColor = '#80007a';
          } else if (item.index === 37) {
            localColor = 'rgb(128,128,0)';
          } else if (item.index === 38) {
            localColor = '#25463b';
          } else if (item.index === 39) {
            localColor = '#005665';
          } else if (item.index === 40) {
            localColor = '#9b69ff';
          } else if (item.index === 41) {
            localColor = 'rgb(0,128,128)';
          } else if (item.index === 42) {
            localColor = '#e55b99';
          } else if (item.index === 43) {
            localColor = 'rgb(0,255,89';
          } else if (item.index === 44) {
            localColor = '#b3f5d7';
          } else if (item.index === 45) {
            localColor = '#867f73';
          } else if (item.index === 46) {
            localColor = '#ff00cc';
          } else if (item.index === 47) {
            localColor = '#89e55b';
          } else if (item.index === 48) {
            localColor = 'rgb(0,119,255)';
          } else if (item.index === 49) {
            localColor = 'rgb(205,179,245)';
          } else if (item.index === 50) {
            localColor = '#868473';
          }
          const element = {
            label: item.label,
            html: '',
            style: {
              'text-align': 'left',
              'background-color': localColor,
              'width': '20px',
              'height': '20px',
              'position': 'relative',
              'margin': '3.75px 0',
            },
          }
          return element;
        }
      )
      const tmpLegend = {
        name: palette.label,
        layer,
        opacity: 1,
        elements,
      }
      legend.current = L.control.htmllegend({
        position: legend_position,
        legends: [
          tmpLegend,
        ],
        collapseSimple: true,
        detectStretched: false,
        collapsedOnInit: false,
        defaultOpacity: 1.0,
      });
      glowglobe.current.addControl(legend.current);
    }
  }

  useEffect(() => {
    loadLayers();
  }, [layers]); // eslint-disable-line


  if ( !leftLayer || !rightLayer ) 
    return <Loading />


  return (
    <div>
      <MapContainer
        zoom={2}
        center={position}
        scrollWheelZoom
        whenCreated={setMap}
        style={{ height: '600px' }}
      />
        {(area) && (
          <GeoJSON 
            key="Roi"
            data={area}
            style={setStyleArea}
          />
        )}
        {(polygons.length > 0) && polygons.map((poly,index)=> (
          <GeoJSON 
            key={'poly'+index}
            onEachFeature={onEachFeature}
            data={poly}
            style={setStylePolygons}
          />
        ))}
        <SideBySide sidebysideRef={sidebyside} leftLayer={leftLayer} rightLayer={rightLayer} />


    </div>

  );
};

export default Glowglobe;