"use client"

import React, { useContext, useEffect, useState, useRef } from 'react';
import { generateScenarioSchema, generateLUImpactMatrixSchema, fillInitialLandCoverageValues, getLandCoverageValuesPerClass } from '../utilities/schema-generators';
import { handleError } from '../utilities/errors';
import { calculateScenarioLdImpact } from '../utilities/ld-calculations';
import { createScenario, getScenarios, deleteAllScenarios, editScenario } from '../services/scenarios';
import { editProject } from '../services/projects';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Toast } from 'primereact/toast';
import { UserContext } from '../context/user';
import dynamic from 'next/dynamic'

const ScenarioToolbar = dynamic(() => import('./scenario_toolbar'), {
  ssr: false
})

const ScenarioTransitionMatrix = dynamic(() => import('./scenario_transition_matrix'), {
  ssr: false
})

const TransitionImpactMatrix = dynamic(() => import('./transition_impact_matrix'), {
  ssr: false
})

const NewScenarioDialog = dynamic(() => import('./dialogs/NewScenario'), {
  ssr: false
})

const LandUse = () => {
  const t = useTranslations('default');
  const [scenarios, setScenarios] = useState([]);
  const [canAddNewScenarios, setCanAddNewScenarios] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [canSave, setCanSave] = useState(false);
  const [scenarioModalVisible, setScenarioModalVisible] = useState(false);
  const [minYear, setMinYear] = useState(new Date().getFullYear());
  const { token, currentProject, setUser } = useContext(UserContext);
  const toast = useRef(null);
  const router = useRouter();
  
  const fetchScenarios = async () => {
    try {
      const response = await getScenarios( currentProject.id, token);
      if ( response.ok && response.data && response.data.data ){
        let data = response.data.data
        let maxYear = new Date().getFullYear();
        if ( data ) {
          for ( let i = 0; i < data.length; i += 1){
            const sc = data[i];
            if (parseInt(sc.to_year, 10) > maxYear) 
              maxYear = sc.to_year;
            setMinYear(parseInt(maxYear, 10));
            setScenarios(data.map((sc) => sc.content));
          }
        }
      }
      else toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'Errors loading scenarios'});
    } catch (e) {
      console.log(e)
      toast.current.show({ severity: 'error', summary: 'Oops!', detail: handleError(e)});      
    }
  };

  const editTransitionImpactMatrix = async (impactMatrixData, silently = false) => {
    try {
      let updatedProject = null;
      const response = await editProject(currentProject.id, {
        has_edited_transition_matrix_data: true,
        transition_impact_matrix_data: impactMatrixData,
      },token);
      if ( response.ok ) {
        updatedProject = response.data.data;
        setUser({ currentProject: updatedProject });
        toast.current.show({ severity: 'success', summary: 'Done!', detail: 'Trasition Impact Matrix for this project has been updated.'});
      }
      else toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'Error updating Trasition Impact Matrix' }); 
    } catch (e) {
        toast.current.show({ severity: 'error', summary: 'Oops!', detail: handleError(e)});          
    }
  };

  const prepareScenario = async (startYear, endYear) => {
    let landCoverHectaresPerClass = currentProject.preprocessing_data.base_lu_hectares_per_class;
    if (scenarios.length > 0) {
      landCoverHectaresPerClass = getLandCoverageValuesPerClass(scenarios.at(-1));
    }
    console.log(currentProject)
    console.log(landCoverHectaresPerClass) 

    const scenario = fillInitialLandCoverageValues({
      ...generateScenarioSchema(currentProject.lu_classes, currentProject.uses_default_lu_classification),
      scenarioName: `${startYear} - ${endYear}`,
      scenarioPeriod: {
        scenarioStart: startYear,
        scenarioEnd: endYear,
      },
    }, landCoverHectaresPerClass);
    console.log(scenario)
    try {
      const response = await createScenario(currentProject.id, scenario, token);
      if ( response.ok ) {
        const data = response.data.data;
        console.log(data)
        scenario.remoteId = data.id;
        // update the remoteId
        await editScenario(currentProject.id, scenario, token);
        toast.current.show({ severity: 'success', summary: 'Scenario created!', detail: 'Scenario created successfully'});
      }
      else toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'Errors creating scenario'});

    } catch (e) {
      console.log(e)
      toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'Errors creating scenario'});          
      return;
    }

    setScenarios((oldScenarios) => {
      const newScenarios = [...oldScenarios, scenario];
      return newScenarios;
    });

    // The new min year is the last end year
    setMinYear(endYear);

    // If the user has put a scenario up to 2030, we're done
    if (parseInt(endYear, 10) === 2030) {
      setCanAddNewScenarios(false);
    }
  };

  const resetScenarios = async () => {
    try {
      const response = await deleteAllScenarios( currentProject.id, token);
      if ( response.ok )
        setMinYear(new Date().getFullYear());
      else toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'Errors deleting scenarios'});          
    } catch (e) {
      toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'Errors deleting scenarios'});          
      return;
    }
    setScenarios([]);
    setCanAddNewScenarios(true);
  };

  const updateScenario = async (scenarioContent) => {
    try {
      if (currentProject.transition_impact_matrix_data === null) {
        toast.current.show({ severity: 'error', summary: 'Oops!', detail: `You can't save changes on a scenario without first saving the Transition Impact Matrix for this project`});          
        return;
      }
      setIsUpdating(true);
      scenarioContent.ld_impact = calculateScenarioLdImpact(scenarioContent, currentProject.transition_impact_matrix_data);
      await editScenario(currentProject.id, scenarioContent, token);
      await fetchScenarios();
    } catch (e) {
      toast.current.show({ severity: 'error', summary: 'Oops!', detail: handleError(e)});          
      ;
    } 
    setIsUpdating(false);
    
  };

  let initialDataForImpactMatrix = [];
  if (currentProject.has_edited_transition_matrix_data &&
    currentProject.transition_impact_matrix_data !== null) {
    initialDataForImpactMatrix = currentProject.transition_impact_matrix_data;
  } else {
    initialDataForImpactMatrix = generateLUImpactMatrixSchema(currentProject.lu_classes, currentProject.uses_default_lu_classification);
  }

  useEffect(() => {
    if ( token && currentProject ) {
      fetchScenarios();
      if (currentProject.transition_impact_matrix_data === null) 
        editTransitionImpactMatrix(initialDataForImpactMatrix, true);
    }
  }, []); // eslint-disable-line

  if ( !token )
    return <></>

  const usesDefaultData = currentProject.uses_default_lu_classification === 1;

  return (
    <>
      <Toast ref={toast} position="top-right" />    
          
      <ScenarioToolbar
        scenarios={scenarios}
        canAddNew={canAddNewScenarios}
        setScenarioModalVisible={setScenarioModalVisible}
        onReset={resetScenarios}
        totalRoiArea={currentProject.preprocessing_data?.total_roi_area}
        initialRoiLd={currentProject.preprocessing_data?.initial_roi_ld}
      />
      <div className="mt-4">
        <TransitionImpactMatrix
          title={t('LU_TRANSITION_IMPACT_MATRIX')}
          initialData={initialDataForImpactMatrix}
          hasDefaultData={usesDefaultData}
          onSave={(impactMatrixData) => editTransitionImpactMatrix(impactMatrixData)}
        />
      </div>
      <div className="mt-4">
        {(scenarios.length > 0) && scenarios.map((s, index)=> (
          <div className={index === 0 ? `p-mt-6` : `` } key={s.scenarioName} id={s.scenarioName}>
            <ScenarioTransitionMatrix
              inputScenario={s}
              projectId={currentProject.id}
              isUpdating={isUpdating}
              canEdit={(scenarios.length === 1) || (index === scenarios.length - 1)}
              onCanSave={(cs) => setCanSave(cs)}
              onSave={(sc) => {
                updateScenario(sc);
              }}
            />
          </div>
        ))}
      </div>
      <NewScenarioDialog
        dialogOpen={scenarioModalVisible}
        setDialogOpen={setScenarioModalVisible}
        hasScenarios={scenarios.length > 0}
        hasUnsavedChanges={canSave}
        minYear={minYear}
        maxYear={2030}
        prepareScenario={prepareScenario}
      />
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

export default LandUse;
