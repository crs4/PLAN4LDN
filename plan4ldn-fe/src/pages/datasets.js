"use client"

import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { RadioButton } from 'primereact/radiobutton';
import { Toast } from 'primereact/toast';
import { TabPanel, TabView } from 'primereact/tabview';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/router';
import { UserContext } from '../context/user';
import { useForm } from 'react-hook-form';
import { intersect, bboxPolygon, featureCollection } from '@turf/turf';
import CustomLuClassesTable from '../components/custom_lu_classes_table';
import Loading from '../components/loading';
import { uploadProjectFile } from '../services/files';
import {
  editProject,
  finaliseProject,
  getProject,
  getUrlForStep,
  PROJECT_STEPS,
} from '../services/projects';
import { handleError } from '../utilities/errors';

const ParseGeoraster = require ('georaster');

const ProjectDatasets = () => {
  const  t  = useTranslations('default');
  const router = useRouter();
  const { token, setUser, currentProject, resetData } = useContext(UserContext);
  const { register, handleSubmit, setValue, getValues } = useForm();
  const customLandDegradationMap = useRef(null);
  const customLandUseMap = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [btnLoading, setBtnLoading] = useState(false);
  const [project, setProject] = useState(null);
  const [topTabIndex, setTopTabIndex] = useState(0);
  const [luClasses, setLuClasses] = useState([]);
  const [custDegFileName, setCustDegFileName] = useState("");
  const [useDefaultLuClasses, setUseDefaultLuClasses] = useState(true);
  const [useDefaultLandDegradationMap, setUseDefaultLandDegradationMap] = useState(true);
  const toast = useRef(null);

  register('customLandDegradationMap', { value: null });
  register('customLandUseMap', { value: null });
  register('defaultLuClasses', { value: true });
  register('luClasses', { required: false });

  const onSubmit = async (dataset, data) => {
    try {
      if (dataset === 'land_use') {
        await editProject( project.id, {
          step: PROJECT_STEPS.DATASETS_LAND_DEGRADATION,
          uses_default_lu_classification: data.defaultLuClasses,
          land_use_map_file_id: data.customLandUseMap,
          lu_classes: (!data.defaultLuClasses) ? data.luClasses : [],
        }, token );
        // Move to next tab if this step is completed
        setTopTabIndex(1);
      } else if (dataset === 'land_degradation') {
        await editProject( project.id, {
          custom_land_degradation_map_file_id: data.customLandDegradationMap,
          step: PROJECT_STEPS.COMPLETED,
        }, token );
        // it's done, let's finalise it
        await finaliseProject(project.id,token);
        router.push(`/`, 500);
      }
      toast.current.show({ severity: 'success', summary: 'Success!',  detail: 'Project details have been updated.'});
    } catch (e) {
      toast.current.show({ severity: 'error', summary: 'Oops!', detail: handleError(e)});
    }
  };

  const uploadLandDegradationMap = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data: res } = await uploadProjectFile(project.id, formData, token);
      if ( res.data ) {
        setValue('customLandDegradationMap', res.data.id);
        setCustDegFileName(res.data.filename);
        toast.current.show({ severity: 'success', summary: 'Success!',  detail: 'Your file has been uploaded.'});
      }
      else toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'Errors uploading file'}); 
    } catch (error) {
      toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'Errors uploading file'});
    }
  };

  const uploadLandUseMap = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    let geoTiff = null;
    /// valid geotiff, roi inside 
    try {
      setBtnLoading(true)
      if ( file ) 
      {
        const readFilePromise = (path) => new Promise((resolve, reject) => {
          const readFile = new FileReader();
          readFile.onload = (event) =>  { 
            ParseGeoraster(event.target.result).then((georaster) => {
              geoTiff = georaster;
              resolve(georaster);
            });
          }
          readFile.onerror = (error) => {
            console.log(error)
            reject(error);
          };
          readFile.readAsArrayBuffer(file);
        })
        await readFilePromise(file);
        const roi = project.polygon;
        console.log(roi)        
        if ( geoTiff && geoTiff.width && geoTiff.height && geoTiff.projection === 4326 && roi && roi.bbox && 
          geoTiff.xmin && geoTiff.ymin && geoTiff.xmax && geoTiff.ymax )
        {   
          const tiffbbox = bboxPolygon([geoTiff.xmin,geoTiff.ymin,geoTiff.xmax,geoTiff.ymax]);
          console.log(tiffbbox)
	  const roibbox = bboxPolygon(roi.bbox);
	  console.log(roibbox)	
          const intersection = intersect(featureCollection([tiffbbox, roibbox]));
          
          if ( intersection !== null )
          {
            const unique = [];
            const classes = [];
            for ( let i = 0; i < geoTiff.height  ; i+=1 )
              for ( let j = 0; j < geoTiff.width  ; j+=1 )
                if ( geoTiff.values[0][i][j] != -32768 && !unique.includes(geoTiff.values[0][i][j]) )
                {
                  unique.push(geoTiff.values[0][i][j]);
                  classes.push ({ 
                    'value' : geoTiff.values[0][i][j],
                    'key' : String(geoTiff.values[0][i][j]),
                    'file_id' : null,                 
                  }); 
                }    
            const { data : res } = await uploadProjectFile( project.id, formData, token);
            if ( res.data ) {
              setValue('customLandUseMap', res.data.id);
              toast.current.show({ severity: 'success', summary: 'Success!',  detail: 'Your file has been uploaded.'});
              setLuClasses(classes);
            }
            else toast.current.show({ severity: 'error', summary: 'Opps!',  detail: 'Errors uploading file.'});     
          } 
          else toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'wrong geotiff !!!'}); 
        } 
        else toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'wrong geotiff !!!'});   
      }
      else toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'geotiff not found!!!'});
                             
    } catch (error) {
      console.log(error)
      toast.current.show({ severity: 'error', summary: 'Oops!', detail: handleError(error)});
    }
    setBtnLoading(false)
  };

  useEffect(() => {
    setValue('luClasses', luClasses);
  }, [luClasses, setValue]);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const id = currentProject.id
        
        const response = await getProject(id, token);
        if ( response.ok ) {
          const prj = response.data.data
          setProject(prj);
          setUser({ currentProject: prj });
          if ( prj.step === PROJECT_STEPS.DATASETS_LAND_USE ) 
            setTopTabIndex(0)
          else if ( prj.step === PROJECT_STEPS.DATASETS_LAND_DEGRADATION ) 
            setTopTabIndex(1)
          else {
            router.push(getUrlForStep(id, prj.step));
          }
        }
        else { 
          if ([401, 403].includes(response.data.status) && token ){
            resetData()
            router.push(`/login`, 300)
          }
        }
        
      } catch (e) {
        console.log(e)
      }
    };
    
    if ( token ) {
      setIsLoading(true)
      fetchProject();
      setIsLoading(false)
    }
    else router.push(`/login`);
  }, []); // eslint-disable-line

  const isDisabled = () => {
    if (!useDefaultLuClasses) {
      // if custom LU classes we should have a land use map
      if (getValues('customLandUseMap') === null) {
        return true;
      }

      // if custom LU classes we should have at least one lu class
      if (luClasses.length === 0) {
        return true;
      }
    }
    return false;
  };

  if (isLoading) {
    return <Loading />;
  }

  if (!project) {
    return <></>;
  }
  
  return (
    <div className="layout-dashboard">
      <Toast ref={toast} position="top-right" />
      <Card>
        <TabView activeIndex={topTabIndex} onTabChange={(e) => setTopTabIndex(e.index)}>
          <TabPanel
            disabled={project.step === PROJECT_STEPS.DATASETS_LAND_DEGRADATION && topTabIndex !== 0}
            header={
              <span><i className="pi pi-th-large mr-2" />{t('LAND_USE')}</span>
            }
          >
            <form onSubmit={handleSubmit((data) => onSubmit('land_use', data))}>
              <div className="flex flex-column gap-3">
                <div className="flex align-items-center">
                  <RadioButton
                    inputId="defaultLuClasses"
                    value="true"
                    name="defaultLuClasses"
                    onChange={() => {
                      setUseDefaultLuClasses(true);
                      setLuClasses([]);
                      setValue('defaultLuClasses', true);
                    }}
                    checked={useDefaultLuClasses}
                  />
                  <label htmlFor="defaultLuClasses" className="ml-2">
                    {t('USE_DEFAULT_LU_CLASSIFICATION')}
                    &nbsp;(
                    <a
                    rel="noreferrer"
                    target="_blank"
                    href="https://data.apps.fao.org/map/catalog/srv/eng/catalog.search#/metadata/fc32c5de-440c-46aa-9cad-81f4c8b84c6a">
                    FAO/LADA
                    </a>)
                  </label>
                </div>  
                <div className="flex align-items-center">
                  <RadioButton
                    inputId="defaultLuClasses"
                    value="false"
                    name="defaultLuClasses"
                    onChange={() => {
                      setUseDefaultLuClasses(false);
                      setValue('defaultLuClasses', false);
                    }}
                    checked={!useDefaultLuClasses}
                  />
                  <label htmlFor="defaultLuClasses" className="ml-2">{t('USE_CUSTOM_LU_CLASSIFICATION')}</label>
                </div>
                { !useDefaultLuClasses && (
                <>  
                <div className="flex align-items-center">
                  <p class="m-3">{t('CUSTOM_LU_CLASSES_MESSAGE')}</p>
                </div>  
                {(getValues('customLandUseMap') === null) && (
                  <div className="flex align-items-center">
                    <input
                      className="hidden"
                      type="file"
                      multiple={false}
                      accept=".geotiff,.geotif,.tiff,.tif"
                      ref={customLandUseMap}
                      onChange={(e) => uploadLandUseMap(e.target.files[0])}
                    />
                    <Button
                      label={t('UPLOAD_LAND_USE_MAP')}
                      icon="pi pi-image"
                      loading={btnLoading}
                      type="button"
                      className="p-mr-2 p-mt-4 p-d-block"
                      onClick={() => {
                        customLandUseMap.current.click();
                      }}
                    />
                  </div>
                )}
                {(getValues('customLandUseMap') !== null) && (
                    <>
                      <Button
                        label='Cancel'
                        icon="pi pi-image"
                        type="button"
                        className="p-mr-2 p-mt-4 p-d-block"
                        onClick={() => {
                          customLandUseMap.current.click();
                        }}
                      />
                    </>
                )}
                <CustomLuClassesTable
                  className="p-mt-4"
                  hasFiles
                  projectId={project.id}
                  roi={project.polygon}
                  data={luClasses}
                  onUpdateItem={(entry) => {
                    setLuClasses((oldLC) => {
                      const index = oldLC.findIndex((lc) => lc.value === entry.value);
                      oldLC[index] = entry;
                      return [...oldLC];
                    });
                  }}
                  onDeleteItem={(entry) => {
                    setLuClasses(luClasses.filter((lc) => lc.key !== entry.key));
                  }}
                />
                </>
                )}
                <div className="flex align-items-center">
                  <Button
                    className="p-button mt-4"
                    type="submit"
                    disabled={isDisabled()}
                    label={t('SAVE_CHANGES')}
                    icon="pi pi-save"
                  />
                </div>
              </div>
            </form>
          </TabPanel>
          <TabPanel
            disabled={project.step === PROJECT_STEPS.DATASETS_LAND_USE && topTabIndex !== 1}
            header={
              <span><i className="pi pi-warehouse mr-2" />{t('LAND_DEGRADATION')}</span>
            }
          >
            <form onSubmit={handleSubmit((data) => onSubmit('land_degradation', data))}>
              <div className="flex flex-column gap-3 m-2">
                <div className="flex align-items-center">
                  <RadioButton
                    inputId="defaultLandDegradationMap"
                    value="true"
                    name="defaultLandDegradationMap"
                    onChange={() => {
                      setUseDefaultLandDegradationMap(true);
                      setValue('defaultLandDegradationMap', true);
                    }}
                    checked={useDefaultLandDegradationMap}
                  />
                  <label htmlFor="defaultLandDegradationMap"  className="ml-2">
                    {t('USE_DEFAULT_SDG_DATA')}(
                    <a
                      href="https://github.com/ConservationInternational/trends.earth"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Trends.Earth
                    </a>
                    )
                  </label>
                </div>
                <div className="flex align-items-center">
                  <RadioButton
                    inputId="defaultLandDegradationMap"
                    value="false"
                    name="defaultLandDegradationMap"
                    onChange={() => {
                      setUseDefaultLandDegradationMap(false);
                      setValue('defaultLandDegradationMap', false);
                    }}
                    checked={!useDefaultLandDegradationMap}
                  />
                  <label htmlFor="defaultLandDegradationMap"  className="ml-2">
                    {t('USE_CUSTOM_LAND_DEGRADATION_MAP')}
                  </label>
                </div>
              </div>
              {!useDefaultLandDegradationMap && (
              <div className="flex flex-row gap-3 m-2">
                <input
                    className="hidden"
                    type="file"
                    multiple={false}
                    ref={customLandDegradationMap}
                    onChange={(e) => uploadLandDegradationMap(e.target.files[0])}
                  />
                  <Button
                    label={t('UPLOAD_LAND_DEGRADATION_MAP')}
                    icon="pi pi-image"
                    type="button"
                    className="mr-2 mb-4 block"
                    disabled={
                        getValues('customLandDegradationMap') !== null
                    }
                    onClick={() => {
                      customLandDegradationMap.current.click();
                    }}
                  />
                  <span className="font-bold">{custDegFileName}</span>
              </div>
              )}
              <Button
                className="p-button m-4"
                type="submit"
                disabled={
                  !useDefaultLandDegradationMap
                    ? getValues('customLandDegradationMap') === null
                    : false
                }
                label={t('SAVE_CHANGES')}
                icon="pi pi-save"
              />
            </form>
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



export default ProjectDatasets;
