"use client"

import { Button } from 'primereact/button';
import { Password } from 'primereact/password';
import { useContext, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { changeUserPassword } from '../services/users';
import { Toast } from 'primereact/toast';
import { handleError } from '../utilities/errors';
import { UserContext } from '../context/user';

export default function UserPassword() {
  const t  = useTranslations('default');
  const toast = useRef(null)
  const { token, setUser } = useContext(UserContext);
  const [isLoading, setIsLoading] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordRepeat, setNewPasswordRepeat] = useState('');

  const changePassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await changeUserPassword( userId, {
        password: oldPassword,
        new: newPassword,
      },token);
      setOldPassword('');
      setNewPassword('');
      setNewPasswordRepeat('');
      if ( response.ok )
        toast.current.show({
          severity: 'success',
          summary: 'Changed password',
          detail: 'Your password has been changed.',
        });
      else toast.current.show({
        severity: 'error',
        summary: 'Oops!',
        detail: 'Error changing password',
      });
    } catch (error) {
      toast.current.show({
        severity: 'error',
        summary: 'Oops!',
        detail: 'Error changing password',
      });
      
    }
    setIsLoading(false);
  };

  return (
    <div className="card fluid shadow-4 rounded">
      <Toast ref={toast} position="top-right" />
        <div className="flex flex-column align-items-center gap-4 mt-8">
          <h5>{t('CHANGE_PASSWORD')}</h5>
          <span className="p-float-label">
            <Password 
              id="oldPassword" 
              value={oldPassword} 
              autoComplete="off" 
              onChange={(e) => setOldPassword(e.target.value)} 
              required
              toggleMask
            />
            <label htmlFor="oldPassword">{t('OLD_PASSWORD')}</label>
          </span>
          <span className="p-float-label">
            <Password 
              id="newPassword" 
              value={newPassword} 
              autoComplete="off" 
              onChange={(e) => setNewPassword(e.target.value)} 
              required
              toggleMask
            />
            <label htmlFor="newPassword">{t('NEW_PASSWORD')}</label>
          </span>
          <span className="p-float-label">
            <Password 
              id="newPasswordRepeat" 
              value={newPasswordRepeat} 
              autoComplete="off" 
              onChange={(e) => setNewPasswordRepeat(e.target.value)} 
              required
              toggleMask
            />
            <label htmlFor="newPasswordRepeat">{t('REPEAT_NEW_PASSWORD')}</label>
          </span>
          {newPassword !== newPasswordRepeat && (
            <small className="error block">
              The two passwords do not match.
            </small>
          )}
          <Button
            label={t('CHANGE_PASSWORD')}
            icon="pi pi-save"
            loading={isLoading}
            type="submit"
            disabled={
              oldPassword.length === 0 ||
              newPassword.length === 0 ||
              newPasswordRepeat === 0 ||
              newPassword !== newPasswordRepeat
            }
            onClick={changePassword}
            className="p-button-primary p-mt-1"
          />
        </div>
    </div>
  );
};

export async function getStaticProps(context) {
  return {
    props: { 
      messages: (await import(`../translations/${context.locale}.json`)).default
     },
  }
}