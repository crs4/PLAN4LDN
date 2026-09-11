"use client"
import React, { useContext, useEffect } from 'react';
import AppSubMenu from './AppSubMenu';
import { UserContext } from '../context/user';
import { PROJECT_STEPS, DRAFT } from '../services/projects';

const AppMenu = (props) => {
    const {  availableProjects, currentProject, language } = useContext(UserContext);
    const a_model = [
        { 
            label: 'Home',
            items: [
                {
                    label: 'HOME',
                    icon: 'pi pi-fw pi-home',
                    to: '/'
                },
                {
                    label: 'ABOUT',
                    icon: 'pi pi-fw pi-info',
                    to: '/about'
                }
            ]
        },
        { separator: true }
    ];
    if ( availableProjects?.length > 0 && currentProject ) 
    {
        a_model.push ({
            label: 'ACTIVE_PROJECT' + ( currentProject ? ': ' + currentProject.acronym : ': -') ,
            icon: 'pi pi-fw pi-image',
            items: []
        })
        a_model.push ({ 
            separator: true 
        })
    } 
    a_model.push(
        {
            label: 'MY_PROJECTS',
            items: [
                {
                    label: 'DASHBOARD',
                    icon: 'pi pi-fw pi-list',
                    to: '/'
                },
                {
                    label: 'NEW_PROJECT',
                    icon: 'pi pi-fw pi-file',
                    to: '/create-project'
                }
            ]
        },
        { 
            separator: true 
        });
    if ( currentProject && currentProject?.status === DRAFT )
    { 
        if ( [ PROJECT_STEPS.COMPLETED ].includes(currentProject.step))
        { 
            a_model.push({
                label: SETUP_PROJECT,
                items: [
                    {
                        label: 'REGION_OF_INTEREST',
                        icon: 'pi pi-fw pi-check-circle',
                    },
                    {
                        label: 'PROJECT_DATASETS',
                        icon: 'pi pi-fw pi-check-circle',
                        to: `/datasets`
                    }            
                ]
            })
        }
        else if ( [ PROJECT_STEPS.DATASETS_LAND_USE, 
                    PROJECT_STEPS.DATASETS_LAND_DEGRADATION,
                  ].includes(currentProject.step)
        ){ 
            a_model.push({
                label: 'SETUP_PROJECT',
                items: [
                    {
                        label: 'REGION_OF_INTEREST',
                        icon: 'pi pi-fw pi-check-circle',
                    },
                    {
                        label: 'PROJECT_DATASETS',
                        icon: 'pi pi-fw pi-circle',
                        to: `/datasets`
                    }            
                ]
            })
        }
        else { 
            a_model.push({
                label: 'SETUP_PROJECT',
                items: [
                    {
                        label: 'REGION_OF_INTEREST',
                        icon: 'pi pi-fw pi-circle',
                        to: `/region-of-interest`
                    },          
                ]
            })
        }
    }
    if ( currentProject && currentProject.status !== DRAFT )
    { 
        a_model.push({
            label: 'REGION_OF_INTEREST',
            items: [
                {
                    label: 'CURRENT_STATE',
                    icon: 'pi pi-fw pi-abacus',
                    to: `/current-state`
                },
                {
                    label: 'ANTICIPATED_NEW_LD',
                    icon: 'pi pi-fw pi-map',
                    to: `/anticipated-new-ldn`
                },
                {
                    label: 'LAND_USE_PLANNING',
                    icon: 'pi pi-fw pi-abacus',
                    to: `/land-use-planning`
                },
                {
                    label: 'FINAL_LDN_BALANCE',
                    icon: 'pi pi-fw pi-map',
                    to: `/final-ldn`
                }            
            ]
        })
    }

    return <AppSubMenu model={a_model} />;
};



export default AppMenu;
