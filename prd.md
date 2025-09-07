Alcance del MVP
El MVP incluirá las siguientes funcionalidades:

Módulo de Ingesta SFTP: Funcionalidad para conectarse a la SFTP y procesar los datos de las tablas.

Motor de Cálculo de KPIs: Implementación de las fórmulas de los KPIs proporcionados.

Visualización Básica: Gráficos de líneas, barras y/o acumulados para cada KPI.

Funcionalidad de Drill Down: Implementación de filtros de tiempo y la capacidad de sumergirse en los datos hasta su origen.

Capacidad de Ajuste Retroactivo: Un mecanismo para que los administradores puedan ajustar los datos de manera retroactiva.

Análisis de IA Generativa: Un componente para el análisis de tendencias y apoyo en la toma de decisiones.

Consideraciones Técnicas
Fuente de Datos: SFTP con las credenciales y directorios proporcionados.

Tablas de Referencia: Se usarán las tablas INCIDENCIAS, ACT, y PLANTILLA para obtener los datos relevantes para las fórmulas de los KPIs.

Riesgos y Preguntas Abiertas
Integridad de Datos: ¿Existen reglas de validación específicas para los datos de origen que deban ser consideradas durante la ingesta?

Ajustes Retroactivos: ¿Se necesita un sistema de auditoría o registro de cambios para los ajustes retroactivos?

Análisis de IA Generativa: ¿Se espera que la IA esté integrada directamente en el dashboard o se generará un reporte aparte con los resultados?

2. Documento de Requisitos de Producto (PRD) para el Dashboard MRM
1. Objetivos y Contexto General
Objetivos: El dashboard entregará los resultados deseados. Se enfoca en proporcionar una visión clara y proactiva de los KPIs de RRHH, permitiendo la toma de decisiones basada en datos.

Contexto General: El proyecto tiene como objetivo crear una herramienta de Business Intelligence para el equipo de RRHH de MRM, abordando la necesidad de un análisis de datos centralizado, dinámico y con capacidad de proyección.

2. Requisitos
Estos son los requisitos funcionales y no funcionales que guiarán el desarrollo.

Requisitos Funcionales (FR)
FR1: El sistema debe conectarse a un servidor SFTP y autenticarse con las credenciales proporcionadas para ingerir los datos de origen.

FR2: El sistema debe procesar los datos de las tablas de origen (INCIDENCIAS, ACT, PLANTILLA) para calcular los KPIs de RRHH especificados.

FR3: Se deben visualizar los KPIs en un dashboard utilizando diferentes tipos de gráficos (línea, barra, etc.).

FR4: El dashboard debe permitir a los usuarios hacer "drill down" en los datos para visualizar la información en una granularidad más detallada.

FR5: El sistema debe proporcionar la capacidad de realizar ajustes retroactivos en los datos y reflejar estos cambios en las visualizaciones.

FR6: El dashboard debe ofrecer una sección de "Análisis con IA Generativa" para analizar tendencias y apoyar la toma de decisiones.

Requisitos No Funcionales (NFR)
NFR1: La ingesta de datos a través de SFTP debe ser segura y confiable.

NFR2: El dashboard debe ser capaz de procesar y visualizar los datos de manera eficiente, incluso con grandes volúmenes de información.

NFR3: La funcionalidad de "drill down" debe ser fluida y tener tiempos de carga mínimos.

NFR4: El sistema debe tener un mecanismo de auditoría o un registro de cambios para las modificaciones de datos retroactivas.

3. Metas de Diseño de la Interfaz de Usuario
Visión de UX General: La interfaz debe ser clara, intuitiva y visualmente atractiva. Debe priorizar la facilidad de uso para los gerentes y el personal de RRHH de MRM.

Pantallas Principales: Las pantallas más importantes son el dashboard principal con todos los KPIs y las vistas detalladas que se obtienen con la función de "drill down".

4. Supuestos Técnicos
Estructura del Repositorio: Se utilizará una estructura de monorepo para gestionar de manera unificada el código de la aplicación (frontend, backend, y utilidades compartidas).

5. Lista de Épicas
He estructurado el trabajo en épicas que representan incrementos de valor completos y desplegables.

Épica 1: Infraestructura y Funcionalidad Central: Establecer la conexión SFTP, la base de datos y los servicios centrales.

Épica 2: Desarrollo del Dashboard y KPIs: Implementar el cálculo de los KPIs y las visualizaciones principales.

Épica 3: Análisis Avanzado y Retrospectivo: Añadir la funcionalidad de "drill down" y el módulo de IA generativa.

6. Detalles de las Épicas
Aquí está el desglose de cada épica en historias de usuario secuenciales.

Épica 1: Infraestructura y Funcionalidad Central
Objetivo: Establecer los cimientos del proyecto, asegurando la ingesta de datos segura y el procesamiento inicial de la información.

Historia 1.1: "Configuración del Proyecto e Ingesta de Datos". Como desarrollador, quiero establecer un proyecto y una conexión SFTP para que el sistema pueda recibir datos.

Criterios de Aceptación:

El proyecto puede inicializarse y ejecutarse localmente.

La aplicación se conecta exitosamente al servidor SFTP.

Los datos pueden ser leídos y almacenados de forma segura.

Historia 1.2: "Procesamiento y Almacenamiento de Datos". Como desarrollador, quiero que los datos crudos de las tablas (INCIDENCIAS, ACT, PLANTILLA) sean procesados para ser almacenados en la base de datos del proyecto.

Criterios de Aceptación:

El sistema puede procesar los datos de las tres tablas.

Los datos se almacenan en la base de datos de manera organizada y accesible.

Se verifica que los datos almacenados coincidan con los datos de origen.

Épica 2: Desarrollo del Dashboard y KPIs
Objetivo: Implementar el motor de cálculo de los KPIs y crear las visualizaciones principales del dashboard.

Historia 2.1: "Cálculo de los KPIs". Como desarrollador, quiero implementar la lógica para calcular todos los KPIs (Activos, Días, Bajas, etc.) según las fórmulas proporcionadas.

Criterios de Aceptación:

Se verifica que los valores de los KPIs se calculan correctamente.

El motor de cálculo es eficiente y escalable.

Los resultados del cálculo son accesibles para la capa de visualización.

Historia 2.2: "Creación del Dashboard de Visualización". Como usuario de RRHH, quiero ver todos los KPIs en un dashboard para que pueda monitorear el estado del equipo.

Criterios de Aceptación:

Se crea una interfaz de usuario que muestra todos los KPIs.

Los KPIs se muestran con sus gráficos correspondientes.

Las visualizaciones son claras y fáciles de entender.

Épica 3: Análisis Avanzado y Retrospectivo
Objetivo: Añadir las funcionalidades de "drill down", ajuste retroactivo y el módulo de análisis con IA.

Historia 3.1: "Drill Down y Filtros de Tiempo". Como usuario, quiero poder filtrar las visualizaciones por períodos de tiempo (mes, año, etc.) y profundizar en la información de cada KPI hasta su fuente para obtener un análisis más detallado.

Criterios de Aceptación:

Los gráficos permiten la selección de diferentes rangos de tiempo.

Al hacer clic en un gráfico, el usuario puede acceder a una vista más granular de los datos.

La vista granular muestra los datos de origen de la información.

Historia 3.2: "Ajustes Retroactivos y Auditoría". Como administrador, quiero poder ajustar los datos de los KPIs de manera retroactiva y dejar un registro de los cambios.

Criterios de Aceptación:

Se puede modificar un valor de KPI para una fecha anterior.

El dashboard actualiza las visualizaciones para reflejar el cambio.

Se registra la fecha, el usuario, el valor anterior y el nuevo valor de cada ajuste.

Historia 3.3: "Módulo de Análisis con IA Generativa". Como usuario, quiero un módulo de análisis con IA para que pueda identificar tendencias, hacer proyecciones y recibir recomendaciones.

Criterios de Aceptación:

El módulo de IA se integra en el dashboard.

El módulo analiza los datos de los KPIs y genera información sobre tendencias.

La IA proporciona recomendaciones accionables basadas en los datos.

3. Documento de Arquitectura de Pila Completa para el Dashboard MRM
Introducción
Este documento describe la arquitectura completa para el proyecto Dashboard MRM, incluyendo los sistemas de backend, la implementación de la interfaz de usuario y su integración. Sirve como la única fuente de verdad para el desarrollo impulsado por IA, garantizando la consistencia en toda la pila tecnológica. Este enfoque unificado combina lo que tradicionalmente serían documentos de arquitectura de backend y frontend separados, lo que agiliza el proceso de desarrollo de aplicaciones modernas de pila completa, donde estas preocupaciones están cada vez más entrelazadas.