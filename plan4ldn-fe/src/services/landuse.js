import doFetch  from '../utilities/api-client';

export const getWocatTechnologies = async (keyword, page, token) => 
  doFetch(`/wocat_technologies?luclass=${keyword}&zone=0&page=${page}`, "GET", null, token );

export const getWocatTechnology = async (techId, token) =>
  doFetch(`/wocat_technologies/${techId}`, "GET", null, token ) 
