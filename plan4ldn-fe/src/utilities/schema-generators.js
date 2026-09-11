import LandCoverDefaults from '../data/land-cover-defaults';
import InitialScenario from '../data/initial-scenario';

export const DEFAULT_LU_CLASSES = {
  1: 'Tree-covered',
  2: 'Grassland',
  3: 'Cropland',
  4: 'Wetland',
  5: 'Artificial Area',
  6: 'Bare land',
  7: 'Water body',
};

export const generateLUImpactMatrixSchema = (luClasses, usesDefault) => {
  if (usesDefault) return [...LandCoverDefaults];
  if (!luClasses || luClasses.length === 0) return [...LandCoverDefaults];
  const matrixSchema = [];

  luClasses.forEach((lc, index, luc) => {
    const matrixEntry = {
      id: parseInt(lc.value, 10),
      name: lc.key,
      non_editable: index + 1,
    };

    const row = [];
    luc.forEach((element) => {
      row.push({
        landType: element.key,
        value: '',
        id: parseInt(element.value, 10),
      });
    });

    matrixEntry.row = row;

    matrixSchema.push(matrixEntry);
  });

  return matrixSchema;
};

export const generateScenarioSchema = (luClasses, usesDefault) => {
  if (usesDefault) return JSON.parse(JSON.stringify(InitialScenario));
  if (!luClasses || luClasses.length === 0) return JSON.parse(JSON.stringify(InitialScenario));
  const scenario = {
    scenarioName: 'Untitled',
    scenarioPeriod: {
      scenarioStart: 0,
      scenarioEnd: 0,
    },
    ld_impact: 0,
  };

  const landTypes = [];
  luClasses.forEach((lc, _index, luc) => {
    const lt = {
      landType: lc.key,
      landId: parseInt(lc.value, 10),
      landCoverage: {
        value: 0,
        unit: 'ha',
      },
      endLandCoverage: {
        value: 0,
        unit: 'ha',
      },
      breakDownLimit: {
        value: 0,
        unit: 'ha',
      },
    }

    const breakDown = [];
    luc.forEach((element) => {
      if (element.key !== lc.key) {
        breakDown.push({
          landType: element.key,
          landId: parseInt(element.value, 10),
          landCoverage: {
            value: 0,
            unit: 'ha',
          },
        })
      }
    });
    lt.breakDown = breakDown;

    landTypes.push(lt);
  });
  scenario.landTypes = landTypes;

  return scenario;
};

export const generateTreeNodes = () => {
  if (usesDefault) return JSON.parse(JSON.stringify(InitialScenario));
  if (!luClasses || luClasses.length === 0) return JSON.parse(JSON.stringify(InitialScenario));
  const scenario = {
    scenarioName: 'Untitled',
    scenarioPeriod: {
      scenarioStart: 0,
      scenarioEnd: 0,
    },
    ld_impact: 0,
  };

  const landTypes = [];
  luClasses.forEach((lc, _index, luc) => {
    const lt = {
      landType: lc.key,
      landId: parseInt(lc.value, 10),
      landCoverage: {
        value: 0,
        unit: 'ha',
      },
      endLandCoverage: {
        value: 0,
        unit: 'ha',
      },
      breakDownLimit: {
        value: 0,
        unit: 'ha',
      },
    }

    const breakDown = [];
    luc.forEach((element) => {
      if (element.key !== lc.key) {
        breakDown.push({
          landType: element.key,
          landId: parseInt(element.value, 10),
          landCoverage: {
            value: 0,
            unit: 'ha',
          },
        })
      }
    });
    lt.breakDown = breakDown;

    landTypes.push(lt);
  });
  scenario.landTypes = landTypes;

  return scenario;
};

export const getLandCoverageValuesPerClass = (scenario) => {
  const landCoverageValues = {};
  scenario.landTypes.forEach((landType) => {
    landCoverageValues[landType.landId] = landType.endLandCoverage.value;
  });
  return landCoverageValues;
};

export const fillInitialLandCoverageValues = (scenario, hectaresPerClass) => {
  if (scenario.landTypes && scenario.landTypes.length > 0) {
    scenario.landTypes.forEach((lt) => {
      let value = 0;
      if (hectaresPerClass && hectaresPerClass[lt.landId]) 
      {
        value = hectaresPerClass[lt.landId];
      }
      lt.landCoverage.value = value;
      lt.endLandCoverage.value = value;
      lt.breakDownLimit.value = value;
    })
  }

  return { ...scenario };
};

export const findLuClassesByIds = (classIds, projectLuClasses, usesDefault) => {
  const class_keys = [];
  if ( classIds ) {
    for (let key in classIds) { // eslint-disable-line
      if ( !isNaN( key ) && parseInt (key,10) > 0 ) 
          class_keys.push(parseInt (key,10));
      }
  }  
  else return null;
  if (usesDefault) {    
    return class_keys.map((id) => ({ key: DEFAULT_LU_CLASSES[id], value: id  }));
  }
 return projectLuClasses.filter((plc) => class_keys.includes(plc.value));
}
