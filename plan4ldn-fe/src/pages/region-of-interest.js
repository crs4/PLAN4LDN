"use client"

import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Toast } from 'primereact/toast';
import { useContext, useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { editProject, getUrlForStep, PROJECT_STEPS, DRAFT } from '../services/projects';
import RegionOfInterestSelector from '../components/region_of_interest_selector';
import { UserContext } from '../context/user';

const RegionOfInterest = () => {
  const t = useTranslations('default');  
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [readyToSubmit, setReadyToSubmit] = useState(false);
  const { register, handleSubmit, watch, setValue } = useForm();
  const toast = useRef(null);
  const { token,  currentProject, setUser } = useContext(UserContext);

  const onSubmit = async (data) => {
    try {
      
      if ( 
        currentProject && currentProject.id && 
        ( currentProject.step === PROJECT_STEPS.REGION_OF_INTEREST ||
          currentProject.step === null ) 
       ) {
        setLoading(true);
        const response = await editProject( currentProject.id, {
          ...data,
          administrative_level: data.adminLevel,
          country_iso_code_3: data.country,
          step: PROJECT_STEPS.DATASETS_LAND_USE,
        },token);
        if ( response.ok ) {
          const project = response.data.data
          setUser({ currentProject: project });
          toast.current.show({
            severity: 'success',
            summary: 'Done!', 
            detail: t('YOUR_CHANGES_HAVE_BEEN_SAVED'),
          });
          router.push(getUrlForStep(PROJECT_STEPS.DATASETS_LAND_USE), 300);
        }
        else { 
          toast.current.show({ severity: 'danger', summary: 'Oops!',
            detail: 'Error setting area!',
          });
          router.push(`/login`, 300)
        }
      }  
      else 
        toast.current.show({ severity: 'danger', summary: 'Oops!', detail: 'Error setting area!' });
    } catch (e) {
      toast.current.show({ severity: 'error', summary: 'Oops!', detail: handleError(error), });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if ( !token ) 
      router.push(`/login`);
    if ( !currentProject || !currentProject.id ||  ( currentProject.step  && currentProject.step !== PROJECT_STEPS.REGION_OF_INTEREST ))
      router.push(`/`);
    
  }, [token, currentProject]); // eslint-disable-line

  useEffect(() => {
    const subscription = watch((value) => {
      if (value?.roi_file_id !== null) {
        setReadyToSubmit(true);
      } else if (value?.country && value?.polygon) {
        setReadyToSubmit(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setReadyToSubmit]); // eslint-disable-line

  return (
    <div className="layout-dashboard">
    <Toast ref={toast} position="top-right" />
    { currentProject && currentProject.id && ( 
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <RegionOfInterestSelector projectId={currentProject.id} register={register} setValue={setValue} />
        </Card>
        <div className="flex justify-content-start mt-4 mb-6">
          <Button
            loading={loading}
            disabled={!readyToSubmit || loading}
            type="submit"
            label={t('SAVE_CHANGES')}
            icon="pi pi-save"
            size="large" 
          />
        </div>
      </form>
    )}
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

export default RegionOfInterest;
         