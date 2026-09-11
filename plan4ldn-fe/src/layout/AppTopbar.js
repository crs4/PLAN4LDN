"use client"

import React, { forwardRef, useImperativeHandle, useState, useEffect, useContext, useRef } from 'react';
import Link from 'next/link';
import { Button } from 'primereact/button';
import AppBreadCrumb from './AppBreadCrumb';
import { StyleClass } from 'primereact/styleclass';
import AppSidebar from './AppSidebar';
import { LayoutContext } from './context/layoutcontext';
import { useRouter } from 'next/router';
import { getInvites, updateInvite } from '../services/users';
import { logout } from '../services/auth';
import { UserContext } from '../context/user';

const AppTopbar = forwardRef( function AppTopbar( props, ref) {
    const btnRef1 = useRef(null);
    const menubuttonRef = useRef(null);
    const { locale, locales, route } = useRouter();
    const { onMenuToggle, layoutConfig } = useContext(LayoutContext);
    const router = useRouter();
    const otherLocale = locales?.find((cur) => cur !== locale);
    const otherlang = (otherLocale === 'fr'? 'French' : 'Anglais');
    const [notificationMenuVisible, setNotificationMenuVisible] = useState(false);
    const [invitations, setInvitations] = useState([]);
    const [loadingInvitation, setLoadingInvitation] = useState(0);
    const { firstname, lastname, token, avatar_url: avatarUrl, resetData } = useContext(UserContext);

    const acceptInvite = async (invitationId) => {
        setLoadingInvitation(invitationId);
        try {
            await updateInvite(invitationId, { status: 'accepted' });
        } catch (e) {
            setError(handleError(e));
        } finally {
            fetchInvites();
        }
    };

    const rejectInvite = async (invitationId) => {
        setLoadingInvitation(invitationId);
        try {
            await updateInvite(invitationId, { status: 'rejected' });
        } catch (e) {
            setError(handleError(e));
        } finally {
            fetchInvites();
        }
    };

    const fetchInvites = async () => {
        try {
          const { data: response } = await getInvites(token);
          setInvitations(response.data);
          if (data.length === 0) {
            setNotificationMenuVisible(false);
          }
        } catch (e) {
          /* sh! fail silently */
        }
    };

    const signOut = async () => { 
        if ( token )  {
            await logout();
            resetData();
            router.push( '/login', 500 );
        }
    };

    useImperativeHandle(ref, () => ({
        menubutton: menubuttonRef.current
    }));
    
    useEffect(() => {
        fetchInvites();
        const interval = setInterval(() => {
            fetchInvites();
        }, process.env.NEXT_PUBLIC_INVITATION_POLLING_FREQUENCY * 1000);
        return () => {
            clearInterval(interval);
        };
    }, []); // eslint-disable-line

    return (
        <div className="layout-topbar">
            <div className="topbar-left">
                <button ref={menubuttonRef} type="button" className="menu-button p-link" onClick={onMenuToggle}>
                    <i className="pi pi-chevron-left"></i>
                </button>
                <span className="topbar-separator"></span>
                <AppBreadCrumb />
                <img
                    id="logo-mobile"
                    className="mobile-logo"
                    style={{width: '50px'}}
                    src="/plan4ldn/img/logo.png"
                    alt="PLAN4LDN"
                />
            </div>
            <div className="layout-topbar-menu-section">
                <AppSidebar sidebarRef={props.sidebarRef} />
            </div>
            <div className="layout-mask modal-in"></div>
            <div className="topbar-right">
                <ul className="topbar-menu">                   
                    <li className="profile-item static sm:relative">
                        <Link href={route} locale={otherLocale}>
                            <img className="language-image pr-4" style={{width: '50px'}} src={`/plan4ldn/img/${otherLocale}.png`} alt="" />
                            <span className="text-lg uppercase ">{otherlang}</span>
                        </Link>   
                    </li>
                    <li className="profile-item static sm:relative">
                        <StyleClass nodeRef={btnRef1} selector="@next" enterClassName="hidden" enterActiveClassName="scalein" leaveToClassName="hidden" leaveActiveClassName="fadeout" hideOnOutsideClick="true">
                            <a tabIndex={0} ref={btnRef1}>
                                <img
                                    src='/plan4ldn/img/user-default.png'
                                    alt="user"
                                    className="profile-image mr-4"
                                />
                                {( ( firstname || lastname ) && (
                                <span className="mr-4 profile-name">
                                    <small>LOGGED_IN_AS </small>
                                    {(firstname?firstname:'') + ' ' + (lastname?lastname:'')}
                                </span>
                                ) )}
                            </a>
                        </StyleClass>
                    </li>
                    <li className="profile-item static sm:relative">
                        <button
                            type="button"
                            className="p-link"
                            onClick={() =>
                            invitations &&
                            invitations.length &&
                            setNotificationMenuVisible(!notificationMenuVisible)
                            }
                        >
                            <i className="pi pi-bell" />
                            {invitations && invitations.length > 0 && (
                                <span className="topbar-badge">{invitations.length}</span>
                            )}
                        </button>
                        {notificationMenuVisible && (
                            <ul className="notifications-menu fade-in-up pt-2" style={{ zIndex: '9999' }}>
                            {invitations &&
                                invitations.map((i) => (
                                <li key={i.id} role="menuitem" className="p-mb-2">
                                    <div className="flex justify-content-between">
                                    <div style={{ paddingRight: '.5rem' }}>
                                        {'INVITED_TEXT'} <strong>{i.project.title}</strong> {'BY'}{' '}
                                        <strong>{`${i.inviter.firstname} ${i.inviter.lastname}`}</strong>.
                                    </div>
                                    <div className="actionable-buttons">
                                        <Button
                                        title={'ACCEPT_INVITE'}
                                        disabled={loadingInvitation === i.id}
                                        icon="pi pi-check"
                                        severity="success"
                                        size="small"
                                        onClick={() => acceptInvite(i.id)}
                                        />
                                        <Button
                                        title={'REJECT_INVITE'}
                                        disabled={loadingInvitation === i.id}
                                        icon="pi pi-times"
                                        className="ml-2"
                                        severity="danger"
                                        size="small"
                                        onClick={() => rejectInvite(i.id)}
                                        />
                                    </div>
                                    </div>
                                </li>
                                ))}
                            </ul>
                        )}
                    </li>
                    {( token && (
                    <li className="profile-item static sm:relative">
                        <Link href="/profile" style={{ width: '100%' }}>
                            <Button
                                label={'ACCOUNT_SETTINGS'}
                                icon="pi pi-cog"
                                severity="secondary"
                                size="small"
                            />
                        </Link>
                    </li>
                    ))}
                    <li className="profile-item static sm:relative">
                        <Button
                            onClick={signOut}
                            title={'SIGN_OUT'}
                            label=""
                            icon="pi pi-sign-out"
                            severity="info"
                            size="small"
                        />
                    </li>
                </ul>
            </div>
        </div>
    );
});

export default AppTopbar;

