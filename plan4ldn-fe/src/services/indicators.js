/* eslint-disable import/prefer-default-export */
import doFetch  from '../utilities/api-client';

export const getIndicators = async (token) => 
    doFetch('/indicators', "GET", null, token )
