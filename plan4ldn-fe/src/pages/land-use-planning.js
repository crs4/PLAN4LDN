"use client"

import React, { useContext, useState, useEffect, useRef } from 'react';
import { TabView, TabPanel } from 'primereact/tabview';
import { Card } from 'primereact/card';
import { Toast } from 'primereact/toast';
import { Message } from 'primereact/message';

import Reprocess from '../components/reprocess';
import PlanForLDN from '../components/plan_for_ldn';
import LayersDifferenceHectaresTable from '../components/tables/LayersDifferenceHectaresTable';
import PlanningLUNewLDMap from '../components/planning_lu_new_ld_map';
import PlanningLMNewLDMap from '../components/planning_lm_new_ld_map';

import { DATAMODIFIED }  from '../services/projects';
import { getScenarios } from '../services/scenarios';
import { getGeoJsonPolygon } from '../services/files';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { UserContext } from '../context/user';
import dynamic from 'next/dynamic'
import { handleError } from '../utilities/errors';

const Map = dynamic(() => import('../components/maps/sidebysidemap'), {ssr: false})

const PlanningBasedNewLUMap = () => {
  const t = useTranslations('default');
  const [maps, setMaps] = useState([]); 
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const toast = useRef()
  const { token, currentProject } = useContext(UserContext);
  
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
    setIsLoading(true)
    try {
      const cu_polygons = await getScenarioPolygons(currentProject.id);
      const mymaps = [
        {
          link: currentProject.preprocessing_data.base_lu, 
          project: currentProject.id, 
          label: 'Baseline Land Use ',
          paletteType: 'LandCoverPalette',
          customLuClasses: currentProject.lu_classes,
        },
        {
          link: currentProject.preprocessing_data.plan_newlu, 
          project: currentProject.id, 
          label: 'Planning Based Future Land Use',
          paletteType: 'LandCoverPalette',
          customLuClasses: currentProject.lu_classes,
        },
        {
          geojson: currentProject.polygon,
          label: 'Project Area',
        },
      ];
      for ( let i = 0; i < cu_polygons.length; i += 1 )
      {
        const cu = cu_polygons[i];
        mymaps.push({
          geojson: cu.geojson,
          label: cu.name,
          contest: 'changeuse',
        });
      };
      setMaps(mymaps);   
    } catch (error) {
      console.log(error)
      toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'Error reading scenarios polygons'});
    }
    setIsLoading(false)      
  }  
  
  useEffect(() => {
    if ( !token ) 
      router.push(`/login`);
    if ( currentProject && currentProject.preprocessing_data ) 
      fetchMaps();  
  }, []); // eslint-disable-line

  /// no data no party
  if (!currentProject || !currentProject.preprocessing_data ) 
    return <></>;
  
  const hUse = currentProject.preprocessing_data.base_lu_hectares_per_class;
  let hFutUse = currentProject.preprocessing_data.plan_newlu_hectares_per_class; 
  if ( !hUse ) {
    hUse = [];
  }  
  if ( !hFutUse ) {
    hFutUse = [];
  } 
  let hectaresValues = [];
  if ( currentProject.lu_classes ) {
    let classname;
    let value;
    // eslint-disable-dot-notation
    for ( const key in currentProject.lu_classes ) 
      if ( currentProject.lu_classes[key] ) {
        classname = currentProject.lu_classes[key].key;
        value = currentProject.lu_classes[key].value;
        hectaresValues.push( { class1: classname , value1: (hUse[value]? hUse[value] : 0) , value2: (hFutUse[value]? hFutUse[value] : 0) } );
      } 
  } 
  else {
    hectaresValues = [
      { class1: 'Tree-covered' , value1: (hUse['1']? hUse['1'] : 0) , value2: (hFutUse['1']? hFutUse['1'] : 0)}, 
      { class1: 'Grassland' , value1: (hUse['2']? hUse['2'] : 0) , value2: (hFutUse['2']? hFutUse['2'] : 0)},
      { class1: 'Cropland' , value1: (hUse['3']? hUse['3'] : 0) , value2: (hFutUse['3']? hFutUse['3'] : 0)},
      { class1: 'Wetland' , value1: (hUse['4']? hUse['4'] : 0) , value2: (hFutUse['4']? hFutUse['4'] : 0)},
      { class1: 'Artificial area' , value1: (hUse['5']? hUse['5'] : 0) , value2: (hFutUse['5']? hFutUse['5'] : 0)},
      { class1: 'Bare land' , value1: (hUse['6']? hUse['6'] : 0) , value2: (hFutUse['6']? hFutUse['6'] : 0)},
      { class1: 'Water body' , value1: (hUse['7']? hUse['7'] : 0) , value2: (hFutUse['7']? hFutUse['7'] : 0)},
    ]
  }

  const headers = ['Land Use Class','Base Land Use','Planning-based Land Use'];

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
            <h4> Baseline Land Use </h4>
          </div>
          <div className="col-6 text-center p-3">
            <h4> Planning Based Future Land Use </h4>
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
          title='Land Use Hectares Gain Table'
          className="mb-4"
        />
        )}
      </Card>
    </>
  );
}

const LandUsePlanning = () => {
  const t = useTranslations('default');
  const [topTabIndex, setTopTabIndex] = useState(0);
  const { currentProject, token } = useContext(UserContext);
  const router = useRouter();  

  useEffect(() => {
    if ( !token ) 
      router.push(`/login`);

  }, [token]); // eslint-disable-line

  if (!currentProject ) {
    return <></>;
  }

  if (!currentProject.preprocessing_data) {
    return <Message severity="info" text='Project preprocessing...' />; 
  }

  if ( currentProject.status === DATAMODIFIED )
      if ( currentProject.land_management_sustainability_method ) 
        return <Reprocess />;
      else return <Message severity="error" text='You must provide a land management assessment for all focus areas' />; 

  return (
    <div className="layout-dashboard">
      <Card>
        <TabView activeIndex={topTabIndex} onTabChange={(e) => setTopTabIndex(e.index)}>
          <TabPanel
            header={(
              <span>
                <i className="pi pi-calculator mr-2" />
                {t('PLAN_FOR_LDN')}
              </span>
            )}
          >
            <PlanForLDN />
          </TabPanel>
          <TabPanel
            header={(
              <span>
                <i className="pi pi-calculator mr-2" />
                {t('PLAN_BASED_NEW_LU')}
              </span>
            )}
          >
            <PlanningBasedNewLUMap />  
          </TabPanel>
          <TabPanel
            header={(
              <span>
                <i className="pi pi-chart-bar mr-2" />
                {t('PLANNING_LU_NEW_LD')}
              </span>
            )}
          >
            <PlanningLUNewLDMap />
          </TabPanel>
          <TabPanel
            header={(
              <span>
                <i className="pi pi-chart-bar mr-2" />
                {t('PLANNING_LM_NEW_LD')}
              </span>
            )}
          >
            <PlanningLMNewLDMap />
          </TabPanel>
        </TabView>
      </Card>
    </div>
  );
}

export async function getStaticProps(context) {
  return {
    props: { 
      messages: (await import(`../translations/${context.locale}.json`)).default
     },
  }
}

export default LandUsePlanning;
