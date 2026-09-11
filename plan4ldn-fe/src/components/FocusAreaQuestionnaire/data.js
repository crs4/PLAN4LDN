const questionsData = [
  {
    label: 'Impacts on Ecosystem Services',
    id: 'ecological_impacts',
    questions: [
      {
        label: 'Soil',
        id: 'soil_value',
        sublabel: [],
        explanationList: [],
      },
      {
        label: 'Biological Resources',
        id: 'biodiversity_value',
        sublabel: [],
        explanationList: [],
      },
      {
        label: 'Water',
        id: 'water_value',
        sublabel: [],
        explanationList: [],
      },
      {
        label: 'Climate Change resilience',
        id: 'climate_change_resilience_value',
        sublabel: [],
        explanationList: [],
      },

    ],
  },
  {
    label: 'Economic Impacts',
    id: 'socio_economic_impacts',
    questions: [
      {
        label: 'Production',
        id: 'production_value',
        sublabel: [],
        explanationList: [
          'crop',
          'fodder',
          'animal',
          'wood',
          'non-wood forest',
          'energy',
        ],
      },
      {
        label: 'Economic viability',
        id: 'economic_viability_value',
        sublabel: [],
        explanationList: [],
      },
    ],
  },
  {
    label: 'Socio-cultural impacts',
    id: 'socio_cultural_impacts',
    questions: [
      {
        label: 'Food security',
        id: 'food_security_value',
        sublabel: [],
        explanationList: [],
      },
      {
        label: 'Equality of opportunity',
        id: 'equality_of_opportunity_value',
        sublabel: [],
        explanationList: [],
      },
    ],
  },
];

export default questionsData;
