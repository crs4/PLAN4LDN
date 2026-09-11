"use client"
import React, { useState, useContext, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { FileUpload } from 'primereact/fileupload';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Toast } from 'primereact/toast';
import Reprocess from '../components/reprocess';
import { area, intersect, polygon, multiPolygon, bbox, featureCollection } from '@turf/turf';
import { stringify } from 'wkt';
import { DATAMODIFIED, editProject, getProjectFocusAreas, addProjectFocusArea, deleteProjectFocusArea } from '../services/projects';
import { uploadProjectFile,  getGeoJsonPolygon } from '../services/files';
import { handleError } from '../utilities/errors';
import { getScenarios } from '../services/scenarios';
import { UserContext } from '../context/user';

const DefineFocusAreas = ({ onBack, onForward }) => {
  const t  = useTranslations('default');
  const fileUploadRef = useRef();
  const toast = useRef(null);
  const { token, currentProject } = useContext(UserContext);
  const [focusAreas, setFocusAreas] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [fileId, setFileId] = useState(null);
  const [fa_area, setFa_area] = useState(0);

  const fetchFocusAreas = async () => {
    try {
      const response = await getProjectFocusAreas(currentProject.id, token);
      setFocusAreas(response.data.data);
    } catch (error) {
      toast.current.show({ severity: 'error', summary:'Error!', detail: handleError(error) })
    }
  };

  const getScenarioPolygons = async () => {
    const polygons = [];
    const  { data: _sc } = await getScenarios(currentProject.id,  token);
    let scenarios = _sc.data
    if ( scenarios && scenarios.length > 0)
    try {
      for ( const scenario of scenarios ) {
        for ( const item of scenario ) {
          if (item.breakDown) {
            for (const breakDownItem of item.breakDown) {
              if (breakDownItem.landCoverage && breakDownItem.landCoverage.file_id) {
                const plg = await getGeoJsonPolygon(currentProject.id, breakDownItem.landCoverage.file_id, token);
                if (plg)
                  polygons.push (plg);
              }
            }
          }
        }
      }
      console.log('getScenarioPolygons')  
      console.log(polygons)  
    } catch ( error ) {
      console.log(error)
      return [];
    }  
    return polygons;
  };

  const addNewFocusArea = async (e) => {
    e.preventDefault();
    setIsAdding(true);
    
    if (name === '' || !fileId || fileId === null || !fa_area) {
      toast.current.show({ severity: 'error', summary:'Error!', detail: 'Errors file not set' });
      return;
    }
    try {
      console.log('addProjectFocusArea')        
      const data = await addProjectFocusArea(currentProject.id, name, fileId, fa_area, token);
      if ( data.ok ) {
        await editProject(currentProject.id, {
          status : DATAMODIFIED,
          land_management_sustainability_method: 0,
        },token);
        currentProject.land_management_sustainability_method = 0;
        currentProject.status = DATAMODIFIED;
        await fetchFocusAreas();
      }
      toast.current.show({ severity: 'success', summary:'success', detail: 'focus area created' })
      setName('');
      setFileId(null);
      setFa_area(0);
      fileUploadRef.current?.clear();
    } catch (error) {
      console.log(error)
      toast.current.show({ severity: 'error', summary:'Error!', detail: 'Errors creating the focus area' })
    } 
    setIsAdding(false);
  }

  const deleteFocusArea = async (focusAreaId) => {
    try {
      await deleteProjectFocusArea( currentProject.id, focusAreaId, token);
      console.log('editProject')
      const prj = await editProject( currentProject.id, {
        status : DATAMODIFIED,
      }, token );
      await setUser({
        currentProject: prj
      });
      console.log('focusAreas')
      await fetchFocusAreas();
    } catch (error) {
      console.log (error);
      toast.current.show({ severity: 'error', summary:'Error!', detail: 'Errors deleting focus area' })
    }
  } 

  const uploadFile = async (files) => {
    // eslint-disable-next-line
    setIsUploading(true);
    const formData = new FormData();
    const new_geojson = null;
    formData.append('file', files[0]);
    try {
      // validate geometry first feature
      // Add bbox, area to new geojson
      const isKO = false; 
      if ( files[0] ) {
        const readFilePromise = (path) => new Promise((resolve, reject) => {
          const readFile = new FileReader();
          readFile.onload = (event) =>  { 
            const contents = event.target.result;
            const geojson = JSON.parse(contents.replaceAll('/n',''));
            /// only first feature
            const feature = geojson.features[0];
            geojson.features = [feature];
            geojson.area = area(geojson) / 10000;   // hectares
            geojson.bbox = bbox(geojson);
            geojson.wkt = stringify(feature.geometry);
            resolve(JSON.stringify(geojson));
          };
          readFile.onerror = (error) => {
            reject(error);
          };
          readFile.readAsText(files[0]);
        });     
        await readFilePromise(files[0])
          .then((result) => formData.append('newjson', result))
          .catch((error) => {
            toast.current.show({ severity: 'error', summary:'Error!', detail: handleError(error) })
            setFileId(null);
            setFa_area(0);
            fileUploadRef.current?.clear();
            console.log(error)
          }); 
        if ( formData.get('newjson') ){
          /// 1. is the polygon inside the ROI?
          /// 2. Does the polygon overlap other inserted focus areas or changeUse polygons? 
            console.log('Verify data');
                    
            const fa = JSON.parse( formData.get('newjson').replaceAll('/n','') );
            if ( fa && fa.area ) {
              const roi = currentProject.polygon;
              let polygons = []
            
              const { data } = await getScenarioPolygons();
              if ( data )
                polygons = data
              let hectares = 0;
              let overlaps = false; 
              for (const its of focusAreas) {
                  if (its.file && its.file.id) {
                    const data = await getGeoJsonPolygon(currentProject.id, its.file.id, token);
                    if (data) {
                      let plg = data.data
                      if (plg)
                        polygons.push (plg);
                    }
                  }
              }
              if ( fa.features ) { 
                fa.features.forEach( (item) => {
                  let plg = null;
                  if (item.geometry && item.geometry.type === 'MultiPolygon') 
                    plg = multiPolygon(item.geometry.coordinates);
                  else if (item.geometry && item.geometry.type === 'Polygon') 
                    plg = polygon(item.geometry.coordinates);
                  if ( roi.features && plg ) {
                    roi.features.forEach(
                      (feature) => {
                        let poly;
                        if (feature.geometry && feature.geometry.type === 'MultiPolygon') 
                          poly = multiPolygon(feature.geometry.coordinates);
                        else if (feature.geometry.type === 'Polygon') 
                          poly = polygon(feature.geometry.coordinates);
                        if ( poly !== null ) {
                          const intersection = intersect( featureCollection([plg, poly]) ); 
                          if ( intersection !== null )
                            hectares += (area (intersection) / 10000);
                        } 
                    })
                  }
                  if ( polygons && plg ) {
                    polygons.forEach(
                      (oplg) => {
                        if ( oplg.features ) {
                          oplg.features.forEach(
                            (feature) => {
                              if ( !overlaps ) {
                                let poly = null;
                                if (feature.geometry && feature.geometry.type === 'MultiPolygon') 
                                  poly = multiPolygon(feature.geometry.coordinates);
                                else if (feature.geometry.type === 'Polygon') 
                                  poly = polygon(feature.geometry.coordinates);
                                if ( poly !== null ) {
                                  const intersection = intersect(featureCollection([plg, poly])); 
                                  if ( intersection !== null ){
                                    overlaps = true;  
                                  }  
                                }
                              } 
                          })
                        }
                    })
                  }
                });
                if ( Math.abs (fa.area - hectares) > 100 ) {
                  toast.current.show({ severity: 'error', summary:'Error!', detail: 'This polygon does not belong to the region of interest for this project.' })
                  setFileId(null);
                  setFa_area(0);
                  fileUploadRef.current?.clear(); 
                } else if (overlaps) {
                  setFileId(null);
                  setFa_area(0);
                  fileUploadRef.current?.clear(); 
                  toast.current.show({ severity: 'error', summary:'Error!', detail: 'This polygon overlaps other focus areas.' })
                } else {
                  const { data } = await uploadProjectFile(currentProject.id, formData, token);
                  const _data = data.data 
                  if (_data) {
                    setFa_area(fa.area);
                    setFileId(_data.id);
                    toast.current.show({ severity: 'success', summary:'Done!', detail: 'Your file has been validated. give it a name and add it up' })
                  }
                  else {
                    setFileId(null);
                    setFa_area(0);
                    fileUploadRef.current?.clear(); 
                    toast.current.show({ severity: 'error', summary:'Error!', detail: 'Errors uploading the file.' })
                  }                  
                } 
              }
            }
        }  
      }  
    } catch (error) {
      toast.current.show({ severity: 'error', summary:'Error!', detail: handleError(error) })
      setFileId(null);
      setFa_area(0);
      fileUploadRef.current?.clear();
      console.log(error)
    } finally {
      console.log('end');
      setIsUploading(false); 
    }
       
  }

  const handleFileDownload = async (row) => {
    try {
      const data = await getGeoJsonPolygon(currentProject.id, row.file.id, token);
      if ( data && data.data)  {
        const element = document.createElement("a");
        const file = new Blob([JSON.stringify(data.data)], {
          type: "application/json"
        });
        element.href = URL.createObjectURL(file);
        element.download = row.file.filename;
        document.body.appendChild(element);
        element.click();
      }
    } catch (error) {
      console.log(error)
      toast.current.show({ severity: 'error', summary:'Error!', detail: "Errors dowloading the file" })
    }
  };

  const onContinue = async () => {
    if (focusAreas.length === 0) {
      toast.current.show({ severity: 'waring', summary:'Warning!', detail: t('NO_FOCUS_AREAS_WARNING') })
      return;
    }
    onForward();
  };

  useEffect(() => {
      if ( !token ) 
        router.push(`/login`);
      else if (currentProject && currentProject.preprocessing_data) {
        fetchFocusAreas();
      }
    }, [token]); // eslint-disable-line

  /// no data no party
  if (!currentProject ) {
    return <></>;
  }

  if (!currentProject.preprocessing_data) {
    return <>Project preprocessing...</>;
  }

  return (
    <>
     { ( currentProject  && (
      <>
      <Toast ref={toast} position="top-right" />
      <div className="grid fluid flex my-4">
        <div className="col-3">
          <h4>{t('ADD_NEW_FOCUS_AREA')}</h4>
          <form onSubmit={addNewFocusArea}>
            <div className="formgrid grid">
              <div className="p-field col-6 md-6">
                <label htmlFor="name">{t('NAME')}</label>
                <InputText
                  id="name"
                  type="text"
                  placeholder="Insert name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="p-field col-6 md-6">
                <label htmlFor="file">{t('FOCUS_AREA')}</label>
                <FileUpload
                  disabled={fileId !== null || isUploading }
                  id="file"
                  ref={fileUploadRef}
                  accept=".geojson"
                  chooseLabel={t('SELECT_FILE')}
                  mode="basic"
                  multiple={false}
                  customUpload
                  auto
                  uploadHandler={(event) => uploadFile(event.files)}
                />
              </div>
            </div>
            <div className="grid formgrid">
              <div className="p-field col-4">
                <Button
                  label={t('ADD')}
                  type="submit"
                  disabled={name === '' || fileId === null || isAdding}
                  loading={isAdding}
                  icon="pi pi-plus"
                  className="p-button-primary mt-2"
                />
              </div>
            </div>
          </form>
        </div>
        <div className="col-9">
        { focusAreas && (
        <>  
          <DataTable
            emptyMessage={t('NO_ENTRIES')}
            value={focusAreas}
            header={t('FOCUS_AREAS')}
          >
            <Column header={t('NAME')} body={(rowData) => (
              <>
                <span className="font-bold text-green-500">{rowData.name}</span>
              </>
            )} />
            <Column header={t('FILE')} body={(rowData) => (
              <>
                <span className="font-bold text-blue-500">{rowData.file.filename}</span>
              </>
            )} />
            <Column
              body={(rowData) => (
                <div className="text-right">
                  <Button
                    className="mr-2"
                    icon="pi pi-download"
                    onClick={() => handleFileDownload(rowData)}
                    severity="info"
                  />
                  <Button
                    icon="pi pi-trash"
                    onClick={() => deleteFocusArea(rowData.id)}
                    severity="danger"
                  />
                </div>
              )}
            />
          </DataTable>
        </> 
        )}
        
        </div>
      </div>
      <div className="flex pt-4 justify-content-between">
        <Button label="Back" icon="pi pi-arrow-left" iconPos="left" onClick={() => onBack()} />
        <Button label="Next" icon="pi pi-arrow-right" iconPos="right" onClick={() => onContinue()} />
      </div>
      </>
    ))}
  </> 
  )
};


export async function getStaticProps(context) {
  return {
    props: { 
      messages: (await import(`../translations/${context.locale}.json`)).default
     },
  }
}

export default DefineFocusAreas;


/*

import React from "react";

export default function App() {
  const handleFileDownload = () => {
    const element = document.createElement("a");
    const file = new Blob(["hello world"], {
      type: "text/plain"
    });
    element.href = URL.createObjectURL(file);
    element.download = "myFile.txt";
    document.body.appendChild(element);
    element.click();
  };

  return (
    <div>
      <button onClick={handleFileDownload}>Download File</button>
    </div>
  );
}

*/
