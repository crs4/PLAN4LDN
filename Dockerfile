FROM geonode/geonode-base:latest-ubuntu-26.04

ENV LC_ALL=C.UTF-8 \
    LANG=C.UTF-8

RUN mkdir -p /usr/src/s4m_catalogue

# Install additional packages needed by the project
RUN apt-get update -y \
    && apt-get install --no-install-recommends \ 
    curl \
    wget \
    unzip \
    gnupg2 \
    saga \
    locales \
    libsqlite3-mod-spatialite -y \
    netcat-openbsd \
    && sed -i -e 's/# C.UTF-8 UTF-8/C.UTF-8 UTF-8/' /etc/locale.gen \
    && locale-gen \
    && apt-get autoremove --purge -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

ENV LC_ALL C.UTF-8
ENV LANG C.UTF-8

# Copy local geonode src inside container
COPY src /usr/src/s4m_catalogue/
WORKDIR /usr/src/s4m_catalogue

RUN python -m pip install --no-cache-dir -U pip setuptools wheel

COPY src/wait-for-databases.sh /usr/bin/wait-for-databases
COPY src/celery.sh /usr/bin/celery-commands
COPY src/celery-cmd /usr/bin/celery-cmd
RUN chmod +x /usr/bin/wait-for-databases /usr/bin/celery-commands /usr/bin/celery-cmd

RUN chmod +x /usr/src/s4m_catalogue/tasks.py /usr/src/s4m_catalogue/entrypoint.sh

RUN pip install --no-cache-dir -e .

RUN pip install --upgrade Django==5.2.17

RUN pip install --upgrade djangorestframework==3.17.2
  

EXPOSE 8000

