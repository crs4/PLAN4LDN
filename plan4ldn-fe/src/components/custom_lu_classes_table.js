"use client"

import React, { useRef, useContext } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import { FileUpload } from 'primereact/fileupload';
import { Toast } from 'primereact/toast';
import { useTranslations } from 'next-intl';
import { intersect, bboxPolygon, featureCollection } from '@turf/turf';
import { uploadProjectFile } from '../services/files';
import { handleError } from '../utilities/errors';
import { UserContext } from '../context/user';

const ParseGeoraster = require ('georaster');

const CustomLuClassesTable = ({
  data,
  onDeleteItem,
  onUpdateItem,
  projectId = null,
  className,
  roi,
}) => {
  const t = useTranslations('default');
  const toast = useRef(null);
  const { token, currentProject } = useContext(UserContext);

  const onDelete = (e, item) => {
    e.preventDefault();
    onDeleteItem(item);
  };

  const updateName = (e, entry) => {
    e.preventDefault();
    entry.key = e.target.value;                     
    onUpdateItem(entry);
  };

  const uploadFile = async (e, files) => {
    // eslint-disable-next-line
    const formData = new FormData();
    formData.append('file', files[0]);
    let geoTiff = null;
    try {
      if ( files[0] ) {
        const readFilePromise = (path) => new Promise((resolve, reject) => {
          const readFile = new FileReader();
          readFile.onload = (event) =>  { 
            ParseGeoraster(event.target.result).then((georaster) => {
              geoTiff = georaster;
              resolve(georaster);
            });
          }
          readFile.onerror = (error) => {
            reject(error);
          };
          readFile.readAsArrayBuffer(files[0]);
        })
        await readFilePromise(files[0]);
        let wrong = false;
        if ( roi && roi.bbox && geoTiff && geoTiff.width && geoTiff.height && geoTiff.projection === 4326 && 
             geoTiff.xmin && geoTiff.ymin && geoTiff.xmax && geoTiff.ymax )
        {   
          const tiffbbox = bboxPolygon([geoTiff.xmin,geoTiff.ymin,geoTiff.xmax,geoTiff.ymax]);
          const roibbox = bboxPolygon(roi.bbox);
          const intersection = intersect(featureCollection([tiffbbox, roibbox])); 
          if ( intersection !== null )
          {  
            /// values [-1,1,0,-32768]  int16  only one band
            let pixel; 
            for ( let i = 0; i < geoTiff.height  ; i+=1 ){ 
              for ( let j = 0; j < geoTiff.width  ; j+=1 ){ 
                pixel = geoTiff.values[0][i][j] ;
                if ( pixel !== -32768 && ( pixel < 0 || pixel > 3 ) ){
                  wrong = true;
                  break;   
                }
              }
              if ( wrong ) break;  
            }
          }
          else wrong = true;
        }    
        if ( !wrong ) { 
          const { data: res } = await uploadProjectFile(projectId, formData, token);
          if ( res && res.data ) {
            const _entry = { key: e.key, value: e.value, file_id: res.data.id }
            onUpdateItem(_entry);
            toast.current.show({severity:'success', summary: 'Done', detail:'Your file has been uploaded.', life: 3000});
          }
          else toast.current.show({severity:'error', summary: 'Errors', detail:'Errors uploading file.', life: 3000});
        }
        else toast.current.show({severity:'error', summary: 'Error', detail:'wrong data in the geotiff !!!', life: 3000});
      }
      else toast.current.show({severity:'error', summary: 'Error', detail:'wrong file!', life: 3000}); 
    } catch (error) {
      toast.current.show({severity:'error', summary: 'Error', detail:handleError(e), life: 3000});
    }
  };

  const headerTemplate = (body) => (
    <div className="flex align-items-center">
      <span>{body}</span>
    </div>
  );

  const nameTemplate = (entry) => (
    <div className="fluid align-items-center">
      <div className="field">
        <label htmlFor="key">{t('NAME')}</label>
          <InputText
            id={String(entry.value)}
            value={entry.key}    
            onChange={(e) => updateName( e, entry )}
          />
      </div>
    </div>
  );

  return (
    <>
      <Toast ref={toast} position="top-right" /> 
      <DataTable
        emptyMessage={t('NO_ENTRIES')}
        value={data}
        className={className}
        header={headerTemplate(t('CUSTOM_LU_CLASSES'))}
      >
        <Column header={t('NAME')} field={nameTemplate} />
        <Column header={t('VALUE')} field="value" />
        <Column
          body={(e) => (
            <div className="text-right">
              {e.file_id
                ? (
                  <Button
                    label={t('HAS_SUITABILITY_MAP')}
                    className="mr-2"
                    severity="secondary"
                    disabled
                    icon="pi pi-check"
                  />
                ) : (
                  <FileUpload
                    accept=".geotiff,.geotif,.tiff,.tif"
                    chooseLabel={t('UPLOAD_LAND_SUITABILITY_MAP')}
                    className="mr-2 inline-block"
                    mode="basic"
                    multiple={false}
                    customUpload
                    auto
                    uploadHandler={(event) => uploadFile(e, event.files)}
                  />
                )}
              <Button
                icon="pi pi-trash"
                type="button"
                severity="danger"
                onClick={(event) => onDelete(event, e)}
              />
            </div>
          )}
        />
      </DataTable>
    </>
  );
};

export async function getStaticProps(context) {
  return {
    props: { 
      messages: (await import(`../translations/${context.locale}.json`)).default
     },
  }
}

export default CustomLuClassesTable;
