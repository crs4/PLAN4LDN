"use client"

import React, { useContext, useState, useEffect, useRef } from 'react';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';

import Loading from './loading';
import ScenarioImpactTable from './tables/ScenarioImpactTable';
import { getScenarios } from '../services/scenarios';
import { getProjectWocatTechnologies } from '../services/projects';
import { findImpactForTransition } from '../utilities/ld-calculations';
import { DEFAULT_LU_CLASSES } from '../utilities/schema-generators';
import { UserContext } from '../context/user';
import { Toast } from 'primereact/toast';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic'

// Create a psuedo component using dynamic import that will only be imported client-side
const LandDegradationWaterfall = dynamic(() => import('./charts/LandDegradationWaterfall'), {
  ssr: false
})

// Create a psuedo component using dynamic import that will only be imported client-side
const ComputedEvaluationSpiderGraph = dynamic(() => import('./charts/ComputedEvaluationSpiderGraph'), {
  ssr: false
})

// Create a psuedo component using dynamic import that will only be imported client-side
const LandDegradationGauge = dynamic(() => import('./charts/LandDegradationGauge'), {
  ssr: false
})

const simplifyValue = (val) => {
  if (val === 0) return 0;
  return val > 0 ? 1 : -1;
}

const findNameForLuClass = (key, luClasses) => {
  if (luClasses === null) {
    return DEFAULT_LU_CLASSES[key];
  }

  const foundLuClass = luClasses.find((luc) => `${luc.value}` === key);

  if (!foundLuClass) {
    return 'Unknown';
  }

  return foundLuClass.key;
}

const NeutralityMatrix = () => {
  const t = useTranslations('default');
  const [isLoading, setIsLoading] = useState(true);
  const [scenarios, setScenarios] = useState([]);
  const [polygonsList, setPolygonsList] = useState([]);
  const [technologies, setTechnologies] = useState([]);
  const [waterfallData, setWaterfallData] = useState([]);
  const { token, currentProject } = useContext(UserContext);
  const toast = useRef(null)
  const router = useRouter();

  useEffect(() => {
    if ( !token ) 
      router.push(`/login`);
    else 
      if (currentProject)
      {
        fetchScenarios();
        fetchProjectTechnologies();
      }
  }, [currentProject, token]); // eslint-disable-line 
  

  const fetchScenarios = async () => {
    if (!isLoading) setIsLoading(true);
    try {
      const response = await getScenarios(
        currentProject?.id, token
      );
      if ( response.ok && response.data && response.data.data )
      {
        const s = response.data.data;
      setScenarios(s.map((sc) => sc.content));
      }
    } catch (e) {
      console.log(e);
      toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'Errors loading scenarios'});     
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjectTechnologies = async () => {
    try {
      const response = await getProjectWocatTechnologies(
        currentProject?.id, 
        { status: 'final' }, token);
      if ( response.ok && response.data && response.data.data )
        setTechnologies(response.data.data);
      else toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'Errors loading project wocat technologies'});    
    
    } catch (e) {
      toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'Errors loading project wocat technologies'});    
    }
  };

  const prepareWaterfallData = () => {
    const initialDegradation = (currentProject?.preprocessing_data?.initial_roi_ld) || 0;
    let lastValue = initialDegradation;
    let lastDate = 0;


    let initialColor = '#d43333';
    if (initialDegradation >= 0) {
      initialColor = '#398e3b';
    } else if (initialDegradation < 0) {
      initialColor = '#d43333';
    }

    const initialColumn = {
      category: `${new Date().getFullYear()}`,
      value: initialDegradation,
      open: 0,
      stepValue: initialDegradation,
      color: initialColor,
      displayValue: initialDegradation,
    }

    const waterfall = scenarios.map(
      (scenarioLocal) => {
        const category = `( ${scenarioLocal.scenarioPeriod.scenarioStart} - ${scenarioLocal.scenarioPeriod.scenarioEnd} )`;
        const value = lastValue + scenarioLocal.ld_impact;
        const open = lastValue;
        const stepValue = lastValue + scenarioLocal.ld_impact;
        const displayValue = scenarioLocal.ld_impact;

        let color = '#d43333';
        if (displayValue >= 0) {
          color = '#398e3b';
        } else if (displayValue < 0) {
          color = '#d43333';
        }

        const column = {
          category,
          value,
          open,
          stepValue,
          color,
          displayValue,
        }

        lastValue = value;

        if (lastDate < scenarioLocal.scenarioPeriod.scenarioEnd) {
          lastDate = scenarioLocal.scenarioPeriod.scenarioEnd;
        }

        return column;
      }
    );

    let lastColor = '#d43333';
    if (waterfall[waterfall.length - 1].value >= 0) {
      lastColor = '#398e3b';
    } else if (waterfall[waterfall.length - 1].value < 0) {
      lastColor = '#d43333';
    }

    const lastColumn = {
      category: lastDate.toString(),
      value: waterfall[waterfall.length - 1].value,
      open: 0,
      stepValue: waterfall[waterfall.length - 1].stepValue,
      color: lastColor,
      displayValue: waterfall[waterfall.length - 1].value,
    }

    waterfall.unshift(initialColumn);
    waterfall.push(lastColumn);

    setWaterfallData(waterfall);
  }

  useEffect(() => {
    if (scenarios.length === 0 || !currentProject?.transition_impact_matrix_data) return;
    const list = [];
    for ( let s=0; s < scenarios.length; s+=1 ){
      let sc = scenarios[s];
      for (let i = 0; i < sc.landTypes.length; i += 1) {
        const transition = sc.landTypes[i];
        for (let j = 0; j < transition.breakDown.length; j += 1) {
          const breakDownEntry = transition.breakDown[j];
          if (breakDownEntry.landCoverage.file_id) {
            const ld_impact = findImpactForTransition(
              transition.landId,
              breakDownEntry.landCoverage.value,
              breakDownEntry.landId,
              currentProject.transition_impact_matrix_data
            );
            list.push({
              value: simplifyValue(ld_impact),
              file_id: breakDownEntry.landCoverage.file_id,
            });
          }
        }
      }
    }
    setPolygonsList(list);
  }, [scenarios]); // eslint-disable-line

  useEffect(() => {
    if (scenarios.length > 0) {
      prepareWaterfallData();
    }
  }, [scenarios]); // eslint-disable-line

  if (isLoading) {
    return (<Loading />);
  }

  if (scenarios.length === 0) {
    return (<div className="mt-2 text-bold">{t('NOT_ENOUGH_SCENARIOS')}</div>)
  }

  return (
    <>
      <Toast ref={toast} position="top-right" />
      {scenarios.map((sc) => (
        <ScenarioImpactTable key={sc.remoteId} scenario={sc} />
      ))}
      {waterfallData.length > 0 && (
        <div className="p-grid p-mt-4">
          {(polygonsList.length > 0) ? (
            <>
              <div className="p-col-6">
                <h4>Land Degradation Evolution in ROI</h4>
                <LandDegradationWaterfall data={waterfallData} />
              </div>
            </>
          ) : (
            <div className="p-col-12 p-grid p-jc-center">
              <h4>Land Degradation Evolution in ROI</h4>
              <LandDegradationWaterfall data={waterfallData} />
            </div>
          )}
          <div className="p-col-12">
            {technologies.length > 0 && (
              <DataTable
                value={technologies}
                emptyMessage={t(`NO_WOCAT_TECHNOLOGIES_FOR_THIS_PROJECT`)}
                header={t('WOCAT_TECHNOLOGIES')}
              >
                <Column header={`${t('FOCUS_AREA')} & ${t('WOCAT_TECHNOLOGY')}`} body={(rowData) => (
                  <>
                    <h4>
                      { rowData.focus_area.name } ({ findNameForLuClass(rowData.lu_class,
                      currentProject.lu_classes) })
                    </h4>
                    <a
                      href={`https://qcat.wocat.net/en/wocat/technologies/view/${rowData.technology_id}`}
                      target="_blank"
                      rel="noreferrer"
                    >{`https://qcat.wocat.net/en/wocat/technologies/view/${rowData.technology_id}`}</a>
                    <p className="p-d-block p-mt-2">Proposed by: {rowData.user.firstname} {rowData.user.lastname}</p>
                  </>
                )} />
                <Column header='Evaluation' body={(rowData) => (
                  <ComputedEvaluationSpiderGraph 
                    domId={`${rowData.id}-evaluation-graph`}
                    evaluation={rowData?.evaluation}
                  />
                )} />
              </DataTable>
            )}
          </div>
        </div>
      )}
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

export default NeutralityMatrix;
