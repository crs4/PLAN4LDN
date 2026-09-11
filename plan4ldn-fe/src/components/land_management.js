"use client"

import { Button } from 'primereact/button';
import { DataView } from 'primereact/dataview';
import { Message } from 'primereact/message';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Image } from 'primereact/image';
import React, { useContext, useRef, useEffect, useState } from 'react';
import { UserContext } from '../context/user';
import { useTranslations } from 'next-intl';
import { Toast } from 'primereact/toast';
import { getWocatTechnologies } from '../services/landuse';
import {
  getProjectFocusAreas,
  proposeProjectWocatTechnology,
  getProjectWocatTechnologies,
  rejectProjectWocatTechnology,
} from '../services/projects';
import { getEvaluations } from '../services/focus-area-evaluations';
import { findLuClassesByIds } from '../utilities/schema-generators';

import dynamic from 'next/dynamic'

const SingleWocatTechnology = dynamic(() => import('./single_wocat_technology'), {
  ssr: false
})

const FocusAreaQuestionnaire = dynamic(() => import('./FocusAreaQuestionnaire'), {
  ssr: false
})

const findEvaluation = (evaluations, focusAreaId, luClass) => {
  if (!evaluations || evaluations.length === 0) return null;
  for (let i = 0; i < evaluations.length; i += 1) {
    if (evaluations[i].project_focus_area_id === focusAreaId && evaluations[i].lu_class === luClass) {
      return evaluations[i];
    }
  }

  return null;
}

const LandManagement = () => {
  const t = useTranslations('default');
  const [selectedFocusArea, setSelectedFocusArea] = useState(null);
  const [selectedLuClass, setSelectedLuClass] = useState(null);
  const [options, setOptions] = useState([]);
  const [selectionEvaluated, setSelectionEvaluated] = useState(false);
  const [selectionEvaluation, setSelectionEvaluation] = useState(null);
  const { currentProject, token, id: userId  } = useContext(UserContext);
  const toast = useRef(null);
  
  const ITEMS_CHUNK_SIZE=25;
  // State related.
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTechnology, setIsLoadingTechnology] = useState(false);

  // Search related.
  const [keyword, setKeyword] = useState('');

  // Pagination.
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);

  // Data.
  const [technologies, setTechnologies] = useState([]);
  const [chosenTechnology, setChosenTechnology] = useState(null);
  const [selectedTechnology, setSelectedTechnology] = useState(null);

  const wocat_search = async () => {
    setIsLoadingTechnology(true);
    try {
      let mkeyword = 'All';
      if ( keyword && keyword !== '' )
        mkeyword = keyword.replaceAll(' ','+');
      const response = await getWocatTechnologies(
        mkeyword,
        currentPage,
        token
      );
      
      if ( response.ok && response.data && response.data.data ){
        let data = response.data.data;
        setTechnologies(data?.items || []);
        setTotal(data?.total || 0);
      }
      else toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'Errors loading Wocat techologies'});     
    } catch (e) {
      console.log(e)
      toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'Errors loading Wocat techologies'});                   
    }
    setIsLoadingTechnology(false);
  };

  const resetState = () => {
    setSelectedFocusArea(null);
    setSelectedLuClass(null);
    setSelectedTechnology(null);
    setSelectionEvaluation(null);
    setSelectionEvaluated(false);
    setChosenTechnology(null);
  };

  const onPropose = async (_evaluationId, evaluationValues) => {
    if (selectedTechnology === null) {
      // How does he get here?
      resetState();
      return;
    }
    try {
      setIsLoading(true);
      const response = await proposeProjectWocatTechnology(
        currentProject.id,
        selectedTechnology?.code,
        selectedFocusArea.id,
        selectedLuClass,
        evaluationValues,
        token
      );
      if ( response.ok ) {
        toast.current.show({ severity: 'success', summary: 'Done!', detail: 'Your proposal has been saved for this focus area and land use.'});          
        resetState();
      }
      else toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'Errors saving proposal'});
    } catch (e) {
      toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'Errors saving proposal'});          
    } finally {
      setIsLoading(false);
    }
  }

  const onReject = async () => {
    if (!chosenTechnology) return;
    try {
      setIsLoading(true);
      const response = await rejectProjectWocatTechnology(currentProject.id, chosenTechnology.id, token);
      if ( response.ok ) {
        toast.current.show({ severity: 'success', summary: 'Done!', detail: 'This proposal has been rejected.'});          
        resetState();
      }
      else toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'Errors rejecting proposal'});
    } catch (e) {
      toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'Errors rejecting proposal'});             
    } finally {
      setIsLoading(false);
    }
  }

  const fetchFocusAreaAndEvaludationsData = async () => {
    try {
      const response1 = await getProjectFocusAreas(currentProject.id, token);
      const response2 = await getEvaluations(currentProject.id, token);
      if ( response1.ok && response2.ok ){
        let focusAreasResponse =  response1.data?.data;
        let evaluationsResponse =  response2.data?.data;
        if ( focusAreasResponse && evaluationsResponse ) {
          const ev_opt = focusAreasResponse.map((focusArea) => ({
            ...focusArea,
            luClasses: findLuClassesByIds(
              focusArea.extracted_classes,
              currentProject.lu_classes,
              currentProject.uses_default_lu_classification
            ).map((lc) => ({
              ...lc,
              evaluation: findEvaluation(evaluationsResponse, focusArea.id, `${lc.value}`),
            })),
          }));
          console.log(ev_opt);
          setOptions(ev_opt);
        }  
      }
      else toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'Errors loading data'});
    } catch (e) {
      toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'Errors loading data'});                      
    }
  };

  const getProjectTechnologies = async (filters = {}) => {
    try {
      let chosen = null;
      setIsLoadingTechnology(true);
      setChosenTechnology(null);
      setSelectedTechnology(null);
      const response = await getProjectWocatTechnologies(currentProject?.id, { ...filters }, token);
      console.log(response)
      if ( response.ok && response.data && response.data.data ) {
        chosen = response.data.data['0'];
        if ( chosen )
          setChosenTechnology(chosen);
        else await wocat_search(); 
      }
      else   toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'Errors loading Wocat Technologies'});          
    
    } catch (e) {
      console.log(e)
      toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'Errors loading Wocat Technologies'});          
    } 
    setIsLoadingTechnology(false);
    
    
  };

  useEffect(() => {
    if ( currentProject ) {
      fetchFocusAreaAndEvaludationsData();
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    if ( selectedLuClass )
      wocat_search();
  }, [currentPage]); // eslint-disable-line

  useEffect(() => {
    if (selectedFocusArea) {
      const luClass = selectedFocusArea.luClasses.find((lu) => lu.value === selectedLuClass);
      if (luClass) {
        setSelectionEvaluated(luClass.evaluation !== null);
        if (luClass.evaluation) {
          setSelectionEvaluation(luClass.evaluation);
          getProjectTechnologies({
            project_focus_area_id: selectedFocusArea.id,
            lu_class: luClass.value,
          })
          
          
        }
      }
    }
  }, [selectedLuClass]); // eslint-disable-line

  const header = (
    <div className="grid formgrid">
      <div className="col-6 flex align-items-center">
        <h5 className="mb-0">{t('APPLICABLE_WOCAT_SLM_TECHNOLOGIES')}</h5>
      </div>
      <div className="col-6">
        <div className="grid formgrid fluid">
          <label className="col-2 flex align-items-center justify-content-end" htmlFor="keyword">
            {t('SEARCH')}:
          </label>
          <div className="col-10">
            <span className="input-icon-right">
              <InputText
                value={keyword}
                placeholder={t('ENTER_KEYWORD')}
                id="keyword"
                disabled={isLoading}
                onChange={(e) => setKeyword(e.target.value)}
              />
              <Button
                icon="pi pi-search"
                className="mr-2 button-secondary"
                onClick={() => wocat_search()}
                disabled={isLoading}
                label='Search'
              />
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const itemTemplate = (tech) => (
    <div className="col-12">
      <div className="flex align-items-center">
        <div className="col-3 text-center">
          {( tech?.image && tech?.image !== '' ) && (
            <Image
              src={tech?.image}
              zoomSrc={ tech?.image } 
              alt="Image" 
              width="250"
              preview
            />  
          )}
          {( tech?.image === '' ) && (
            <Image
              src='/plan4ldn/img/placeholder.png'
              alt="Image" 
              width="250"
            />  
          )}
        </div>
        <div className="col-7">
          <div className="px-4">
            <a href={tech?.url || '#'} target="_blank" rel="noreferrer noopener">
              <h5 className="text-primary">
                {tech?.name || ''} - {tech?.country || ''}
              </h5>
            </a>
            <p className="pr-4">{tech?.description || ''}</p>
            <div className="grid">
              <div className="col-12">
                <i className="pi pi-map-marker" />
                <span className="ml-2 font-bold">Longitude:</span>
                <span className="ml-2 text-primary">{tech?.longitude || 'N/A'}</span>
                <span className="ml-2 font-bold">Latitude:</span>
                <span className="ml-2 text-primary">{tech?.latitude || 'N/A'}</span>
              </div>
              <div className="col-12">
                <i className="pi pi-calendar" />
                <span className="ml-2 font-bold">Created:</span>
                <span className="ml-2 text-primary">{tech?.created || 'N/A'}</span>
                <span className="ml-2 font-bold">Updated:</span>
                <span className="ml-2 text-primary">{tech?.updated || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="col-2">
          <Button
            label="Select"
            onClick={() => setSelectedTechnology(tech)}
            className="ml-2 block"
            icon="pi pi-check"
          />
        </div>
      </div>
    </div>
  );

  const onFocusAreaChange = (e) => {
    resetState();
    setSelectedFocusArea(e.value);
    
  }

  const onLuClassChange = (e) => {
    setSelectedTechnology(null);
    setSelectionEvaluation(null);
    setSelectionEvaluated(false);
    setChosenTechnology(null);
    setSelectedLuClass(e.value);
  }

  const selectedFocusAreaTemplate = (option, props) => {
    if (option) {
      let hasFinishedEvaluations = true;
      for (let i = 0; i < option.luClasses.length; i += 1) {
        if (!option.luClasses[i].evaluation) {
          hasFinishedEvaluations = false;
          break;
        }
      }
      return (
        <div className="flex align-items-center">
          {hasFinishedEvaluations
            ? <i className="block far fa-check-circle mr-2" />
            : <i className="block far fa-circle mr-2" />
          }
          <span className="block">{option.name}</span>
        </div>
      );
    }

    return (
      <span>
        {props.placeholder}
      </span>
    );
  }

  const focusAreaOptionTemplate = (option) => {
    let hasFinishedEvaluations = true;
    for (let i = 0; i < option.luClasses.length; i += 1) {
      if (!option.luClasses[i].evaluation) {
        hasFinishedEvaluations = false;
        break;
      }
    }
    return (
      <div key={option.id} className="flex align-items-center">
        {hasFinishedEvaluations
          ? <i className="block far fa-check-circle mr-2" />
          : <i className="block far fa-circle mr-2" />
        }
        <span className="block">{option.name}</span>
      </div>
    );
  };

  const selectedLuClassTemplate = (option, props) => {
    if (option) {
      return (
        <div key={option.value} className="flex align-items-center">
          {option.evaluation !== null
            ? <i className="block far fa-check-circle mr-2" />
            : <i className="block far fa-circle mr-2" />
          }
          <span className="block">{option.key || option.value}</span>
        </div>
      );
    }

    return (
      <span>
        {props.placeholder}
      </span>
    );
  }

  const luClassOptionTemplate = (option) => (
    <div key={option.value} className="flex align-items-center">
      {option.evaluation !== null
        ? <i className="block far fa-check-circle mr-2" />
        : <i className="block far fa-circle mr-2" />
      }
      <span className="block">{option.key || option.value}</span>
    </div>
  );

  if (!currentProject) {
    return <></>;
  }
  return (
    <>
    <Toast ref={toast} position="top-right" />             
      <div className="grid">
        <div className="col-6">
          <strong className="block mb-2">
            Select a focus area and then a land use type to select a WOCAT technology:
          </strong>
          <Dropdown
            className="mr-2"
            value={selectedFocusArea}
            options={options}
            onChange={onFocusAreaChange}
            optionLabel="name"
            placeholder="Select a focus area"
            valueTemplate={selectedFocusAreaTemplate}
            itemTemplate={focusAreaOptionTemplate}
          />
          {selectedFocusArea && (
            <Dropdown
              className="mr-2"
              value={selectedLuClass}
              options={selectedFocusArea.luClasses}
              onChange={onLuClassChange}
              optionLabel="value"
              optionValue="value"
              placeholder="Select a land use type"
              valueTemplate={selectedLuClassTemplate}
              itemTemplate={luClassOptionTemplate}
            />
          )}
        </div>
        {selectedTechnology !== null && (
          <div className="col-6 text-right">
            <Button
              icon="pi pi-info-circle"
              label={selectedTechnology?.code}
              tooltip={selectedTechnology?.name}
              tooltipOptions={{ position: 'bottom', mouseTrack: true, mouseTrackTop: 15 }} 
              className="m-2 font-bold"
              severity="success" text raised
            />

            <Button
              icon="pi pi-arrow-circle-left"
              className="m-2"
              onClick={() => setSelectedTechnology(null)}
              label='Search for a different technology'
              severity="Warning"
            />
          </div>
        )}
      </div>
      {(selectedFocusArea && selectedLuClass && !selectionEvaluated) && (
        <Message
          severity="warn"
          text="The selected land use hasn't been evaluated from you yet. Please evaluate it first in the
          Current State menu, then come back here."
          className="mt-2"
        />
      )}
      {(
        selectedFocusArea && selectedLuClass && selectionEvaluated && 
        chosenTechnology === null && selectedTechnology !== null && !isLoadingTechnology
      ) && (
        <FocusAreaQuestionnaire
          evaluation={null}
          onSave={onPropose}
          showFinalQuestion={false}
          comparingEvaluation={selectionEvaluation}
          isForProposal
        />        
      )}
      {( isLoadingTechnology ) && (
        <div className="col-12">
          <i className="pi pi-spin pi-spinner" style={{ fontSize: '4em' }} />
        </div>
      )}
      {(
        selectedFocusArea && selectedLuClass && selectionEvaluated && 
        chosenTechnology === null && selectedTechnology === null && !isLoadingTechnology
      ) && (
          <DataView
            paginator
            rows={ITEMS_CHUNK_SIZE}
            totalRecords={total}
            lazy
            paginatorPosition="both"
            first={currentPage * ITEMS_CHUNK_SIZE}
            value={technologies}
            onPage={(e) => setCurrentPage(e?.page || 0)}
            header={header}
            itemTemplate={itemTemplate}
            loading={isLoading}
            emptyMessage={t('NO_WOCAT_TECHNOLOGIES_FOUND')}
          />
        )}
      {(selectedFocusArea && selectedLuClass && selectionEvaluated && chosenTechnology) && (
          <SingleWocatTechnology
            techId={chosenTechnology?.technology_id}
            proposerEvaluation={chosenTechnology?.evaluation}
            selfEvaluation={selectedLuClass.evaluation}
            onReject={onReject}
          />
        )}
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

export default LandManagement;
