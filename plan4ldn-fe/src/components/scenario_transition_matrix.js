"use client"

import React, { useState, useEffect, useContext, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputNumber } from 'primereact/inputnumber';
import { FileUpload } from 'primereact/fileupload';
import { ToggleButton } from 'primereact/togglebutton';
import { Button } from 'primereact/button';
import { stringify } from 'wkt';
import { area, intersect, polygon, multiPolygon, bbox, featureCollection } from '@turf/turf';
import { uploadProjectFile, deleteFile, getGeoJsonPolygon } from '../services/files';
import { getProjectFocusAreasPolygons, getLandCoverClasses, editProject, DATAMODIFIED  } from '../services/projects';
import { getScenarios } from '../services/scenarios';
import { handleError } from '../utilities/errors';
import { Toast } from 'primereact/toast';
import { useTranslations } from 'next-intl';
import { UserContext } from '../context/user';
import { useRouter } from 'next/navigation'; 

const ScenarioTransitionMatrix = ({ inputScenario, onSave, projectId, isUpdating, canEdit, onCanSave }) => {
  const [expandedRows, setExpandedRows] = useState([]);
  const [scenarioStart, setScenarioStart] = useState(null);
  const [scenarioEnd, setScenarioEnd] = useState(null);
  const [scenario, setScenario] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [processionPolygonForId, setProcessionPolygonForId] = useState(-1);
  const [scenarioName, setScenarioName] = useState(null)
  const [onChecked, setOnChecked] = useState(false)
  const [canSave, setCanSave] = useState(false)
  const fileUploadRefs = useRef({});
  const t = useTranslations('default');
  const { currentProject, token } = useContext(UserContext);
  const toast = useRef();
  const router = useRouter();

  useEffect(() => {
    if (inputScenario !== undefined) {
      setScenarioName(inputScenario.scenarioName);
      setScenario(inputScenario.landTypes);
      setScenarioStart(inputScenario.scenarioPeriod.scenarioStart);
      setScenarioEnd(inputScenario.scenarioPeriod.scenarioEnd);
    }
  }, [inputScenario]);

  useEffect(() => {
    if (onCanSave) {
      onCanSave(canSave);
    }
  }, [canSave, onCanSave]);

  const format = (num, decimals) => num.toFixed(decimals).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')

  const onEditorValueChange = (rowData, value, landId, fileId = null) => {
    const row = scenario.find((item) => item.landId === landId);
    const endRow = scenario.find((item) => item.landId === rowData.landId);
    const rowBreakDown = row.breakDown.find((item) => item.landId === rowData.landId);  
    const fluent_breakDown = row.breakDownLimit.value + rowBreakDown.landCoverage.value;
    if (fluent_breakDown <= value) {
      rowBreakDown.landCoverage.value = fluent_breakDown;
      row.breakDownLimit.value = 0;
    } else {
      rowBreakDown.landCoverage.value = value;
      row.breakDownLimit.value = fluent_breakDown - value;
    }
    if (fileId !== null) {
      rowBreakDown.landCoverage.file_id = fileId;
    }
    // SUM
    let sumBaseline = 0;
    for ( let x1 = 0; x1 < scenario.length; x1 += 1 ) 
    {
      const item = scenario[x1];
      if (item.landId !== landId && item.breakDown ) {
        for ( let y1 = 0; y1 < item.breakDown.length; y1 += 1 ) 
          if (item.breakDown[y1].landId === landId)
              sumBaseline += item.breakDown[y1].landCoverage.value;
      }
    }
    row.endLandCoverage.value = row.breakDownLimit.value + sumBaseline;

    let sumEditline = 0;
    for ( let x2 = 0; x2 < scenario.length; x2 += 1 ) 
    {
      const item = scenario[x2];
      if (item.landId !== rowData.landId) {
        for ( let y2 = 0; y2 < item.breakDown.length; y2 += 1 )
          if (item.breakDown[y2].landId === rowData.landId)
            sumEditline += item.breakDown[y2].landCoverage.value
              
      }
    }
    endRow.endLandCoverage.value = endRow.breakDownLimit.value + sumEditline;

    if (!canSave) {
      setCanSave(true);
    }
    setOnChecked(false);
    setScenario([...scenario]);
  }

  const coverageEditor = (rowData, landId) => {
    const row = scenario.find((item) => item.landId === landId);
    const { value } = rowData.landCoverage;
    return <InputNumber
      value={rowData.landCoverage.value}
      onValueChange={(e) => onEditorValueChange(rowData, e.value, landId)}
      disabled={isUploading || processionPolygonForId === (`${landId}${rowData.landId}`)}
      min={0} 
      max={row.breakDownLimit.value + value} 
      showButtons
      suffix="ha"
    />
  };
  
  const getScenarioPolygons = async () => {
    const polygons = [];
    const response = await getScenarios(projectId, token);
    if ( response.ok && response.data && response.data.data ) 
    {
      let scenarios = response.data.data
    // polygons of other scenarios
      if ( scenarios )  
      {
        for ( let x = 0; x < scenarios.length; x += 1 ) 
        {
          const sc = scenarios[x];
          if ( sc.content && sc.content.landTypes ) 
          {
            for ( let y = 0; y < sc.content.landTypes.length; y += 1 ) 
            {
              const item = sc.content.landTypes[y];
              if (item.breakDown) {
                for ( let z = 0; z < item.breakDown.length; z += 1 ) 
                if (item.breakDown[z].landCoverage && item.breakDown[z].landCoverage.file_id) 
                {
                  const response = await getGeoJsonPolygon(currentProject.id, item.breakDown[z].landCoverage.file_id, token);
                  if ( response.ok ) 
                  {
                    const plg = response.data.data
                    if (plg)
                      polygons.push (
                        { id :item.breakDown[z].landCoverage.file_id,
                          name : plg.name,  
                          geojson: plg,
                        }
                      );
                  }   
                }
              }
            }
          }
        } 
      } 
    // polygons of current scenario
      for ( let x1 = 0; x1 < scenario.length; x1 += 1 )
      {
        const item = scenario[x1]; 
        if (item.breakDown) 
        {
          for ( let y1 = 0; y1 < item.breakDown.length; y1 += 1 )
          {
            const breakDownItem = item.breakDown[y1]; 
            if ( breakDownItem.landCoverage && breakDownItem.landCoverage.file_id ) 
            {
              const response =  await getGeoJsonPolygon( currentProject.id, breakDownItem.landCoverage.file_id, token);
              if ( response.ok && response.data && response.data.data ) 
              {
                const plg = response.data.data; 
                if (plg)
                  polygons.push (
                    { 
                      id : breakDownItem.landCoverage.file_id,
                      name : plg.name,  
                      geojson: plg,
                    }
                  );
              }
            }
          }
        }
      }
    } 
    return polygons;
  };

  const uploadFile = async (rowData, landTypeId, landType, files) => {
    setIsUploading(true);
    const formData = new FormData();
    let fileId = null;
    formData.append('file', files[0]);
    try {
      const response = await getProjectFocusAreasPolygons(projectId, token);
      const fa_polygons = [];
      if ( response.ok && response.data && response.data.data )
        fa_polygons = response.data.data;
      const cu_polygons  = await getScenarioPolygons();
        // const { data: prj } = await getProject( projectId, token);
      const uniqueButton = `${landTypeId}${rowData.landId}`;
      fileUploadRefs.current[uniqueButton]?.clear();
      setProcessionPolygonForId(uniqueButton);
      // validate geometry first feature
      // Add bbox, area to new geojson
      const isKO = false; 
      if ( files[0] ) {
        const readFilePromise = (path) => new Promise((resolve, reject) => {
          const readFile = new FileReader();
          readFile.onload = (event) =>  { 
            const contents = event.target.result;
            const geojson = JSON.parse(contents.replaceAll('/n',''));
            /// only first feature
            const feature = geojson.features[0];
            geojson.features = [feature];
            geojson.area = area(geojson) / 10000;   // hectares
            geojson.bbox = bbox(geojson);
            geojson.wkt = stringify(feature.geometry);
            geojson.contest = 'changeUse';
            resolve(JSON.stringify(geojson));
          };
          readFile.onerror = (error) => {
            reject(error);
          };
          readFile.readAsText(files[0]);
        });     
        await readFilePromise(files[0])
          .then( (result) => formData.append('newjson', result) )
          .catch( (error) => { toast.current.show({ severity: 'danger', summary:'Error!', detail: handleError(error) })} );
        if ( formData.get('newjson') ){
        /// verigy cu e fa polygons list , roi , and extract classes
            const new_plg = JSON.parse( formData.get('newjson').replaceAll('/n','') );
            const roi = currentProject.polygon;
            const polygons = fa_polygons.concat(cu_polygons);
            let hectares = 0;
            let overlaps = false;
            let plg = null;
        /// 1. is the polygon inside the ROI ?
        /// 2. Does the polygon overlap with other inserted polygons
            if ( new_plg.features )
            {
              for ( let p1 = 0; p1 < new_plg.features.length; p1 += 1 )
              {
                const item = new_plg.features[p1];
                if ( item.geometry && item.geometry.type === 'MultiPolygon' ) 
                  plg = multiPolygon( item.geometry.coordinates );
                else if ( item.geometry && item.geometry.type === 'Polygon' ) 
                  plg = polygon(item.geometry.coordinates);
                if ( roi.features ) 
                  for ( let p2 = 0; p2 < new_plg.features.length; p2 += 1 )
                  {
                    const feature = roi.features[p2];
                    let poly;
                    if (feature.geometry && feature.geometry.type === 'MultiPolygon') 
                      poly = multiPolygon(feature.geometry.coordinates);
                    else if (feature.geometry.type === 'Polygon') 
                      poly = polygon(feature.geometry.coordinates);
                    if ( poly !== null ) {
                      const intersection = intersect(featureCollection([plg, poly])); 
                      if ( intersection !== null )
                        hectares += (area (intersection) / 10000);
                    } 
                  }
                if ( polygons ) 
                  for ( let p3 = 0; p3 < new_plg.features.length; p3 += 1 )
                  {
                    const oplg = polygons[p3];
                    if ( oplg && oplg.geojson && oplg.geojson.features && 
                      ( oplg.geojson.contest !== 'changeUse' || oplg.geojson.from === landTypeId ) ) 
                    {
                      for ( let p4 = 0; p4 < new_plg.features.length; p4 += 1 )
                      {
                        const feature = oplg.geojson.features[p4];
                        if ( !overlaps )  {
                          let poly = null;
                          if (feature.geometry && feature.geometry.type === 'MultiPolygon') 
                            poly = multiPolygon(feature.geometry.coordinates);
                          else if (feature.geometry.type === 'Polygon') 
                            poly = polygon(feature.geometry.coordinates);
                          if ( poly !== null ) {
                            const intersection = intersect(featureCollection([plg, poly])); 
                            if ( intersection !== null ){
                              overlaps = true;
                            }  
                          }
                        }  
                      }
                    }
                  }
              }
            }
            if (hectares === 0) {
              toast.current.show({ severity: 'danger', summary:'Error!', detail: 'This polygon does not belong to the region of interest for this project.' })
            } else if (overlaps) {
              toast.current.show({ severity: 'danger', summary:'Error!', detail: 'This polygon overlaps other inserted polygons.' })
            } else {
              const uploadResponse = await uploadProjectFile(currentProject.id, formData, token);
              if ( uploadResponse && uploadResponse.ok && uploadResponse.data && uploadResponse.data.data ) 
              {
                const file = uploadResponse.data.data; 
                // verify hectares
                const  response  = await getLandCoverClasses( projectId, file.id, new_plg.area, token );
                if ( response.ok && response.data && response.data.data ) 
                {
                  new_plg.landUseClasses = response.data.data;
                  new_plg.from = landTypeId; 
                  new_plg.to = rowData.landId; 
                  formData.set('newjson',JSON.stringify(new_plg));
                  const row = scenario.find((item) => item.landId === landTypeId);
                  const { value } = rowData.landCoverage;
                  const max = row.breakDownLimit.value + value;
                  hectares = response.data.data[landTypeId]; 
                  if ( hectares === undefined || hectares === 0 ) {
                    const error = 'The polygon doesn\'t contains the class ' + landType; //eslint-disable-line 
                    toast.current.show({ severity: 'danger', summary:'Error!', detail: error })
                  }
                  else if ( hectares > max) {
                    toast.current.show({ severity: 'danger', summary:'Error!', detail: 'The hectares of this polygon are greater than the available area.' })
                  } 
                  else {
                    await deleteFile(currentProject.id, file.id, token);
                    const responseFile = await uploadProjectFile( currentProject.id, formData, token);
                    if ( responseFile && responseFile.ok && responseFile.data && responseFile.data.data ) 
                    {
                      const file = responseFile.data.data; 
                      onEditorValueChange({ ...rowData }, hectares, landTypeId, file.id);
                      console.log('editProject')
                      const prj = await editProject(currentProject.id, {
                        status : DATAMODIFIED,
                      },token);
                      await setUser({
                        currentProject: prj
                      });
                      console.log('changeUseAreas')
                      toast.current.show({ severity: 'success', summary: 'Done!', detail: 'Polygon has been applied to this transition.' })
                    }
                    else toast.current.show({ severity: 'danger', summary:'Error!', detail: 'Errors applying the polygon to this transaction'  })
                  }
                }
                else toast.current.show({ severity: 'danger', summary:'Error!', detail: 'Errors uploading the  file'  })
              }
            }
        } else {
            toast.current.show({ severity: 'danger', summary:'Error!', detail: 'Errors parsing the file'  })
        }
      } else {
        toast.current.show({ severity: 'danger', summary:'Error!', detail: 'Errors reading the file' })
      }
    } catch (error) {
      console.log(error)
      toast.current.show({ severity: 'danger', summary:'Error!', detail: handleError(error) })
    } finally {
      setProcessionPolygonForId(-1);
      setIsUploading(false);
    }
  }; 

  const requiredValidator = () => true;  
 
  const filterLandTypeBreakdown = (landType) => {
    console.log(landType)
    const data = [];
    // projectId
    if ( landType.breakDown )
    for ( let x = 0; x < landType.breakDown.length; x += 1  )
    {
      const from = landType.landId;
      const to = landType.breakDown[x].landId;
      let found = false;
      const transitions = currentProject.transition_impact_matrix_data;
      if ( transitions )
        for ( let x1 = 0; x1 < transitions.length; x1 += 1 )
          if ( transitions[x1].id === from ) 
            for ( let x2 = 0; x2 < transitions.length; x2 += 1 )
              if ( transitions[x1].row[x2].id === to && transitions[x1].row[x2].value !== 'x' ) 
                found = true;
      if ( found ) {   
        data.push(landType.breakDown[x]);
      }           
    }
    
    return data;
  }; 
  
  const uploadButton = (rowData, landTypeId, landType) => (
    <div className="flex justify-content-end">
      {rowData?.landCoverage?.file_id && (
        <Button
          icon='pi pi-check-circle'
          style={{ cursor: 'default' }}
          tooltip="A polygon has already been submitted for this land type."
          tooltipOptions={{ position: 'top' }}
          onClick={() => {}}
          className="mr-2"
          severity="success"
        />
      )}
      {!rowData?.landCoverage?.file_id && (
        <FileUpload
          ref={(ref) => { fileUploadRefs.current[`${landTypeId}${rowData.landId}`] = ref; }}
          disabled={!canEdit || isUploading || processionPolygonForId === (`${landTypeId}${rowData.landId}`)}
          accept=".geojson"
          chooseLabel=''
          chooseOptions={{
            label: (processionPolygonForId === (`${landTypeId}${rowData.landId}`))
              ? t('PROCESSING_POLYGON')
              : '',
            icon: (processionPolygonForId === (`${landTypeId}${rowData.landId}`)) ? 'pi pi-spin pi-spinner' : 'pi pi-upload',
          }}
          icon="pi pi-upload"
          mode="basic"
          multiple={false}
          customUpload
          auto
          uploadHandler={(event) => uploadFile(rowData, landTypeId, landType, event.files)}
        />
      )}
    </div>
  );

  const rowExpansionTemplate = (landType) => (
    <div className="orders-subtable datatable-editing-demo">
      <DataTable
        value={filterLandTypeBreakdown(landType)}
        className="editable-cells-table"
        rowHover
      >
        <Column
          field="landType"
          header={t('BECOMES')}
        />
        <Column
          field="landCoverage"
          header=""
          style={{ textAlign: 'right' }}
          body={startCoverageHeader}
          editorValidatorEvent="blur"
          editor={(rowData) => coverageEditor(rowData, landType.landId)} 
          editorValidator={(rowData) => requiredValidator(rowData)}
        />
        <Column
          field="upload"
          header=""
          body={(row) => uploadButton(row, landType.landId, landType.landType)}
        /> 
      </DataTable>
    </div>
  );

  const saveStatus = (e) => {
    if (!canEdit) return;
    onSave(
      { ...inputScenario, landTypes: scenario }
    );
    setOnChecked(e);
    setCanSave(false);
  }

  const scenarioTableHeader = (
    <div className="grid">
      <div className="col-6">
        <h4 className="m-3">{scenarioName}</h4>
      </div>
      <div className="col-6 flex flex-row-reverse">
        <ToggleButton
          offIcon='pi pi-chevron-right'
          onIcon='pi pi-chevron-down'
          offLabel={t('COLLAPSE')}
          onLabel={t('EXPAND')}
          checked={isCollapsed}
          onChange={(e) => { setIsCollapsed(e.value); setExpandedRows([]); } }
          className="ml-2"
        />
        {canEdit && (
          <Button
            label={(!canSave && t('SAVED')) || (canSave && t('SAVE_CHANGES'))}
            icon={ (!canSave && 'pi pi-check') || (canSave && 'pi pi-save')}
            className="mr-2"
            disabled={!canSave}
            onClick={(e) => saveStatus(e.value)} />
        )}
      </div>
    </div>
  );

  const startCoverageHeader = (landType) => {
    const startingCoverage = `${format(landType.landCoverage.value, 2)} ${landType.landCoverage.unit}`;
    return startingCoverage;
  }

  const endCoverageHeader = (landType) => {
    const endCoverage = `${format(landType.endLandCoverage.value, 2)} ${landType.landCoverage.unit}`;
    return endCoverage;
  }

  return (
    <div>
      <Toast ref={toast} position="top-right" />
      
      <div className="scenario-transition-matrix">
        {scenario && (
          <DataTable
            loading={isUpdating}
            value={scenario}
            expandedRows={expandedRows}
            className="stm-parent-dt"
            dataKey="landId"
            onRowToggle={(e) => setExpandedRows(e.data)}
            header={scenarioTableHeader}
            rowExpansionTemplate={rowExpansionTemplate}
            rowHover
          >
            {!isCollapsed && (<Column expander headerStyle={{ width: '3rem' }} />)}
            {!isCollapsed && (<Column field="landType" header="Land Type" />)}
            {!isCollapsed && (<Column style={{ textAlign: 'left' }} field="landCoverage" header={scenarioStart} body={startCoverageHeader} />)}
            {!isCollapsed && (<Column style={{ textAlign: 'left' }} field="landCoverage" header={scenarioEnd} body={endCoverageHeader} />)}
          </DataTable>
        )}
      </div>
    </div>
  );
}

export async function getStaticProps(context) {
  return {
    props: { 
      messages: (await import(`../translations/${context.locale}.json`)).default
     },
  }
}

export default ScenarioTransitionMatrix;
