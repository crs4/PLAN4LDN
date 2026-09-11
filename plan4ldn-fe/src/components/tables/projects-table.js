import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  DRAFT,
  PREPROCESSING,
  PROJECT_OWNER,
  PROJECT_USER,
  PUBLISHED,
  DATAMODIFIED,
  REPROCESSING,
} from '../../services/projects';

const ProjectsTable = ({
  title,
  projects,
  inviteToProject,
  editProject,
  loadProject,
  className,
  deleteProject,
}) => {

  const  t  = useTranslations('default');
  const [filter, setFilter] = useState('');
  const [isDeleting, setIsDeleting] = useState(null);

  const tryToDelete = async (projectId) => {
    setIsDeleting(projectId);
    try {
      await deleteProject(projectId);
    } finally {
      setIsDeleting(null);
    }
  };

  const tableHeader = (
    <div className="flex flex-row justify-content-between align-items-center">
      <h4 className="my-0 text-capitalize">{title}</h4>
      <span>
        <i className="pi pi-search" />
        <InputText
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="mr-2"
          placeholder={t('SEARCH')}
        />
      </span>
    </div>
  );

  const titleTemplate = (rowData) => (
    <>
      <div className="flex justify-content-start align-items-center">
        {(rowData.role === PROJECT_OWNER && rowData.status === DRAFT) && (
          <Button
            icon="pi pi-pencil"
            className="mr-2"
            aria-label="Project Status"
            onClick={() => editProject(rowData.id)}
            rounded outlined 
          />
        )}
        <div>{rowData.title}</div>
      </div>
    </>
  );

  const actionsTemplate = (rowData) => (
    <div className="flex">
      {rowData.role === PROJECT_OWNER && rowData.status === DRAFT && (
        <Button
          icon="pi pi-cog"
          className="mr-2 mb-2"
          onClick={() => loadProject(rowData)}
          style={{ width: '160px' }}
          label={t('CONTINUE_SETUP')}
        />
      )}
      {rowData.role === PROJECT_OWNER && rowData.status === PREPROCESSING && (
        <Button
          icon="pi pi-cog"
          disabled
          className="mr-2 mb-2"
          severity="secondary"
          onClick={() => {}}
          label={t('PREPROCESSING')}
        />
      )}
      {rowData.role === PROJECT_OWNER && rowData.status === REPROCESSING && (
        <Button
          icon="pi pi-cog"
          disabled
          className="mr-2 mb-2"
          severity="secondary"
          onClick={() => {}}
          label={t('REPROCESSING')}
        />
      )}
      {rowData.role === PROJECT_USER &&
        ( rowData.status === DRAFT || rowData.status === PREPROCESSING ) && (
          <span>{t('PROJECT_UNDER_PREPARATION')}</span>
      )}
      {(rowData.role === PROJECT_USER && rowData.status === REPROCESSING ) && (
          <span>{t('PROJECT_UNDER_ELABORATION')}</span>
      )}
      { (rowData.status === PUBLISHED || rowData.status === DATAMODIFIED) && (
        <Button
          icon="pi pi-folder-open"
          className="mr-2 mb-2"
          onClick={() => loadProject(rowData)}
          style={{ width: '160px' }}
          label={t('LOAD_PROJECT')}
        />
      )}
      {rowData.role === PROJECT_OWNER && (
        <>
          <Button
            icon="pi pi-user-plus"
            onClick={() => inviteToProject(rowData.id)}
            severity="secondary" 
            className="mr-2 mb-2"
            tooltip={t('INVITE_MEMBERS_TO_PROJECT')}
            tooltipOptions={{ position: 'top' }}
            label=""
          />
          <Button
            icon="pi pi-times"
            className="mb-2 mr-2"
            severity="danger" 
            label=""
            loading={isDeleting === rowData.id}
            disabled={isDeleting === rowData.id}
            tooltip={t('DELETE_PROJECT')}
            tooltipOptions={{ position: 'top' }}
            onClick={() => tryToDelete(rowData.id)}
          />
        </>
      )}
    </div>
  );

  return (
    <DataTable
      header={tableHeader}
      globalFilter={filter}
      paginator
      rows={10}
      rowsPerPageOptions={[10, 20, 50]}
      totalRecords={projects.length}
      emptyMessage={t('NO_PROJECTS_FOUND')}
      value={projects}
      className={className}
    >
      <Column header={t('PROJECT_TITLE')} sortable body={titleTemplate} />
      <Column field="acronym" header={t('PROJECT_ACRONYM')} sortable />
      <Column field="description" header={t('PROJECT_DESCRIPTION')} sortable />
      <Column header={t('ACTIONS')} body={actionsTemplate} />
    </DataTable>
  );
};

export async function getStaticProps(context) {
  return {
    props: { 
      messages: (await import(`../../translations/${context.locale}.json`)).default
     },
  }
}

export default ProjectsTable;
