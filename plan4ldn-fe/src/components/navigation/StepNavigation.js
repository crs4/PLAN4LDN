import { Button } from 'primereact/button';
import React from 'react';

const StepNavigation = ({ onBack, onForward }) => {
  let classes = '';
  if (onBack && onForward) {
    classes = 'flex justify-content-between align-items-center pb-4';
  } else if (onBack) {
    classes = 'flex justify-content-start align-items-center pb-4';
  } else if (onForward) {
    classes = 'flex justify-content-end align-items-center pb-4';
  }

  return (
    <div className={classes}>
      {onBack && (
        <Button
          onClick={onBack}
          className="p-button-secondary"
          icon="fad fa-arrow-alt-to-left"
          iconPos="right"
          label="Back"
        />
      )}
      {onForward && (
        <Button
          onClick={onForward}
          className="p-button-primary"
          icon="fad fa-arrow-alt-to-right"
          iconPos="right"
          label="Continue"
        />
      )}
    </div>
  );
};

export default StepNavigation;
