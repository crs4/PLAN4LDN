"use client"

import React, { useEffect, useRef } from 'react';
import * as am4core from '@amcharts/amcharts4/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';

const CurvedGraph = ({ data }) => {
  const chart = useRef();

  useEffect(() => {
    buildGraph();
    return () => chart.current?.dispose();
  }, [data]); // eslint-disable-line

  const buildGraph = () => {
    // Themes begin
    am4core.useTheme(am4themes_animated);

    /* Create chart instance */
    chart.current = am4core.create('curved-graph', am4charts.XYChart);
    chart.current.hiddenState.properties.opacity = 0;

    chart.current.data = data;

    const categoryAxis = chart.current.xAxes.push(new am4charts.CategoryAxis());
    categoryAxis.renderer.grid.template.location = 0;
    categoryAxis.dataFields.category = 'indicator';
    categoryAxis.renderer.minGridDistance = 40;

    const valueAxis = chart.current.yAxes.push(new am4charts.ValueAxis());
    const series = chart.current.series.push(new am4charts.CurvedColumnSeries());

    series.dataFields.categoryX = 'indicator';
    series.dataFields.valueY = 'value';
    series.clustered = false;
    series.columns.template.strokeOpacity = 0;
    series.dataItems.template.adapter.add('width', (_width, _target) => am4core.percent(50));

    series.columns.template.adapter.add('fill', (_fill, target) => {
      if (chart.current.data[target.dataItem.index].value > 0) {
        return am4core.color('#398e3b');
      }
      return am4core.color('#d43333');
    });

    chart.current.events.on('ready', (_ev) => {
      valueAxis.min = -3;
      valueAxis.max = 3;
    });
  }

  const styles = {
    width: '100%',
    maxWidth: '600px',
    height: '500px',
    maxHeight: '60vh',
  };

  return (
    <div id="curved-graph" style={styles} />
  );

}

export default CurvedGraph;
