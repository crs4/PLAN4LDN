"use client"

import React, { useContext, useState } from 'react';
import { Card } from 'primereact/card';
import LayersHectaresTable from './tables/LayersHectaresTable';
import { UserContext } from '../context/user';
import dynamic from 'next/dynamic'

const Map = dynamic(() => import('./glowglobe/Map'), {
  ssr: false
})

export default function LandUseSuitability() {

  const { currentProject } = useContext(UserContext);

  if ( !currentProject ) {
    return <></>;
  }

  if ( !currentProject.preprocessing_data ) {
    return <>Project preprocessing...</>;
  }

  // da rivedere
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
  const maps = [
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
  ];
  const headers = ['Land Use','Land Suitability'];

  return (
    <Card>
      <div className="p-grid p-justify-between p-px-3">
        <div>
          <h4>{maps[0].label}</h4>
        </div>
        <div>
          <h4>{maps[1].label}</h4>
        </div>
      </div>
      <Map
        type='side-by-side'
        maps={maps}
      />
      <LayersHectaresTable
        hectares={hectaresValues}
        headers={headers}
        title="Hectares table"
        className="p-mb-4"
      />
    </Card>
  );
};

export async function getStaticProps(context) {
  return {
    props: { 
      messages: (await import(`../translations/${context.locale}.json`)).default
     },
  }
}