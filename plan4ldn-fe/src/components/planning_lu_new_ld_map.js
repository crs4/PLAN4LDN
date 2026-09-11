"use client"

import React, { useState, useContext, useEffect, useRef } from 'react';
import { Toast } from 'primereact/toast';

import { Card } from 'primereact/card';
import { useTranslations } from 'next-intl';
import { UserContext } from '../context/user';
import { useRouter } from 'next/navigation';
import Reprocess from './reprocess';
import LayersDifferenceHectaresTable from './tables/LayersDifferenceHectaresTable';
import { DATAMODIFIED }  from '../services/projects';
import { getScenarios } from '../services/scenarios';
import { getGeoJsonPolygon } from '../services/files';
import dynamic from 'next/dynamic'

const Map = dynamic(() => import('../components/maps/sidebysidemap'), {ssr: false})

const PlanningLUNewLDMap = () => {
  const [maps, setMaps] = useState([]);
  const t = useTranslations('default');
  const { token, currentProject } = useContext(UserContext);
  const toast = useRef();
  const router = useRouter();
  
  const getScenarioPolygons = async (prj_id) => {
    const changeUseList = [];
    try {    
      const response = await getScenarios(prj_id, token);
      if ( response && response.data && response.data.data ) {
        const data = response.data.data;
        const scenarios = data.map((sc) => sc.content);
        for (let j = 0; j < scenarios.length; j += 1) {
          const sc = scenarios[j];
          for (let i = 0; i < sc.landTypes.length; i += 1) {
            const transition = sc.landTypes[i];
            for (let b = 0; b < transition.breakDown.length; b += 1) {
              const breakDownEntry = transition.breakDown[b];
              if (breakDownEntry.landCoverage.file_id) {
                const plg = await getGeoJsonPolygon(currentProject.id, breakDownEntry.landCoverage.file_id, token); // eslint-disable-line
                changeUseList.push({
                  name: breakDownEntry.landId + ' to ' + transition.landId, // eslint-disable-line
                  geojson: plg,
                });
              }
            }
          }
        };
      }
    } catch (error) {
      console.log(error)
      toast.current.show({ severity: 'error', summary: 'Oops!',
        detail: 'Error reading scenarios polygons',
      });
      return [];
    }
    return changeUseList;
  }

  const fetchMaps = async () => {
    try {
      const response = await getScenarioPolygons(currentProject.id);
      const cu_polygons = [];
      if (response.ok) 
        cu_polygons = response.data.data;
      const mymaps = [
        {
          link: currentProject.preprocessing_data.bau_future_ld, 
          project: currentProject.id, 
          label: 'BAU Future LD',
          paletteType: 'FutureLandDegradationPalette',
        },
        {
          link: currentProject.preprocessing_data.plan_lu_future_ld,
          project: currentProject.id, 
          label: 'Planning LU Future LD',
          paletteType: 'FutureLandDegradationPalette',
        },
        {
          geojson: currentProject.polygon,
          label: 'Project Area',
        },
      ];
      for ( let i = 0; i < cu_polygons.length; i += 1 ){
        let cu = cu_polygons[i];
        mymaps.push({
          geojson: cu.geojson,
          label: cu.name,
          contest: 'changeuse',
        });
      }  
      setMaps(mymaps); 
    } catch (error) {
      console.log(error);
    }
  }
  
  useEffect(() => {
    if ( !token ) 
      router.push(`/login`);
    if ( currentProject && currentProject.preprocessing_data )
      fetchMaps();
  }, [ currentProject, token ]);  // eslint-disable-line 

  if ( !currentProject || !currentProject.preprocessing_data ) {
    return <></>;
  }
  
  const hbau = currentProject.preprocessing_data.bau_future_ld_hectares_per_class;
  const hfut = currentProject.preprocessing_data.plan_lu_future_ld_hectares_per_class;
  const hf1 = [];
  if ( hbau ) {
    hf1.A = (hbau['1']? hbau['1'] : 0) + (hbau['2']? hbau['2'] : 0);
    hf1.B = (hbau['3']? hbau['3'] : 0) + (hbau['4']? hbau['4'] : 0);
    hf1.C = (hbau['5']? hbau['5'] : 0) + (hbau['6']? hbau['6'] : 0) + (hbau['7']? hbau['7'] : 0);
    hf1.D = (hbau['8']? hbau['8'] : 0) + (hbau['9']? hbau['9'] : 0);
    hf1.E = (hbau['10']? hbau['10'] : 0) + (hbau['11']? hbau['11'] : 0) + (hbau['12']? hbau['12'] : 0) + (hbau['0']? hbau['0'] : 0) + (hbau['-32768']? hbau['-32768'] : 0);
  } 
  const hf2 = [];
  if ( hfut ) { 
    hf2.A = (hfut['1']? hfut['1'] : 0) + (hfut['2']? hfut['2'] : 0);
    hf2.B = (hfut['4']? hfut['4'] : 0) + (hfut['3']? hfut['3'] : 0);
    hf2.C = (hfut['5']? hfut['5'] : 0) + (hfut['7']? hfut['7'] : 0) + (hfut['6']? hfut['6'] : 0);
    hf2.D = (hfut['9']? hfut['9'] : 0) + (hfut['8']? hfut['8'] : 0);
    hf2.E = (hbau['12']? hbau['12'] : 0) + (hfut['10']? hfut['10'] : 0) + (hfut['11']? hfut['11'] : 0) + (hbau['0']? hbau['0'] : 0) + (hbau['-32768']? hbau['-32768'] : 0);
  }
  
  const hectaresValues = [
    { class1: 'Class A' , value1: hf1.A , value2: hf2.A }, 
    { class1: 'Class B' , value1: hf1.B , value2: hf2.B },
    { class1: 'Class C' , value1: hf1.C , value2: hf2.C },
    { class1: 'Class D' , value1: hf1.D , value2: hf2.D },
    { class1: 'Class E' , value1: hf1.E , value2: hf2.E },
  ]
  
  const headers = ['Class Name','BAU Future LD','Planning LU Future LD'];
   

  return (
    <>
      <Toast ref={toast} position="top-right" />
      <Card>
        <div className="grid">
          <div className="col-6 text-center p-3">
            <h4>{ maps[0] ? maps[0].label : 'Errors loading map' }</h4>
          </div>
          <div className="col-6 text-center p-3">
            <h4>{ maps[1] ? maps[1].label : 'Errors loading map' }</h4>
          </div>
        </div>
        <Map
          type='side-by-side'
          maps={maps}
          customLuClasses={currentProject.lu_classes}
        />
        { hectaresValues && (
        <LayersDifferenceHectaresTable
            hectares={hectaresValues}
            headers={headers}
            title="Hectares table"
            className="p-mb-4"
        />
        )}
      </Card>
    </>
  );
}

export async function getStaticProps(context) {
  return {
    props: { 
      messages: (await import(`../translations/${context.locale}.json`)).default
     },
  }
}

export default PlanningLUNewLDMap;
