"use client"

import React, { useEffect, useRef } from 'react';
import * as am4core from '@amcharts/amcharts4/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';

import { buildInitialSpiderGraphData } from '../FocusAreaQuestionnaire';
import questions from '../FocusAreaQuestionnaire/data';

const ComputedEvaluationSpiderGraph = ({ domId = 'spider-graph', evaluation }) => {
  const chart = useRef();

  useEffect(() => {
    buildGraph();
    return () => chart.current?.dispose();
  }, [evaluation]); // eslint-disable-line

  const buildGraph = () => {
    // Themes begin
    am4core.useTheme(am4themes_animated);
    // Themes end

    /* Create chart instance */
    chart.current = am4core.create(domId, am4charts.RadarChart);

    const data = buildInitialSpiderGraphData(questions, evaluation);
    if (data !== undefined) {
      chart.current.data = data;
    }

    chart.current.legend = new am4charts.Legend();

    /* Create axes */
    const categoryAxis = chart.current.xAxes.push(new am4charts.CategoryAxis());
    categoryAxis.dataFields.category = 'criteria';

    const valueAxis = chart.current.yAxes.push(new am4charts.ValueAxis());
    valueAxis.renderer.axisFills.template.fill = chart.current.colors.getIndex(2);
    valueAxis.renderer.axisFills.template.fillOpacity = 0.05;

    /* Create and configure series */
    const series1 = chart.current.series.push(new am4charts.RadarSeries());
    series1.dataFields.valueY = 'slm1';
    series1.dataFields.categoryX = 'criteria';
    series1.name = 'LM Sustainability Assessment';
    series1.strokeWidth = 2;
    series1.stroke = am4core.color('#46a084');
    series1.fill = am4core.color('#46a084');

    const series2 = chart.current.series.push(new am4charts.RadarSeries());
    series2.dataFields.valueY = 'slm2';
    series2.dataFields.categoryX = 'criteria';
    series2.name = 'Zero Line (neither improve nor degrade)';
    series2.strokeWidth = 2;
    series2.stroke = am4core.color('#fcdd90');
    series2.fill = am4core.color('#fcdd90');

    chart.current.legend.itemContainers.template.paddingTop = 30;
  }

  const styles = {
    width: '100%',
    maxWidth: '600px',
    height: '500px',
    maxHeight: '60vh',
  };

  return (
    <div id={domId} style={styles} />
  );

}

export default ComputedEvaluationSpiderGraph;
