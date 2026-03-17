# Arquitectura del Sistema - HR KPI Dashboard MRM

Documento consolidado de arquitectura. Fuente unica de verdad para entender como funciona todo el sistema, archivo por archivo.

Ultima actualizacion: Marzo 2026

---

## 1. Resumen del Proyecto

Dashboard de Business Intelligence para analisis de KPIs de Recursos Humanos. Procesa datos importados via SFTP desde sistemas de nomina y provee visualizaciones interactivas con analisis impulsado por IA (Google Gemini).

**Usuarios**: Gerentes y analistas de RH de Moto Repuestos Monterrey (MRM).

**Datos que maneja**:
- ~1,051 empleados (activos + historicos)
- ~676 registros de bajas/terminaciones
- ~8,880 incidencias (faltas, vacaciones, permisos, etc.)
- ~374 registros de prenomina semanal

**Que puede hacer un usuario**:
1. Ver KPIs del mes actual o cualquier periodo historico
2. Filtrar por empresa, area, departamento, puesto, clasificacion, ubicacion
3. Analizar rotacion de personal (voluntaria vs involuntaria, por motivo, por antiguedad)
4. Analizar incidencias y ausentismo
5. Ver analisis demografico (edad, genero, antiguedad)
6. Recibir insights automaticos generados por IA
7. Importar datos nuevos desde el servidor SFTP (solo admins)
8. Gestionar acceso de usuarios (solo admins)

---

## 2. Tech Stack

| Componente | Tecnologia | Para que |
|------------|-----------|----------|
| Frontend | Next.js 14 (App Router, TypeScript) | SSR, routing, API routes |
| Backend/DB | Supabase (auth + PostgreSQL + RLS) | Base de datos, autenticacion, seguridad por fila |
| UI | shadcn/ui + Tailwind CSS | Componentes de interfaz + estilos |
| Graficos | Recharts | Graficas de barras, lineas, heatmaps |
| IA | Google Gemini API | Generacion de narrativas e insights |
| Testing | Vitest (unit) + Playwright (E2E) | 212 tests, 80% coverage |
| Hosting | Vercel | Deployment automatico desde GitHub |
| Monorepo | npm workspaces | apps/web + packages/shared |
| SFTP | ssh2-sftp-client | Conexion al servidor de nomina |
| Parseo | xlsx + papaparse | Lectura de archivos Excel y CSV |

---

## 3. Estructura del Monorepo

```
/mrm
├── apps/web/                  # Aplicacion principal (Next.js 14)
├── packages/shared/           # Tipos TypeScript compartidos entre apps
├── supabase/                  # Migraciones SQL de base de datos
│   ├── migrations/            # Archivos de migracion (historico)
│   └── RLS_BEST_PRACTICES.md  # Guia de Row Level Security
├── parches/                   # Scripts SQL y archivos de datos para patches
├── tmp/                       # Archivos temporales de trabajo (Excel, CSV)
├── docs/                      # Documentacion (este archivo)
├── .github/workflows/         # CI/CD (GitHub Actions para tests)
└── vercel.json                # Configuracion de deployment
```

### Estructura completa de `apps/web/src/`

```
src/
├── app/                           # RUTAS Y API (Next.js App Router)
│   ├── layout.tsx                 # Layout raiz (ThemeProvider, fuentes, metadata)
│   ├── page.tsx                   # Pagina principal "/" → renderiza DashboardPage
│   ├── login/page.tsx             # Pagina de login (Supabase Auth)
│   ├── admin/page.tsx             # Panel de admin (/admin) - imports SFTP + whitelist usuarios
│   ├── setup/page.tsx             # Setup inicial
│   ├── perfil/cambiar-contrasena/ # Cambio de contrasena
│   └── api/                       # 17 API endpoints (ver seccion 4)
│
├── middleware.ts                  # Middleware de autenticacion (protege rutas)
│
├── components/                    # COMPONENTES REACT (55 archivos)
│   ├── dashboard-page.tsx         # ★ COMPONENTE RAIZ del dashboard (orquesta todo)
│   ├── shared/                    # Componentes compartidos entre todos los tabs
│   │   ├── filter-panel.tsx       # Panel de filtros (dropdowns de año, mes, depto, etc.)
│   │   ├── kpi-card.tsx           # Tarjeta individual de KPI (valor, varianza, target)
│   │   ├── smart-narrative.tsx    # Narrativa generada por IA
│   │   ├── visualization-container.tsx  # Wrapper para graficas (fullscreen + export PNG)
│   │   ├── incidents-permits-kpis.tsx   # KPIs especificos de incidencias
│   │   ├── error-boundary.tsx     # Manejo de errores React
│   │   ├── user-menu.tsx          # Menu de usuario (perfil, logout)
│   │   ├── theme-toggle.tsx       # Toggle dark/light mode
│   │   └── theme-provider.tsx     # Provider de tema (dark/light)
│   ├── resumen/                   # Tab 1: Resumen
│   │   └── summary-comparison.tsx # Comparacion de KPIs entre periodos
│   ├── personal/                  # Tab 2: Personal
│   │   ├── personal-tab.tsx       # Analisis demografico principal
│   │   └── tables/
│   │       ├── age-gender-table.tsx      # Tabla edad × genero
│   │       └── seniority-gender-table.tsx # Tabla antiguedad × genero
│   ├── incidencias/               # Tab 3: Incidencias
│   │   ├── incidents-tab.tsx      # Analisis de asistencia principal
│   │   └── tables/
│   │       └── absenteeism-table.tsx     # Tabla detallada de ausencias
│   ├── rotacion/                  # Tab 4: Rotacion (14 archivos, el tab mas complejo)
│   │   ├── rotacion-tab.tsx       # Tab principal de retencion/rotacion
│   │   ├── retention-charts.tsx   # Graficas de rotacion mensual y acumulada 12m
│   │   ├── bajas-por-motivo-heatmap.tsx  # Heatmap: motivos × meses
│   │   ├── dismissal-reasons-table.tsx   # Tabla de motivos de baja
│   │   ├── abandonos-otros-summary.tsx   # Resumen de "otros" motivos
│   │   └── tables/                # 8 tablas especializadas de rotacion
│   │       ├── rotation-headcount-table.tsx        # Empleados activos por mes
│   │       ├── rotation-percentage-table.tsx       # % rotacion por mes
│   │       ├── rotation-bajas-voluntarias-table.tsx    # Bajas voluntarias
│   │       ├── rotation-bajas-involuntarias-table.tsx  # Bajas involuntarias
│   │       ├── rotation-by-motive-month-table.tsx     # Motivo × mes
│   │       ├── rotation-by-motive-area-table.tsx      # Motivo × area
│   │       ├── rotation-by-motive-seniority-table.tsx # Motivo × antiguedad
│   │       └── rotation-combined-table.tsx            # Metricas combinadas
│   ├── admin/                     # Componentes de administracion
│   │   ├── sftp-import-admin.tsx  # UI para importar archivos SFTP
│   │   └── user-whitelist-admin.tsx # UI para gestionar acceso de usuarios
│   └── ui/                        # 18 componentes primitivos (shadcn/ui)
│       ├── button.tsx, card.tsx, table.tsx, tabs.tsx, dialog.tsx,
│       ├── checkbox.tsx, input.tsx, label.tsx, select.tsx, badge.tsx,
│       ├── dropdown-menu.tsx, popover.tsx, separator.tsx, skeleton.tsx,
│       ├── progress.tsx, alert.tsx, metric-toggle.tsx, chart.tsx
│
├── hooks/                         # HOOKS PERSONALIZADOS (logica de estado)
│   ├── use-auth.ts                # Estado de autenticacion del usuario
│   ├── use-dashboard-data.ts      # Carga de datos desde Supabase
│   ├── use-plantilla-filters.ts   # ★ Filtrado central (4 variantes)
│   └── use-retention-kpis.ts      # ★ Calculo de 50+ KPIs de retencion
│
├── context/                       # REACT CONTEXT
│   └── visualization-export-context.tsx  # Contexto para exportar graficas a PNG
│
├── lib/                           # ★ LOGICA DE NEGOCIO (el corazon del sistema)
│   ├── supabase.ts                # Cliente Supabase + queries principales
│   ├── supabase-client.ts         # Factory de cliente browser (con RLS)
│   ├── supabase-admin.ts          # Cliente admin (service role, sin RLS)
│   ├── supabase-server.ts         # Cliente server-side para API routes
│   ├── kpi-calculator.ts          # Motor de calculo de KPIs (clase KPICalculator)
│   ├── normalizers.ts             # ★ Normalizacion de datos crudos (encoding, clasificacion)
│   ├── retention-calculations.ts  # Calculos de periodos de retencion
│   ├── sftp-client.ts             # Conexion y operaciones SFTP
│   ├── sftp-structure-comparator.ts # Deteccion de cambios en estructura de archivos
│   ├── sftp-importer.ts           # Orquestacion de importacion SFTP
│   ├── sftp-row-hash.ts           # Hashing de filas para deteccion de cambios
│   ├── ai-analyzer.ts             # Motor local de analisis (tendencias, anomalias)
│   ├── gemini-ai.ts               # Integracion con Google Gemini API
│   ├── server-auth.ts             # Middleware de auth server-side (requireAdmin)
│   ├── email-notifier.ts          # Notificaciones por email de eventos SFTP
│   ├── utils.ts                   # Utilidades generales (cn para Tailwind)
│   ├── date-utils.ts              # Helpers de fechas
│   ├── chart-colors.ts            # Paleta de colores para graficas
│   ├── filters/                   # Sistema de filtros
│   │   ├── core/filter-engine.ts  # ★ Motor de filtrado (4 scopes)
│   │   ├── utils/summary.ts      # Helpers para mostrar resumen de filtros
│   │   └── index.ts              # Re-exports
│   ├── utils/
│   │   ├── kpi-helpers.ts         # ★ Funciones puras de calculo (rotacion, promedios)
│   │   └── sync-schedule.ts      # Gestion de horarios de sincronizacion
│   └── types/
│       └── records.ts             # Interfaces de registros de DB
│
└── test/                          # UTILIDADES DE TESTING
    ├── mockData.ts                # Datos mock (empleados, bajas, incidencias)
    ├── setup.ts                   # Configuracion de Vitest
    └── utils.tsx                  # Helpers para tests (createMockEmpleado, etc.)
```

---

## 4. API Endpoints

Todos los endpoints estan en `apps/web/src/app/api/`.

### Datos y KPIs

| Endpoint | Metodo | Que hace |
|----------|--------|----------|
| `/api/kpis` | GET | Calcula y retorna todos los KPIs para un periodo dado |
| `/api/narrative` | POST | Genera narrativa AI (envia KPIs a Gemini, recibe texto) |
| `/api/motivos/distinct` | GET | Lista unica de motivos de baja (para dropdowns) |

### SFTP e Importacion

| Endpoint | Metodo | Que hace |
|----------|--------|----------|
| `/api/sftp` | GET/POST | Lista archivos SFTP, prueba conexion, descarga datos |
| `/api/sftp/approve` | POST | Aprueba cambios estructurales detectados en importacion |
| `/api/sftp/settings` | GET/PUT | Lee/actualiza configuracion de sincronizacion |
| `/api/sftp/test-email` | POST | Envia email de prueba de notificacion |
| `/api/import-sftp-real-data` | POST | Importacion estandar (con deteccion de cambios) |
| `/api/import-real-sftp-force` | POST | Importacion forzada (sin verificacion de estructura) |
| `/api/import-csv-incidencias` | POST | Importa incidencias desde archivo CSV |
| `/api/cron/sync-sftp` | POST | Endpoint para cron job (sincronizacion programada) |

### Autenticacion y Admin

| Endpoint | Metodo | Que hace |
|----------|--------|----------|
| `/api/auth/me` | GET | Retorna datos del usuario autenticado actual |
| `/api/admin/users` | GET/POST | Lista o agrega usuarios al whitelist |
| `/api/admin/users/create` | POST | Crea cuenta de usuario nueva en Supabase Auth |

### MCP (Desarrollo)

| Endpoint | Metodo | Que hace |
|----------|--------|----------|
| `/api/mcp/scan` | POST | Escaneo MCP (herramienta de desarrollo) |

---

## 5. Schema de Base de Datos

**Supabase Project ID**: `ufdlwhdrrvktthcxwpzt`

### 5.1 Tablas principales de datos (importadas desde SFTP)

#### empleados_sftp (~1,051 registros)
Master de empleados. Snapshot directo del archivo SFTP "Validacion Alta de empleados.xls".

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | SERIAL PK | ID interno |
| numero_empleado | INTEGER UNIQUE NOT NULL | Clave unica del empleado |
| nombres, apellidos | VARCHAR NOT NULL | Nombre y apellidos |
| nombre_completo | VARCHAR | Nombre concatenado |
| gafete | VARCHAR | Numero de gafete |
| genero | VARCHAR | M/F |
| imss | VARCHAR | Numero de seguro social |
| fecha_nacimiento | DATE | Fecha de nacimiento |
| estado | VARCHAR | Estado de la republica |
| fecha_ingreso | DATE NOT NULL | Fecha de contratacion |
| fecha_antiguedad | DATE | Fecha de antiguedad (puede diferir de ingreso) |
| fecha_baja | DATE | NULL = empleado activo; con fecha = dado de baja |
| activo | BOOLEAN DEFAULT true | Estado actual |
| empresa | VARCHAR | Nombre de la empresa (MOTO REPUESTOS MONTERREY, MOTO TOTAL, etc.) |
| registro_patronal | VARCHAR | Registro patronal ante IMSS |
| codigo_puesto, puesto | VARCHAR | Codigo y nombre del puesto |
| codigo_depto, departamento | VARCHAR | Codigo y nombre del departamento |
| codigo_cc, cc, subcuenta_cc | VARCHAR | Centro de costos |
| clasificacion | VARCHAR | CONFIANZA, SINDICALIZADO, HONORARIOS, EVENTUAL |
| codigo_area, area | VARCHAR | Codigo y nombre del area |
| ubicacion | VARCHAR | Ubicacion fisica (planta, oficina) |
| ubicacion2 | VARCHAR | Ubicacion organizacional: CAD, CORPORATIVO, FILIALES |
| tipo_nomina | VARCHAR | Tipo de nomina |
| turno | VARCHAR | Turno asignado |
| prestacion_ley, paquete_prestaciones | VARCHAR | Paquete de prestaciones |

#### motivos_baja (~676 registros)
Historial de terminaciones. **Un empleado puede tener multiples registros** (si fue recontratado y vuelto a dar de baja).

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | SERIAL PK | ID interno |
| numero_empleado | INTEGER NOT NULL | FK a empleados_sftp.numero_empleado |
| fecha_baja | DATE NOT NULL | Fecha de la terminacion |
| tipo | VARCHAR NOT NULL | Clasificacion general del tipo |
| motivo | VARCHAR NOT NULL | Motivo especifico (21 motivos unicos, ver seccion 8) |
| descripcion | TEXT | Descripcion adicional |
| observaciones | TEXT | Notas |

#### incidencias (~8,880 registros)
Registro diario de incidencias laborales (faltas, vacaciones, permisos, etc.).

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | SERIAL PK | ID interno |
| emp | INTEGER NOT NULL | Numero de empleado |
| nombre | TEXT | Nombre del empleado |
| fecha | DATE NOT NULL | Fecha de la incidencia |
| turno | SMALLINT | Numero de turno |
| horario | TEXT | Formato "0830_1700" |
| incidencia | TEXT | Descripcion de la incidencia |
| entra | TIME | Hora de entrada real |
| sale | TIME | Hora de salida real |
| ordinarias | NUMERIC DEFAULT 0 | Horas ordinarias trabajadas |
| numero | INTEGER | Numero secuencial |
| inci | VARCHAR | Codigo de incidencia (VAC, FI, FJ, INC, SUSP, etc.) |
| status | SMALLINT | Status numerico |
| ubicacion2 | TEXT | Ubicacion (CAD/CORPORATIVO/FILIALES) |

#### prenomina_horizontal (~374 registros)
Datos semanales de nomina con horas desglosadas por dia.

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | SERIAL PK | ID interno |
| numero_empleado | INTEGER NOT NULL | FK |
| nombre | VARCHAR NOT NULL | Nombre del empleado |
| semana_inicio, semana_fin | DATE NOT NULL | Rango lunes-domingo |
| {dia}_fecha | DATE | Fecha del dia (lun, mar, ..., dom) |
| {dia}_horas_ord | NUMERIC DEFAULT 0 | Horas ordinarias del dia |
| {dia}_horas_te | NUMERIC DEFAULT 0 | Horas extras del dia |
| {dia}_incidencia | VARCHAR | Codigo de incidencia del dia |
| total_horas_ord | NUMERIC GENERATED | Suma automatica de horas ordinarias |
| total_horas_te | NUMERIC GENERATED | Suma automatica de horas extras |
| total_horas_semana | NUMERIC GENERATED | Total semanal (CHECK >= 0 AND <= 168) |

### 5.2 Tablas de usuarios y acceso

#### user_profiles
| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | UUID PK | FK a auth.users.id |
| email | TEXT UNIQUE NOT NULL | Email del usuario |
| empresa | TEXT | Empresa principal asignada |
| role | TEXT DEFAULT 'user' | 'admin' o 'user' |

#### user_empresa_access
Acceso multi-empresa. PK compuesto: (user_id, empresa). Permite a un usuario ver datos de multiples empresas.

#### sync_settings
Configuracion de sincronizacion automatica. **Tabla singleton** (1 solo registro).
Campos: frequency (manual/daily/weekly/monthly), day_of_week, run_time, last_run, next_run.

### 5.3 Tablas de auditoria SFTP

| Tabla | Registros | Que almacena |
|-------|-----------|-------------|
| sftp_file_structure | ~18 | Estructura de columnas (JSONB) de cada archivo para detectar cambios |
| sftp_import_log | Variable | Bitacora de importaciones: status, cambios detectados, aprobaciones |
| sftp_file_versions | ~15 | Version de cada archivo con timestamp, checksum SHA256, row_count |
| sftp_record_diffs | Variable | Cambios a nivel de registro: insert/update/delete con old/new values |

#### labs
Tabla de referencia para laboratorios (convenios). Actualmente vacia.

> **Nota**: La tabla `asistencia_diaria` fue eliminada en migracion `drop_asistencia_diaria` (Enero 2026). Los datos de asistencia provienen de `incidencias` y `prenomina_horizontal`.

---

## 6. Pipeline de Datos (de SFTP al Dashboard)

Este es el flujo completo de como los datos llegan desde el servidor SFTP hasta lo que ve el usuario en el dashboard:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ PASO 1: IMPORTACION (Bronze Layer - datos crudos)                          │
│                                                                              │
│ Servidor SFTP (archivos .xls/.csv)                                          │
│     │ sftp-client.ts se conecta y descarga                                  │
│     ▼                                                                        │
│ API Route: /api/import-sftp-real-data/route.ts                              │
│     │ Parsea Excel/CSV con xlsx + papaparse                                 │
│     │ sftp-structure-comparator.ts compara columnas con import anterior      │
│     │ Si hay cambios estructurales → requiere aprobacion admin              │
│     │ Batch inserts a Supabase (upsert por numero_empleado)                 │
│     ▼                                                                        │
│ Supabase PostgreSQL                                                          │
│     empleados_sftp (1,051) + motivos_baja (676)                             │
│     incidencias (8,880) + prenomina_horizontal (374)                        │
│     ⚠ Datos con encoding UTF-8 corrupto (ej: "RescisiA³n")                │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ PASO 2: CARGA Y NORMALIZACION (Silver Layer - datos limpios)               │
│                                                                              │
│ use-dashboard-data.ts (hook) llama a:                                       │
│     │                                                                        │
│     ├─ db.getEmpleadosSFTP() [supabase.ts]                                 │
│     │     Carga empleados_sftp con paginacion (.order('id') como tiebreaker)│
│     │     Carga motivos_baja como referencia historica                       │
│     │     ★ REGLA: empleados_sftp.fecha_baja > motivos_baja.fecha_baja     │
│     │     ★ Si fecha_baja = NULL → empleado ACTIVO (ignora bajas antiguas) │
│     │     Aplica normalizers (normalizeDepartamento, normalizeArea, etc.)    │
│     │     Resultado: PlantillaRecord[] limpio y consistente                 │
│     │                                                                        │
│     ├─ db.getMotivosBaja() → MotivoBajaRecord[]                            │
│     ├─ db.getIncidenciasCSV() → IncidenciaCSVRecord[]                      │
│     └─ KPICalculator.calculateAllKPIs() → KPIs base                        │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ PASO 3: FILTRADO (4 variantes segun el tab)                                │
│                                                                              │
│ use-plantilla-filters.ts recibe PlantillaRecord[] + filtros del usuario     │
│ y produce 4 variantes filtradas:                                            │
│                                                                              │
│ 1. plantillaFiltered (specific: año+mes+estructura)                        │
│    → Para KPI cards del mes seleccionado                                    │
│                                                                              │
│ 2. plantillaFilteredYearScope (year-only: año+estructura, sin mes)         │
│    → Para tab de Incidencias (patrones anuales)                             │
│    → Para generar empleadosFiltradosIds (filtra bajas e incidencias)        │
│                                                                              │
│ 3. plantillaFilteredGeneral (general: solo estructura, sin temporales)      │
│    → Para comparaciones historicas                                           │
│                                                                              │
│ 4. plantillaRotacionYearScope (year-only + incluye inactivos)              │
│    → Para tablas de rotacion (necesita ver las bajas)                        │
│                                                                              │
│ Tambien filtra:                                                              │
│    bajasFiltered → solo bajas de empleados en scope                         │
│    incidenciasFiltered → solo incidencias de empleados en scope             │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ PASO 4: CALCULO DE KPIs                                                     │
│                                                                              │
│ use-retention-kpis.ts recibe plantilla filtrada y calcula 50+ metricas:    │
│                                                                              │
│ Usa kpi-helpers.ts (funciones puras):                                       │
│   calculateActivosPromedio() → promedio de empleados activos en periodo     │
│   calcularRotacionConDesglose() → % rotacion con voluntaria/involuntaria    │
│   calcularRotacionAcumulada12mConDesglose() → rotacion 12 meses moviles    │
│   calcularRotacionYTDConDesglose() → rotacion acumulada del año            │
│   calculateBajasEnPeriodo() → conteo de bajas                               │
│                                                                              │
│ Resultado: RetentionKPIs con todos los valores calculados + varianzas       │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ PASO 5: PRESENTACION                                                         │
│                                                                              │
│ dashboard-page.tsx orquesta los 4 tabs:                                     │
│                                                                              │
│ Tab Resumen    → KPI cards + comparacion de periodos                        │
│ Tab Personal   → Tablas edad×genero, antiguedad×genero                      │
│ Tab Incidencias → Graficas de incidencias + tabla de ausentismo             │
│ Tab Rotacion   → Graficas de rotacion + heatmap + 8 tablas de desglose     │
│                                                                              │
│ + smart-narrative.tsx envia KPIs a /api/narrative → Gemini → insights AI   │
│ + visualization-container.tsx permite fullscreen y export PNG               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Funcion clave: getEmpleadosSFTP()

Esta funcion en `supabase.ts` es el puente entre datos crudos (Bronze) y datos limpios (Silver):

1. Carga `empleados_sftp` con paginacion (usa `.order('id')` como tiebreaker para evitar saltar registros)
2. Carga `motivos_baja` como referencia historica
3. Para cada empleado, busca su motivo de baja mas reciente
4. **Regla de prioridad**: `empleados_sftp.fecha_baja` (snapshot SFTP) tiene prioridad sobre `motivos_baja.fecha_baja` (historico)
5. **Regla de rehires**: Si `empleados_sftp.fecha_baja = NULL`, el empleado es ACTIVO sin importar bajas historicas en `motivos_baja`
6. Aplica normalizers para limpiar encoding corrupto

---

## 7. Capa de Normalizacion

**Archivo**: `apps/web/src/lib/normalizers.ts`

Los archivos SFTP vienen con encoding UTF-8 corrupto (los acentos se rompen) y motivos de baja escritos de multiples formas. Este archivo resuelve eso.

### Problemas que resuelve

1. **Encoding corrupto**: `"RescisiA³n por desempeA±o"` → `"Rescision por desempeno"`
2. **Variaciones de texto**: `"OPERACIONES Y LOG?STICA"` → `"Operaciones y Logistica"`
3. **Clasificacion de negocio**: Determinar si una baja es voluntaria o involuntaria

### Funciones principales

| Funcion | Que hace | Ejemplo |
|---------|----------|---------|
| `normalizeMotivo(raw)` | Limpia encoding y mapea a 21 motivos estandarizados | `"RescisiA³n"` → `"Rescision por desempeno"` |
| `isMotivoClave(raw)` | Retorna `true` si es baja involuntaria | `"Rescision por disciplina"` → `true` |
| `normalizeDepartamento(raw)` | Estandariza nombres de departamentos | `"OPERACIONES Y LOG?STICA"` → `"Operaciones y Logistica"` |
| `normalizeArea(raw)` | Estandariza nombres de areas | Limpia encoding |
| `normalizePuesto(raw)` | Estandariza nombres de puestos | Limpia encoding |
| `normalizeIncidenciaCode(raw)` | Estandariza codigos de incidencia | `"vac"` → `"VAC"` |
| `prettyMotivo(raw)` | Formateo bonito para UI | Capitaliza correctamente |

### Clasificacion de motivos de baja (21 motivos unicos)

**Involuntarios** (`isMotivoClave = true`) — 3 motivos:
- Rescision por desempeno (12 casos)
- Rescision por disciplina (8 casos)
- Termino del contrato (36 casos)

**Voluntarios** (`isMotivoClave = false`) — 18 motivos:
- Baja Voluntaria (421), Otra razon (67), Abandono/No regreso (46), Regreso a la escuela (15), Otro trabajo mejor compensado (8), Trabajo muy dificil (8), Cambio de domicilio (4), Falta quien cuide hijos (4), No le gusto el tipo de trabajo (4), Problema de transporte (4), Ausentismo (3), Falta de oportunidades (2), Cambio de ciudad (1), Jubilacion (1), Motivos de salud (1), No le gusto el ambiente (1), No le gustaron las instalaciones (1), Poco salario y prestaciones (1), Problemas con jefe inmediato (1)

### Codigos de incidencia

| Categoria | Codigos | Que significan |
|-----------|---------|----------------|
| Vacaciones | VAC | Vacaciones |
| Faltas | FI, SUSP, PSIN | Falta Injustificada, Suspension, Permiso Sin Goce |
| Salud | ENFE, MAT1, MAT3, ACCI, INCA | Enfermedad, Maternidad, Accidente, Incapacidad |
| Permisos | PCON, FEST, PATER, JUST | Permiso Con Goce, Festivo, Paternidad, Justificacion |

### Donde se aplican los normalizers

- `getEmpleadosSFTP()` los aplica al cargar datos → datos limpios para toda la app
- `filter-panel.tsx` los aplica al poblar dropdowns → el usuario ve nombres limpios
- `rotacion-tab.tsx` y componentes de rotacion usan `normalizeMotivo()` para agrupar bajas

---

## 8. Sistema de Filtros

**Archivos**:
- Motor: `apps/web/src/lib/filters/core/filter-engine.ts`
- Hook: `apps/web/src/hooks/use-plantilla-filters.ts`
- UI: `apps/web/src/components/shared/filter-panel.tsx`
- Resumen: `apps/web/src/lib/filters/utils/summary.ts`

### Como funciona

El usuario selecciona filtros en el panel (año, mes, departamento, puesto, etc.). El hook `usePlantillaFilters` toma la plantilla completa y aplica esos filtros en 4 variantes diferentes, una para cada necesidad de negocio.

### Los 4 scopes de filtrado

| Scope | Que filtra | Que tabs lo usan | Por que |
|-------|-----------|-------------------|---------|
| `specific` | Año + Mes + Estructura | Resumen, Personal | KPIs del mes especifico |
| `year-only` | Año + Estructura (sin mes) | Incidencias, Rotacion | Patrones anuales, incluye bajas del año |
| `general` | Solo Estructura (sin temporales) | Historicos | Comparaciones sin restriccion de tiempo |
| `year` | Año + Estructura (interno) | Calculos internos | Para calculos anuales dentro del motor |

### Filtros estructurales disponibles

| Filtro | Campo de empleados_sftp | Ejemplo de valores |
|--------|------------------------|--------------------|
| Negocio (Empresa) | empresa | MOTO REPUESTOS MONTERREY, MOTO TOTAL |
| Area | area | Comercial, Produccion |
| Departamento | departamento | Ventas, Operaciones y Logistica |
| Puesto | puesto | Vendedor, Operador |
| Clasificacion | clasificacion | CONFIANZA, SINDICALIZADO |
| Ubicacion | ubicacion2 | CAD, CORPORATIVO, FILIALES |

### Funcion principal

```typescript
applyFiltersWithScope(
  plantilla: PlantillaRecord[],
  filters: RetentionFilterOptions,
  scope: 'specific' | 'year-only' | 'general'
): PlantillaRecord[]
```

La comparacion es case-insensitive y accent-insensitive (normaliza con NFD + remove diacritics).

### Relacion filtros ↔ normalizers

`filter-panel.tsx` consulta Supabase directamente para poblar los dropdowns, pero aplica `normalizeDepartamento()`, `normalizeArea()`, `normalizePuesto()` antes de mostrar las opciones. Esto asegura que los valores en el dropdown coinciden con los datos ya normalizados por `getEmpleadosSFTP()`, evitando mismatches.

---

## 9. Formulas KPI

**Archivos**:
- Motor general: `apps/web/src/lib/kpi-calculator.ts` (clase `KPICalculator`)
- Funciones puras: `apps/web/src/lib/utils/kpi-helpers.ts` (15 funciones criticas)
- Hook: `apps/web/src/hooks/use-retention-kpis.ts` (calcula 50+ metricas)

### KPIs principales

| KPI | Formula | Fuente de datos | Rango tipico |
|-----|---------|----------------|-------------|
| **Activos** | Count(empleados WHERE fecha_baja IS NULL) | empleados_sftp | 70-85 |
| **Activos Promedio** | (Empleados_Inicio + Empleados_Fin) / 2 | empleados_sftp | 70-85 |
| **Bajas** | Count(empleados WHERE fecha_baja IN periodo) | empleados_sftp + motivos_baja | Variable |
| **Rotacion Mensual** | (Bajas / Activos_Promedio) * 100 | Calculado | 5-15% |
| **Rotacion Acum. 12m** | (Bajas_12_meses / Prom_Activos_12m) * 100 | Calculado (ventana movil) | Variable |
| **Rotacion YTD** | (Bajas_del_año / Prom_Activos_año) * 100 | Calculado | Variable |
| **Incidencias** | Count(registros de incidencias en periodo) | incidencias | 8,880+ total |
| **Inc prom x empleado** | Incidencias / Activos_Promedio | Calculado | 0.3-0.7 |
| **Dias Laborados** | (Activos / 7) * 6 | Calculado | Estimacion 6 dias/semana |
| **% Incidencias** | (Incidencias / Dias_Laborados) * 100 | Calculado | 3-8% |
| **Horas Ordinarias** | SUM(total_horas_ord) | prenomina_horizontal | Variable |
| **Horas Extras** | SUM(total_horas_te) | prenomina_horizontal | Variable |

### Funciones de kpi-helpers.ts (business-critical)

Estas funciones son puras (sin side effects) y tienen tests unitarios. **Nunca modificarlas sin correr tests primero**.

| Funcion | Que calcula |
|---------|-------------|
| `calculateActivosPromedio(plantilla, year, month)` | Promedio de empleados activos al inicio y fin del periodo |
| `calculateBajasEnPeriodo(plantilla, year, month)` | Cuenta empleados con fecha_baja en el mes |
| `calcularRotacionConDesglose(plantilla, year, month)` | % rotacion total + desglose voluntaria/involuntaria |
| `calcularRotacionAcumulada12mConDesglose(plantilla, year, month)` | Rotacion acumulada en ventana de 12 meses |
| `calcularRotacionYTDConDesglose(plantilla, year, month)` | Rotacion acumulada desde enero del año |
| `calculateVariancePercentage(current, previous)` | % de cambio entre dos valores |
| `filterByMotivo(plantilla, tipo)` | Filtra empleados por tipo de baja |
| `filterByDateRange(plantilla, start, end)` | Filtra por rango de fechas |
| `countActivosEnFecha(plantilla, fecha)` | Cuenta activos en una fecha especifica |
| `calculateBajasTempranas(plantilla, year, month)` | Bajas con menos de 90 dias de antiguedad |
| `validatePlantilla(plantilla)` | Valida integridad de datos |

### Diferencia entre Cards y Graficos

- **KPI Cards** (kpi-card.tsx): Usan `Activos Promedio` para calculos de rotacion. Es la formula estandar de RH.
- **Graficos de tendencia** (retention-charts.tsx): Usan `Activos` (headcount al final del mes) para visualizar tendencia.

### Caching

- KPICalculator tiene cache con TTL de 5 minutos (in-memory Map)
- Los hooks usan `useMemo` para evitar recalculos innecesarios

---

## 10. Tabs del Dashboard

**Componente raiz**: `apps/web/src/components/dashboard-page.tsx`

Este componente:
1. Llama a `useDashboardData()` para cargar datos
2. Llama a `usePlantillaFilters()` para filtrar
3. Llama a `useRetentionKPIs()` para calcular metricas
4. Renderiza 4 tabs con los datos filtrados

### Tab 1: Resumen

| Propiedad | Valor |
|-----------|-------|
| Scope de filtro | `specific` (año + mes + estructura) |
| Componente principal | `resumen/summary-comparison.tsx` |
| Que muestra | Vista general de KPIs del mes: activos, bajas, rotacion, incidencias. Comparacion con mes anterior (varianza %). |
| Datos que usa | `plantillaFiltered` (filtrado especifico) |

### Tab 2: Personal

| Propiedad | Valor |
|-----------|-------|
| Scope de filtro | `specific` (año + mes + estructura) |
| Componente principal | `personal/personal-tab.tsx` |
| Que muestra | Analisis demografico: distribucion por edad y genero, distribucion por antiguedad y genero |
| Componentes | `age-gender-table.tsx` (rangos de edad × M/F), `seniority-gender-table.tsx` (rangos de antiguedad × M/F) |
| Datos que usa | `plantillaFiltered` |

### Tab 3: Incidencias

| Propiedad | Valor |
|-----------|-------|
| Scope de filtro | `year-only` (año + estructura, sin mes) |
| Componente principal | `incidencias/incidents-tab.tsx` |
| Que muestra | Analisis de asistencia: tipos de incidencias, tendencias mensuales, empleados con mas faltas |
| Componentes | `absenteeism-table.tsx` (tabla detallada de ausencias) |
| Datos que usa | `plantillaFilteredYearScope` + `incidenciasFiltered` |
| Por que sin mes | Las incidencias se analizan como patrones del año completo, no mes a mes |

### Tab 4: Rotacion

| Propiedad | Valor |
|-----------|-------|
| Scope de filtro | `year-only` (año + estructura, sin mes) |
| Componente principal | `rotacion/rotacion-tab.tsx` |
| Que muestra | Rotacion de personal: voluntaria vs involuntaria, por motivo, por area, por antiguedad |
| Datos que usa | `plantillaRotacionYearScope` + `bajasFiltered` (filtrado por empleados en scope) |
| Componentes clave | |

- `retention-charts.tsx` — Graficas: rotacion mensual (barras) y acumulada 12m (linea)
- `bajas-por-motivo-heatmap.tsx` — Heatmap: motivos de baja × meses (intensidad por frecuencia)
- `dismissal-reasons-table.tsx` — Tabla con todos los motivos y conteos
- `abandonos-otros-summary.tsx` — Resumen de motivos agrupados
- **8 tablas de desglose** en `tables/`:
  - `rotation-headcount-table` — Empleados activos por mes
  - `rotation-percentage-table` — % rotacion por mes
  - `rotation-bajas-voluntarias-table` — Desglose bajas voluntarias por mes
  - `rotation-bajas-involuntarias-table` — Desglose bajas involuntarias por mes
  - `rotation-by-motive-month-table` — Cada motivo × cada mes
  - `rotation-by-motive-area-table` — Cada motivo × cada area
  - `rotation-by-motive-seniority-table` — Cada motivo × rango de antiguedad
  - `rotation-combined-table` — Vista combinada de todas las metricas

---

## 11. Pipeline SFTP (Importacion de Datos)

### Flujo paso a paso

1. Admin abre `/admin` → ve componente `sftp-import-admin.tsx`
2. Click "Probar Conexion" → `sftp-client.ts` intenta conectar al servidor SFTP
3. Click "Actualizar Lista" → lista archivos en el directorio `ReportesRH/`
4. Click "Importar" → inicia el proceso:
   a. Descarga archivos .xls/.csv del SFTP
   b. `sftp-structure-comparator.ts` compara columnas con la ultima importacion guardada en `sftp_file_structure`
   c. **Si hay cambios estructurales** (columnas nuevas o eliminadas) → muestra UI de aprobacion con detalle de cambios
   d. Admin aprueba → importacion continua
   e. **Si no hay cambios** → importacion procede automaticamente
5. Parseo de archivos (xlsx + papaparse) en server-side
6. Batch inserts a Supabase (upsert por numero_empleado)
7. Se registra version del archivo en `sftp_file_versions` con checksum SHA256
8. Se registra la importacion en `sftp_import_log`

### Archivos involucrados

| Archivo | Responsabilidad |
|---------|-----------------|
| `lib/sftp-client.ts` | Conexion SFTP (ssh2-sftp-client). Metodos: testConnection, listFiles, downloadFile, syncAllData |
| `lib/sftp-structure-comparator.ts` | Compara columnas entre importaciones. Detecta added/removed columns |
| `lib/sftp-importer.ts` | Orquestacion de alto nivel de la importacion |
| `lib/sftp-row-hash.ts` | Hashing de filas para detectar cambios a nivel de registro |
| `api/import-sftp-real-data/route.ts` | Endpoint principal de importacion (con deteccion de cambios) |
| `api/import-real-sftp-force/route.ts` | Importacion forzada (sin verificacion) |
| `api/sftp/route.ts` | Listado de archivos y test de conexion |
| `api/sftp/approve/route.ts` | Aprobacion de cambios estructurales |
| `api/cron/sync-sftp/route.ts` | Endpoint para sincronizacion programada (cron) |
| `components/admin/sftp-import-admin.tsx` | UI del panel de admin |

### Sincronizacion automatica (Cron)

El endpoint `/api/cron/sync-sftp` puede ser llamado por un cron job (configurado en Vercel o externamente). La frecuencia se configura en la tabla `sync_settings`. El endpoint valida un token secreto antes de proceder.

### Principio de diseno

> "Solo pausar cuando cambia la ESTRUCTURA del archivo. Los datos (registros) fluyen automaticamente."

---

## 12. Analisis AI

### Componentes

| Archivo | Que hace |
|---------|----------|
| `lib/ai-analyzer.ts` | Motor LOCAL de analisis. Detecta tendencias (varianza > 15%), anomalias (varianza > 25%). Genera insights con scoring de confianza y clasificacion de impacto (alto/medio/bajo). No requiere API externa. |
| `lib/gemini-ai.ts` | Integracion con Google Gemini API. Clase `GeminiAIService` con metodo `analyzeKPIs()`. Cache de 10 minutos. Genera narrativas para nivel "manager" o "analyst". Si no hay API key, usa analisis mock como fallback. |
| `api/narrative/route.ts` | Endpoint que recibe KPIs y retorna narrativa generada por Gemini |
| `components/shared/smart-narrative.tsx` | Componente UI que llama a `/api/narrative` y muestra los insights al usuario |

### Flujo

```
Usuario ve el dashboard
  → smart-narrative.tsx detecta que hay KPIs cargados
  → Llama a /api/narrative con los KPIs del periodo
  → route.ts instancia GeminiAIService y llama analyzeKPIs()
  → Gemini genera narrativa contextual
  → Se muestra como texto en el dashboard
```

---

## 13. Autenticacion y Seguridad

### Flujo de autenticacion

```
Usuario visita cualquier pagina
  → middleware.ts intercepta
  → Verifica session de Supabase via cookies
  → Si no hay session → redirect a /login
  → Si hay session + ruta /admin → verifica que es admin
  → Si hay session + ruta normal → permite acceso
```

### Archivos

| Archivo | Responsabilidad |
|---------|-----------------|
| `middleware.ts` | Intercepta requests, verifica auth, protege rutas |
| `lib/supabase-client.ts` | Crea cliente browser con cookies (para RLS) |
| `lib/supabase-server.ts` | Crea cliente server-side (para API routes) |
| `lib/supabase-admin.ts` | Cliente con service role (bypass RLS, para imports) |
| `lib/server-auth.ts` | Funcion `requireAdmin()` para API routes que requieren admin |
| `hooks/use-auth.ts` | Hook que expone estado de autenticacion al frontend |

### Row Level Security (RLS)

Las tablas de datos tienen politicas RLS que filtran por empresa del usuario. Cuando un usuario hace query desde el browser, Supabase solo retorna registros de su empresa.

Las API routes que necesitan ver todos los datos (ej: importacion SFTP) usan el cliente admin con `SUPABASE_SERVICE_ROLE_KEY`.

### Variables de entorno requeridas

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# SFTP
SFTP_HOST=...
SFTP_PORT=22
SFTP_USER=...
SFTP_PASSWORD=...
SFTP_DIRECTORY=ReportesRH

# AI (opcional)
GOOGLE_GENERATIVE_AI_API_KEY=...
```

---

## 14. Manejo de Estado (sin Redux)

El proyecto usa hooks de React puro, sin librerias de state management.

| Que estado | Donde vive | Como se actualiza |
|-----------|-----------|-------------------|
| Sesion de usuario | `use-auth.ts` | Supabase session (cookies) |
| Datos crudos (plantilla, bajas, incidencias) | `use-dashboard-data.ts` | useState + useCallback (carga una vez) |
| Filtros del usuario | `filter-panel.tsx` (local state) | useState, se propaga via callback `onFiltersChange` |
| Datos filtrados (4 variantes) | `use-plantilla-filters.ts` | useMemo (se recalcula cuando cambian datos o filtros) |
| KPIs calculados (50+ metricas) | `use-retention-kpis.ts` | useMemo (se recalcula cuando cambia plantilla filtrada) |
| Tema (dark/light) | `theme-provider.tsx` | React Context |
| Contexto de exportacion | `visualization-export-context.tsx` | React Context |

### Caching

| Cache | TTL | Donde |
|-------|-----|-------|
| KPIs (KPICalculator) | 5 min | In-memory Map |
| AI Analysis (GeminiAI) | 10 min | In-memory Map |
| Filtros | Instant | useMemo (recalcula cuando cambian dependencias) |
| SFTP downloads | Session | Previene re-descargas |

---

## 15. Testing

**Framework**: Vitest (unit/component) + Playwright (E2E)
**Stats**: 212 tests, 98% pass rate, 80% coverage

### Estructura de tests

```
src/
├── lib/__tests__/
│   ├── kpi-calculator.test.ts     # Tests del motor de KPIs
│   └── normalizers.test.ts        # Tests de normalizacion
├── lib/utils/__tests__/
│   └── kpi-helpers.test.ts        # Tests de funciones de calculo (CRITICOS)
├── lib/filters/__tests__/
│   └── filters.test.ts            # Tests del motor de filtrado
├── components/__tests__/          # Tests de componentes UI (8 archivos)
└── components/rotacion/tables/__tests__/  # Tests de tablas de rotacion (4 archivos)
```

### Datos mock

`src/test/mockData.ts` provee datos de prueba:
- `mockPlantilla` — Empleados de ejemplo
- `mockMotivosBaja` — Bajas de ejemplo
- `mockIncidencias` — Incidencias de ejemplo
- `mockPrenomina` — Prenomina de ejemplo

`src/test/utils.tsx` provee helpers:
- `createMockEmpleado(overrides)` — Crea empleado personalizado para tests

### Comandos

```bash
# Desde apps/web/
npm test                     # Watch mode
npm run test:run             # Todos los tests una vez
npm run test:coverage        # Con reporte de coverage
npm run test:e2e             # Playwright E2E
npm test -- kpi-helpers      # Solo tests de kpi-helpers
npm test -- filters          # Solo tests de filtros
npm test -- normalizers      # Solo tests de normalizers
```

### CI/CD

GitHub Actions (`.github/workflows/tests.yml`):
- Corre unit tests + E2E en cada PR
- Reporta coverage
- PRs bloqueados si tests fallan

---

## 16. Gotchas Conocidos

### Bug de timezone en fechas

`new Date("2025-12-01")` crea fecha en UTC medianoche. En Mexico (UTC-6) se convierte a 30 nov 6pm → `getMonth()` retorna 10 (noviembre) en lugar de 11 (diciembre).

```typescript
// ❌ INCORRECTO - causa bug de timezone
const date = new Date(registro.fecha_baja);
const mes = date.getMonth(); // PUEDE ESTAR MAL

// ✅ CORRECTO - parsear string directamente
const [year, month, day] = String(fecha).split('-');
const mes = parseInt(month, 10) - 1;
const date = new Date(parseInt(year), mes, parseInt(day), 12, 0, 0);
```

### Rehires (empleados recontratados)

16 empleados fueron recontratados: tienen `empleados_sftp.fecha_baja = NULL` (activos) pero registros historicos en `motivos_baja` con bajas anteriores.

**Regla**: Si `empleados_sftp.fecha_baja = NULL` → el empleado es ACTIVO, sin importar lo que diga `motivos_baja`.

### Paginacion no determinista en Supabase

Supabase `range()` puede saltar registros entre paginas cuando multiples registros comparten el mismo valor de ordenamiento (ej: muchas incidencias en la misma fecha).

**Solucion**: Siempre agregar `.order('id', { ascending: false })` como tiebreaker secundario.

### Encoding UTF-8 corrupto en archivos SFTP

Los archivos .xls del SFTP contienen caracteres corruptos (ej: `RescisiA³n`, `OPERACIONES Y LOG?STICA`). El sistema los normaliza en `normalizers.ts` mapeando patrones conocidos a texto limpio. **Nunca mostrar datos raw de Supabase directamente en la UI** — siempre pasar por normalizers.

### Cache de Next.js (rebuild necesario)

Cambios en hooks, filtros, kpi-helpers o normalizers pueden no reflejarse por el cache de Next.js. Sintomas: datos desactualizados, console.logs viejos.

```bash
pkill -f "next dev"
rm -rf apps/web/.next
npm run build
npm run dev
# En browser: Cmd+Shift+R (hard refresh)
```

---

## 17. Comandos de Desarrollo

```bash
# Desde raiz del monorepo
npm run dev          # Servidor de desarrollo (http://localhost:3000)
npm run build        # Build de produccion
npm run start        # Iniciar build de produccion
npm run lint         # ESLint
npm run type-check   # TypeScript strict mode check

# Testing (desde apps/web/)
npm test                    # Watch mode
npm run test:run            # Todos los tests una vez
npm run test:coverage       # Con coverage
npm run test:e2e            # Playwright E2E
npm run test:e2e:ui         # Playwright modo visual
npm test -- kpi-helpers     # Test especifico por nombre
```

---

## 18. Dependencias Principales

| Paquete | Version | Para que |
|---------|---------|----------|
| next | 14.x | Framework React SSR |
| @supabase/supabase-js | - | Cliente de base de datos |
| @supabase/ssr | - | Auth server-side con cookies |
| recharts | - | Graficas |
| @radix-ui/* | - | Primitivos UI (base de shadcn) |
| tailwindcss | - | Estilos utilitarios |
| @google/generative-ai | - | API de Gemini |
| ssh2-sftp-client | - | Conexion SFTP |
| xlsx | - | Parseo de archivos Excel |
| papaparse | - | Parseo de archivos CSV |
| date-fns | - | Manipulacion de fechas |
| vitest | - | Testing unitario |
| @playwright/test | - | Testing E2E |
