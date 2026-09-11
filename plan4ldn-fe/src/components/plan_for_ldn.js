"use client"

import { Menubar } from 'primereact/menubar';
import React, { useContext, useState, useEffect } from 'react';

import { useRouter } from 'next/navigation';
import { UserContext } from '../context/user';
import LandManagement from './land_management';
import LandUse from './land_use';
import { useTranslations } from 'next-intl';

const getMenuItemClasses = (index, currentIndex) => {
  let classNames = 'button component p-button-text mr-2';
  if (index !== currentIndex) {
    classNames += ' button-secondary';
  } else {
    classNames += ' text-bold';
  }
  return classNames;
};

const PlanForLDN = () => {
  const t  = useTranslations('default');
  const [menuIndex, setMenuIndex] = useState(0);
  const { token, currentProject } = useContext(UserContext);
  const router = useRouter();
  const menuItemTemplate = (item, options) => (
    <button
      type="button"
      className={getMenuItemClasses(item.index, menuIndex)}
      target={item.target}
      onClick={options.onClick}
    >
      <span className={options.iconClassName} />
      <span className={options.labelClassName}>{item.label}</span>
    </button>
  );

  const menuItems = [
    {
      index: 0,
      label: t('LAND_USE'),
      icon: 'pi pi-fw pi-angle-right',
      command: () => setMenuIndex(0),
      template: menuItemTemplate,
    },
  ];

  useEffect(() => {
    if ( !token ) 
      router.push(`/login`);
    
  }, []);  // eslint-disable-line 
  
  if ( !currentProject  ) {
    return <></>;
  }

  if (currentProject.land_management_sustainability_method) {
    menuItems.push({
      index: 1,
      label: t('LAND_MANAGEMENT'),
      icon: 'pi pi-fw pi-angle-right',
      command: () => setMenuIndex(1),
      template: menuItemTemplate,
    });
  }

  //
  return (
    <>
     
      <div style={{ marginLeft: '-1rem', marginRight: '-1rem' }}>
        {menuItems.length > 1 && (
          <Menubar model={menuItems} className="mb-4" />
        )}
        <div className="pb-4">
          {menuIndex === 0 && <LandUse />}
          {menuIndex === 1 && <LandManagement />}
        </div>
      </div>
    </>
  );
};

export async function getStaticProps(context) {
  return {
    props: { 
      messages: (await import(`../translations/${context.locale}.json`)).default
     },
  }
}

export default PlanForLDN;