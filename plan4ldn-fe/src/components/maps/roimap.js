"use client"

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { bbox, point, polygon, multiPolygon, booleanPointInPolygon, booleanIntersects } from '@turf/turf';
// Geoman
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
//import './leaflet-extensions/Leaflet.Control.Custom';
// Mask
import './leaflet-extensions/mask/leaflet.mask';
// Legends
import './leaflet-extensions/htmllegend/L.Control.HtmlLegend';
// EasyButton
//import './leaflet-extensions/easybutton/easy-button';
// Leaflet Basemap Providers
import 'leaflet-providers';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/router';
import { GeoJSON } from 'react-leaflet/GeoJSON';
        
const GeomanControl = ({ toolbarRef, output, isValidPoint, isValidBox, setMapData, setAdminLevel }) => {
  const map = useMap();
  const toolOptions = {
      position: 'topleft', 
      oneBlock: true,
      drawMarker: false,
      drawCircleMarker: true,
      drawPolyline: false,
      drawPolygon: false,
      drawCircle: false,
      drawText: false,
      editMode: false,
      dragMode: false,
      cutPolygon: false,
      removalMode: false,
      rotateMode: false,    
  }
  const initializeAdministratorSelector = () => {
    const actions = [
      'cancel',
      {
        text: 'Administration Level 1',
        onClick: async () => {
          await setAdminLevel(1);
          const classes = map.pm.Toolbar.getButtons().AdministrationLevelSelector.buttonsDomNode.firstChild.firstChild.className.split(' ');
          const filteredClasses = classes.filter(
            (item) => !item.startsWith('admin-level')
          )
          filteredClasses.push('admin-level-1');
          map.pm.Toolbar.getButtons().AdministrationLevelSelector.buttonsDomNode.firstChild.firstChild.className = filteredClasses.join(' ');
        },
      },
      {
        text: 'Administration Level 2',
        onClick: () => {
          setAdminLevel(2);
          const classes = map.pm.Toolbar.getButtons().AdministrationLevelSelector.buttonsDomNode.firstChild.firstChild.className.split(' ');
          const filteredClasses = classes.filter(
            (item) => !item.startsWith('admin-level')
          )
          filteredClasses.push('admin-level-2');
          map.pm.Toolbar.getButtons().AdministrationLevelSelector.buttonsDomNode.firstChild.firstChild.className = filteredClasses.join(' ');
        },
      },
    ];
    const toolbarOptions = {
      name: 'AdministrationLevelSelector',
      block: 'draw',
      title: 'Admin Level Selector',
      toggle: true,
      className: 'admin-level-1',
      actions,

    };
    map.pm.Toolbar.createCustomControl(toolbarOptions);
  };

  const geomanControl = L.Control.extend({
    options: {},
    initialize(options) {
      L.setOptions(this, options);
    },
    addTo(map) {
      map.output = output,
      map.isValidBox = isValidBox,
      map.isValidPoint = isValidPoint,
      map.pm.addControls({
        ...this.options,
      });
      map.pm.setGlobalOptions({ snappable: false });
      initializeAdministratorSelector();
      map.on('pm:drawstart', (e) => {
        map.pm.getGeomanDrawLayers(false).forEach(
          (geomanLayer) => {
            map.removeLayer(geomanLayer);
          }
        )
      })
      map.on('pm:create', async (e) => {
        map.pm.disableDraw();
        if ( map.output) 
        {
          const geojson = e.layer.toGeoJSON();
          if (( geojson.geometry.type === 'Polygon' &&
                map.isValidBox(geojson) === true ) ||
              ( geojson.geometry.type === 'Point' &&
                map.isValidPoint(geojson) === true ))
          {
            setMapData( await map.output(geojson));
          }
        }  
        map.pm.getGeomanDrawLayers(false).forEach(
          (geomanLayer) => {map.removeLayer(geomanLayer);})
      });
    }, 
  })
  const toolbar = function(opts) {
    return new geomanControl(opts);
  }

  useEffect(() => {
    if (!map || !map.pm || toolbarRef.current )
      return;
    toolbarRef.current = (toolbar(toolOptions)).addTo(map);
  }, [map, toolbarRef]); // eslint-disable-line 
//toolbarOptions
  return null  
};

const MapLegend = ({ legendRef }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || legendRef.current ) 
      return;
    let JSONlayer = null;
    map.eachLayer(function (layer) {
      if (layer.key === 'areas' ){
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
    if (!map || !data ) 
      return;
    if ( maskRef.current )
      map.removeLayer(maskRef.current)
    maskRef.current = L.mask(data, {
        map: map, fitBounds: true,
    }).addTo(map);
  }, [map, data, maskRef]);
  return null  
};

export default function S4Mmap ({areas, setAdminLevel, output}) {
  let bounds = [[38.5, 8.5],[ 39.5, 9.5]];
  const [mapData, setMapData] = useState(areas)
  const router = useRouter();
  const t = useTranslations('default');
  const geojson = useRef(null); 
  const legend = useRef(null); 
  const mask = useRef(null);
  const events = useRef(null); 
  const toolbar = useRef(null);
  const bboxArray = bbox(areas);
  bounds = [[bboxArray[1], bboxArray[0]], [bboxArray[3], bboxArray[2]]];

  const setStyle = ({ properties }) => {
    return {
      "color": "#2266ff'",
      "weight": 2,
      "fillOpacity": 0.1,
      "fillColor": "#6699ff"
    };
  };
  
  let zoom = 7;

  const isValidPoint = (pin) => {
      const pt = point(pin.geometry.coordinates);
      let isValid = false;
      for (let geoIndex = 0; geoIndex < mapData.features.length; geoIndex += 1) {
        const feature = mapData.features[geoIndex];
        if (feature.geometry.type === 'MultiPolygon') {
          const turfShape = multiPolygon(feature.geometry.coordinates);
          if (booleanPointInPolygon(pt, turfShape) === true) {
            isValid = true;
            break;
          };
        } else if (feature.geometry.type === 'Polygon') {
          const turfShape = polygon(feature.geometry.coordinates);
          if (booleanPointInPolygon(pt, turfShape) === true) {
            isValid = true;
            break;
          };
        }
      }
      return isValid;
  }
    
  const isValidBox = (box) => {
    const plg = polygon(box.geometry.coordinates);
    let isValid = false;
    if ( mapData )
    for (let geoIndex = 0; geoIndex < mapData.features.length; geoIndex += 1) {
      const feature = mapData.features[geoIndex];
      if (feature.geometry.type === 'MultiPolygon') {
        const turfShape = multiPolygon(feature.geometry.coordinates);
        if (booleanIntersects(plg, turfShape) === true) {
          isValid = true;
          break;
        };
      } else if (feature.geometry.type === 'Polygon') {
        const turfShape = polygon(feature.geometry.coordinates);
        if (booleanIntersects(plg, turfShape) === true) {
          isValid = true;
          break;
        };
      }
    }
    return isValid;
  }
    
  function onEachFeature (feature, layer) {
    const popupOptions = {
      minWidth: 50,
    };
    if (feature.properties) {
      let name = "no name"
      if ( feature.properties.name_1 )
        name = feature.properties.name_1;
      if ( feature.properties.name_2 )
        name = feature.properties.name_2;
      layer.bindPopup(() => {
        return name;
      }, popupOptions);
    }
  }

  useEffect(() => {
    setMapData(areas)
  }, [areas]); // eslint-disable-line

  useEffect(() => {
    if ( !geojson.current )
      return;
    geojson.current.clearLayers();
    //geojson.current.setMapData(mapData);
  }, [mapData]); // eslint-disable-line
        
  return (
    <>
      <MapContainer
        doubleClickZoom={false}
        id='RoiSelector'
        zoom={zoom}
        bounds={bounds}
        style={{ height: '600px' }}
      > 
        <TileLayer
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <GeomanControl toolbarRef={toolbar} isValidPoint={isValidPoint} setMapData={setMapData} isValidBox={isValidBox} output={output} setAdminLevel={setAdminLevel} /> 
            
        {mapData && (
          <>
          <GeoJSON
            key="areas"
            ref={geojson} 
            onEachFeature={onEachFeature}
            data={mapData}
            style={setStyle}
          />
          <MapLegend legendRef={legend} />
          <Mask maskRef={mask} data={mapData}/>
          </>
        )}
            
      </MapContainer>
    </>  
  );
};


        