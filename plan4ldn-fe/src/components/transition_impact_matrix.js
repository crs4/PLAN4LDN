"use client"

import React, { useContext, useEffect, useState, useRef } from 'react';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { ToggleButton } from 'primereact/togglebutton';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { getScenarios } from '../services/scenarios';
import { getGeoJsonPolygon } from '../services/files';

import { Toast } from 'primereact/toast';
import { useTranslations } from 'next-intl';
import { UserContext } from '../context/user';
import { useRouter } from 'next/navigation';
import landCoverDefaults from '../data/land-cover-defaults';

const StatusEditor = ({ rowData, field, onStatusEditorValueChange }) => {
  const [dropdownValue, setDropdownValue] = useState('');
  const t = useTranslations('default');
  const { token, setUser } = useContext(UserContext);
  const toast = useRef();
  const router = useRouter();

  useEffect(() => {
    rowData.row.forEach((item) => {
      if (item.id === field) {
        setDropdownValue(item.value);
      }
    });
  }, [setDropdownValue, field, rowData.row]);

  const statuses = [
    { label: t('IMPROVEMENT'), value: '+' },
    { label: t('STABLE'), value: '' },
    { label: t('DEGRADATION'), value: '-' },
    { label: t('NOT_AVAILABLE'), value: 'x' },
  ];

  return (
    <Dropdown
      value={dropdownValue}
      options={statuses}
      onChange={(e) => {
        setDropdownValue(e.value);
        onStatusEditorValueChange(rowData, field, e.value);
      }}
      style={{ width: '100%' }}
      placeholder={t('SELECT_STATUS')}
      itemTemplate={(option) => {
        let classBadge = 'lowstock';
        if (option.value === '+') {
          classBadge = 'instock';
        } else if (option.value === '-') {
          classBadge = 'outofstock';
        } else if (option.value === 'x') {
          classBadge = 'notstock';
        }

        return <span className={`product-badge status-${classBadge}`}>{option.label}</span>;
      }}
    />
  );
};

const TransitionImpactMatrix = ({ initialData, title, hasDefaultData, onSave }) => {
  const t = useTranslations('default');
  const {  currentProject } = useContext(UserContext);
  const toast = useRef();
  const router = useRouter();
  const [landCoverItem, setLandCoverItem] = useState(JSON.parse(JSON.stringify(initialData)));
  const [selectedlandCoverItem, setSelectedlandCoverItem] = useState(null);
  const [trendsEarthStatus, setTrendsEarthStatus] = useState(true);
  const [onChecked, setOnChecked] = useState(false);
  
  
  const loadDefault = () => {
    if ( hasDefaultData ) {
      setLandCoverItem(JSON.parse(JSON.stringify(landCoverDefaults)));
      console.log(initialData)
      setTrendsEarthStatus(true);
      handleSave(true);
    }
    else toast.current.show({ severity: 'error', summary:'Error!', detail: 'No defaults for custom data' })
  };

  const getScenarioPolygons = async () => {
    const polygons = [];
    const { data: scenarios } = await getScenarios(user.userData.access_token, currentProject.id,token);
    if ( scenarios )
      for ( const scenario of scenarios ) {
        if ( scenario.content && scenario.content.landTypes ) {
          for ( const item of scenario.content.landTypes ) {
            if (item.breakDown) {
              for (const breakDownItem of item.breakDown) {
                if (breakDownItem.landCoverage && breakDownItem.landCoverage.file_id) {
                  const plg = await getGeoJsonPolygon(user.userData.access_token, currentProject.id, breakDownItem.landCoverage.file_id,token);
                  if (plg)
                    polygons.push (plg);
                }
              }
            }
          }
        }      
      }
    return polygons;
  };

  const onStatusRowEditSave = ({ data }) => {
    const landCoverItemLocal = JSON.parse(JSON.stringify(landCoverItem));
    const updatedLandCoverItem = landCoverItemLocal.map(
      (item) => {
        if (item.id === data.id) {
          item.row.forEach(
            (itemRow) => {
              if (data[itemRow.id] !== undefined) {
                itemRow.value = data[itemRow.id];
              }
            }
          );
        }
        return item;
      }
    );
    if ( hasDefaultData ) 
      setTrendsEarthStatus(false);
    setLandCoverItem(updatedLandCoverItem);
    handleSave(true);
  };

  const onStatusEditorValueChange = async (rowData, field, value) => {
    for ( const item of rowData.row){
      if (item.id === field) {
        const found = false;
        if ( value === 'x' ) {
          const checkPolygons = await getScenarioPolygons();
          for ( const poly of checkPolygons ){
            if ( poly.from === rowData.id && poly.to === field ){
              found = true;
              break;
            }  
          }
        }
        if ( !found ) { 
          item.value = value;
        }
        else 
          toast.current.show({ severity: 'error', summary:'Error!', detail: 'First delete polygon for this transition' })
      }
    };
  };

  const statusEditor = ({ rowData }, field) => (
    <StatusEditor
      rowData={rowData}
      field={field}
      onStatusEditorValueChange={onStatusEditorValueChange}
    />
  )

  const statusColumn = (data, index) => {
    let className = 'medium';

    if (data.row[index].value === '-') {
      className = 'low';
    } else if (data.row[index].value === '+') {
      className = 'high';
    } else if ( !data.row[index].value || data.row[index].value === 'x' || data.row[index].value === '') {
      className = 'not';
    }

    return (
      <div className={className} style={{ textAlign: 'center' }}>
        {data.row[index].value}
      </div>
    );
  };

  const handleSave = (checked) => {
    setOnChecked(checked);
    onSave(landCoverItem);
  };

  const landCoverTableHeader = (
    <div className="table-header">
      <div className="flex justify-content-between align-items-center py-2 px-2">
        <div>
          <h4 className="mb-0">{title}</h4>
        </div>
        <div>
          {hasDefaultData && (
            <Button
              icon="pi pi-refresh"
              label={t('LOAD_TRENDS_EARTH_DEFAULTS')}
              onClick={loadDefault}
              disabled={trendsEarthStatus}
            />
          )}
          <ToggleButton
            onLabel={t('SAVED')}
            offLabel={t('SAVE_CHANGES')}
            onIcon="pi pi-check"
            offIcon="pi pi-save"
            className="g-save ml-2"
            checked={onChecked}
            disabled={trendsEarthStatus}
            onChange={(e) => handleSave(e)}
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
    <Toast ref={toast} position="top-right" />
      
    <DataTable
      value={landCoverItem}
      className="datatable-gridlines datatable-striped datatable-sm datatable-customers"
      rows={(landCoverItem && landCoverItem.length) ? landCoverItem.length : 0}
      dataKey="id"
      rowHover
      selection={selectedlandCoverItem}
      editMode="row"
      onSelectionChange={(e) => setSelectedlandCoverItem(e.value)}
      header={landCoverTableHeader}
      onRowEditSave={onStatusRowEditSave}
      tabIndex="false"
    >
      <Column
        field="name"
        header=""
      />
      {landCoverItem.map((lci, index) => (
        <Column
          key={lci.id}
          header={lci.name}
          editor={(props) => statusEditor(props, lci.id)}
          body={(rowData) => statusColumn(rowData, index)}
        />
      ))}
      <Column rowEditor headerStyle={{ width: '7rem' }} bodyStyle={{ textAlign: 'center' }} />
    </DataTable>
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

export default TransitionImpactMatrix;
