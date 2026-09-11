import React, { useEffect } from 'react';
import * as am4core from '@amcharts/amcharts4/core';
import * as am4maps from '@amcharts/amcharts4/maps';
import am4geodata_worldHigh from '@amcharts/amcharts4-geodata/worldHigh';
import am4geodata_data_countries2 from '@amcharts/amcharts4-geodata/data/countries2';

import CountryCodes from '../data/country-codes';

const CountrySelector = ({ setCountry }) => {
  useEffect(() => {
    let selectedCOUNTRYid;
    let selectedAREAid;

    // Create map instance
    const chart = am4core.create('country-selector', am4maps.MapChart);
    chart.projection = new am4maps.projections.Miller();

    chart.seriesContainer.events.disableType('doublehit');
    chart.chartContainer.background.events.disableType('doublehit');

    // Create map polygon series for world map
    const worldSeries = chart.series.push(new am4maps.MapPolygonSeries());
    worldSeries.useGeodata = true;
    worldSeries.geodata = am4geodata_worldHigh;
    worldSeries.exclude = ['AQ'];

    const worldPolygon = worldSeries.mapPolygons.template;
    worldPolygon.tooltipText = '{name}';
    worldPolygon.nonScalingStroke = true;
    worldPolygon.strokeOpacity = 0.5;
    worldPolygon.fill = am4core.color('#666666');

    const hs = worldPolygon.states.create('hover');
    hs.properties.fill = am4core.color('#6b9ed6');

    // Create active state
    const activeWState = worldPolygon.states.create('active');
    activeWState.properties.fill = am4core.color('#5ccaa7');

    // Create country specific series (but hide it for now)
    const countrySeries = chart.series.push(new am4maps.MapPolygonSeries());
    countrySeries.useGeodata = true;
    countrySeries.hide();
    countrySeries.geodataSource.events.on('done', (_ev) => {
      worldSeries.hide();
      countrySeries.show();
    });

    const countryPolygon = countrySeries.mapPolygons.template;
    countryPolygon.tooltipText = '{name}';
    countryPolygon.nonScalingStroke = true;
    countryPolygon.strokeOpacity = 0.5;
    countryPolygon.fill = am4core.color('#666666');

    // Create active state
    const activeState = countryPolygon.states.create('active');
    activeState.properties.fill = am4core.color('#5ccaa7');

    // Set up click events
    worldPolygon.events.on('hit', (ev) => {
      if (selectedCOUNTRYid) {
        selectedCOUNTRYid.isActive = false;
      }
      selectedCOUNTRYid = ev.target;
      selectedCOUNTRYid.isActive = true;

      const cid2 = ev.target.dataItem.dataContext.id;

      let cid3 = '';

      for (let j = 0; j < CountryCodes.length; j += 1) {
        if (CountryCodes[j].iso2 === cid2) {
          cid3 = CountryCodes[j].iso3;
        }
      }

      let north; let south; let west; let
        east;
      const country = worldSeries.getPolygonById(cid2);

      if (north === undefined || (country.north > north)) {
        north = country.north;
      }
      if (south === undefined || (country.south < south)) {
        south = country.south;
      }
      if (west === undefined || (country.west < west)) {
        west = country.west;
      }
      if (east === undefined || (country.east > east)) {
        east = country.east;
      }

      // Pre-zoom
      ev.target.series.chart.zoomToRectangle(north, east, south, west, 1, true);
      //  ev.target.series.chart.zoomToMapObject(ev.target);

      if ((cid3 === 'USA') || (cid3 === 'CAN') || (cid3 === 'BRA') || (cid3 === 'ARG') ||
        (cid3 === 'CHL') || (cid3 === 'AUS') || (cid3 === 'CHN') || (cid3 === 'RUS')) {
        const { map } = ev.target.dataItem.dataContext;
        if (map) {
          ev.target.isHover = false; // eslint-disable-line
          countrySeries.geodataSource.url = `https://www.amcharts.com/lib/4/geodata/json/${map}.json`;
          countrySeries.geodataSource.load();
        }
      } else {
        setCountry(cid3);
      }
    });

    countryPolygon.events.on('hit', (ev) => {
      if (selectedAREAid) {
        selectedAREAid.isActive = false;
      }
      selectedAREAid = ev.target;
      selectedAREAid.isActive = true;

      const aid = ev.target.dataItem.dataContext.id;

      setCountry(aid);
    });

    // Set up data for countries
    const data = [];
    for (const id in am4geodata_data_countries2) {
      if (Object.prototype.hasOwnProperty.call(am4geodata_data_countries2, id)) {
        const country = am4geodata_data_countries2[id];

        if (country.maps.length) {
          data.push({
            id,
            map: country.maps[0],
          });
        }
      }
    }
    worldSeries.data = data;

    // Zoom control
    chart.zoomControl = new am4maps.ZoomControl();

    const homeButton = new am4core.Button();
    homeButton.events.on('hit', () => {
      worldSeries.show();
      countrySeries.hide();
      chart.goHome();
    });

    homeButton.icon = new am4core.Sprite();
    homeButton.padding(7, 5, 7, 5);
    homeButton.width = 30;
    homeButton.icon.path = 'M16,8 L14,8 L14,16 L10,16 L10,10 L6,10 L6,16 L2,16 L2,8 L0,8 L8,0 L16,8 Z M16,8';
    homeButton.marginBottom = 10;
    homeButton.parent = chart.zoomControl;
    homeButton.insertBefore(chart.zoomControl.plusButton);

    // Enable small map
    chart.smallMap = new am4maps.SmallMap();
    chart.smallMap.series.push(worldSeries);

    chart.smallMap.rectangle.stroke = am4core.color('#5583C4');
    chart.smallMap.rectangle.strokeWidth = 2;

    chart.smallMap.background.stroke = am4core.color('#666666');
    chart.smallMap.background.strokeOpacity = 0.9;
    chart.smallMap.background.strokeWidth = 1;

    // chart.smallMap.background.fillOpacity = 0.9;

    chart.smallMap.align = 'left';
    chart.smallMap.valign = 'top';

    const smallSeries = chart.smallMap.series.getIndex(0);
    smallSeries.mapPolygons.template.stroke = smallSeries.mapPolygons.template.fill;
    smallSeries.mapPolygons.template.strokeWidth = 1;
  }, [setCountry]);

  return <div id="country-selector" style={{ height: '600px' }} />;
};

export default CountrySelector;
