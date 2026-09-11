<div align="center">

# PLAN4LDN
**Land Use Planning for Land Degradation Neutrality**
The Plan4LDN is a software analytics tool  to support more transparent and well-informed land-use decisions at the local to national level across the globe. 

[![License: GPL v3](https://img.shields.io/github/license/crs4/PLAN4LDN)](./LICENSE)

[Live app](https://soilgislab.crs4.it/plan4ldn) 

</div>

---

## About
The **PLAN4LDN tool** is Based on **[LUP4LDN](https://github.com/SCiO-systems/lup4ldn/)**, developed and maintained by **[SCiO P.C.](https://scio.systems)**, Athens, Greece.  

PLAN4LDN uses partially different IT technologies compared to LUP4LDN, has a significantly redesigned interface and implements to a much larger extent the functionalities that form part of the original conceptual design of the tool, including capacity to perform directly GIS processing on the input data.

The tool is a [Docker Compose](https://docs.docker.com/compose/) Multi-container application. 
Compose simplifies the control of the entire application stack, making it easy to manage services, networks, and volumes in a single YAML configuration file. 
Docker Compose is a cloud-native architectures, containerization and open-source, cloud-agnostic tools to decouple applications from specific infrastructure.  
Compose works in all environments - production, staging, development, testing, as well as CI workflows. It also has commands for managing the whole lifecycle of the application.

## Components
The main components of the Plan4LDN Tool are three:

| Component | Role | Stack |
|---|---|---|
| Backend API | Plan4LDN project's management API | [Laravel](https://laravel.org)  |
| Frontend dashboard | Plan4LDN dashboard | [NextJS](https://nextjs.org), [PrimeReact REACT Diamond](https://diamond.primereact.org/) |
| Web GIs Catalogue | Plan4LDN utilities: default GIS data management and WEB-GIS functionalities | [Geonode](https://geonode.org) |

### Backend API
It is a **Laravel** application based on

- **PHP** 8.2
- **Laravel** 12

### Frontend dashboard
It is a NextJS application that use the PrimeReact REACT Diamond template

- **React** 18.3.0
- **NextJS** 15.5.15
- **Primereact** 10.2.1

### Web GIs Catalogue
It is a Geonode WEB GIS catalogue

- **Geonode** 5.1.0  
- **Geoserver** 2.27.4 
- **Django** 5.2.17
- **djangorestframework** 3.17.2
- **Python** 3.12


---


## Getting started

### Requirenments
- **docker compose Desktop or Engine

### 1. copy the .env.dev file o r the .env.prod in a new file named .env 

```bash
cp .env.dev .env
```

### 2. edit the environment variables in the new .env file (see the comments in the file)

```bash
vi .env
```

### 3. inside the root directory run docker compose build

```bash
docker compose build 
```

### 3. inside the root directory run the docker compose application

```bash
docker compose up -d 
```

## License

The source code in this repository is licensed under the **GNU General Public
License v3.0 (GPL-3.0)** — see [`LICENSE`](./LICENSE) for the full text.

---

## Trademark


**"PLAN4LDN"**  belongs to the University of Sassari, ICARDA, and WOCAT, who have developed this tool with the technical support of CRS4 by enhancing and reframing the LUP4LDN tool that won the GEO-LDN International Technology Innovation Competition in 2021, and who maintain this tool.

The PLAN4LDN source code is released under the GNU General Public License v3.0 (GPL-3.0). That license applies to the software code only. It does not grant any right to use the PLAN4LDN name.

The PLAN4LDN GitHub repository is maintained by **[CRS4](https://crs4.it)**, Cagliari, Italy

### What you may not do without prior written permission by the tool developers
Use "PLAN4LDN", or any confusingly similar name (for example "PLAN4LDN 2.0", or "PLAN4LDN Plus"), as the name of a fork, derivative or separately governed tool.
Use the name in any way that suggests your version is the original PLAN4LDN, or that it is endorsed by, affiliated with, or maintained by the tool developers.
If you fork
Give your fork a clearly different name and its own logo. You may include a factual attribution line such as: "Based on PLAN4LDN, developed and maintained by the University of Sassari, ICARDA, WOCAT and CRS4"

## Contact
For any permission or question regarding the PLAN4LDN name or logo, contact the developers at **smsl@uniss.it**.

