"use client"

import React, { useEffect } from 'react';
import * as am4core from '@amcharts/amcharts4/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';

const LandDegradationWaterfall = ({ data }) => {
  const waterfallChart = () => {
    am4core.useTheme(am4themes_animated);

    const chart = am4core.create('land-degradation-waterfall', am4charts.XYChart);
    chart.hiddenState.properties.opacity = 0; // this makes initial fade in effect
    chart.data = data;
    chart.exporting.menu = new am4core.ExportMenu();

    const categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
    categoryAxis.dataFields.category = 'category';
    categoryAxis.renderer.minGridDistance = 40;

    chart.yAxes.push(new am4charts.ValueAxis());

    const columnSeries = chart.series.push(new am4charts.ColumnSeries());
    columnSeries.dataFields.categoryX = 'category';
    columnSeries.dataFields.valueY = 'value';
    columnSeries.dataFields.openValueY = 'open';
    columnSeries.fillOpacity = 0.8;
    columnSeries.sequencedInterpolation = true;
    columnSeries.interpolationDuration = 1500;

    const columnTemplate = columnSeries.columns.template;
    columnTemplate.strokeOpacity = 0;
    columnTemplate.propertyFields.fill = 'color';

    const label = columnTemplate.createChild(am4core.Label);
    label.text = '{displayValue.formatNumber(\'#,###.00\')} ha';
    label.align = 'center';
    label.valign = 'middle';

    const stepSeries = chart.series.push(new am4charts.StepLineSeries());
    stepSeries.dataFields.categoryX = 'category';
    stepSeries.dataFields.valueY = 'stepValue';
    stepSeries.noRisers = true;
    stepSeries.stroke = new am4core.InterfaceColorSet().getFor('alternativeBackground');
    stepSeries.strokeDasharray = '3,3';
    stepSeries.interpolationDuration = 2000;
    stepSeries.sequencedInterpolation = true;

    // because column width is 80%, we modify start/end locations so that step would start with column and end with next column
    stepSeries.startLocation = 0.1;
    stepSeries.endLocation = 1.1;

    chart.cursor = new am4charts.XYCursor();
    chart.cursor.behavior = 'none';
  }

  useEffect(() => {
    waterfallChart()
  }, [data]); // eslint-disable-line

  return (
    <div style={{ width: '100%', maxWidth: '900px', height: '500px' }} id="land-degradation-waterfall" />
  );
};

export default LandDegradationWaterfall;
