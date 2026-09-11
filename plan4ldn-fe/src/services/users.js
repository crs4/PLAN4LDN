import doFetch  from '../utilities/api-client';


// Profile
export const getUserProfile = async ( id, token ) => 
  doFetch ( `/users/${id}`, "GET", null, token )
  
export const updateUserProfile = async ( id, data, token) => 
  doFetch ( `/users/${id}`, "PUT", data, token )

// Avatar
export const getUserAvatar = async ( id, token) => 
  doFetch (  `/users/${id}/avatar`, "GET", null, token )

export const updateUserAvatar = async ( id, data, token) => 
  doFetch ( `/users/${id}/avatar`, "POST", data, token )

// Password
export const changeUserPassword = async ( id, data, token) => 
  doFetch ( `/users/${id}/password`,"PUT", data, token )

// Invitations
export const getInvites = async ( token ) => 
  doFetch ( `/invites`, "GET", null, token );

export const updateInvite = async ( invitationId, data, token) =>  
  doFetch ( `/invites/${invitationId}`, "PUT", data, token )

// Registration
export const registerUser = async ( data ) => 
  doFetch ( `/register`, "POST", data, null ) 
   

// Search
export const searchUsers = async ( name, token) => 
  doFetch ( `/users?name=${name}`, "GET", null, token )
  
