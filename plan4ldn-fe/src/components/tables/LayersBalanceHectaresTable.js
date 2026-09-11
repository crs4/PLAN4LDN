import React, { useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { useTranslations } from 'next-intl';
import { ToggleButton } from 'primereact/togglebutton';

const format = (num, decimals) => num === '' ? '' : num.toFixed(decimals).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,') + ' ha'; // eslint-disable-line

const LayersBalanceHectaresTable = ({
  hectares,
  headers,
  title,
  classname,
}) => {
  const t  = useTranslations('default');
  const [isCollapsed, setIsCollapsed] = useState(true);

  const tableHeader = (
    <div className="flex justify-content-between align-items-center"> 
      <div>
        <h4 className="mb-0 text-capitalize">{title}</h4>
      </div> 
      <div>
        <Button
          icon={`pi ${isCollapsed ? 'pi-angle-down' : 'pi-angle-up'}`}
          label={isCollapsed ? t('EXPAND') : t('COLLAPSE')}
          onClick={() => setIsCollapsed((v) => !v)}
        />
      </div>
    </div>
  );

  const classTemplate = (rowData) => (
    <> 
      <div className="flex justify-content-start align-items-center">
        <div>{rowData.class1}</div>
      </div>
    </>
  );

  
  const valueTemplate1 = (rowData) => (
      <>{format(rowData.v1,2)} </>
  );

  const valueTemplate2 = (rowData) => (
    <>{format(rowData.v2,2)} </>
  );

  const valueTemplate3 = (rowData) => (
    <>{format(rowData.v3,2)} </>
  );

  const valueTemplate4 = (rowData) => (
    <>{format(rowData.v4,2)} </>
  );

  const valueTemplate5 = (rowData) => (
    <>{format(rowData.v5,2)}  </>
  );
  
  const valueTemplate6 = (rowData) => (
    <>{format(rowData.v6,2)}  </>
  );

  const valueTemplate7 = (rowData) => (
    <>{format(rowData.v7,2)}  </>
  );

  return (
    <DataTable
      header={tableHeader}
      emptyMessage={t('NO_DATA_FOUND')}
      value={hectares}
      className={classname}
    >
    {!isCollapsed && (<Column header={headers[0]} body={classTemplate} />)}
    {!isCollapsed && (<Column header={headers[1]} body={valueTemplate1} />)}
    {!isCollapsed && (<Column header={headers[2]} body={valueTemplate2} />)}
    {!isCollapsed && (<Column header={headers[3]} body={valueTemplate3} />)}
    {!isCollapsed && (<Column header={headers[4]} body={valueTemplate4} />)}
    {!isCollapsed && (<Column header={headers[5]} body={valueTemplate5} />)}
    {!isCollapsed && (<Column header={headers[6]} body={valueTemplate6} />)}
    {!isCollapsed && (<Column header={headers[7]} body={valueTemplate7} />)}
    </DataTable>
  );
};

export default LayersBalanceHectaresTable;
