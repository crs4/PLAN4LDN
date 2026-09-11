import doFetch  from '../utilities/api-client';

export const getEvaluations = async (id, token) => 
  doFetch(`/projects/${id}/focus_area_evaluations`, "GET", null, token )

export const addEvaluation = async (id, data, token) =>
  doFetch(`/projects/${id}/focus_area_evaluations`, "POST", { ...data } , token );

export const updatEvaluation = async (id, evaluationId, data, token) =>
  doFetch(`/projects/${id}/focus_area_evaluations/${evaluationId}`, "POST", { ...data } , token);

