"use client"

import React, { useRef, useEffect, useState, useContext } from 'react';
import {useTranslations} from 'next-intl';
import InviteProjectMembersDialog from '../components/dialogs/invite-project-members-dialog';
import ProjectsTable from '../components/tables/projects-table';
import Loading from '../components/loading';
import { listProjects, PROJECT_OWNER, DRAFT, getUrlForStep, deleteProject, PUBLISHED, DATAMODIFIED } from '../services/projects';
import { UserContext } from '../context/user';
import { useRouter } from 'next/router';
import { Toast } from 'primereact/toast';

export default function Dashboard() {
  const t = useTranslations('default');
  const toast = useRef(null)
  const [myProjects, setMyProjects] = useState([]);
  const [sharedProjects, setSharedProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState({});
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { token, setUser, resetData, currentProject } = useContext(UserContext);
  const router = useRouter();

  useEffect(() => {
    if ( token ) {
      const fetchProjects = async () => {
        setIsLoading(true)
        try {
          const response = await listProjects(token);
          if ( response && response.data ) {
            const data = response.data.data;
            setMyProjects(data.filter((p) => p.role === PROJECT_OWNER));
            setSharedProjects(data.filter((p) => p.role !== PROJECT_OWNER));
            setUser({ currentProject: null, availableProjects: data });
          }
          else { 
            if ([401, 403].includes(response.status) ){
              resetData()
              router.push(`/login`, 300)
            }
          }
        } catch( error )  {
          console.log( error )
          setMyProjects([]);
          setSharedProjects([]);
        }
        setIsLoading(false)
      }; 
      fetchProjects(); 
      
    }
    else router.push(`/login`);

  }, [token]); // eslint-disable-line

  const editProject = (projectId) => {
      const project = myProjects.filter((p) => p?.id === projectId)?.pop();
      if ( project ) {
        setUser({ currentProject: project });
      }
      router.push(`/edit-project`);
  };

  const inviteToProject = (id) => {
    setSelectedProject(myProjects.filter((p) => p?.id === id)?.pop());
    setInviteDialogOpen(true);
  };

  const setCurrentProject = async (selproject) => {
    const project = myProjects.filter((p) => p.id === selproject.id)?.pop();
    if ( project )
      await setUser({ currentProject: selproject });
  };

  const loadProject = async (project) => {
    if ( project ) {
      await setCurrentProject(project)
      if ( project.status === DRAFT || project.status === PUBLISHED || project.status === DATAMODIFIED ) {
        router.push(getUrlForStep(project.step),1000);
      }
    }
    else console.log ("???????currentProject")
  };

  const removeProject = async (projectId) => {
    try {
      const response = await deleteProject(projectId, token);
        if ( response.ok ) {
          setMyProjects((omp) => (omp.filter((p) => p.id !== projectId)));
          toast.current.show({
            severity: 'success',
            summary: 'Done!', 
            detail: 'Project has been deleted',
          });
        }
        else { 
          toast.current.show({
            severity: 'error',
            summary: 'Oops!',
            detail: 'Error deleting project',
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
        detail: 'Error deleting project',
      });
    }
  };

  if (isLoading) {
      return <Loading />;
  }

  if (!token)
    return <></>

  return ( 
    <div className="layout-dashboard">
      <Toast ref={toast} position="top-right" />
      <ProjectsTable
        projects={myProjects}
        title={t('MY_PROJECTS')}
        editProject={(id) => editProject(id)}
        inviteToProject={(id) => inviteToProject(id)}
        loadProject={loadProject}
        deleteProject={removeProject}
        className="mb-4"
      />
      <ProjectsTable
        projects={sharedProjects}
        title={t('SHARED_PROJECTS')}
        inviteToProject={(id) => inviteToProject(id)}
        loadProject={loadProject}
      />
      <InviteProjectMembersDialog
        project={selectedProject}
        dialogOpen={inviteDialogOpen}
        setDialogOpen={setInviteDialogOpen}
      />
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


