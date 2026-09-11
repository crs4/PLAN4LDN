"use client"

import React, { useContext, useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { TabView, TabPanel } from 'primereact/tabview';
import { Card } from 'primereact/card';
import { Toast } from 'primereact/toast';
import { Message } from 'primereact/message';

import { UserContext } from '../context/user';
import Reprocess from '../components/reprocess';
import LayersHectaresTable from '../components/tables/LayersHectaresTable';
import LayersDifferenceHectaresTable from '../components/tables/LayersDifferenceHectaresTable';
import { DATAMODIFIED, getProjectFocusAreasPolygons }  from '../services/projects';
import TMap from '../components/maps/sidebysidemap';

const CurrentDegradationMap = () => {
  const t  = useTranslations('default');
  const [maps, setMaps] = useState(null);
  const toast = useRef(null);
  const [hectares, setHectares] = useState([]);
  const { token, currentProject, resetData } = useContext(UserContext);
  
  const fetchMaps = async () => {
    try {
      const response = await getProjectFocusAreasPolygons(currentProject.id, token);
      let data = [];
      if ( response.ok ) 
        data = response.data.data
      else { 
          toast.current.show({ severity: 'error', summary: 'Oops!',
            detail: 'Error reading project focus areas polygons!'
          });
          if ([401, 403].includes(response.status) && token ){
            resetData()
            router.push(`/login`, 300)
          }
      }
      const mymaps = [
        {
          link: currentProject.preprocessing_data.base_ld, 
          project: currentProject.id, 
          label: 'Current Land Degradation',
          paletteType: 'LandDegradationPalette',
        },
        {
          link: currentProject.preprocessing_data.bau_future_ld,
          project: currentProject.id, 
          label: 'Future Land Degradation',
          paletteType: 'FutureLandDegradationPalette',
        },
        {
          geojson: currentProject.polygon,
          label: 'Project Area',
        },
      ];
      if ( data && data.length ){
        for ( let fa = 0 ; fa < data.length ; fa += 1 ){
          if ( data[fa] )
            mymaps.push({
              geojson: data[fa].geojson,
              label: data[fa].name,
              context: 'focusarea'
            });
        }    
      };
      setMaps(mymaps);
       
    } catch (error) {
      console(error)
      toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'Error loading maps data!'});
    }
  }  

  function readHectares() {
    let hsdg = currentProject.preprocessing_data.base_ld_hectares_per_class;
    const hfut = currentProject.preprocessing_data.bau_future_ld_hectares_per_class; 
    const hf = [];
    if ( hfut ) { 
      hf.A = (hfut['1']? hfut['1'] : 0) + (hfut['2']? hfut['2'] : 0);
      hf.B = (hfut['3']? hfut['3'] : 0) + (hfut['4']? hfut['4'] : 0);
      hf.C = (hfut['7']? hfut['7'] : 0) + (hfut['5']? hfut['5'] : 0) + (hfut['6']? hfut['6'] : 0);
      hf.D = (hfut['8']? hfut['8'] : 0) + (hfut['9']? hfut['9'] : 0);
      hf.E = (hfut['10']? hfut['10'] : 0) + (hfut['11']? hfut['11'] : 0) + (hfut['12']? hfut['12'] : 0);
    }
    if ( hsdg  == null ) {
      hsdg = [];
    }  
    const hectaresValues = [
      { class1: 'Degradation' , value1: (hsdg['-1']? hsdg['-1'] : 0)  , class2 : 'Class A', value2: hf.A}, 
      { class1: 'Stable' , value1: (hsdg['0']? hsdg['0'] : 0) , class2 : 'Class B', value2: hf.B },
      { class1: 'Improvement' , value1: (hsdg['1']? hsdg['1'] : 0)  , class2 : 'Class C', value2: hf.C},
      { class1: '' , value1: ''  , class2 : 'Class D', value2: hf.D },
      { class1: '' , value1: '' , class2 : 'Class E', value2: hf.E},
    ]
    setHectares(hectaresValues);
  }

  useEffect(() => {
    if ( !token ) 
     router.push(`/login`);
    else if (currentProject && currentProject.preprocessing_data) {
      readHectares()   
      fetchMaps();
    }
  }, [token, currentProject]); // eslint-disable-line
 
  if (!currentProject || !currentProject.preprocessing_data ) {
    return <></>;
  }
  
  const headers = [ 'Current LD Class Name','BAU Future LD Class Name'];
    
  return (
    <>
    <Card>  
      <Toast ref={toast} position="top-right" />
      <div className="grid">
        <div className="col-6 text-center p-3">
          <h4>Current Land Degradation</h4>
        </div>
        <div className="col-6 text-center p-3">
          <h4>Future Land Degradation</h4>
        </div>
      </div>    
      <div className="grid justify-content-between mt-2 px-3">
        <div className="col-12">
        { maps && (
          <TMap  maps={maps}  customLuClasses={ currentProject.lu_classes } />
        )}
        </div>
        <div className="col-12">
          { hectares && (
            <LayersHectaresTable
              hectares={hectares}
              headers={headers}
              title='Hectares table'
              className="p-mb-4"
            />
          )}
        </div>
      </div>
    </Card>
    </>
  );
}

const NewLandDegradationMap = () => {
  const t = useTranslations('default');
  const [maps, setMaps] = useState(null);
  const toast = useRef(null)
  const { token, currentProject, resetData } = useContext(UserContext);
  const [hectares, setHectares] = useState([]);
  const router = useRouter();

  useEffect(() => { 
    const fetchMaps = async () => {
      try {
        const response = await getProjectFocusAreasPolygons(currentProject.id, token);
        let data = [];
        if ( response.ok ) 
          data = response.data.data
        else { 
          toast.current.show({ severity: 'error', summary: 'Oops!',
            detail: 'Error reading project focus areas polygons!'
          });
          if ([401, 403].includes(response.status) && token ){
            resetData()
            router.push(`/login`, 300)
          }
        }
        const mymaps = [
          {
            link: currentProject.preprocessing_data.bau_lu_newld, 
            project: currentProject.id, 
            label: 'LU based New Land Degradation',
            paletteType: 'LULandDegradationPalette',
          },
          {
            link: currentProject.preprocessing_data.bau_lm_newld, 
            project: currentProject.id, 
            label: 'LM based New Land Degradation',
            paletteType: 'LMLandDegradationPalette',
          },
          {
            geojson: currentProject.polygon,
            label: 'Project Area',
          },
        ];
       
        if ( data && data.length ){
          for ( let fa = 0 ; fa < data.length ; fa += 1 ){
            if ( data[fa] )
              mymaps.push({
                geojson: data[fa].geojson,
                label: data[fa].name,
                context: 'focusarea'
              });
          }    
        };
        
        setMaps(mymaps); 
      } catch (error) {
        console.log(error);
        toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'Error loading maps data!' });
      }
    }
    if ( currentProject && currentProject.preprocessing_data )
    {
      fetchMaps();
      readHectares();
    }    
  }, [currentProject]); // eslint-disable-line

  if (!currentProject || !currentProject.preprocessing_data ) {
    return <></>;
  }

  function readHectares() {
    let hnew = currentProject.preprocessing_data.bau_lm_newld_hectares_per_class;
    let hlu = currentProject.preprocessing_data.bau_lu_newld_hectares_per_class; 
    if ( !hlu ) {
      hlu = [];
    }  
    if ( !hnew ) {
      hnew = [];
    }  
    const _hectares = [
      { class1: 'No Data' , value1: (hlu['0']? hlu['0'] : 0) , value2: (hnew['0']? hnew['0'] : 0)}, 
      { class1: 'No New LD' , value1: (hlu['1']? hlu['1'] : 0) , value2: (hnew['1']? hnew['1'] : 0)},
      { class1: 'New LD not expected' , value1: (hlu['2']? hlu['2'] : 0) , value2: (hnew['2']? hnew['2'] : 0)},
      { class1: 'New LD!' , value1: (hlu['3']? hlu['3'] : 0) , value2: (hnew['3']? hnew['3'] : 0)},
    ]
    setHectares(_hectares)
  } 
  
  const headers = ['Class Name','LU based New LD','LM based New LD'];
  
  return (
    <>
      <Card>
        <Toast ref={toast} position="top-right" />
      <div className="grid">
        <div className="col-6 text-center p-3">
          <h4>LU based New Land Degradation</h4>
        </div>
        <div className="col-6 text-center p-3">
          <h4>LM based New Land Degradation</h4>
        </div>
      </div>    
      <div className="grid justify-content-between mt-2 px-3">
        <div className="col-12">
        { maps && (  
          <TMap  maps={maps}  customLuClasses={ currentProject.lu_classes } />
        )}
        </div>
        <div className="col-12">
        { hectares && (
          <LayersDifferenceHectaresTable
            hectares={hectares}
            headers={headers}
            title='Hectares Gain Table'
            className="mb-4"
          />
        )}
        </div>
      </div>
      </Card>
    </>
  );
}

const AnticipatedNewLD = () => {
  const t = useTranslations('default');
  const [topTabIndex, setTopTabIndex] = useState(0);
  const { currentProject, token } = useContext(UserContext);
  const router = useRouter();

  useEffect(() => {
    if ( !token ) 
     router.push(`/login`);
  }, [token]); // eslint-disable-line

  /// no data no party
  if (!currentProject ) 
    return <></>;

  if (!currentProject.preprocessing_data) 
    return <Message severity="info" text='Project preprocessing...' />;

  if ( currentProject.status === DATAMODIFIED )
    if ( currentProject.land_management_sustainability_method ) 
      return <Reprocess />;
  else return <Message severity="error" text="You must provide a land management assessment for all focus areas" />; 

  return (
    <div className="layout-dashboard">
      <Card>
        <TabView activeIndex={topTabIndex} onTabChange={(e) => setTopTabIndex(e.index)}>
          <TabPanel
            header={(
              <span>
                <i className="pi pi-chart-line mr-2" />
                {t('BAU_NEW_FUTURE_LD')}
              </span>
            )}
          >
            <NewLandDegradationMap />
          </TabPanel>
          <TabPanel
            header={(
              <span>
                <i className="pi pi-chart-line mr-2" />
                {t('ANTICIPATED_NEW_LAND_DEGRADATION')}
              </span>
            )}
          >
            <CurrentDegradationMap />
          </TabPanel>
          
        </TabView>
      </Card>
    </div>
  )
};

export async function getStaticProps(context) {
  return {
    props: { 
      messages: (await import(`../translations/${context.locale}.json`)).default
     },
  }
}

export default AnticipatedNewLD; 
  