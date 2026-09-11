"use client"

import { Card } from 'primereact/card';
import { TabPanel, TabView } from 'primereact/tabview';
import { Message } from 'primereact/message';

import React, { useContext, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { UserContext } from '../context/user';
import LayersHectaresTable from '../components/tables/LayersHectaresTable';
import LandManagementSustainability from '../components/land_management_sustainability';
import TMap from '../components/maps/sidebysidemap';
import { useRouter } from 'next/router';

export default function CurrentState() {
  
  const t = useTranslations('default');
  const { token, currentProject } = useContext(UserContext);
  const router = useRouter();
  const [luHectares, setLuHectares ] = useState(null);
  const [layersProps, setLayersProps ] = useState(null);
  const [message,setMessage] = useState('Loading');
  
  useEffect(() => {
    if ( !token ) 
      router.push(`/login`);
    try {
      if ( currentProject && currentProject.preprocessing_data ){
        readHectares()
        setLayersProps( [
          {
            link: currentProject.preprocessing_data.base_lu, 
            project: currentProject.id, 
            label: 'Land Use',
            paletteType: 'LandCoverPalette',
            customLuClasses: currentProject.lu_classes,
          },
          {
            link: currentProject.preprocessing_data.base_ls, 
            project: currentProject.id, 
            label: 'Land Suitability',
            paletteType: 'LandSuitabilityPalette',
          },
          {
            geojson: currentProject.polygon,
            label: 'Project Area',
          },
        ])
      }
      setMessage(null)
    } catch (e)  {
      console.log(e)
    }
  }, [token, currentProject]); // eslint-disable-line
   
  if ( !currentProject ) {
    return <></>;
  }

  if (!currentProject.preprocessing_data) 
      return <Message severity="info" text='Project preprocessing...' />;
  
  function readHectares() {
    let hUse = currentProject.preprocessing_data.base_lu_hectares_per_class;
    let hSuit = currentProject.preprocessing_data.base_ls_hectares_per_class; 
    if ( !hUse ) {
      hUse = [];
    }  
    if ( !hSuit ) {
      hSuit = [];
    } 
    let hectaresValues = [];
    let row = 0;
    let classname;
    let value;
    const ls_class_names = ['No Data','Suitable','Marginally suitable','Unsuitable'];
    if (  !hSuit['0'] || hSuit['0'] === 0 )  { // empty No Data in hSuit
      let value = 0;
      let values = Object.values(hUse);
      for ( let cu = 0; cu < values.length; cu += 1 ){  
        value += values[cu];
        if ( hSuit[''+cu] )
          value -= hSuit[''+cu];     
      }
      if ( value < 0 ) //Error
        value = 0;
      hSuit['0'] = value;  
    } 
    if ( currentProject.lu_classes ) {
      for ( const key in currentProject.lu_classes ) { // eslint-disable-line
        classname = String (currentProject.lu_classes[key]['key']); // eslint-disable-line
        value = String (currentProject.lu_classes[key]['value']); // eslint-disable-line
        if ( row < 4 )
          hectaresValues.push( { class1: classname , value1: (hUse[value]? hUse[value] : 0) , class2 : ls_class_names[row], value2: (hSuit[row]? hSuit[row] : 0)} ); // eslint-disable-line
        else
          hectaresValues.push( { class1: classname , value1: (hUse[value]? hUse[value] : 0) , class2 : '', value2: ''} ); 
        row+=1;
      }  
    } 
    else {
      hectaresValues = [
        { class1: 'Tree-covered' , value1: (hUse['1']? hUse['1'] : 0) , class2 : 'No Data', value2: (hSuit['0']? hSuit['0'] : 0)}, 
        { class1: 'Grassland' , value1: (hUse['2']? hUse['2'] : 0) , class2 : 'Suitable', value2: (hSuit['1']? hSuit['1'] : 0)},
        { class1: 'Cropland' , value1: (hUse['3']? hUse['3'] : 0) , class2 : 'Marginally suitable', value2: (hSuit['2']? hSuit['2'] : 0)},
        { class1: 'Wetland' , value1: (hUse['4']? hUse['4'] : 0) , class2 : 'Unsuitable', value2: (hSuit['3']? hSuit['3'] : 0)},
        { class1: 'Artificial area' , value1: (hUse['5']? hUse['5'] : 0) , class2 : '', value2: ''},
        { class1: 'Bare land' , value1: (hUse['6']? hUse['6'] : 0) , class2 : '', value2: ''},
        { class1: 'Water body' , value1: (hUse['7']? hUse['7'] : 0) , class2 : '', value2: ''},
      ]
    }
    setLuHectares(hectaresValues)
  }
 
  const LUheaders = ['Land Use','Land Suitability'];

  return (
    <div className="layout-dashboard">
    <Card>
        <TabView>
          <TabPanel
            header={
              <span>
                <i className="pi pi-th-large mr-2" />
                {t('LAND_USE_SUITABILITY')}
              </span>
            }
          >
          <Card>
            <div className="grid">
              <div className="col-6 text-center p-3">
                <h4>LandUse</h4>
              </div>
              <div className="col-6 text-center p-3">
                <h4>LandSuitability</h4>
              </div>
            </div>
            { message && (
            <div className="m-4"><h4>{message}</h4></div>
            )}
            { layersProps && (
              <TMap  maps={layersProps}  customLuClasses={ layersProps[0].customLuClasses } />
            )}
            { luHectares && (
            <LayersHectaresTable
              hectares={luHectares}
              headers={LUheaders}
              title="Hectares table"
              className="mb-4"
            />
            )}
          </Card>
          </TabPanel>
          <TabPanel
            header={
              <span>
                <i className="pi pi-receipt mr-2" />
                {t('LAND_MANAGEMENT_SUSTAINABILITY')}
              </span>
            }
          >
            <LandManagementSustainability />
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

