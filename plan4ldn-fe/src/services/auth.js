import doFetch  from '../utilities/api-client';


export const login = async (email, password) => {
  try { 
    const response = await doFetch ( 
      `/login`,
      "POST", 
      { email: email, password: password },
      null
    )
    return response
  }
  catch( error )  {
    console.log(error)
    return null
  }
}

export const logout = async ( token ) => { 
  try { 
    if (!token) return;
    const response = await apiClient.doFetch ( 
      `/logout`,
      "POST",
      null,
      token
    )
    return response
  }
  catch( error )  {
    console.log(error)
    return null
  }
} 

