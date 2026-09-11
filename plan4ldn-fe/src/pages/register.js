"use client"

import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Toast } from 'primereact/toast';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/router';
import Logo from '../components/logo';
import { registerUser } from '../services/users';
import { validateName, validatePassword } from '../utilities/validations';
import { handleError } from '../utilities/errors';
import { UserContext } from '../context/user';

export default function Register() {
  const router = useRouter();
  const t  = useTranslations('default');
  const toast = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formValid, setFormValid] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [emailConfirm, setEmailConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const { token, resetData } = useContext(UserContext);


  useEffect(() => {
    resetData();
  }, []); // eslint-disable-line 

  const createNewAccount = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await registerUser({ firstname, lastname, email, password } );
      if ( response.ok ) {
        toast.current.show({
          severity: 'success',
          summary: 'Registration',
          detail: 'Your new account has been created! You will be redirected to the login screen.',
        });
        router.push(`/`, 3000);
      }
      else
        toast.current.show({
        severity: 'error',
        summary: 'Oops!',
        detail: response.message
      });
    } catch (error) {
      toast.current.show({
        severity: 'error',
        summary: 'Oops!',
        detail: handleError(error),
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    // Basic form validation.
    if (
      !validatePassword(password, passwordConfirm) ||
      !validateName(firstname) ||
      !validateName(lastname)
    ) {
      setFormValid(false);
    } else {
      setFormValid(true);
    }
  }, [firstname, lastname, password, passwordConfirm, email, emailConfirm]);

  if ( token ) {
    router.push(`/`);
  }

  return (
    <div className="layout-dashboard">
      <Toast ref={toast} position="top-right" />
      <div className="grid flex justify-content-center">
        <div className="flex flex-column align-items-center gap-4 mt-8">
          <Logo />
          <div className="card flex flex-column rounded align-items-center w-30rem gap-2 shadow-4">
            <h5 className="font-bold block text-yellow-800">{t('NEW_USER_REGISTRATION_TEXT')}</h5>
            <div className="flex flex-column align-items-center gap-1">
              <label htmlFor="firstname" className="font-bold block text-yellow-800 ">{t('FIRSTNAME')}</label>
              <InputText
                id="firstname"
                type="text"
                value={firstname}
                onChange={(e) => setFirstname(e.target.value)}
                required
                className={firstname.length === 0 && 'p-invalid'}
              />
              {firstname.length === 0 && (
                <small className="p-error p-d-block">Please fill in your first name.</small>
              )}
            </div>
            <div className="flex flex-column align-items-center gap-1">
              <label htmlFor="lastname" className="font-bold block text-yellow-800 ">{t('LASTNAME')}</label>
              <InputText
                id="lastname"
                value={lastname}
                onChange={(e) => setLastname(e.target.value)}
                type="text"
                required
                className={lastname.length === 0 && 'p-invalid'}
                
              />
              {lastname.length === 0 && (
                <small className="p-error p-d-block">Please fill in your last name.</small>
              )}
            </div>
            <div className="flex flex-column align-items-center gap-1">
              <label htmlFor="email" className="font-bold block text-yellow-800 ">{t('EMAIL')}</label>
              <InputText
                id="email"
                type="email"
                keyfilter="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={(email.length === 0 || email.indexOf('@') === -1) && 'p-invalid'}
                required
                
              />
              {email.length === 0 && (
                <small className="p-error p-d-block">
                  Please fill in your email address.
                </small>
              )}
              {email.indexOf('@') === -1 && email.length > 0 && (
                  <small className="p-error p-d-block">The email address is invalid.</small>
              )}
            </div>
            <div className="flex flex-column align-items-center gap-1">
              <label htmlFor="emailConfirm"  className="font-bold block text-yellow-800">{t('REPEAT_EMAIL')}</label>
              <InputText
                id="emailConfirm"
                onChange={(e) => setEmailConfirm(e.target.value)}
                type="email"
                keyfilter="email"
                value={emailConfirm}
                required
                className={email !== emailConfirm && 'p-invalid'}
                
              />
              {email !== emailConfirm && (
                <small className="p-error p-d-block">
                  The two email addresses do not match.
                </small>
              )}
            </div>
            <div className="flex flex-column align-items-center gap-1">
              <label htmlFor="password" className="font-bold block text-yellow-800">{t('PASSWORD')}</label>
              <Password
                feedback
                toggleMask
                id="password"
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className={(password.length <= 8 && 'p-invalid') || ''}
                
              />
              {password.length <= 8 && (
                <small className="p-error p-d-block">
                  The password must be more than 8 characters in length.
                </small>
              )}
            </div>
            <div className="flex flex-column align-items-center gap-1">
              <label htmlFor="passwordConfirm" className="font-bold block text-yellow-800">{t('REPEAT_PASSWORD')}</label>
              <Password
                feedback
                toggleMask
                autoComplete="off"
                value={passwordConfirm}
                id="passwordConfirm"
                onChange={(e) => setPasswordConfirm(e.target.value)}
                type="password"
                className={(password !== passwordConfirm && 'p-invalid') || ''}
                
              />
              {password !== passwordConfirm && (
                <small className="p-error p-d-block">The two passwords do not match.</small>
              )}
            </div>
            <div className="flex align-items-center gap-2 mt-3">
                <label className="font-bold block text-yellow-800 " style={{ cursor: 'pointer' }}>
                  <a href="/doc/terms.pdf" >{t('TERMS_CONDITIONS')}</a>
                </label>
            </div>
            <div className="flex align-items-center gap-2 mt-3">
              <Checkbox
                  inputId="legalCheck"
                  name="option"
                  value="legal"
                  checked={acceptedTerms}
                  onChange={() => setAcceptedTerms(!acceptedTerms)}
                />
                <label className="font-bold block text-yellow-800 " style={{ cursor: 'pointer' }}>
                  <a href="/doc/terms.pdf" >{t('TERMS_ACCEPT')}</a>
                </label>
            </div>
            <div className="flex flex-column gap-2 mt-3">
              <Button
                label={t('CREATE_ACCOUNT_BUTTON')}
                icon="pi pi-user-plus"
                type="submit"
                loading={isLoading}
                onClick={createNewAccount}
                disabled={!acceptedTerms || !formValid}
                className="p-button-big p-mr-2 p-mb-2"
              />
            </div>
          </div>
        </div>
      </div>
    </div>        
  );
};

Register.getLayout = function getLayout(page) {
    return page;
};

export async function getStaticProps(context) {
  return {
    props: { 
      messages: (await import(`../translations/${context.locale}.json`)).default
     },
  }
}



