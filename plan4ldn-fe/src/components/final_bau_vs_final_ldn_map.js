"use client"
import React, { useState, useContext, useEffect, useRef } from 'react';
import Reprocess from './reprocess';
import LayersDifferenceHectaresTable from './tables/LayersDifferenceHectaresTable';
import { DATAMODIFIED, getProjectFocusAreasPolygons }  from '../services/projects';
import { getScenarios } from '../services/scenarios';
import { getGeoJsonPolygon } from '../services/files';
import { Toast } from 'primereact/toast';
import { Card } from 'primereact/card';

import { useTranslations } from 'next-intl';
import { UserContext } from '../context/user';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic'

const Map = dynamic(() => import('../components/maps/sidebysidemap'), {ssr: false})

const BAUvsFinalLDNBalanceMap = () => {
  const [maps, setMaps] = useState(null);
  const t = useTranslations('default');
  const { token, currentProject } = useContext(UserContext);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useRef();
  const router = useRouter();
  
  useEffect(() => {
    if ( !token ) 
      router.push(`/login`);
    else 
      if (currentProject)
        fetchMaps();
  }, [currentProject, token]); // eslint-disable-line  
  
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
      setIsLoading(true)
      let fa_polygons = [];
      const response = await getProjectFocusAreasPolygons(currentProject.id, token);
      if ( response.ok && response.data && response.data.data )
        fa_polygons = response.data.data;
      const cu_polygons = await getScenarioPolygons(currentProject.id, token);
      const mymaps = [
        {
          link: currentProject.preprocessing_data.bau_ldn_balance, 
          project: currentProject.id, 
          label: 'BAU LDN Balance',
          paletteType: 'LDNBalancePalette',
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
      console.log(error)
      toast.current.show({ severity: 'danger', summary:'Error!', detail: handleError(error) })
    }
    setIsLoading(false)
  }

  /// no data no party
  if (!currentProject ) {
    return <><Toast ref={toast} position="top-right" /></>;
  }
  if (!currentProject.preprocessing_data ) {
    return <><Toast ref={toast} position="top-right" /></>;
  }
  if ( currentProject.status === DATAMODIFIED ) {
      return <Reprocess/>
  }

  const hlu = currentProject.preprocessing_data.bau_ldn_balance_hectares_per_class;
  const hnew = currentProject.preprocessing_data.final_ldn_balance_hectares_per_class;
  const n = currentProject.preprocessing_data.lu_classes_nr;
  const bau = [0,0,0,0,0];
  const final = [0,0,0,0,0];
  // step lu_classes_nr, 5 classes  
  if ( hlu ) {
    for (let index = 1; index <= n; index+=1) { 
      bau[3] += (hlu[index]? hlu[index] : 0);
      bau[2] += (hlu[(index+n)]? hlu[(index+n)] : 0);
      bau[1] += (hlu[(index+n*2)]? hlu[(index+n*2)] : 0);
      bau[0] += (hlu[(index+n*3)]? hlu[(index+n*3)] : 0);
    }
    bau[4] = (hlu['0']? hlu['0'] : 0);      
  }  
  if ( hnew ) {
    for (let index = 1; index <= n; index+=1) {
      final[3] += (hnew[index]? hnew[index] : 0);
      final[2] += (hnew[(index+n)]? hnew[(index+n)] : 0);
      final[1] += (hnew[(index+n*2)]? hnew[(index+n*2)] : 0);
      final[0] += (hnew[(index+n*3)]? hnew[(index+n*3)] : 0);
    }
    final[4] = (hnew['0']? hnew['0'] : 0);      
  }   
  const hectaresValues = [
    { class1: 'Persistent' , value1: bau[0] , value2: final[0]}, 
    { class1: 'Recent' , value1: bau[1] , value2: final[1]},
    { class1: 'Improved' , value1: bau[2] , value2: final[2]},
    { class1: 'Not-changing' , value1: bau[3] , value2: final[3]},
    { class1: 'No Data' , value1: bau[4] , value2: final[4]},
  ]

  const headers = ['Class Name','BAU LDN Balance','Final LDN Balance'];

  return (
    <> 
    <Toast ref={toast} position="top-right" />
    <Card>
      <div className="grid">
        <div className="col-12"> 
        { isLoading && ( 
          <i className="pi pi-spin pi-spinner text-center" style={{ fontSize: '4em' }} />
        )} 
        </div>
        <div className="col-6 text-center p-3">
          <h4> BAU LDN Balance </h4>
        </div>
        <div className="col-6 text-center p-3">
          <h4> Final LDN Balance </h4>
        </div>
      </div>
      <Map
        type='side-by-side'
        maps={maps}
        customLuClasses={currentProject.lu_classes}
      />
    </Card>
    <LayersDifferenceHectaresTable
        hectares={hectaresValues}
        headers={headers}
        title="Hectares table"
        className="mb-4"
    />
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

export default BAUvsFinalLDNBalanceMap;
