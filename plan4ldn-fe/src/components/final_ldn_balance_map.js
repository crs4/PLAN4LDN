"use client"

import React, { useState, useContext, useEffect, useRef } from 'react';
import { Toast } from 'primereact/toast';
import { Card } from 'primereact/card';
import { useTranslations } from 'next-intl';
import { UserContext } from '../context/user';
import { useRouter } from 'next/navigation';
import Reprocess from './reprocess';
import LayersBalanceHectaresTable from './tables/LayersBalanceHectaresTable';
import { DATAMODIFIED, getProjectFocusAreasPolygons }  from '../services/projects';
import { getScenarios } from '../services/scenarios'; 
import { getGeoJsonPolygon } from '../services/files';
import dynamic from 'next/dynamic'

const Map = dynamic(() => import('../components/maps/sidebysidemap'), {ssr: false})

const FinalLDNBalanceMap = ( ) => {
  const t  = useTranslations('default');
  const { token, currentProject } = useContext(UserContext);
  const [maps, setMaps] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useRef();
  const router = useRouter();

  const getScenarioPolygons = async (prj_id) => {
     const changeUseList = [];
     try {    
         const responseSc = await getScenarios(prj_id, token);
         if (responseSc.ok && responseSc.data && responseSc.data.data) { 
           const scenarios = responseSc.data.data.map((sc) => sc.content);
           for (let j = 0; j < scenarios.length; j += 1) {
             const sc = scenarios[j];
             for (let i = 0; i < sc.landTypes.length; i += 1) {
               const transition = sc.landTypes[i];
               for (let b = 0; b < transition.breakDown.length; b += 1) {
                 const breakDownEntry = transition.breakDown[b];
                 if (breakDownEntry.landCoverage.file_id) {
                   const response = await getGeoJsonPolygon(currentProject.id, breakDownEntry.landCoverage.file_id, token); // eslint-disable-line
                   if ( response.ok && response.data && response.data.data ){
                     const plg = response.data.data
                     if (plg) {
                       changeUseList.push({
                         name: breakDownEntry.landId + ' to ' + transition.landId, // eslint-disable-line
                         geojson: plg,
                       });
                     }
                   }
                 }
               }
             }
           }
         }
     } catch (error) {
       console.log(error)
       return [];
     }
     return changeUseList;
   }  
  
  const fetchMaps = async () => {
    try {
      setIsLoading(true)
      let fa_polygons = [];
      const response = await getProjectFocusAreasPolygons(currentProject.id, token);
      if ( response.ok && response.data && response.data.data )
        fa_polygons = response.data.data;
      const cu_polygons = await getScenarioPolygons(currentProject.id, token);
      const mymaps = [
        {
          link: currentProject.preprocessing_data.past_ld_masked, 
          project: currentProject.id, 
          label: 'Past LD ',
          paletteType: 'PastLDMaskedPalette',
        },
        {
          link: currentProject.preprocessing_data.final_ldn_balance, 
          project: currentProject.id, 
          label: 'Final LDN Balance',
          paletteType: 'LDNBalancePalette',
        },
        {
          geojson: currentProject.polygon,
          label: 'Project Area',
        },
      ];
      if ( fa_polygons && fa_polygons.length) {
        for ( let fa = 0 ; fa < fa_polygons.length; fa += 1 )  {
          let mf = fa_polygons[fa]
          if (mf)
            mymaps.push({
              geojson: mf.geojson,
              label: mf.name,
              contest: 'focusarea',
            });
        } 
      }
      if ( cu_polygons && cu_polygons.length) {
        for ( let cu = 0 ; cu < cu_polygons.length; cu += 1 )  {
          if ( cu_polygons[cu] )
            mymaps.push({
              geojson: cu_polygons[cu].geojson,
              label: cu_polygons[cu].name,
              contest: 'changeuse',
            });
        }
      }
      setMaps(mymaps); 
    } catch (error) {
      console.log(error);
    }
    setIsLoading(false);
  
  }

  useEffect(() => {
    if ( !token ) 
      router.push(`/login`);
    else 
      if (currentProject)
        fetchMaps();
  }, [currentProject, token]); // eslint-disable-line 

  
  if (!currentProject ) {
    return <></>;
  }
  if (!currentProject.preprocessing_data) 
  {
    return <></>;
  }
  if ( !currentProject.status === DATAMODIFIED ) 
  {
      return <Reprocess/>
  }

  
  let title = 'Hectares table ';
  let hlu = currentProject.preprocessing_data.past_ld_mask_hectares_per_class;
  let hlb = currentProject.preprocessing_data.final_ldn_balance_hectares_per_class; 
  if ( !hlu ) {
    hlu = [];  
  }
  if ( !hlb ) {
    hlb = [];
  }

// hlu: 
// v['0'] no data ,
//  v:['1'..'n']  value "-1" for land uses;  
//  v:['n+1'..'n*2']  value "0" for land uses;  
//  v:['2*n+1'..'n*3']  value "1" for land uses;
//  hlb: 
//  v:['0'] no data ,
//  v:['1'..'n']  value "1:Un-changing" for land uses ;  
//  v:['n+1'..'2*n']  value "2:Improved" for land uses ;  
//  v:['2*n+1'..'3*n']  value "3:Recent" for land uses;
//  v:['3*n+1'..'4*n']  value "4:Persistent" land uses ;

  const n = currentProject.preprocessing_data.lu_classes_nr;
  const values = [];  // 
  for (let index = 0; index < n; index+=1) {
    values[(5*index)] = (hlu[index+1]? hlu[index+1] : 0);
    values[(5*index + 1)] = (hlb[(index+1)]? hlb[(index+1)] : 0);
    values[(5*index + 2)] = (hlb[(n+index+1)]? hlb[(n+index+1)] : 0);
    values[(5*index + 3)] = (hlb[(n*2+index+1)]? hlb[(n*2+index+1)] : 0);
    values[(5*index + 4)] = (hlb[(n*3+index+1)]? hlb[(n*3+index+1)] : 0);  
  }
  const hectaresValues = [];
  let lu_classes = [];
  if ( currentProject.lu_classes ) {
       // !!!!class key ordering
     currentProject.lu_classes.sort((a, b) => parseInt(a.value,10) - parseFloat(b.value,10));
     currentProject.lu_classes.forEach(element => {
         lu_classes.push(element.key);
     });
  }  
  else lu_classes = ['Tree-Covered','Grassland','Cropland','Artificial area','Wetland','Bare land','Water body']
  title = 'Hectares table (No Data: ' + String(hlu[0]? hlu[0] : 0) + ' hectares)'; // eslint-disable-line
  let index = 0;
  const total = [0,0,0,0,0];
  for ( const cls in lu_classes ) { 
    hectaresValues.push ({ 
      class1: lu_classes[cls], 
      v1: values[5*index] , 
      v2: values[5*index+4], 
      v3: values[5*index+3], 
      v4: values[5*index+2], 
      v5: values[5*index+1],
      v6: values[5*index]-values[5*index+4]-values[5*index+3],
      v7: values[5*index]-values[5*index+4]-values[5*index+3]+values[5*index+2], 
    });
    total[0] += values[5*index];
    total[1] += values[5*index+4];
    total[2] += values[5*index+3];
    total[3] += values[5*index+2];
    total[4] += values[5*index+1];
    index+=1;
  }  
  hectaresValues.push ( { 
    class1: 'Total', 
    v1: total[0] , 
    v2: total[1] , 
    v3: total[2] , 
    v4: total[3] , 
    v5: total[4] ,
    v6: total[0]-total[1]-total[2],
    v7: total[0]-total[1]-total[2]+total[3],
  });

  const headers = ['Class Name','Past LD','Persistent','Recent','Improved','Not changing','Balance 1','Balance 2'];

  return (
    <>
    <Toast ref={toast} position="top-right" />
    <Card>
    <div className="grid justify-content-between mt-2 px-3">
      <div>
        <h4>Past LD</h4>
      </div>
      <div>
        <h4>Final LDN Balance</h4>
      </div>
    </div>
    <Map
      type='side-by-side'
      maps={maps}
      customLuClasses={currentProject.lu_classes}
    />
    </Card>
    <LayersBalanceHectaresTable
        hectares={hectaresValues}
        headers={headers}
        title={title}
        className="mb-4"
    />
    <div className="mt-2 px-3">
      <h6>Balance 1 = Past LD - Persistent - Recent</h6>
      <h6>Balance 2 = Past LD - Persistent - Recent + Improvement</h6>
    </div>
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

export default FinalLDNBalanceMap;
