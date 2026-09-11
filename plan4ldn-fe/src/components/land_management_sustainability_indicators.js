"use client"

import { PickList } from 'primereact/picklist';
import { Button } from 'primereact/button';
import React, { useContext, useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { getIndicators } from '../services/indicators';
import {
  getProjectIndicators,
  PROJECT_OWNER,
  PROJECT_USER,
  saveProjectIndicators,
} from '../services/projects';
import { UserContext } from '../context/user';
import { handleError } from '../utilities/errors';
import { Toast } from 'primereact/toast';

export default function LandManagementSustainabilityIndicators({ onForward }) {
  const t = useTranslations('default');
  const { token, currentProject } = useContext(UserContext);
  const toast = useRef(null);
  const [indicators, setIndicators] = useState([]);
  const [selected, setSelected] = useState({});

  const filterSourceListItems = (items, id) => {
    // Get the existing selected items and their ids.
    const ids = selected[id] ? selected[id]?.map((item) => item.id) : [];

    // Check if all the source items are transferable to the target
    // and also if the list of target ids does not contain the source item id.
    return items.filter((i) => i.transferable === 1).filter((i) => !ids.includes(i.id));
  };

  const filterTargetListItems = (items, id) => {
    // Get the existing selected items and their ids.
    const existing = selected[id] || [];
    const existingIds = existing.map((item) => item.id);

    // Tranfer all the items to the target list, then filter by untransferable
    // and also check if any of the source items are not in the target list already.
    return items
      .filter((i) => i.transferable === 0)
      .filter((i) => !existingIds.includes(i.id))
      .concat(existing);
  };

  const setDefaultSelectedIndicators = (allIndicators, projectIndicators) => {
    // Convert the project indicators to IDs.
    const projectIndicatorIds = projectIndicators.map((i) => i.id);

    // Get all the indicators that need to be selected by default.
    const defaults = allIndicators
      .map((e) => e.children)
      .flat()
      .map((c) =>
        c.children.filter((e) => e.transferable === 0 || projectIndicatorIds.includes(e.id))
      )
      .flat();

    // Create an empty object to hold them.
    const s = {};

    // Create the format that is needed.
    defaults.forEach((i) => {
      if (!s[i.parent_indicator_id]) {
        s[i.parent_indicator_id] = [];
      }
      s[i.parent_indicator_id].push(i);
    });

    // Send the untransferable items to the target.
    setSelected(s);
  };

  const onChange = (e, id) => {
    // Get the non-transferable items from the source back to the target.
    const nonTransferableSourceItems = e.source.filter((i) => i.transferable === 0);

    setSelected({ ...selected, [id]: e.target.concat(nonTransferableSourceItems) });
  };

  const onContinue = async () => {
    // Save the changes.
    try {
      
      const selectedIndicatorIds = Object.values(selected)
        .flat()
        .map(({ id }) => id);
      
      // Save the indicators if the owner is the one making the changes.
      if (currentProject?.role === PROJECT_OWNER) {
        await saveProjectIndicators(currentProject?.id, selectedIndicatorIds, token);
      }
      console.log(selectedIndicatorIds);
      onForward();
    } catch (error) {
      setError(handleError(error));
    }
  };
 

  useEffect(() => {
    const fetchIndicators = async () => {
      try {
        let resp = await getIndicators(token);
        const allIndicators = resp.data;
        resp  = await getProjectIndicators(currentProject?.id, token);
        const projectIndicators = resp.data
        
        setIndicators(allIndicators);
        setDefaultSelectedIndicators(allIndicators, projectIndicators);
      } catch (error) {
        toast.current.show({ severity: 'error', summary: 'Oops!', detail: handleError(e)});       
      }
    };
    fetchIndicators();
  }, []); // eslint-disable-line

  const itemTemplate = ({ transferable, name }) => (
    <div key={name}>
      <span className="mr-2">
        {transferable === 1 ? <i className="pi pi-tag" /> : <i className="pi fa-tags" />}
      </span>
      <span>{name}</span>
    </div>
  );

  return (
    <>
    <Toast ref={toast} position="top-right" />       
    <div className="flex flex-column m-2">
      {indicators.map((indicator) => (
          <div className="grid" key={indicator?.id}>
            <div className="col-12 pb-0">
              <h5 className="mb-1">{indicator?.name}</h5>
            </div>
            <div className="col-12 surface-100 m-2">
              {indicator?.children?.map((impact) => (
                <div key={impact?.id} className="grid fluid pb-4">
                  <div className="col-12" style={{ position: 'relative' }}>
                    <PickList
                      sourceHeader={impact?.name}
                      showSourceControls={false}
                      targetHeader={t('ASSESSMENT_CRITERIA')}
                      source={filterSourceListItems(impact?.children, impact?.id)}
                      target={filterTargetListItems(impact?.children, impact?.id)}
                      itemTemplate={itemTemplate}
                      onChange={(e) => onChange(e, impact?.id)}
                      sourceStyle={{ height: '280px' }}
                      targetStyle={{ height: '280px' }}
                    />
                  </div>
                </div>
              ))}  
            </div>
          </div>
      ))}
    </div>
    <div className="flex pt-4 justify-content-between">
      <Button label="Next" icon="pi pi-arrow-right" iconPos="right" onClick={() => onContinue()} />
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

      

