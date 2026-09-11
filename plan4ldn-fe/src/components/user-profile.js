"use client"

import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { useContext, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  getUserProfile,
  updateUserAvatar,
  updateUserProfile,
} from '../services/users';
import { handleError } from '../utilities/errors';
import { Toast } from 'primereact/toast';
import { UserContext } from '../context/user';


export default function UserProfile( { userId }) { 
  const t  = useTranslations('default');
  const userAvatar = useRef(null);
  const { token, setUser } = useContext(UserContext);
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [userAvatarUrl, setUserAvatarUrl] = useState(null);
  const toast = useRef();

  const uploadAvatar = async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const { data } = await updateUserAvatar(userId, formData, token);
      setUserAvatarUrl(data.avatar_url);
      setUser({ avatar_url: data.avatar_url });
      toast.current.show({
        severity: 'success',
        summary: 'Avatar',
        detail: 'Your avatar has been updated.',
      });
    } catch (error) {
      toast.current.show({
        severity: 'error',
        summary: handleError(error),
        detail: error,
      });
    }
  };

  const fetchProfile = async () => {
    try {
      const { data } = await getUserProfile(userId,token);
      if (data) {
        setFirstname(data.firstname);
        setLastname(data.lastname);
        setEmail(data.email);
        setUserAvatarUrl(data.avatar_url);
      }
    } catch (error) {
      toast.current.show({
        severity: 'error',
        summary: handleError(error),
        detail: error,
      });
    }
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      const response = await updateUserProfile( userId, { firstname, lastname }, token);
      if ( response.ok )
        toast.current.show({
          severity: 'success',
          summary: 'Profile',
          detail: 'Your profile has been updated!',
        });
      else toast.current.show({
        severity: 'error',
        summary: handleError(error),
        detail: 'Error updating user profile',
      });
    } catch (error) {
      toast.current.show({
        severity: 'error',
        summary: 'Error updating user profile',
        detail: error,
      });
    }
  };

  useEffect(() => {
      fetchProfile();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
 
  return (
    <div className="card p-fluid p-shadow-4 rounded">
      <Toast ref={toast} position="top-right" />
      <div className="flex flex-column align-items-center gap-4 mt-8">
        <h5 className="text-center">{t('USER_PROFILE_TITLE')}</h5>
        <form onSubmit={updateProfile}>
          <div className="formgrid grid">
            <div className="field col-12 md-6">
              <label htmlFor="firstname">{t('FIRSTNAME')}</label>
              <InputText
                id="firstname"
                type="text"
                value={firstname}
                onChange={(e) => setFirstname(e.target.value)}
                required
              />
            </div>
            <div className="field col-12 md-6">
              <label htmlFor="lastname">{t('LASTNAME')}</label>
              <InputText
                id="lastname"
                type="text"
                value={lastname}
                onChange={(e) => setLastname(e.target.value)}
                required
              />
            </div>
            <div className="field col-12 md-6">
                <label htmlFor="email">{t('EMAIL')}</label>
                <InputText
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
            </div>
            <div className="field col-12 md-6">
              <Button
                label={t('SAVE_CHANGES')}
                type="submit"
                onClick={updateProfile}
                icon="pi pi-save"
                className="p-button-primary p-mr-2 p-mt-2"
              />
            </div>
          </div>
        </form>
      </div>
      <div className="flex flex-column align-items-center gap-4 mt-8">
        <h5 className="text-center">{t('PROFILE_PICTURE_TITLE')}</h5>
          <div className="formgrid grid">
            <div className="field col-12 text-center">
              {userAvatarUrl ? (
                <img
                  src={userAvatarUrl}
                  height="130px"
                  className="rounded-full"
                  alt="Avatar"
                />
              ) : (
                <img
                  src="/plan4ldn/img/user-default.png"
                  style={{ height: '130px' }}
                  alt="Default Avatar"
                />
              )}
            </div>
            <div className="field col-12">
              <input
                className="hidden"
                type="file"
                multiple={false}
                ref={userAvatar}
                onChange={(e) => uploadAvatar(e.target.files[0])}
              />
              <Button
                label={t('CHANGE_PICTURE')}
                icon="pi pi-image"
                className="p-button-secondary p-mr-2 p-mb-2"
                onClick={(e) => {
                  userAvatar.current.click();
                }}
              />
            </div>
          </div>
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