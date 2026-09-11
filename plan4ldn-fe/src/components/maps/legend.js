"use client"
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import { useEffect } from 'react';

const MapLegend = ({ lref, data, position }) => {
  const map = useMap();
 
  const renderLegend = (legend) => {
    if (!legend.elements) {
        return;
    }
    const elements = legend.elements;
    const block = L.DomUtil.create('div', 'leaflet-control leaflet-bar leaflet-html-legend');
    
    if (legend.name) {
      const header = L.DomUtil.create('h4', null, block);
      L.DomUtil.create('div', 'legend-caret', header);
      L.DomUtil.create('span', null, header).innerHTML = legend.name;
      L.DomEvent.on(header, 'click', () => {
          if (L.DomUtil.hasClass(header, 'closed')) {
              L.DomUtil.removeClass(header, 'closed');
          }
          else {
              L.DomUtil.addClass(header, 'closed');
          }
      }, this);    
    }

    const elementContainer = L.DomUtil.create('div', 'legend-elements', block);
    
    for ( let e = 0; e < elements.length; e += 1 ) {
      if ( elements[e] )
        addElement(elements[e].html, elements[e].label, elements[e].style, elementContainer);
    };
    return block;
  }

  const addElement = (html, label, style, container) => {
    const row = L.DomUtil.create('div', 'legend-row', container);
    const symbol = L.DomUtil.create('span', 'symbol', row);
    if (style) {
        Object.entries(style).forEach(([k, v]) => { symbol.style[k] = v; });
    }
    symbol.innerHTML = html;
    if (label) {
      L.DomUtil.create('label', null, row).innerHTML = label;
    }
  }

 
  
  useEffect(() => {
    if (!map  || !data || !lref || lref.current) 
      return;
    const _legend = [];
    if ( data )  {
      if (data.type === 'LandCoverPalette') {
        _legend = {
            name: data.label,
            layer: null,
            opacity: 1,
            elements: [{
              label: 'Tree-covered',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#42b05c',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Grassland',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#a0dc67',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Cropland',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#c67f5f',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Wetland',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#12AAB5',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Artificial area',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#5D7F99',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Bare land',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#f5d680',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Water body',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#67b7dc',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            ],
        }
      }
      else if (data.type === 'LandDegradationPalette') {
        _legend = {
            name: data.label,
            layer: null,
            opacity: 1,
            elements: [{
              label: 'Degradation (declining)',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#d43333',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Stable, unchanging (neutral)',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#fcdd90',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Improvement (improving)',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#398e3b',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            ],
        }
      }
      else if (data.type === 'LandSuitabilityPalette') {
        _legend = {
            name: data.label,
            layer: null,
            opacity: 1,
            elements: [
              {
                label: 'Suitable',
                html: '',
                style: {
                  'text-align': 'left',
                  'background-color': '#398e3b',
                  'width': '20px',
                  'height': '20px',
                  'position': 'relative',
                  'margin': '3.75px 0',
                },
              },
              {
                label: 'Marginally suitable',
                html: '',
                style: {
                  'text-align': 'left',
                  'background-color': '#fcdd90',
                  'width': '20px',
                  'height': '20px',
                  'position': 'relative',
                  'margin': '3.75px 0',
                },
              },
              {
                label: 'Unsuitable',
                html: '',
                style: {
                  'text-align': 'left',
                  'background-color': '#d43333',
                  'width': '20px',
                  'height': '20px',
                  'position': 'relative',
                  'margin': '3.75px 0',
                },
              },
            ],
        }
      }
      else if (data.type === 'FutureLandDegradationPalette') {
        _legend = {
            name: data.label,
            layer: null,
            opacity: 1,
            elements: [{
              label: 'E: No data on anticipated future changes',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#fcfcfc',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'D: No action needed',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#3a8e3b',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'C: Evaluate and monitor for possible future action',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#dfdb15',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'B: Reduce or revert degradation dynamics',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#efa14c',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'A: Avoid expected degradation of areas that were stable or improving',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#d43333',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            ],
        }
      }
      else if (data.type === 'LDNBalancePalette') {
        _legend = {
            name: data.label,
            layer: null,
            opacity: 1,
            elements: [{
              label: '4.Persistent',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#d43433',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: '3.Recent',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#fcdd90',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: '2.Improved',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#3a8e3b',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: '1.Not-changing',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#afafaf',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            ],
        }
      }
      else if (data.type === 'PastLDMaskedPalette') {
        _legend = {
            name: data.label,
            layer: null,
            opacity: 1,
            elements: [{
              label: '-1.Degradation',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#d43433',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: '0.Stable',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#fcdd90',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: '1.Improvement',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#3a8e3b',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'No Data',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#ffffff',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            ],
          }
      }
      else if (data.type === 'LULandDegradationPalette') {
        _legend = {
            name: data.label,
            layer: null,
            opacity: 1,
            elements: [{
              label: '0, No Data',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#eeeeee',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: '1,No New LD; Land Suitable: Neutral/stable',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#3a8e3b',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: '2, New LD not expected; Land marginally suitable: LU improvement advised',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#ed8f2e',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: '3,New LD! Land Not suitable: LU change required ',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#d43433',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            }
            ]
        }
      }
      else if (data.type === 'LMLandDegradationPalette') {
        _legend = {
            name: data.label,
            layer: null,
            opacity: 1,
            elements: [{
              label: '0, No Data',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#eeeeee',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: '1,No New LD; improved ES provision ',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#3a8e3b',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: '2,No New LD; LM improvement advised',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#ed8f2e',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: '3,New LD!; overall ES provision reduced, or SDG indicator negative: LM improvement required ',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#d43433',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            }
            ]
        }
      }
      else if (data.type === 'LandUsePalette') {
        _legend = {
            name: data.label,
            layer: null,
            opacity: 1,
            elements: [{
              label: 'Forest virgin or protected',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#267300',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Forestry with ag. activities',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#a7e39d',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Grasslands unmanaged or protected',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#e66000',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Grasslands with ag. activities',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#ffaa01',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Shrub cover unmanaged or protected',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#573a00',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Shrub cover with ag. activities',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#a87001',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Agricultural activities',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#df72ff',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Urban areas',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#343434',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Wetland',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#12AAB5',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Sparse areas unmanaged or protected',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#e7e600',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Sparse areas with ag. activities',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#feff73',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Bare areas unmanaged or protected',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#c7960d',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Bare areas with ag. activities',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#f5d680',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            {
              label: 'Water body',
              html: '',
              style: {
                'text-align': 'left',
                'background-color': '#67b7dc',
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            },
            ],
        }
      }
      else if (data.type === 'Custom') {
        const elements = data.legend.map(
          (item) => {
              let localColor = '#FFFFF';
            if (item.index === 0) {
              localColor = '#89E55B';
            } else if (item.index === 1) {
              localColor = '#007FFF';
            } else if (item.index === 2) {
              localColor = '#FFD12A';
            } else if (item.index === 3) {
              localColor = '#ED872D';
            } else if (item.index === 4) {
              localColor = '#A40000';
            } else if (item.index === 5) {
              localColor = '#614051';
            } else if (item.index === 6) {
              localColor = '#FC8EAC';
            } else if (item.index === 7) {
              localColor = '#DAA520';
            } else if (item.index === 8) {
              localColor = '#FFFFF0';
            } else if (item.index === 9) {
              localColor = '#00A86B';
            } else if (item.index === 10) {
              localColor = '#C3B091';
            } else if (item.index === 11) {
              localColor = '#C4C3D0';
            } else if (item.index === 12) {
              localColor = '#FFDB58';
            } else if (item.index === 13) {
              localColor = '#000080';
            } else if (item.index === 14) {
              localColor = '#808000';
            } else if (item.index === 15) {
              localColor = '#CB99C9';
            } else if (item.index === 16) {
              localColor = '#65000B';
            } else if (item.index === 17) {
              localColor = '#FF8C69';
            } else if (item.index === 18) {
              localColor = '#008080';
            } else if (item.index === 19) {
              localColor = '#5B92E5';
            } else if (item.index === 20) {
              localColor = '#8F00FF';
            } else if (item.index === 21) {
              localColor = '#F5DEB3';
            } else if (item.index === 22) {
              localColor = '#738678';
            } else if (item.index === 23) {
              localColor = '#FFFF00';
            } else if (item.index === 24) {
              localColor = '#00fff7';
            } else if (item.index === 25) {
              localColor = '#d8ff2a';
            } else if (item.index === 26) {
              localColor = '#ed602d';
            } else if (item.index === 27) {
              localColor = '#99a400';
            } else if (item.index === 28) {
              localColor = '#504061';
            } else if (item.index === 29) {
              localColor = 'rgb(252,142,172)';
            } else if (item.index === 30) {
              localColor = 'rgb(218,165,32)';
            } else if (item.index === 31) {
              localColor = 'rgb(255,255,240)';
            } else if (item.index === 32) {
              localColor = 'rgb(0,168,107)';
            } else if (item.index === 33) {
              localColor = 'rgb(195,176,145)';
            } else if (item.index === 34) {
              localColor = '#432f96';
            } else if (item.index === 35) {
              localColor = 'rgb(255,219,88)';
            } else if (item.index === 36) {
              localColor = '#80007a';
            } else if (item.index === 37) {
              localColor = 'rgb(128,128,0)';
            } else if (item.index === 38) {
              localColor = '#25463b';
            } else if (item.index === 39) {
              localColor = '#005665';
            } else if (item.index === 40) {
              localColor = '#9b69ff';
            } else if (item.index === 41) {
              localColor = 'rgb(0,128,128)';
            } else if (item.index === 42) {
              localColor = '#e55b99';
            } else if (item.index === 43) {
              localColor = 'rgb(0,255,89';
            } else if (item.index === 44) {
              localColor = '#b3f5d7';
            } else if (item.index === 45) {
              localColor = '#867f73';
            } else if (item.index === 46) {
              localColor = '#ff00cc';
            } else if (item.index === 47) {
              localColor = '#89e55b';
            } else if (item.index === 48) {
              localColor = 'rgb(0,119,255)';
            } else if (item.index === 49) {
              localColor = 'rgb(205,179,245)';
            } else if (item.index === 50) {
              localColor = '#868473';
            }
            const element = {
              label: item.label,
              html: '',
              style: {
                'text-align': 'left',
                'background-color': localColor,
                'width': '20px',
                'height': '20px',
                'position': 'relative',
                'margin': '3.75px 0',
              },
            }
            return element;
          }
        )
        const tmpLegend = {
          name: data.label,
          layer: null,
          opacity: 1,
          elements,
        }
        _legend = tmpLegend
      }
    }
    lref.current = L.control({position: position});
    lref.current.myleg = _legend
    lref.current.onAdd = function (map) {
      this._div = renderLegend(this.myleg); 
      return this._div;
    }  
    lref.current.addTo(map);  
  }, [map, lref]); // eslint-disable-line  
    
  return null  
}; 

export default MapLegend;