"use client"

import React, { useContext, useEffect, useState, useRef } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Toast } from 'primereact/toast';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/router';
import { createProject, editProject, getNextStep } from '../services/projects';
import { UserContext } from '../context/user';
import ProjectDetails from '../components/forms/ProjectDetails';

const CreateProject = () => {
  const t = useTranslations('default');
  const router = useRouter();
  const { token, setUser, resetData } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const toast = useRef(null);
  const { register, formState: { errors }, handleSubmit  } = useForm();
  

  useEffect(() => {
    if ( !token )
       router.push('/login')
    else setUser({ currentProject: null }); 
  }, []);  // eslint-disable-line 
  

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const response  = await createProject(data, token);
      if ( response && response.data ) {
        if ( response.data.data ) {
          const prj = response.data.data
          await editProject(prj.id, { step: getNextStep(prj) }, token);
          setUser({ currentProject: prj });
          toast.current.show({severity:'success', summary: 'Success', detail:'Your project has been created.', life: 3000});
          router.push(`/`, 3000)
        }
        else { 
          toast.current.show({ severity: 'error', summary: 'Oops!',
            detail: 'Error creating project!',
          });
          if ([401, 403].includes(response.status) && token ){
            resetData()
            router.push(`/login`, 300)
          }
        }
      } 
      else toast.current.show({severity:'Error', summary: 'Error', detail: 'System error', life: 3000});
    } catch (e) {
      toast.current.show({severity:'Error', summary: 'Error', detail: 'System error', life: 3000});
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="layout-dashboard">
      <Toast ref={toast} position="top-right" />     
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card title={t('PROJECT_DETAILS')} subTitle={t('PROJECT_DETAILS_SUBTITLE')} >
          <ProjectDetails register={register} errors={errors} />
        </Card>
        <div className="flex justify-content-start mt-4 mb-6">
          <Button
            className="button"
            loading={loading}
            disabled={loading}
            type="submit"
            label={t('CREATE_PROJECT')}
            icon="pi pi-plus"
          />
        </div>
      </form>
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


export default CreateProject;
