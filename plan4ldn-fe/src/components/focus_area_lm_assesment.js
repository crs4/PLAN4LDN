"use client"

import React, { useEffect, useContext, useState, useRef } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { UserContext } from '../context/user';
import Loading from './loading';
import FocusAreaQuestionnaire from './FocusAreaQuestionnaire';
import { getProjectFocusAreas, editProject, DATAMODIFIED, REPROCESSING, PUBLISHED } from '../services/projects';
import { getEvaluations, addEvaluation, updatEvaluation } from '../services/focus-area-evaluations';
import { handleError } from '../utilities/errors';
import { findLuClassesByIds } from '../utilities/schema-generators';

const hasEvaluation = (evaluations, focusAreaId, luClass) => {
  if (!evaluations || evaluations.length === 0) return false;

  for (let i = 0; i < evaluations.length; i += 1) {
    if (evaluations[i].project_focus_area_id === focusAreaId && evaluations[i].lu_class === luClass) {
      return true;
    }
  }

  return false;
}

const FocusAreaLMAssesment = ({ onBack }) => {
  const t = useTranslations('default');
  const { token, currentProject, setUser } = useContext(UserContext);
  const toast = useRef();
  const router = useRouter();
  const [evaluations, setEvaluations] = useState([]);
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFocusArea, setSelectedFocusArea] = useState(null);
  const [selectedLuClass, setSelectedLuClass] = useState(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  

  const fetchData = async () => {
    try {
      const { data: f } = await getProjectFocusAreas(currentProject.id, token);
      const { data: e } = await getEvaluations(currentProject.id, token);
      const focusAreasResponse = f.data;
      const evaluationsResponse = e.data;
      setEvaluations(evaluationsResponse);
      if ( focusAreasResponse ) {
        if (focusAreasResponse.length === 0) {
          onBack();
          return;
        }
        setOptions(focusAreasResponse.map((focusArea) => ({
          ...focusArea,
          luClasses: findLuClassesByIds(
            focusArea.extracted_classes,
            currentProject.lu_classes,
            currentProject.uses_default_lu_classification
          ).map((lc) => ({
            ...lc,
            hasEvaluation: hasEvaluation(evaluationsResponse, focusArea.id, `${lc.value}`),
          })),
        })));
      }
    } catch (error) {
      toast.current.show({ severity: 'danger', summary:'Error!', detail: handleError(error) })
      setEvaluations(null)
      console.log(error)     
    }
    setIsLoading(false);
  };

  const saveEvaluation = async (evaluationId, newdata) => {
    
    if (selectedLuClass === null || selectedFocusArea === null) {
      // Do nothing if nothing is selected
      return;
    }
    try {
      if (selectedEvaluation === null) {
        // Add it
        await addEvaluation( currentProject.id, {
          project_focus_area_id: selectedFocusArea.id,
          lu_class: selectedLuClass,
          ...newdata,
        }, token);
      } else {
        // Update it
        await updatEvaluation(currentProject.id, evaluationId, newdata, token);
      }
      let hasFinishedEvaluations = true;
      if ( options && options.length > 0 ){
        options.forEach( (opt) => {
          
          for ( let lucls of opt.luClasses ) { // eslint-disable-line
            if ( !( opt.id === selectedFocusArea.id && lucls.value === selectedLuClass ) &&
                 !lucls.hasEvaluation ) {
              hasFinishedEvaluations = false;
              break;
            }
          }
        })
      }
      currentProject.land_management_sustainability_method = hasFinishedEvaluations;
      if ( hasFinishedEvaluations ) {
        const response = await editProject(currentProject.id, {
          status : DATAMODIFIED,
          land_management_sustainability_method: hasFinishedEvaluations,
        }, token);
        if ( response && response.ok && response.data && response.data.data )
          setUser({ currentProject: response.data.data });
      }
      await fetchData();
      toast.current.show({ severity: 'success', summary:'Done!', detail: t('YOUR_CHANGES_HAVE_BEEN_SAVED') })
    } catch (error) {
      console.log(error)
      toast.current.show({ severity: 'danger', summary:'Error!', detail: handleError(error) })          
    } finally {
      setSelectedFocusArea(null);
      setSelectedLuClass(null);
      setSelectedEvaluation(null); 
    }
  };
  
  const handleSubmit = async () => {
    if ( currentProject.status === REPROCESSING ) {
      router.push('/');
    }
    if ( currentProject.status === DATAMODIFIED && currentProject.land_management_sustainability_method )  {  
        try {
          await editProject(currentProject.id, {
            status : REPROCESSING,
          }, token);
          router.push(`/`);
          return;
        } catch (e) {
          toast.current.show({ severity: 'danger', summary:'Error!', detail: handleError(error) }) 
        }
    } else toast.current.show({ severity: 'danger', summary:'Error!', detail: 'Focus Areas LM Assesment not completed' }) 
  }

  useEffect(() => {
    if ( currentProject )
      fetchData();
  }, [currentProject, token ]); // eslint-disable-line

  useEffect(() => {
    if (selectedFocusArea && selectedLuClass) {
      const foundEvaluation = evaluations.find((ev) => (
        ev.project_focus_area_id === selectedFocusArea.id && ev.lu_class === `${selectedLuClass}`
      ));
      setSelectedEvaluation(foundEvaluation || null);
    }
  }, [selectedFocusArea, selectedLuClass]); // eslint-disable-line

  if (isLoading) {
    return (
      <>
      <Toast ref={toast} position="top-right" />
      <div className="mt-6"><Loading /></div>
      </>
    );
  }

  const onFocusAreaChange = (e) => {
    setSelectedFocusArea(e.value);
    setSelectedLuClass(null);
  }

  const onLuClassChange = (e) => {
    setSelectedLuClass(e.value);
  }

  const selectedFocusAreaTemplate = (option, props) => {
    if (option) {
      let hasFinishedEvaluations = true;
      for (let i = 0; i < option.luClasses.length; i += 1) {
        if (!option.luClasses[i].hasEvaluation) {
          hasFinishedEvaluations = false;
          break;
        }
      }
      return (
        <div className="p-d-flex p-ai-center">
          {hasFinishedEvaluations
            ? <i className="block pi pi-check-circle mr-2" />
            : <i className="block pi pi-circle mr-2" />
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
      if (!option.luClasses[i].hasEvaluation) {
        hasFinishedEvaluations = false;
        break;
      }
    }
    return (
      <div key={option.id} className="p-d-flex p-ai-center">
        {hasFinishedEvaluations
          ? <i className="block pi pi-check-circle mr-2" />
          : <i className="block pi pi-circle mr-2" />
        }
        <span className="p-block">{option.name}</span>
      </div>
    );
  };

  const selectedLuClassTemplate = (option, props) => {
    if (option) {
      return (
        <div key={option.value} className="flex align-items-center">
          {option.hasEvaluation
            ? <i className="block pi pi-check-circle mr-2" />
            : <i className="block pi pi-circle mr-2" />
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
      {option.hasEvaluation
        ? <i className="block pi pi-check-circle mr-2" />
        : <i className="block pi pi-circle mr-2" />
      }
      <span className="block">{option.key || option.value}</span>
    </div>
  );

  return (
    <>
    <Toast ref={toast} position="top-right" />
    <div className="flex flex-column m-2">
    {!evaluations && (<h4 className="font-bold text-red-500">Errors loading data</h4>) }  
    {evaluations && (
      <>
      <div className="grid">
        <div className="col-6">
          <strong className="block mb-2">
            Select a focus area and then a land use type to evaluate it:
          </strong>
          <Dropdown
            className="mr-2 w-3"
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
        <div className="col-6 flex justify-content-end align-items-center">
          {(( evaluations && evaluations.length > 0 &&
              currentProject.role === 'owner' &&
              currentProject.land_management_sustainability_method &&
              currentProject.status === DATAMODIFIED  )) && (
            <Button
              label={t('PROJECT_REPROCESSING')}
              loading={isLoading}
              icon="pi pi-chart"
              type="button"
              onClick={() => handleSubmit()}
            />
          )}
        </div>
      </div>
      {(selectedFocusArea && selectedLuClass) && (
        <FocusAreaQuestionnaire
          evaluation={selectedEvaluation}
          onSave={saveEvaluation}
          isForProposal={false}
          showFinalQuestion
        />
      )}
    </>  
    )}

    </div>
    <div className="flex pt-4 justify-content-between">
      <Button label="Back" icon="pi pi-arrow-left" iconPos="left" onClick={() => onBack()} />        
    </div>
    </>
  );
}

export async function getStaticProps(context) {
  return {
    props: { 
      messages: (await import(`../translations/${context.locale}.json`)).default
     },
  }
}

export default FocusAreaLMAssesment;
