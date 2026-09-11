"use client"

import { Steps } from 'primereact/steps';
import React, { useContext, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { UserContext } from '../context/user';
import DefineFocusAreas from './define_focus_areas';
import FocusAreaLMAssesment from './focus_area_lm_assesment';
import LandManagementSustainabilityIndicators from './land_management_sustainability_indicators';

const LandManagementSustainability = () => {
  const ts = useTranslations('default');
  const router = useRouter();
  const MIN_STEP_INDEX = 0;
  const MAX_STEP_INDEX = 2;
  const { currentProject } = useContext(UserContext);
  const [stepIndex, setStepIndex] = useState(MIN_STEP_INDEX); // eslint-disable-line

  const onForward = () => {
    if (stepIndex >= MAX_STEP_INDEX) {
      return;
    }
    setStepIndex(stepIndex + 1);
  };

  const onBack = () => {
    if (stepIndex <= MIN_STEP_INDEX) {
      return;
    }
    setStepIndex(stepIndex - 1);
  };

  const steps = [
      {
        label: ts('LM_SUSTAINABILITY_IMPACT_INDICATORS'),
      },
      {
        label: ts('DEFINE_FOCUS_AREAS_IN_ROI'),
      },
      {
        label: ts('FOCUS_AREA_LM_ASSESMENT'),
      },
    ];


  
  if (!currentProject ) {
    return <></>;
  }
  if (!currentProject.preprocessing_data) {
    return <>Project preprocessing...</>;
  }
  
  
  return (
      <div className="card">
        <Steps
          className="p-4"
          activeIndex={stepIndex}
          onSelect={(e) => setStepIndex(e.index)}
          model={steps}
        />
        { stepIndex === 0 && (
          <LandManagementSustainabilityIndicators onForward={onForward} />
        )}
        { stepIndex === 1 && (
          <DefineFocusAreas onBack={onBack} onForward={onForward} />
        )}  
        { stepIndex === 2 && (
          <FocusAreaLMAssesment onBack={onBack} />
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

export default LandManagementSustainability;
