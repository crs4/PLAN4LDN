

export const doFetch = async (endpoint, method, payload, token) => { 
  { 
    try { 
      let response = null;
      let _auth = { }
      let base = process.env.NEXT_PUBLIC_API_BASE_URL
      if ( token )
        _auth = { 
            Authorization: `Bearer ${token}`
        }
      else 
        if ( endpoint !== '/register' && endpoint !== '/login') 
          base = '' 
      let url = base + endpoint;
      if ( method === 'GET' ) { 
        response = await fetch( url,
        { 
          method: method, 
          headers:{ 
            ..._auth,
            "Content-Type": "application/json", 
            Accept: 'application/json',
          }
        })
      }
      else if ( method === 'GETTIFF' ) { 
        response = await fetch( url,
        {  
          method: "GET",
          responseType: 'arraybuffer',
          headers: {
            Accept: 'image/tiff',
            ..._auth,
          },
        });
      }
      else if ( method === 'POSTFILE' ) { 
        response = await fetch( url,
        {  
          method: "POST",
          headers: {
          //  'Content-Type': 'multipart/form-data',
            Accept: 'application/json',
            ..._auth,
          },
          body: payload 
        });
      }
      else if ( method === 'DELETE' ) { 
        response = await fetch( url,
        {  
          method: "DELETE",
          headers: {
            Accept: 'application/json',
            ..._auth,
          }
        });
      }
      else  { 
        response = await fetch( url,
        { 
          method: method, 
          headers:{ 
            "Content-Type": "application/json", 
            Accept: 'application/json',
            ..._auth,
          },
          body: JSON.stringify ( payload )
        })
      }
      if ( !response.ok ) {
        // get error message from body or default to response status
        return { data: null, ok: false, status: response.status }
      }
      let data = null;
      if ( method === 'GETTIFF' ){
        data = await response.arrayBuffer();
        return data;
      }
      else {
        const isJson = response.headers.get('content-type')?.includes('application/json');
        data = response.data
        if (isJson)
          data = await response.json();
        return { data: data, ok: response.ok, status: response.status }
      }  
    }
    catch( error )  {
      console.log(error)  
    }
    return { data: null, ok: false, status: null }
  }
}

export default doFetch;
