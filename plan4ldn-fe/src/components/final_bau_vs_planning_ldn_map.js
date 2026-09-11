"use client"
import React, { useState, useContext, useEffect, useRef } from 'react';
import Reprocess from './reprocess';
import LayersDifferenceHectaresTable from './tables/LayersDifferenceHectaresTable';
import { DATAMODIFIED, getProjectFocusAreasPolygons }  from '../services/projects';
import { getScenarioPolygons } from '../services/scenarios';
import { Toast } from 'primereact/toast';
import { Card } from 'primereact/card';

import { useTranslations } from 'next-intl';
import { UserContext } from '../context/user';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic'

const Map = dynamic(() => import('./maps/sidebysidemap'), {ssr: false})


const BAUvsPlanningLDNBalanceMap = () => {
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

  const fetchMaps = async () => {
    try {
      setIsLoading(true)
      const fa_polygons = await getProjectFocusAreasPolygons(currentProject.id, token);
      if ( !fa_polygons )
        fa_polygons = [];
      const cu_polygons = await getScenarioPolygons(currentProject.id, token);
      if ( !cu_polygons )
        cu_polygons = [];
      const mymaps = [
        {
          link: currentProject.preprocessing_data.bau_ldn_balance, 
          project: currentProject.id, 
          label: 'BAU LDN Balance',
          paletteType: 'LDNBalancePalette',
        },
        {
          link: currentProject.preprocessing_data.plan_ldn_balance, 
          project: currentProject.id, 
          label: 'Planning LDN Balance',
          paletteType: 'LDNBalancePalette',
        },
        {
          geojson: currentProject.polygon,
          label: 'Project Area',
        },
      ];
      
      for ( let fa = 0 ; fa < fa_polygons.length; fa += 1 )  {
        if ( fa_polygons[fa] )
          mymaps.push({
            geojson: fa_polygons[fa].geojson,
            label: fa_polygons[fa].name,
            context: 'focusarea',
          });
      } 
      for ( let cu = 0 ; cu < cu_polygons.length; cu += 1 )  {
        if ( cu_polygons[cu] )
          mymaps.push({
            geojson: cu_polygons[cu].geojson,
            label: cu_polygons[cu].name,
            context: 'changeuse',
          });
      }
       
      setMaps(mymaps); 
    } catch (error) {
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

  const hbau = currentProject.preprocessing_data.bau_ldn_balance_hectares_per_class;
  const hnew = currentProject.preprocessing_data.plan_ldn_balance_hectares_per_class;
  const n = currentProject.preprocessing_data.lu_classes_nr;
  const bau = [0,0,0,0,0,0];
  const final = [0,0,0,0,0,0];
  // step lu_classes_nr,  5 ldn classes
  //  v:['0'] no data ,
  //  v:['1'..'n']  value "1:No data about future LD" on land uses [1..n];  
  //  v:['n+1'..'2*n']  value "2:Improved" on land uses [1..n] ;  
  //  v:['2*n+1'..'3*n']  value "3:Recent" on land uses [1..n];
  //  v:['3*n+1'..'4*n']  value "4:Persistent" on land uses [1..n] ;
  //  v:['4*n+1'..'5*n']  value "5:To be monitored" on land uses [1..n] ;
 

  if ( hbau ) {
    for (let index = 1; index <= n; index+=1) { 
      bau[4] += (hbau[index]? hbau[index] : 0); //
      bau[3] += (hbau[(index+n)]? hbau[(index+n)] : 0);
      bau[2] += (hbau[(index+n*2)]? hbau[(index+n*2)] : 0);
      bau[1] += (hbau[(index+n*3)]? hbau[(index+n*3)] : 0);
      bau[0] += (hbau[index+n*4]? hbau[index+n*4] : 0); //
      
    }
    bau[5] = (hbau['0']? hbau['0'] : 0);      
  }  
  if ( hnew ) {
    for (let index = 1; index <= n; index+=1) {
      final[4] += (hnew[index]? hnew[index] : 0);
      final[3] += (hnew[(index+n)]? hnew[(index+n)] : 0);
      final[2] += (hnew[(index+n*2)]? hnew[(index+n*2)] : 0);
      final[1] += (hnew[(index+n*3)]? hnew[(index+n*3)] : 0);
      final[0] += (hnew[(index+n*4)]? hnew[(index+n*4)] : 0);
    }
    final[5] = (hnew['0']? hnew['0'] : 0);      
  }   
  const hectaresValues = [
    { class1: 'No data about future LD' , value1: bau[0] , value2: final[0]}, 
    { class1: 'Improved' , value1: bau[1] , value2: final[1]}, 
    { class1: 'Recent' , value1: bau[2] , value2: final[2]},
    { class1: 'Persistent' , value1: bau[3] , value2: final[3]},
    { class1: 'To be monitored' , value1: bau[4] , value2: final[4]},
    { class1: 'No Data' , value1: bau[5] , value2: final[5]},
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
          <h4> Planning LDN Balance </h4>
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

export default BAUvsPlanningLDNBalanceMap;
