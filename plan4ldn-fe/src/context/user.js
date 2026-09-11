"use client"

import React, { useState, useEffect, useContext } from 'react';
import { useLocalStorage } from '../hooks/storage';

export const UserContext = React.createContext();

const initialState = {
  token: null,
  id: null,
  firstname: null,
  lastname: null,
  email: null,
  role: null,
  avatar_url: null,
  currentProject: null,
  availableProjects: [],
  language: {
    icon: '🇬🇧',
    label: 'English',
    code: 'en',
  },
};


export const UserProvider = (props) => {
  const localStorageKey = process.env.NEXT_PUBLIC_LOCAL_STORAGE_KEY ? process.env.NEXT_PUBLIC_LOCAL_STORAGE_KEY : 'change_it&&&&&&jhg4j3j5%lkhjkhskjhhkkkkkkk';
  const [userData, setUserData] = useLocalStorage (
      localStorageKey,
      initialState
  ) 

  return (
    <UserContext.Provider
      value={{
        ...userData,
        setUser: async (user) => {
          setUserData({ ...userData, ...user });
          return userData;
        },
        resetData: async () => {
          setUserData({ ...initialState });
          return userData;
        }
      }}
    >
    {props.children}
    </UserContext.Provider>
  );
};
