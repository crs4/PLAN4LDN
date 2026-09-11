import doFetch  from '../utilities/api-client';

export const getScenarios = async (projectId,token) => doFetch(`/projects/${projectId}/scenarios`, "GET", null, token );

export const createScenario = async (projectId, scenario, token) =>
  doFetch(`/projects/${projectId}/scenarios`, "POST", {
    name: scenario.scenarioName,
    from_year: scenario.scenarioPeriod.scenarioStart,
    to_year: scenario.scenarioPeriod.scenarioEnd,
    content: scenario,
  }, token);

export const editScenario = async (projectId, scenario, token) =>
  doFetch(`/projects/${projectId}/scenarios/${scenario.remoteId}`, "PUT", {
    name: scenario.scenarioName,
    from_year: scenario.scenarioPeriod.scenarioStart,
    to_year: scenario.scenarioPeriod.scenarioEnd,
    content: scenario,
  }, token);

export const deleteAllScenarios = async (projectId, token) =>
  doFetch(`/projects/${projectId}/scenarios`,"DELETE", null, token);

export const deleteScenario = async (projectId, scenario, token) =>
  doFetch(`/projects/${projectId}/scenarios/${scenario.remoteId}`,"DELETE", null, token );
