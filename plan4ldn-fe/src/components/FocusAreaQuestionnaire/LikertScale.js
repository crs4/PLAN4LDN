"use client"
import { RadioButton } from 'primereact/radiobutton';
import React, { useEffect, useState } from 'react';


const LikertScale = ({ id, initialScale, onChange }) => {
  const [value, setValue] = useState(null);

  const likertRange = {
    'strongly_disagree': -3,
    'disagree': -2,
    'somewhat_disagree': -1,
    'neither_agree_or_disagree': 0,
    'somewhat_agree': 1,
    'agree': 2,
    'strongly_agree': 3,
  };

  useEffect(() => {
    if (initialScale !== undefined) {
      if (Object.values(likertRange).includes(initialScale)) {
        for (const key in likertRange) {
          if (likertRange[key] === initialScale) {
            setValue(key);
          }
        }
      }
    }
  }, [initialScale]); // eslint-disable-line

  const selectValue = (e) => {
    setValue(e.value);
    if (onChange !== undefined) {

      const humanReadable = e.value;

      let numericScale = 0;
      if (humanReadable === 'strongly_disagree') {
        numericScale = -3;
      } else if (humanReadable === 'disagree') {
        numericScale = -2;
      } else if (humanReadable === 'somewhat_disagree') {
        numericScale = -1;
      } else if (humanReadable === 'neither_agree_or_disagree') {
        numericScale = 0;
      } else if (humanReadable === 'somewhat_agree') {
        numericScale = 1;
      } else if (humanReadable === 'agree') {
        numericScale = 2;
      } else if (humanReadable === 'strongly_agree') {
        numericScale = 3;
      }

      const valueSelection = {
        id,
        humanReadable,
        numericValue: numericScale,
      }

      onChange(valueSelection);
    }
  }

  return (

    <div>
      <RadioButton
        className="strongly_disagree small "
        value="strongly_disagree"
        name={`likert_scale_${id}`}
        onChange={(e) => selectValue(e)}
        checked={value === 'strongly_disagree'}
      />
      <RadioButton
        className="likert disagree small "
        value="disagree"
        name={`likert_scale_${id}`}
        onChange={(e) => selectValue(e)}
        checked={value === 'disagree'}
      />
      <RadioButton
        className="likert somewhat_disagree small "
        value="somewhat_disagree"
        name={`likert_scale_${id}`}
        onChange={(e) => selectValue(e)}
        checked={value === 'somewhat_disagree'}
      />
      <RadioButton
        className="likert neither_agree_or_disagree small "
        value="neither_agree_or_disagree"
        name={`likert_scale_${id}`}
        onChange={(e) => selectValue(e)}
        checked={value === 'neither_agree_or_disagree'}
      />
      <RadioButton
        className="likert somewhat_agree small "
        value="somewhat_agree"
        name={`likert_scale_${id}`}
        onChange={(e) => selectValue(e)}
        checked={value === 'somewhat_agree'}
      />
      <RadioButton
        className="likert agree small "
        value="agree"
        name={`likert_scale_${id}`}
        onChange={(e) => selectValue(e)}
        checked={value === 'agree'}
      />
      <RadioButton
        className="likert strongly_agree small "
        value="strongly_agree"
        name={`likert_scale_${id}`}
        onChange={(e) => selectValue(e)}
        checked={value === 'strongly_agree'}
      />
    </div>

  );
}

export default LikertScale;
