export const findImpactForTransition = (fromLandTypeId, becomesValue, becomesLandTypeId, impactMatrix) => {
  // we don't care if the value is 0...
  if (becomesValue === 0) {
    return 0;
  }

  let impactMatrixEntry = null;
  for (let i = 0; i < impactMatrix.length; i += 1) {
    if (impactMatrix[i].id === fromLandTypeId) {
      impactMatrixEntry = { ...impactMatrix[i] };
      break;
    }
  }

  // there's no impact matrix entry for this landId
  if (impactMatrixEntry === null) {
    return 0;
  }

  let transitionTo = null;
  for (let i = 0; i < impactMatrixEntry.row.length; i += 1) {
    if (impactMatrixEntry.row[i].id === becomesLandTypeId) {
      transitionTo = { ...impactMatrixEntry.row[i] };
      break;
    }
  }

  // we can't find the transition value (+,- or neutral)
  if (transitionTo === null) {
    return 0;
  }

  // if it's neutral
  if (transitionTo.value === '' || transitionTo.value === null) {
    return 0;
  }

  return (transitionTo.value === '+') ? becomesValue : (-1 * becomesValue);
};

export const calculateScenarioLdImpact = (scenario, impactMatrix) => {
  let ld_impact = 0;

  for (let i = 0; i < scenario.landTypes.length; i += 1) {
    const transition = scenario.landTypes[i];
    for (let j = 0; j < transition.breakDown.length; j += 1) {
      const breakDownEntry = transition.breakDown[j];
      ld_impact += findImpactForTransition(
        transition.landId,
        breakDownEntry.landCoverage.value,
        breakDownEntry.landId,
        impactMatrix
      );
    }
  }

  return ld_impact;
};
