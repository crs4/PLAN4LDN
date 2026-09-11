"use client"
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Message } from 'primereact/message';
import { InputNumber } from 'primereact/inputnumber';
import { InputMask } from 'primereact/inputmask';
import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const NewScenarioDialog = ({ minYear, maxYear, prepareScenario, dialogOpen, hasUnsavedChanges, setDialogOpen }) => {
  const t  = useTranslations('default');
  const [startYear, setStartYear] = useState(minYear);
  const [endYear, setEndYear] = useState(maxYear);

  useEffect(() => {
    setStartYear(minYear);
  }, [minYear])

  return (
    <Dialog
      header={t('NEW_SCENARIO')}
      visible={dialogOpen}
      style={{ width: '500px' }}
      onHide={() => setDialogOpen(false)}
    >
      {hasUnsavedChanges && (
        <Message severity="error" text="You have unsaved changes on your last scenario. Save
          them before adding a new one." className="mb-2" />
      )}
      <div className="fluid">
        <div className="formgrid grid">
          <div className="col-12">
            <div className="field">
              <label htmlFor="start_year">{t('START_YEAR')}</label>
              <br />
              <InputMask
                id="start_year"
                mask="9999"
                slotChar="yyyy"
                value={startYear}
                onChange={(e) => setStartYear(e.value)}
                disabled
              />
            </div>
          </div>
          <div className="col-12">
            <div className="field">
              <label htmlFor="end_year">{t('END_YEAR')}</label>
              <br />
              <InputNumber
                value={endYear}
                onValueChange={(e) => setEndYear(e.value)}
                showButtons
                buttonLayout="horizontal"
                decrementButtonClassName="button-danger"
                incrementButtonClassName="button-success"
                incrementButtonIcon="pi pi-plus"
                decrementButtonIcon="pi pi-minus"
                mode="decimal"
                useGrouping={false}
                min={startYear + 1}
                max={maxYear}
              />
            </div>
          </div>
          <div className="col-12 text-center mt-3">
            <div className="flex inline col-6 align-items-center justify-items-center">
              <Button
                label={t('CREATE_NEW')}
                disabled={hasUnsavedChanges}
                icon="pi pi-calendar-plus"
                onClick={() => {
                  prepareScenario(startYear, endYear);
                  setDialogOpen(false);
                }}
                autoFocus
              />
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default NewScenarioDialog;
