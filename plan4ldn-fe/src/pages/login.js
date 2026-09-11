"use client"

import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Toast } from 'primereact/toast';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Logo from '../components/logo';
import { login } from '../services/auth';
import Link from 'next/link'
import { UserContext } from '../context/user';
import { useRouter } from 'next/router';

export default function Login() {
  const t = useTranslations('default');
  const toast = useRef(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { token, isLoggedIn, setUser } = useContext(UserContext);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  
  useEffect (() => {
    if ( token ) {
      router.push(`/`);
    }
  }, [token]); // eslint-disable-line

  const authWithLocal = async () => {
    try {
      const response = await login(email, password);
      if ( response.ok )  {
        const data = response.data.data
        await setUser({
          ...data.user,
          token: data.token
        });
        router.push('/',300);
      }
      else toast.current.show({ severity: 'error', summary: 'Oops!', detail: 'bad credentials' });

    } catch (e) {
      let error = 'Something went wrong';
      toast.current.show({
        severity: 'error',
        summary: 'Oops!',
        detail: error,
      });
    }
  };

  const loginHandler = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await authWithLocal();
    setIsLoading(false);
  };

  return (
    <div className="layout-dashboard">
      <Toast ref={toast} position="top-right" />
      <div className="grid flex justify-content-center">
        <div className="flex flex-column justify-content-center gap-4 mt-8 w-30rem">
          <Logo />
          <div className="card flex flex-column rounded align-items-center gap-4 shadow-4" >
              <div className="flex flex-column gap-1 mt-5">
                <label htmlFor="email" className="font-bold block text-yellow-900 ">Email</label>
                <InputText 
                    id="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-describedby="username-help" 
                />
                <small id="username-help">
                    Enter your email.
                </small>
              </div>
              <div className="flex flex-column gap-1">
                <label htmlFor="password" className="font-bold block text-yellow-900 ">Password</label>
                <Password
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-describedby="password-help"
                  feedback={false}
                />
                <small id="password-help">
                    Enter your password.
                </small>
              </div>
              <div className="flex flex-column align-items-center gap-3">
                <Button
                  label={t('LOGIN_BUTTON_TEXT')}
                  className="mt-4 w-12rem"
                  loading={isLoading}
                  disabled={password.length === 0 || email.length === 0} 
                  type="submit"
                  onClick={loginHandler}
                />
              </div>
              <div>  
                <Link href="/register" className="font-bold block text-primary-800 ">{t('SIGN_UP_LINK_TEXT')}</Link>
              </div>
          </div>
        </div>
      </div>
      
    </div>    
  );
};


Login.getLayout = function getLayout(page) {
    return page;
};

export async function getStaticProps(context) {
  return {
    props: { 
      messages: (await import(`../translations/${context.locale}.json`)).default
     }
  }
}



