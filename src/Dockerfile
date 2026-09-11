ARG BASE_IMAGE_VERSION
FROM geonode/geoserver_data:${BASE_IMAGE_VERSION:-2.28.4-latest}

## WARNING! 
# Modifications to GeoServer layer XML configuration files could prevent GeoServer from starting.

# Workspace geonode structure and backoffice datastore:
# geonode_workspaces/geonode/workspace.xml
# geonode_workspaces/geonode/backoffice/...
# geonode_workspaces/geonode/styles/...

COPY geonode_workspaces/geonode /tmp/geonode

RUN set -e \
    #  workspace geonode should be exist
    && mkdir -p /geoserver_data/data/workspaces/geonode \
    \
    # 1) workspace.xml: Copy the file if it does not already exist.
    &&  if [ ! -f /geoserver_data/data/workspaces/geonode/workspace.xml ]; then \
           cp /tmp/geonode/workspace.xml /geoserver_data/data/workspaces/geonode/workspace.xml; \
        fi \
    \   
    # 2) Copy the backoffice folder if it does not already exist. 
    &&  if [ ! -d /geoserver_data/data/workspaces/geonode/backoffice ]; then \
            cp -R /tmp/geonode/backoffice /geoserver_data/data/workspaces/geonode/; \
        fi \
    \
    # 3) cartella styles: la copio solo se non esiste già
    &&  if [ -d /tmp/geonode/styles ] && [ ! -d /geoserver_data/data/workspaces/geonode/styles ]; then \
           cp -R /tmp/geonode/styles /geoserver_data/data/workspaces/geonode/; \
        fi \
    \
    # 4) permessi (nel nostro caso geoserver gira come root:root -> 0:0)
    && chown -R 0:0 /geoserver_data/data/workspaces/geonode \
    \
    # 5) pulizia della dir temporanea
    && rm -rf /tmp/geonode
