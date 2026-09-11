import doFetch  from '../utilities/api-client';

export const uploadProjectFile = async (projectId, formData, token) =>
  doFetch(`/projects/${projectId}/files`, "POSTFILE", formData, token );

export const getProjectFiles = async (projectId, token) =>
  doFetch(`/projects/${projectId}/files`, "GET", null, token )

export const getProjectFile = async (projectId, fileId, token) =>
  doFetch(`/projects/${projectId}/files/${fileId}`, "GET", null, token )

export const deleteFile = async (projectId, fileId, token) =>
  doFetch(`/projects/${projectId}/files/${fileId}`, "DELETE", null, token )

export const getGeoJsonPolygon = async (id,polygonFileId, token) => 
  doFetch(`/projects/${id}/files/${polygonFileId}/content`, "GET", null, token )

export const getGeoTiff = async (id,tiff_file_id, token) => 
  doFetch(`/projects/${id}/files/${tiff_file_id}/content`, "GETTIFF", null, token )
  


