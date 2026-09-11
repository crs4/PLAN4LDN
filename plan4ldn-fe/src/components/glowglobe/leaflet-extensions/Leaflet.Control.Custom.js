"use client"

/* eslint-disable */
import L from 'leaflet';

const load = (_window, _document) => {
  L.Control.Custom = L.Control.extend({
    version: '1.0.1',
    options: {
      position: 'topright',
      id: '',
      title: '',
      classes: '',
      content: '',
      style: {},
      datas: {},
      events: {},
    },
    container: null,
    onAdd(_map) {
      this.container = L.DomUtil.create('div');
      this.container.id = this.options.id;
      this.container.title = this.options.title;
      this.container.className = this.options.classes;
      this.container.innerHTML = this.options.content;

      for (const option in this.options.style) {
        if (option) {
          this.container.style[option] = this.options.style[option];
        }
      }

      for (const data in this.options.datas) {
        if (data) {
          this.container.dataset[data] = this.options.datas[data];
        }
      }

      /* Prevent click events propagation to map */
      L.DomEvent.disableClickPropagation(this.container);

      /* Prevent right click event propagation to map */
      L.DomEvent.on(this.container, 'contextmenu', (ev) => {
        L.DomEvent.stopPropagation(ev);
      });

      /* Prevent scroll events propagation to map when cursor on the div */
      L.DomEvent.disableScrollPropagation(this.container);

      for (const event in this.options.events) {
        if (event) {
          L.DomEvent.on(this.container, event, this.options.events[event], this.container);
        }
      }

      return this.container;
    },

    onRemove(_map) {
      for (const event in this.options.events) {
        if (event) {
          L.DomEvent.off(this.container, event, this.options.events[event], this.container);
        }
      }
    },
  });

  L.control.custom = (options) => new L.Control.Custom(options);
};

load(window, document);
