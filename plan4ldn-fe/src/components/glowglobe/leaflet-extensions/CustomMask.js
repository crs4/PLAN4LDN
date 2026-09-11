"use client"

/* eslint-disable */
import L from 'leaflet';

// credits: https://github.com/turban/Leaflet.Mask
L.Mask = L.Polygon.extend({
  options: {
    stroke: false,
    color: '#333',
    fillOpacity: 0.5,
    clickable: true,

    outerBounds: new L.LatLngBounds([-90, -360], [90, 360]),
  },

  initialize(latLngs, options) {
    const outerBoundsLatLngs = [
      this.options.outerBounds.getSouthWest(),
      this.options.outerBounds.getNorthWest(),
      this.options.outerBounds.getNorthEast(),
      this.options.outerBounds.getSouthEast(),
    ];
    L.Polygon.prototype.initialize.call(this, [outerBoundsLatLngs, latLngs], options);
  },

});
L.mask = (latLngs, options) => new L.Mask(latLngs, options);
