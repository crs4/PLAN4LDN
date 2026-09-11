const landCoverDefaults = [
  {
    id: 1,
    name: 'Tree-covered',
    non_editable: 1,
    row: [
      {
        landType: 'Tree-covered', 
        value: '',
        id: 1,
      },
      {
        landType: 'Grassland',
        value: '-',
        id: 2,
      },
      {
        landType: 'Cropland',
        value: '-',
        id: 3,
      },
      {
        landType: 'Wetland',
        value: '-',
        id: 4,
      },
      {
        landType: 'Artificial area',
        value: '-',
        id: 5,
      },
      {
        landType: 'Bare land',
        value: '-',
        id: 6,
      },
      {
        landType: 'Water body',
        value: '',
        id: 7,
      },
    ],
  },
  {
    id: 2,
    name: 'Grassland',
    non_editable: 2,
    row: [
      {
        landType: 'Tree-covered',
        value: '+',
        id: 1,
      },
      {
        landType: 'Grassland',
        value: '',
        id: 2,
      },
      {
        landType: 'Cropland',
        value: '+',
        id: 3,
      },
      {
        landType: 'Wetland',
        value: '-',
        id: 4,
      },
      {
        landType: 'Artificial area',
        value: '-',
        id: 5,
      },
      {
        landType: 'Bare land',
        value: '-',
        id: 6,
      },
      {
        landType: 'Water body',
        value: '',
        id: 7,
      },
    ],
  },
  {
    id: 3,
    name: 'Cropland',
    non_editable: 3,
    row: [
      {
        landType: 'Tree-covered',
        value: '+',
        id: 1,
      },
      {
        landType: 'Grassland',
        value: '-',
        id: 2,
      },
      {
        landType: 'Cropland',
        value: '',
        id: 3,
      },
      {
        landType: 'Wetland',
        value: '-',
        id: 4,
      },
      {
        landType: 'Artificial area',
        value: '-',
        id: 5,
      },
      {
        landType: 'Bare land',
        value: '-',
        id: 6,
      },
      {
        landType: 'Water body',
        value: '',
        id: 7,
      },
    ],
  },
  {
    id: 4,
    name: 'Wetland',
    non_editable: 4,
    row: [
      {
        landType: 'Tree-covered',
        value: '-',
        id: 1,
      },
      {
        landType: 'Grassland',
        value: '-',
        id: 2,
      },
      {
        landType: 'Cropland',
        value: '-',
        id: 3,
      },
      {
        landType: 'Wetland',
        value: '',
        id: 4,
      },
      {
        landType: 'Artificial area',
        value: '-',
        id: 5,
      },
      {
        landType: 'Bare land',
        value: '-',
        id: 6,
      },
      {
        landType: 'Water body',
        value: '',
        id: 7,
      },
    ],
  },
  {
    id: 5,
    name: 'Artificial area',
    non_editable: 5,
    row: [
      {
        landType: 'Tree-covered',
        value: '+',
        id: 1,
      },
      {
        landType: 'Grassland',
        value: '+',
        id: 2,
      },
      {
        landType: 'Cropland',
        value: '+',
        id: 3,
      },
      {
        landType: 'Wetland',
        value: '+',
        id: 4,
      },
      {
        landType: 'Artificial area',
        value: '',
        id: 5,
      },
      {
        landType: 'Bare land',
        value: '+',
        id: 6,
      },
      {
        landType: 'Water body',
        value: '',
        id: 7,
      },
    ],

  },
  {
    id: 6,
    name: 'Bare land',
    non_editable: 6,
    row: [
      {
        landType: 'Tree-covered',
        value: '+',
        id: 1,
      },
      {
        landType: 'Grassland',
        value: '+',
        id: 2,
      },
      {
        landType: 'Cropland',
        value: '+',
        id: 3,
      },
      {
        landType: 'Wetland',
        value: '+',
        id: 4,
      },
      {
        landType: 'Artificial area',
        value: '-',
        id: 5,
      },
      {
        landType: 'Bare land',
        value: '',
        id: 6,
      },
      {
        landType: 'Water body',
        value: '',
        id: 7,
      },
    ],
  },
  {
    id: 7,
    name: 'Water body',
    non_editable: 7,
    row: [
      {
        landType: 'Tree-covered',
        value: '',
        id: 1,
      },
      {
        landType: 'Grassland',
        value: '',
        id: 2,
      },
      {
        landType: 'Cropland',
        value: '',
        id: 3,
      },
      {
        landType: 'Wetland',
        value: '',
        id: 4,
      },
      {
        landType: 'Artificial area',
        value: '',
        id: 5,
      },
      {
        landType: 'Bare land',
        value: '',
        id: 6,
      },
      {
        landType: 'Water body',
        value: '',
        id: 7,
      },
    ],
  },
];

export default landCoverDefaults;
