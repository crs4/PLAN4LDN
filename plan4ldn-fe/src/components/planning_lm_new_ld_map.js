"use client"

import React, { useState, useContext, useEffect, useRef } from 'react';
import { Toast } from 'primereact/toast';
import { Card } from 'primereact/card';
import { useTranslations } from 'next-intl';
import { UserContext } from '../context/user';
import { useRouter } from 'next/navigation'; 
import Reprocess from './reprocess'
import LayersDifferenceHectaresTable from './tables/LayersDifferenceHectaresTable';
import { DATAMODIFIED, getProjectFocusAreasPolygons }  from '../services/projects';
import dynamic from 'next/dynamic'

const Map = dynamic(() => import('../components/maps/sidebysidemap'), {ssr: false})

const PlanningLMNewLDMap = () => {
  const [maps, setMaps] = useState([]);
  const t = useTranslations('default');
  const { token, currentProject } = useContext(UserContext);
  const toast = useRef();
  const router = useRouter();

  useEffect(() => {
    if ( !token ) 
      router.push(`/login`);
    if ( currentProject && currentProject.preprocessing_data )
      fetchMaps();
  }, [ currentProject, token ]);  // eslint-disable-line 
  
  if ( !currentProject || !currentProject.preprocessing_data ) {
    return <></>;
  }

  const fetchMaps = async () => {
    try {
      const { data } = await getProjectFocusAreasPolygons(currentProject.id, token);
      const mymaps = [
        {
          link: currentProject.preprocessing_data.bau_future_ld, 
          project: currentProject.id, 
          label: 'BAU Future LD',
          paletteType: 'FutureLandDegradationPalette',
        },
        {
          link: currentProject.preprocessing_data.plan_lm_future_ld,
          project: currentProject.id, 
          label: 'Planning LM Future LD',
          paletteType: 'FutureLandDegradationPalette',
        },
        {
          geojson: currentProject.polygon,
          label: 'Project Area',
        },
      ];
      if ( data )
        for ( let i = 0; i < data.length; i += 1 ){
          let fa = data[i];
          mymaps.push({
            geojson: fa.geojson,
            label: fa.name,
            contest: 'focusarea',
          });
        }
      setMaps(mymaps); 
    } catch (error) {
      console.log(error);
    }
  }
  
  const hbau = currentProject.preprocessing_data.bau_future_ld_hectares_per_class;
  const hfut = currentProject.preprocessing_data.plan_lm_future_ld_hectares_per_class;
  const hf1 = [];
  if ( hbau ) {
    hf1.A = (hbau['1']? hbau['1'] : 0) + (hbau['2']? hbau['2'] : 0);
    hf1.B = (hbau['3']? hbau['3'] : 0) + (hbau['4']? hbau['4'] : 0);
    hf1.C = (hbau['5']? hbau['5'] : 0) + (hbau['6']? hbau['6'] : 0) + (hbau['7']? hbau['7'] : 0);
    hf1.D = (hbau['8']? hbau['8'] : 0) + (hbau['9']? hbau['9'] : 0);
    hf1.E = (hbau['10']? hbau['10'] : 0) + (hbau['11']? hbau['11'] : 0) + (hbau['12']? hbau['12'] : 0);
  } 
  const hf2 = [];
  if ( hfut ) { 
    hf2.A = (hfut['1']? hfut['1'] : 0) + (hfut['2']? hfut['2'] : 0);
    hf2.B = (hfut['4']? hfut['4'] : 0) + (hfut['3']? hfut['3'] : 0);
    hf2.C = (hfut['5']? hfut['5'] : 0) + (hfut['7']? hfut['7'] : 0) + (hfut['6']? hfut['6'] : 0);
    hf2.D = (hfut['9']? hfut['9'] : 0) + (hfut['8']? hfut['8'] : 0);
    hf2.E = (hbau['12']? hbau['12'] : 0) + (hfut['10']? hfut['10'] : 0) + (hfut['11']? hfut['11'] : 0);
  }
  
  const hectaresValues = [
    { class1: 'Class A' , value1: hf1.A , value2: hf2.A }, 
    { class1: 'Class B' , value1: hf1.B , value2: hf2.B },
    { class1: 'Class C' , value1: hf1.C , value2: hf2.C },
    { class1: 'Class D' , value1: hf1.D , value2: hf2.D },
    { class1: 'Class E' , value1: hf1.E , value2: hf2.E },
  ]
  
  const headers = ['Class Name','BAU Future LD','Planning LM Future LD'];

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
            title="Hectares gain table"
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

export default PlanningLMNewLDMap;
