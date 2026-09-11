"use client"

import React, { useEffect, useState, useRef, useContext } from 'react';
import { Button } from 'primereact/button';
import { Steps } from 'primereact/steps';
import { useTranslations } from 'next-intl';
import { bbox, area, bboxPolygon } from '@turf/turf';
import { stringify } from 'wkt';
import { UserContext } from '../context/user';
import { Toast } from 'primereact/toast';
import { getCountryAdminLevelArea, getByCoordinates, getByBox } from '../services/polygons';
import { uploadProjectFile } from '../services/files';
import dynamic from 'next/dynamic'

const RoiMap = dynamic(() => import('./maps/roimap'), {ssr: false})

const CountrySelector = dynamic(() => import('./country_selector'), {ssr: false})


const RegionOfInterestSelector = ({ projectId, register, setValue }) => {
  const t = useTranslations('default');
  const roiMapRef = useRef(null);
  const roiFileRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [country, setCountry] = useState(undefined);
  const [adminLevel, setAdminLevel] = useState(1);
  const [glayer, setGlayer] = useState(null);
  const toast = useRef(null);
  const { token } = useContext(UserContext);

  register('country', { required: false });
  register('adminLevel', { required: false });
  register('polygon', { required: false });
  register('roi_file_id', { value: null });

  const getCountryAdminLevel = async (country, adminLevel) => {
    const res = await getCountryAdminLevelArea(country, adminLevel)
    if ( res.data ){
      setGlayer( res.data );
      setAdminLevel(adminLevel);
      setActiveIndex(1);
    } 
    else toast.current.show({ severity: 'error', summary: 'Error!', detail: 'No data for this country'});
  }

  const byCoordinates = async (point, country, administrative_level, token) => {
    let res = await getByCoordinates(point, country, administrative_level, token)
    if ( res.data ){
      res.data.bbox = bbox(res.data);
      res.data.area = area(res.data)/10000;
      setGlayer( res.data);
      setValue('polygon',  res.data);
      setValue('roi_file_id', null);
      console.log(res.data)
      return  res.data;
    }
    return null;
  }

  const byBox = async (box, country, administrative_level, token) => {
    let res = await getByBox(box, country, administrative_level, token)
    if ( res.data ){
      res.data.bbox = bbox(res.data);
      res.data.area = area(res.data)/10000;
      setGlayer(res.data);
      setValue('polygon',  res.data);
      setValue('roi_file_id', null);
      return  res.data;
    }
    return null;
  };
  
  useEffect( () => {
    setValue('country', country);
    setValue('adminLevel', adminLevel);

    if (country) {
      getCountryAdminLevel(country, adminLevel)  
    } 
  }, [country, adminLevel]); // eslint-disable-line

  const resetSelections = () => {
    setCountry(undefined);
    setAdminLevel(1);
    setGlayer(null);
    setActiveIndex(0);
  };

  const handleOutput = async (pin) => {
    if ( !country || !pin || !pin.geometry || !pin.geometry.type  ) 
      return null;
    let newdata = null;
    if ( pin.geometry.type === 'Point' ) 
      newdata = await byCoordinates(pin, country, pin.administrative_level, token)
    else if ( pin.geometry.type === 'Polygon' ) 
      newdata = await byBox(pin, country, pin.administrative_level,token)
    

    return newdata;    
  };

  const steps = [
    {
      label: t('SELECT_COUNTRY'),
      command: (_e) => {
        setActiveIndex(0);
      },
    },
    {
      label: t('DEFINE_THE_ROI'),
      command: (_e) => {
        if (country === undefined) return;
        setActiveIndex(1);
      },
    },
  ];

  const uploadRoiFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file); 
    const new_geojson = null;
    try {
      // validate geometry first feature
      // Add bbox, area to new geojson
      const isKO = false; 
      if ( file ) {
        const readFilePromise = (path) => new Promise((resolve, reject) => {
          const readFile = new FileReader();
          readFile.onload = (event) =>  { 
            const contents = event.target.result;
            let geojson = JSON.parse(contents.replaceAll('/n',''));
            /// only first feature
            const feature = geojson.features[0];
            geojson.features = [feature];
            geojson.bbox = bbox(geojson);
            geojson.area = area(geojson) / 10000;   // hectares
            geojson.wkt = stringify(feature.geometry);
            resolve(JSON.stringify(geojson));
          };
          readFile.onerror = (error) => {
            reject(error);
          };
          readFile.readAsText(file);
        });     
        const result = await readFilePromise(file)
        if ( result ) 
        {
          formData.append('newjson', result);
          const validated = JSON.parse( result.replaceAll('/n','') );
          const response  = await uploadProjectFile(projectId, formData, token);
          if ( response && response.data && response.data.data ) 
          {
            let data = response.data.data;
          // delete old file if exist!!!!!
            setValue('roi_file_id', data.id);
            setValue('polygon', validated);
            toast.current.show({ severity: 'success', summary: 'Done!', detail: 'Your file has been uploaded.'});
            setGlayer(validated);
            setActiveIndex(1);
          }
          else toast.current.show({ severity: 'error', summary: 'Error!', detail: 'Errors uploading file.'});
            
        }
        else {
          roiFileRef.current?.clear();
          toast.current.show({ severity: 'error', summary: 'Error!', detail: 'Errors reading file'});
        }
      }
      
    } catch (error) {
      console.log(error)
      roiFileRef.current?.clear();
      toast.current.show({ severity: 'error', summary: 'Error!', detail: 'Errors reading file'});
    }
  };
//  
        
  return (
    <>
      
      <Steps
        model={steps}
        activeIndex={activeIndex}
        readOnly
        className="p-mb-4"
      />
      <Toast ref={toast} position="top-right" />
      {activeIndex === 0 && (
        <>
          <CountrySelector setCountry={setCountry} />
          <p className="p-mt-6">
            {t('OR_UPLOAD_CUSTOM_POLYGON')}:
            <br />
            <input
              className="hidden"
              type="file"
              accept=".geojson,json"
              multiple={false}
              ref={roiFileRef}
              onChange={(e) => uploadRoiFile(e.target.files[0])}
            />
            <Button
              label={t('UPLOAD_POLYGON')}
              icon="pi pi-image"
              className="mr-2 mt-2"
              type="button"
              onClick={() => {
                roiFileRef.current.click();
              }}
            />
          </p>
        </>
      )}
      {activeIndex === 1 && glayer && (
        <RoiMap
          areas={glayer}
          setAdminLevel={setAdminLevel}
          output={handleOutput}
        />

      )}
      <div className="flex justify-items-between mt-6 mb-2">
        <Button
          className={`${activeIndex === 0 ? ' hidden' : ''}`}
          type="button"
          disabled={activeIndex === 0}
          onClick={(_e) => resetSelections()}
          severity="secondary"
          label={t('PREVIOUS')}
          icon="pi pi-angle-left"
        />
        <Button
          className={`${(activeIndex === 1 || country === undefined) ? ' hidden' : ''}`}
          type="button"
          disabled={activeIndex === 1 || country === undefined}
          label={t('NEXT')}
          onClick={(_e) => setActiveIndex((oldIndex) => (oldIndex + 1))}
          icon="pi pi-angle-right"
          iconPos="right"
          severity="secondary"
        />
      </div>
      
    </>
  );
};

export async function getStaticProps(context) {
  return {
    props: { 
      messages: (await import(`../translations/${context.locale}.json`)).default
     },
  }
}

export default RegionOfInterestSelector;
