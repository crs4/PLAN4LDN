import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ToggleButton } from 'primereact/togglebutton';


const format = (num, decimals) => num === '' ? '' : num.toFixed(decimals).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,') + ' ha'; // eslint-disable-line

const LayersDifferenceHectaresTable = ({
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
    <>{format(rowData.value1,2)} </>
  );
  const valueTemplate2 = (rowData) => (
    <>{format(rowData.value2 - rowData.value1,2)} </>
  );

  const valueTemplate3 = (rowData) => (
    <>{format(rowData.value2,2)} </>
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
    {!isCollapsed && (<Column header={headers[2]} body={valueTemplate3} />)}
    {!isCollapsed && (<Column header='Diff.' body={valueTemplate2} />)}
    </DataTable>
  );
};

export default LayersDifferenceHectaresTable;
