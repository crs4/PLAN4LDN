"use client"

import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Toast } from 'primereact/toast';
import React, { useContext, useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import ProjectDetails from '../components/forms/ProjectDetails';
import { editProject, getProject } from '../services/projects';
import { UserContext } from '../context/user';

const EditProject = () => {
  const t  = useTranslations('default');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const toast = useRef();
  const { token, setUser, resetData, currentProject } = useContext(UserContext);
  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm();

  const onSubmit = async (data) => {
    try {
      if ( currentProject && currentProject.id ) {
        setLoading(true);
        const  response = await editProject(currentProject.id, data, token);
        
        if ( response && response.data ) {
          const project = response.data.data
          setUser({ currentProject: project });
          toast.current.show({ severity: 'success', summary: 'Success!', detail: 'Project details have been updated.'});
          router.push(`/`, 500)
        }
        else toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'Error saving data' });
      }
      toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'project not set'});
    } catch (e) {
      console.log(e)
      toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'System errors'});
    }
    setLoading(false);
  };

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        const response = await getProject(currentProject.id, token);
        console.log(response)
        if ( response && response.data ) {
          const project = response.data.data
          setUser({ currentProject: project });
        }
        else { 
          toast.current.show({ severity: 'error', summary: 'Oops!',
            detail: 'Error loading project',
          });
          if ([401, 403].includes(response.status) && token ){
            resetData()
            router.push(`/login`, 300)
          }
        }
      } catch (e) {
        toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'Error loading project'});
      }
      setLoading(false);
    };
    if ( currentProject && currentProject.id ) {
      fetchProject();
    }
  },[currentProject]); // eslint-disable-line

  return (
    <div className="layout-dashboard">
      <Toast ref={toast} position="top-right" />
      { currentProject && currentProject.id && ( 
      <Card title={t('PROJECT_DETAILS')} subTitle={t('PROJECT_DETAILS_SUBTITLE')}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ProjectDetails project={currentProject} register={register} errors={errors} />
          <div className="flex justify-content-start mt-4 mb-2">
            <Button
              className="button"
              type="submit"
              loading={loading}
              disabled={loading}
              label={t('SAVE_CHANGES')}
              icon="pi pi-save"
            />
          </div>
        </form>
      </Card>
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



export default EditProject;
