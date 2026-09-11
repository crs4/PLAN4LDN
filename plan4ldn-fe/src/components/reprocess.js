"use client"

import { useRef, useContext } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { useRouter } from 'next/router';
import { Toast } from 'primereact/toast';
import { handleError } from '../utilities/errors';
import { UserContext } from '../context/user';
import { DATAMODIFIED, REPROCESSING, editProject }  from '../services/projects';


export default function Reprocess() {
  const  t  = useTranslations('default');
  const toast = useRef(null)
  const { token, currentProject, setUser, resetData } = useContext(UserContext);
    
  const router = useRouter();

  const handleSubmit = async () => {
    if ( !token ||  !currentProject )
      return;
    if ( currentProject.status === REPROCESSING ) {
        router.push('/');
        return;
    }
    if ( currentProject.status === DATAMODIFIED && 
         currentProject.land_management_sustainability_method )  {  
        try {
          const response = await editProject(currentProject.id, { status : REPROCESSING }, token );
          if ( response.ok ) { 
            setUser({ currentProject: null });
            setTimeout(() => router.push(`/`), 500);
          } else { 
            toast.current.show({ severity: 'error', summary: 'Oops!',
              detail: 'Errors changing the project status'
            });
            if ([401, 403].includes(response.status) && token ){
              resetData()
              router.push(`/login`, 300)
            }
          }
        } catch (e) {
          toast.current.show({
            severity: 'error',
            summary: 'Oops!',
            detail: 'Errors changing the project status',
          });
        } 
    } 
    else toast.current.show({
        severity: 'error',
        summary: 'Oops!',
        detail: 'Error nothing to do'
    }); 
  }


  return (
    <>
      <div className="grid justify-items-center text-center mt-4 px-3">
        <Toast ref={toast} position="top-right" />
        <Message severity="warn" text={t('PROJECT_NEED_REPROCESSING')} />
        {( currentProject.role === 'owner' ) && (
          <Button
            label={t('PROJECT_REPROCESSING')}
            icon="pi pi-gear"
            type="button"
            className="block"
            onClick={() => handleSubmit()}
          />
        )}
      </div>
    </>
  )
}

export async function getStaticProps(context) {
  return {
    props: { 
      messages: (await import(`../translations/${context.locale}.json`)).default
     },
  }
}