import doFetch  from '../utilities/api-client';

export const PROJECT_OWNER = 'owner';
export const PROJECT_USER = 'user';

export const DRAFT = 'draft';
export const PREPROCESSING = 'preprocessing';
export const PUBLISHED = 'published';
export const DATAMODIFIED = 'modified';
export const REPROCESSING = 'reprocessing';

export const PROJECT_STEPS = {
  REGION_OF_INTEREST: 'RegionOfInterest',
  DATASETS_LAND_USE: 'LandUse',
  DATASETS_LAND_DEGRADATION: 'LandDegradation',
  COMPLETED: 'CurrentState',
};

export const getNextStep = (project) => {
  if (project.step === null) {
    return PROJECT_STEPS.REGION_OF_INTEREST;
  }
  if (project.step === PROJECT_STEPS.REGION_OF_INTEREST) {
    return PROJECT_STEPS.DATASETS_LAND_USE;
  }
  if (project.step === PROJECT_STEPS.DATASETS_LAND_USE) {
    return PROJECT_STEPS.DATASETS_LAND_DEGRADATION;
  }
  return PROJECT_STEPS.COMPLETED;
};

export const getUrlForStep = (step) => {
  switch (step) {
    case null:
    case PROJECT_STEPS.REGION_OF_INTEREST:
      return `/region-of-interest`;
    case PROJECT_STEPS.DATASETS_LAND_USE:
      return `/datasets/?step=0`;
    case PROJECT_STEPS.DATASETS_LAND_DEGRADATION:
      return `/datasets/?step=1`;
    case PROJECT_STEPS.COMPLETED:
      return `/current-state`;
    default:
      return `/`;
  }
}

export const getProject = async ( id, token)  => 
  doFetch ( `/projects/${id}`, "GET", null, token )
  
export const listProjects = async ( token ) => 
  doFetch ( `/projects`, "GET", null, token ) 

export const createProject = async ( { title, acronym, description }, token) => 
  doFetch (  `/projects`, "POST", { "title" : title, "acronym" : acronym, "description" : description }, token )
  
export const editProject = async ( id, data, token) => 
  doFetch ( `/projects/${id}`, "PATCH", data, token )

export const finaliseProject = async ( id, token) => 
  doFetch ( `/projects/${id}/finalise`, "POST", {}, token )
  
export const elaborateProject = async ( id, token) => 
  doFetch ( `/projects/${id}/elaborate`, "POST", {}, token )
  
export const deleteProject = async ( id, token) => 
  doFetch ( `/projects/${id}`,"DELETE", {}, token )

export const inviteUsers = async ( id, users, token) => 
  doFetch (  `/projects/${id}/invites`, "POST", { user_ids: users }, token  )

export const getProjectWocatTechnologies = async ( id, filters = {}, token) => {
  try { 
    const qs = Object.keys(filters)
      .map(key => `${key}=${filters[key]}`)
      .join('&');
    const response = await doFetch (
      `/projects/${id}/wocat_technologies?${qs}`, "GET",  null, token  )
    return response
  }
  catch( error )  {
    return null
  }
}

export const proposeProjectWocatTechnology = async ( id, technologyId, focusAreaId, luClass, evaluationData, token ) => 
  doFetch ( 
    `/projects/${id}/propose_wocat_technology`,
    "POST",
    { 
      technology_id: technologyId,
      project_focus_area_id: focusAreaId,
      lu_class: `${luClass}`,
      ...evaluationData,
    },
    token
  )

export const rejectProjectWocatTechnology = async ( id, projectWocatSlmTechnologyId, token) => 
  doFetch( 
    `/projects/${id}/reject_wocat_technology`,
    "POST",
    { project_wocat_slm_technology_id: projectWocatSlmTechnologyId },
    token
  )

export const getProjectIndicators = async ( id, token ) => 
  doFetch (`/projects/${id}/indicators`, "GET",  null, token  )

export const saveProjectIndicators = async ( id, indicators, token ) => 
  doFetch (`/projects/${id}/indicators`,"PUT", indicators, token )

export const getProjectFocusAreas = async ( id, token ) => 
  doFetch (`/projects/${id}/focus_areas`, "GET",  null, token  )

export const getProjectFocusAreasPolygons = async ( id, token ) => 
  doFetch (`/projects/${id}/focus_areas_polygons`, "GET",  null, token  )

export const getLandCoverClasses = async ( id, polygon, area, token ) => 
  doFetch ( 
    `/projects/${id}/land_cover_classes`,
    "POST",
    { polygon: polygon, area: area },
    token
  )
 
export const addProjectFocusArea = async ( id, name, file_id, area, token ) => 
  doFetch ( 
    `/projects/${id}/focus_areas`,
    "POST",
    { name: name, file_id: file_id, area: area },
    token
  ) 

export const deleteProjectFocusArea = async ( id, focus_area_id, token ) => 
  doFetch ( 
    `/projects/${id}/focus_areas/${focus_area_id}`,
    "DELETE",
    null,
    token
  )
 
