import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
//import 'primereact/resources/primereact.min.css';
import React, { useState } from 'react';
import { useTranslations } from 'next-intl';

const format = (num, decimals) => num === '' ? '' : num.toFixed(decimals).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,') + ' ha'; // eslint-disable-line

const LayersHectaresTable = ({
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

  const classTemplate1 = (rowData) => (
    <>
      <div className="flex justify-content-start align-items-center">
        <div>{rowData.class1}</div>
      </div>
    </>
  );

  const classTemplate2 = (rowData) => (
    <>
      <div className="flex justify-content-start align-items-center">
        <div>{rowData.class2}</div>
      </div>
    </>
  );

  const valueTemplate1 = (rowData) => (
      <>{format(rowData.value1,2)} </>
  );

  const valueTemplate2 = (rowData) => (
    <>{format(rowData.value2,2)}  </>
  );

  return (
    <DataTable
      header={tableHeader}
      emptyMessage={t('NO_DATA_FOUND')}
      value={hectares}
      className={classname}
    >
    {!isCollapsed && (<Column header={headers[0]} body={classTemplate1} />)}
    {!isCollapsed && (<Column header="Hectares" body={valueTemplate1} />)}
    {!isCollapsed && (<Column header={headers[1]} body={classTemplate2} />)}
    {!isCollapsed && (<Column header="Hectares" body={valueTemplate2} />)}
    </DataTable>
  );
};

export async function getStaticProps(context) {
  return {
    props: { 
      messages: (await import(`../../translations/${context.locale}.json`)).default
     },
  }
}

export default LayersHectaresTable;
