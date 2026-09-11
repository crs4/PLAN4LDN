import React from 'react';
import { useTranslations } from 'next-intl';
import Input from './Input';
import TextArea from './TextArea';

const ProjectDetails = ({ project, register, errors }) => {
  const t = useTranslations('default');

  return (
    <>
      <Input class="mt-3 mb-3" value={project?.title} register={register} errors={errors} required name="title" label={t('PROJECT_TITLE')} />
      <Input class="mt-3 mb-3" value={project?.acronym} register={register} errors={errors} required name="acronym" label={`${t('PROJECT_ACRONYM')} (max 50 characters)`} />
      <TextArea class="mt-3 mb-3" value={project?.description} rows={5} cols={30} register={register} errors={errors} name="description" label={t('PROJECT_DESCRIPTION')} />
    </>
  );
};

export default ProjectDetails;
