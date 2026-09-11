"use client"
import { AutoComplete } from 'primereact/autocomplete';
import { Button } from 'primereact/button';
import { Skeleton } from 'primereact/skeleton';
import { Chip } from 'primereact/chip';
import { Dialog } from 'primereact/dialog';
import { useContext, useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { inviteUsers, getProject } from '../../services/projects';
import { searchUsers } from '../../services/users';
import { handleError } from '../../utilities/errors';
import useDebounce from '../../hooks/debounce';
import { Toast } from 'primereact/toast';
import { UserContext } from '../../context/user';

const InviteProjectMembersDialog = ({ project, dialogOpen, setDialogOpen }) => {
  const t = useTranslations('default');
  const [members, setMembers] = useState([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [existingMembers, setExistingMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const toast = useRef(null);
  const { token } = useContext(UserContext);

  useEffect(() => {
    if (search?.length > 0) {
      searchMembers();
    }
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!dialogOpen || !project) return;
    const fetchProject = async () => {
      try {
        const { data } = await getProject(project.id, token);
        if (data.users && data.users.length) {
          setExistingMembers(data.users);
          setIsLoadingMembers(false);
        }
      } catch (error) {
        setError(handleError(error));
      }
    };
    fetchProject();
  }, [project, dialogOpen]); // eslint-disable-line

  const onSearch = ({ query }) => setSearch(query);

  const sendInvites = async (e) => {
    e.preventDefault();
    const users = selectedMembers?.map(({ id }) => id) || [];
    try {
      const { existing_users } = await inviteUsers(project.id, users, token);
      if (existing_users.length > 0) {
        const str = existing_users.map((eu) => eu.email).join(',');
        setSuccess(
          'Invites',
          `The invitations were sent! The following users are already in this
          project: ${str}`
        );
      } else {
        setSuccess('Invites', 'The invitations were sent!');
      }
      setSelectedMembers([]);
      setMembers([]);
      setDialogOpen(false);
    } catch (error) {
      setError(handleError(error));
    }
  };

  const searchMembers = async () => {
    try {
      const { data: foundMembers } = await searchUsers(search, token);
      setMembers(foundMembers || []);
    } catch (error) {
      setError(handleError(error));
    }
  };

  const itemTemplate = ({ firstname, lastname, identity_provider: idp, email }) => {
    if (idp === IDENTITY_PROVIDER_LOCAL) {
      return `${firstname} ${lastname} (${email})`;
    }
    return `${firstname} ${lastname} (${idp.toString().toUpperCase()})`;
  };

  return (
    <Dialog
      header={t('INVITE_MEMBERS_TO_PROJECT')}
      visible={dialogOpen}
      style={{ width: '600px' }}
      draggable={false}
      modal
      onHide={() => setDialogOpen(false)}
    >
      <Toast ref={toast} />
      <div className="fluid">
        <form onSubmit={sendInvites}>
          <div className="formgrid grid">

            <div className="col-12">
              <div className="field">
                <label htmlFor="members">{t('EXISTING_MEMBERS')}</label>
                <div className="mb-2">
                  { isLoadingMembers ? (
                    <Skeleton shape="rectangle" />
                  ) : (
                      <div style={{ maxHeight: '100px', overflowY: 'auto' }} className="flex align-items-center flex-wrap">
                      { existingMembers.map((u) => (
                        <Chip
                          key={u.id}
                          className="mr-2 mb-2"
                          label={`${u.firstname} ${u.lastname} ${u.email ? `(${u.email})` : ''}`}
                        />
                      )) }
                    </div>
                  ) }
                </div>
              </div>
            </div>
            <div className="col-12">
              <div className="field">
                <label htmlFor="members">{t('SEARCH_MEMBERS_BY_NAME')}</label>
                <AutoComplete
                  value={selectedMembers}
                  suggestions={members}
                  completeMethod={onSearch}
                  itemTemplate={itemTemplate}
                  selectedItemTemplate={itemTemplate}
                  multiple
                  onChange={(e) => setSelectedMembers(e.value)}
                />
              </div>
            </div>
            <div className="col-12 text-center mt-3">
              <div className="p-d-inline-flex col-6 align-items-end justify-items-end">
                <Button
                  label={t('SEND_INVITES')}
                  icon="pi pi-send"
                  type="submit"
                  disabled={selectedMembers?.length === 0}
                  className="mr-2 mb-2"
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </Dialog>
  );
};

export default InviteProjectMembersDialog;
