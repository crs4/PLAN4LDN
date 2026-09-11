"use client"

import React, { useEffect, useState } from 'react';
import { Fieldset } from 'primereact/fieldset';
import { RadioButton } from 'primereact/radiobutton';
import { Button } from 'primereact/button';
import { useTranslations } from 'next-intl';

import QuestionPanel from './QuestionPanel';
import questions from './data';

import dynamic from 'next/dynamic'

const EvaluationSpiderGraph = dynamic(() => import('../charts/EvaluationSpiderGraph'), {
  ssr: false
})

export const buildInitialSpiderGraphData = (data, evaluation) => {
  const spiderGraphData = [];

  if (data.length === 0) return spiderGraphData;

  data.forEach((questionSection) => {
    questionSection.questions.forEach((likertValues) => {
      spiderGraphData.push({
        'criteria': likertValues.label,
        'slm1': (evaluation) ? evaluation[likertValues.id] : 0,
        'slm2': 0,
        'id': likertValues.id,
      });
    });
  });

  return spiderGraphData;
};

// TODO: The following remains commented out until further notice (CurvedGraph is unused)
// const buildInitialCurvedGraphData = (evaluation) => {
//   const data = [
//     {
//       'indicator': 'LU Cover Change',
//       'value': 0,
//     }, {
//       'indicator': 'Productivity',
//       'value': 0,
//     }, {
//       'indicator': 'Soil Organic Carbon',
//       'value': 0,
//     },
//   ];
//
//   if (evaluation) {
//     data[0].value = (evaluation.water_value + evaluation.climate_change_resilience_value) / 2;
//     data[1].value = evaluation.biodiversity_value;
//     data[2].value = evaluation.soil_value;
//   }
//
//   return data;
// }

const getEvaluationValues = (evaluation) => {
  const defaults = {
    soil_value: 0,
    biodiversity_value: 0,
    water_value: 0,
    climate_change_resilience_value: 0,
    production_value: 0,
    economic_viability_value: 0,
    food_security_value: 0,
    equality_of_opportunity_value: 0,
    anticipated_ld_impact: 'neutral',
  };

  if (!evaluation) {
    return defaults;
  }

  Object.keys(evaluation).forEach((key) => {
    if (defaults[key] !== undefined) {
      defaults[key] = evaluation[key];
    }
  });

  return defaults;
}

const FocusAreaQuestionnaire = ({ evaluation, onSave, showFinalQuestion, isForProposal, comparingEvaluation = null }) => {
  const t  = useTranslations('default');
  const [spiderData, setSpiderData] = useState([]);
  const [spiderDataComparing, setSpiderDataComparing] = useState([]);
  // const [curvedData, setCurvedData] = useState([]);
  const [evaluationValues, setEvaluationValues] = useState();

  const handleChangeEvaluation = ({ id, numericValue }) => {
    setEvaluationValues((oev) => {
      const copy = { ...oev };
      if (copy[id] !== undefined) {
        copy[id] = numericValue;
      }
      return copy;
    });
  }

  const handleLdImpactChange = (value) => {
    setEvaluationValues((oev) => {
      const copy = { ...oev };
      if (copy.anticipated_ld_impact !== undefined) {
        copy.anticipated_ld_impact = value;
      }
      return copy;
    });
  }

  const handleSave = async () => {
    if (onSave) {
      await onSave(evaluation?.id, evaluationValues);
    }
  }

  useEffect(() => {
    setSpiderData(buildInitialSpiderGraphData(questions, evaluationValues));
    if (comparingEvaluation !== null) {
      setSpiderDataComparing(buildInitialSpiderGraphData(questions, comparingEvaluation));
    }
    // setCurvedData(buildInitialCurvedGraphData(evaluationValues));
  }, [evaluationValues, comparingEvaluation]);

  useEffect(() => {
    setEvaluationValues(getEvaluationValues(evaluation));
  }, [evaluation]);

  return (
    <>
      <div className="grid mt-2">
        {
          questions.map(
            (questionnaire) => {
              if (questionnaire.questions.length === 4) {
                return (
                  <div className="col-12" key={questionnaire.id}>
                    <Fieldset
                      legend={questionnaire.label}
                      toggleable
                      className="col-12 shadow-2"
                      collapsed={false}
                    >
                      <div className="grid">
                        {
                          questionnaire.questions.map(
                            (question) => (
                              <div key={question.id} className="col-6">
                                <QuestionPanel
                                  onChange={handleChangeEvaluation}
                                  question={question}
                                  value={evaluationValues ? evaluationValues[question.id] : 0}
                                />
                              </div>
                            )
                          )
                        }
                      </div>
                    </Fieldset>
                  </div>
                )
              }

              return (
                <div className="col-6" key={questionnaire.id}>
                  <Fieldset
                    legend={questionnaire.label}
                    toggleable
                    className="col-12 shadow-2"
                    collapsed={false}
                  >
                    {
                      questionnaire.questions.map(
                        (question) => (
                          <QuestionPanel
                            key={question.id}
                            onChange={handleChangeEvaluation}
                            value={evaluationValues ? evaluationValues[question.id] : 0}
                            question={question}
                          />
                        )
                      )
                    }
                  </Fieldset>
                </div>
              )

            }
          )
        }
      </div>
      <div className="grid m-2">
        <div className="col-6">
          {(comparingEvaluation === null && spiderData.length > 0) && (
            <div className='flex  justify-content-center align-items-center'>
              <EvaluationSpiderGraph data={spiderData} />
            </div>
          )}
          {(comparingEvaluation !== null && spiderDataComparing.length > 0) && (
            <div className="text-center">
              <h4>Assessment of current SLM</h4>
              <div className='flex justify-content-center align-items-center'>
                <EvaluationSpiderGraph domId="current-slm-evaluation-graph" data={spiderDataComparing} />
              </div>
            </div>
          )}
        </div>
        <div className="col-6">
          {/* {curvedData.length > 0 && ( */}
          {/*   <CurvedGraph data={curvedData} /> */}
          {/* )} */}
          {(comparingEvaluation !== null && spiderData.length > 0) && (
            <div className="text-center">
              <h4>Selected SLM assessment</h4>
              <div className='flex justify-content-center align-items-center'>
                <EvaluationSpiderGraph domId="selected-slm-evaluation-graph" data={spiderData} />
              </div>
            </div>
          )}
          {showFinalQuestion && (
            <div className="mt-6">
              <h5>
                What is the anticipated LD impact for this LU Type?
              </h5>
              <div className="field-radiobutton mt-2">
                <RadioButton
                  id="improved_ld_impact"
                  name="anticipated_ld_impact"
                  value="improved"
                  onChange={(e) => handleLdImpactChange(e.value)}
                  checked={evaluationValues?.anticipated_ld_impact === 'improved'}
                />
                <label htmlFor="improved_ld_impact">Improved</label>
              </div>
              <div className="field-radiobutton">
                <RadioButton
                  id="slightly_improved_ld_impact"
                  name="anticipated_ld_impact"
                  value="slightly_improved"
                  onChange={(e) => handleLdImpactChange(e.value)}
                  checked={evaluationValues?.anticipated_ld_impact === 'slightly_improved'}
                />
                <label htmlFor="slightly_improved_ld_impact">Slightly Improved</label>
              </div>
              <div className="field-radiobutton">
                <RadioButton
                  id="neutral_ld_impact"
                  name="anticipated_ld_impact"
                  value="neutral"
                  onChange={(e) => handleLdImpactChange(e.value)}
                  checked={evaluationValues?.anticipated_ld_impact === 'neutral'}
                />
                <label htmlFor="neutral_ld_impact">Neutral</label>
              </div>
              <div className="field-radiobutton">
                <RadioButton
                  id="slightly_reduced_ld_impact"
                  name="anticipated_ld_impact"
                  value="slightly_reduced"
                  onChange={(e) => handleLdImpactChange(e.value)}
                  checked={evaluationValues?.anticipated_ld_impact === 'slightly_reduced'}
                />
                <label htmlFor="slightly_reduced_ld_impact">Slightly Reduced</label>
              </div>
              <div className="field-radiobutton">
                <RadioButton
                  id="reduced_ld_impact"
                  name="anticipated_ld_impact"
                  value="reduced"
                  onChange={(e) => handleLdImpactChange(e.value)}
                  checked={evaluationValues?.anticipated_ld_impact === 'reduced'}
                />
                <label htmlFor="reduced_ld_impact">Reduced</label>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="grid p-2">
        <div className="col-6 offset-6">
          {/* Final question could go here if we decide to show the curved graph */}
        </div>
      </div>
      <div className="flex justify-content-center p-4">
        <Button
          onClick={() => handleSave()}
          className="button-primary button"
          icon="fad fa-save"
          iconPos="right"
          label={t('SAVE_ASSESSMENT')}
        />
      </div>
    </>
  )
};

export async function getStaticProps(context) {
  return {
    props: { 
      messages: (await import(`../../translations/${context.locale}.json`)).default
     },
  }
}

export default FocusAreaQuestionnaire;
