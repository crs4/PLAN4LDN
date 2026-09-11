import { createControlComponent } from "@react-leaflet/core";
import * as L from "leaflet";
import "@geoman-io/leaflet-geoman-free";

const Geoman = L.Control.extend({
  options: {
    position: 'topleft',
    drawMarker: true,
    drawCircleMarker: false,
    drawPolyline: false,
    drawRectangle: true,
    drawPolygon: false,
    drawCircle: false,
    editMode: false,
    dragMode: false,
    cutPolygon: false,
    removalMode: false,
    rotateMode: false,
    oneBlock: true,
  },

  /*initialize(options) {
    L.setOptions(this, options);
  },*/

  addTo(map) {
    if (!map.pm) return;
    map.pm.addControls({
      ...this.options,
    });
    /*
    const actions = [
      'cancel',
      {
        text: 'Administration Level 1',
        onClick: () => {
          //setAdminLevel(1);
          /*if (output) {
            const tmpData = data;
            tmpData.administrative_level = 1
            output(tmpData)
            setData(tmpData)
          }
          
          const classes = map.pm.Toolbar.getButtons().AdministrationLevelSelector.buttonsDomNode.firstChild.firstChild.className.split(' ');
          const filteredClasses = classes.filter(
            (item) => !item.startsWith('admin-level')
          )
          filteredClasses.push('admin-level-1');
          map.pm.Toolbar.getButtons().AdministrationLevelSelector.buttonsDomNode.firstChild.firstChild.className = filteredClasses.join(' ');
        },
      },
      {
        text: 'Administration Level 2',
        onClick: () => {
          /*setAdminLevel(2);
          if (output) {
            const tmpData = data;
            tmpData.administrative_level = 2
            output(tmpData)
            setData(tmpData)
          }
          const classes = map.pm.Toolbar.getButtons().AdministrationLevelSelector.buttonsDomNode.firstChild.firstChild.className.split(' ');
          const filteredClasses = classes.filter(
            (item) => !item.startsWith('admin-level')
          )
          filteredClasses.push('admin-level-2');
          map.pm.Toolbar.getButtons().AdministrationLevelSelector.buttonsDomNode.firstChild.firstChild.className = filteredClasses.join(' ');
        },
      },
    ];
    const toolbarOptions = {
      name: 'AdministrationLevelSelector',
      block: 'draw',
      title: 'Admin Level Selector',
      toggle: true,
      className: 'admin-level-1',
      actions,
    };*/
    map.pm.setGlobalOptions({ snappable: false });
    //map.pm.Toolbar.createCustomControl(toolbarOptions);
  },

});

const createGeomanInstance = (props) => {
  console.log(props)
  return new Geoman(props);
};

export const GeomanControl = createControlComponent(createGeomanInstance);