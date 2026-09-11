"use client"

import React, { useContext, useRef, useState, useEffect } from 'react';
import UserPassword from '../components/user-password';
import UserProfile from '../components/user-profile';
import { useRouter } from 'next/navigation';
import { UserContext } from '../context/user';

export default function AccountSettings() {
  const toast = useRef(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { id, token } = useContext(UserContext);
  const router = useRouter()

  useEffect(() => {
      if (!token) 
        router.push('/login');
  }, [token]); // eslint-disable-line
  

  return (
    <div className="layout-dashboard">
      <div className="grid flex justify-content-center">
        <div className="flex flex-column align-items-center gap-4 mt-8">
          <UserProfile
            userId={id}
            dialogOpen={dialogOpen}
            setDialogOpen={setDialogOpen}
          />
          <UserPassword userId={id} /> 
        </div>
      </div>
    </div> );
};

export async function getStaticProps(context) {
  return {
    props: { 
      messages: (await import(`../translations/${context.locale}.json`)).default
     },
  }
}


