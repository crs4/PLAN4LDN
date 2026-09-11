"use client"

import React, { useContext, useEffect, useState, useRef } from 'react';
import { Button } from 'primereact/button';
import { Image } from 'primereact/image';
import { getWocatTechnology } from '../services/landuse';
import { handleError } from '../utilities/errors';
import EvaluationSpiderGraph from './charts/EvaluationSpiderGraph';
import { buildInitialSpiderGraphData } from './FocusAreaQuestionnaire';
import questions from './FocusAreaQuestionnaire/data';
import { UserContext } from '../context/user';
import { Toast } from 'primereact/toast';
import { useTranslations } from 'next-intl';

const SingleWocatTechnology = ({ techId, onReject, proposerEvaluation, selfEvaluation }) => {
  const t = useTranslations('default');
  const [isLoading, setIsLoading] = useState(true);
  const [tech, setTech] = useState(null);
  const [selfGraphData, setSelfGraphData] = useState([]);
  const [proposerGraphData, setProposerGraphData] = useState([]);
  const toast = useRef(null);
  const { token } = useContext(UserContext);
    

  useEffect(() => {
    const fetchTech = async () => {
      setIsLoading(true);
      try {
        const response = await getWocatTechnology(
          techId,
          token
        );
        if ( response.ok && response.data && response.data.data && response.data.data.item )
          setTech(response.data.data.item);
        else 
          toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'Wocat Technology not found'});
      } catch (e) {
        toast.current.show({ severity: 'error', summary: 'Oops!', detail: handleError(e)});
      }
      setIsLoading(false);
    };
    if (token && techId) {
      fetchTech();
    }
  }, [token, techId]); // eslint-disable-line

  useEffect(() => {
    setSelfGraphData(buildInitialSpiderGraphData(questions, selfEvaluation));
    setProposerGraphData(buildInitialSpiderGraphData(questions, proposerEvaluation));
  }, [selfEvaluation, proposerEvaluation]);

  if (isLoading || (tech === null)) {
    return (
      <>
      <Toast ref={toast} position="top-right" />
      <i className="pi pi-spin pi-spinner" style={{ fontSize: '2em' }} />
      </>
    );
  }

  return (   
    <div className="col-12">
      <Toast ref={toast} position="top-right" />
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
                <i className="pi pi-calendar" />
                <span className="ml-2 font-bold">Year:</span>
                <span className="ml-2 text-primary">{tech?.year || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="col-2">
          <Button
            icon="pi pi-arrow-circle-left"
            className="mb-2"
            onClick={() => onReject()}
            severity="secondary"
            label='Search for a different technology'
          />
        </div>
      </div>    
      <div className="grid mt-4">
        <div className="col-6 text-center">
          <h4>Assessment of current SLM</h4>
          <div className="flex justify-items-center align-items-center">
            {selfGraphData.length > 0 && (
              <EvaluationSpiderGraph
                domId="self-evaluation-spider-graph"
                data={selfGraphData} 
              />
            )}
          </div>
        </div>
        <div className="col-6 text-center">
          <h4>Proposed SLM assessment</h4>
          <div className="flex justify-items-center align-items-center">
            {proposerGraphData.length > 0 && (
              <EvaluationSpiderGraph
                domId="new-evaluation-spider-graph"
                data={proposerGraphData} 
              />
            )}
          </div>
        </div>
      </div>
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
export default SingleWocatTechnology;
