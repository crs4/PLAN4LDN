"use client"

import React, { useContext, useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { TabView, TabPanel } from 'primereact/tabview';
import dynamic from 'next/dynamic'
import { Card } from 'primereact/card';
import { Toast } from 'primereact/toast';
import { Message } from 'primereact/message';

import { UserContext } from '../context/user';
import { useRouter } from 'next/navigation';
import { DATAMODIFIED, getProjectFocusAreasPolygons }  from '../services/projects';
import { getScenarios } from '../services/scenarios';
import { getGeoJsonPolygon } from '../services/files';


import Reprocess from '../components/reprocess';
import NeutralityMatrix from '../components/final_neutrality_matrix';
import FinalLDNBalanceMap from '../components/final_ldn_balance_map';
import BAUvsFinalLDNBalanceMap from '../components/final_bau_vs_final_ldn_map'; 
import LayersDifferenceHectaresTable from '../components/tables/LayersDifferenceHectaresTable';


const Map = dynamic(() => import('../components/maps/sidebysidemap'), {ssr: false})

const PlanningFutureLDMap = () => {
  const  t  = useTranslations('default');
  const [maps, setMaps] = useState(null);
  const { token,  currentProject } = useContext(UserContext);
  const toast = useRef();
  const [isLoading, setIsLoading] = useState(true);
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
      setIsLoading(true)  
      const cu_polygons = await getScenarioPolygons( currentProject.id, token );
      const response = await getProjectFocusAreasPolygons( currentProject.id, token );
      let fa_polygons = []
      if ( response.ok && response.data && response.data.data) 
        fa_polygons = response.data.data
      else toast.current.show({ severity: 'error', summary: 'Oops!',
            detail: 'Error reading project focus areas polygons!'
      });    
      const mymaps = [
        {
          link: currentProject.preprocessing_data.bau_future_ld, 
          project: currentProject.id, 
          label: 'BAU Overall Future LD',
          paletteType: 'FutureLandDegradationPalette',
        },
        {
          link: currentProject.preprocessing_data.overall_future_ld, 
          project: currentProject.id, 
          label: 'Planning-based Overall Future LD',
          paletteType: 'FutureLandDegradationPalette',
        },
        {
          geojson: currentProject.polygon,
          label: 'Project Area',
        },
      ];
      if ( fa_polygons &&  fa_polygons.length ) {
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
    setIsLoading(false)
  }

  useEffect(() => {
    if ( !token ) 
     router.push(`/login`);
    else fetchMaps();  
  }, []); // eslint-disable-line
   

  if ( !currentProject || !currentProject.preprocessing_data ) {
    return <></>;
  }
   
  const hfbase = currentProject.preprocessing_data.bau_future_ld_hectares_per_class;
  const hfplan = currentProject.preprocessing_data.overall_future_ld_hectares_per_class;
  // A1=1;A2=2;B1=3;B2=4;C1=5;C2=6;c3=7;D1=8;D2=9;E0=10;E1=11;E2=12 
  const hfb = [];
  if ( hfbase ) { 
    hfb.A = (hfbase['1']? hfbase['1'] : 0) + (hfbase['2']? hfbase['2'] : 0);
    hfb.B = (hfbase['3']? hfbase['3'] : 0) + (hfbase['4']? hfbase['4'] : 0);
    hfb.C = (hfbase['7']? hfbase['7'] : 0) + (hfbase['6']? hfbase['6'] : 0) + (hfbase['5']? hfbase['5'] : 0);
    hfb.D = (hfbase['8']? hfbase['8'] : 0) + (hfbase['9']? hfbase['9'] : 0);
    hfb.E = (hfbase['10']? hfbase['10'] : 0) + (hfbase['11']? hfbase['11'] : 0) + (hfbase['12']? hfbase['12'] : 0);
  }
  const hfp = [];
  if ( hfplan ) {
    hfp.A = (hfplan['1']? hfplan['1'] : 0) + (hfplan['2']? hfplan['2'] : 0);
    hfp.B = (hfplan['3']? hfplan['3'] : 0) + (hfplan['4']? hfplan['4'] : 0);
    hfp.C = (hfplan['7']? hfplan['7'] : 0) + (hfplan['6']? hfplan['6'] : 0) + (hfplan['5']? hfplan['5'] : 0);
    hfp.D = (hfplan['8']? hfplan['8'] : 0) + (hfplan['9']? hfplan['9'] : 0);
    hfp.E = (hfplan['10']? hfplan['10'] : 0) + (hfplan['11']? hfplan['11'] : 0) + (hfplan['12']? hfplan['12'] : 0);
  }  
  const hectaresValues = [
    { class1: 'A' , value1: (hfb.A? hfb.A : 0) , value2: (hfp.A? hfp.A : 0)}, 
    { class1: 'B' , value1: (hfb.B? hfb.B : 0) , value2: (hfp.B? hfp.B : 0) },
    { class1: 'C' , value1: (hfb.C? hfb.C : 0) , value2: (hfp.C? hfp.C : 0)},
    { class1: 'D' , value1: (hfb.D? hfb.D : 0) , value2: (hfp.D? hfp.D : 0) },
    { class1: 'E' , value1: (hfb.E? hfb.E : 0) , value2: (hfp.E? hfp.E : 0)},
  ]

  const headers = ['Class Name','BAU Overall Future LD','Planning-based Overall Future LD']; 

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
          <h4> BAU Overall Future LD </h4>
        </div>
        <div className="col-6 text-center p-3">
          <h4> Planning-based Overall Future LD </h4>
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
          title="Hectares Gain Table"
          className="p-mb-4"
        />
      )}
      </Card>
    </>
  );
}

const FinalLDNBalance = () => {
  const t = useTranslations('default');
  const [topTabIndex, setTopTabIndex] = useState(0);
  const { currentProject, token } = useContext(UserContext);
  const router = useRouter();
  
  useEffect(() => {
      if ( !token ) 
        router.push(`/login`);
  }, [token]); // eslint-disable-line

  if (!currentProject ) 
    return <></>;
    
  
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
                <i className="fad fa-chart-line-down p-mr-2" />
                {t('PLANNING_FUTURE_LD')}
              </span>
            )}
          >
            <PlanningFutureLDMap />
          </TabPanel>
          <TabPanel
            header={(
              <span>
                <i className="fad fa-chart-line-down p-mr-2" />
                {t('BAU_VS_FINAL_LDN_BALANCE')}
              </span>
            )}
          >
            <BAUvsFinalLDNBalanceMap />  
          </TabPanel> 
          <TabPanel
            header={(
              <span>
                <i className="fad fa-chart-line-down p-mr-2" />
                {t('LDN_BALANCE')}
              </span>
            )}
          >
            <FinalLDNBalanceMap  /> 
          </TabPanel>  
          <TabPanel
            header={(
              <span>
                <i className="fad fa-analytics p-mr-2" />
                {t('NEUTRALITY_MATRIX_MAP')}
              </span>
            )}
          >
            <NeutralityMatrix  />
          </TabPanel>
        </TabView>
    </Card>
    </div>
  );
};

export async function getStaticProps(context) {
  return {
    props: { 
      messages: (await import(`../translations/${context.locale}.json`)).default
     },
  }
}

export default FinalLDNBalance;
