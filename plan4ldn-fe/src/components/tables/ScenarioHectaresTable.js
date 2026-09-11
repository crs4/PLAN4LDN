import React, { useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { useTranslations } from 'next-intl';
import { ToggleButton } from 'primereact/togglebutton';

const format = (num, decimals) => num.toFixed(decimals).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')

const HectaresDataTable = ({ scenario }) => {
  const t  = useTranslations('default');
  const [isCollapsed, setIsCollapsed] = useState(true);

  const scenarioTableHeader = (
    <div className="flex justify-content-between align-items-center">
      <div>
        <h4 className="mb-0">{`${t('SCENARIO')} ${scenario.scenarioName}`}</h4>
      </div>
      <div>
        <ToggleButton
          icon={`pi ${isCollapsed ? 'pi-angle-right' : 'pi-angle-down'}`}
          label={isCollapsed ? t('EXPAND') : t('COLLAPSE')}
          onClick={() => setIsCollapsed((v) => !v)}
        />
      </div>
    </div>
  );

  const landDegradationImpactBody = (rowData) => (
    <>{format(rowData.endLandCoverage.value - rowData.landCoverage.value, 2)} {rowData.landCoverage.unit}</>
  );

  const landCoverageBody = (rowData) => (
    <>{format(rowData.endLandCoverage.value, 2)} {rowData.endLandCoverage.unit}</>
  )

  const footerRow = () => {
    let label = t('STABLE');
    if (scenario.ld_impact > 0) {
      label = t('IMPROVED');
    } else {
      label = t('DEGRADED');
    }

    const text = `${t('LAND_DEGRADATION_BALANCE').toUpperCase()}: ${label.toUpperCase()} ( ${format(scenario.ld_impact, 2)} ha )`;

    return <span>{text}</span>;
  }

  return (
    <DataTable
      value={scenario.landTypes}
      dataKey="landId"
      header={scenarioTableHeader}
      rowHover
      footer={footerRow()}
    >
      {!isCollapsed && (<Column field="landType" header="Land Type" />)}
      {!isCollapsed && (<Column style={{ textAlign: 'right' }} header="Land Type Change" body={landDegradationImpactBody} />)}
      {!isCollapsed && (<Column style={{ textAlign: 'right' }} header="Land Coverage" body={landCoverageBody} />)}
    </DataTable>
  )
}

export default HectaresDataTable;
