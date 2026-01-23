# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Guidelines (IMPORTANT - READ FIRST)

Before making any changes to this codebase, follow these rules:

1. **ANTES DE CUALQUIER COSA**: Usa el MCP de Supabase (`mcp__supabase__*`) para analizar la estructura actual de la base de datos, tablas, datos y relaciones. Esto asegura que trabajes con información actualizada y no con documentación potencialmente desactualizada.
2. First think through the problem, read the codebase for relevant files.
3. Before you make any major changes, check in with me and I will verify the plan.
4. Please every step of the way just give me a high level explanation of what changes you made.
5. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
6. Maintain a documentation file that describes how the architecture of the app works inside and out.
7. Never speculate about code you have not opened. If the user references a specific file, you MUST read the file before answering. Make sure to investigate and read relevant files BEFORE answering questions about the codebase. Never make any claims about code before investigating unless you are certain of the correct answer - give grounded and hallucination-free answers.

### Supabase MCP Commands (usar frecuentemente)
```bash
# Project ID: ufdlwhdrrvktthcxwpzt

# Comandos útiles:
mcp__supabase__list_tables        # Ver todas las tablas y columnas
mcp__supabase__execute_sql        # Ejecutar queries de análisis
mcp__supabase__list_migrations    # Ver historial de migraciones
mcp__supabase__get_logs           # Ver logs de servicios
mcp__supabase__get_advisors       # Verificar seguridad/performance
```

## Project Overview

HR KPI Dashboard - A Business Intelligence dashboard for analyzing Human Resources KPIs, built with Next.js 14 and Supabase. The system processes data from SFTP sources and provides interactive visualizations with AI-powered insights.

## Development Commands

**Root Level (using npm workspaces):**
```bash
npm run dev        # Start development server
npm run build      # Build production app
npm run start      # Start production server
npm run lint       # Run ESLint
npm run type-check # Run TypeScript type checking
```

**Direct Web App Commands (from apps/web/):**
```bash
npm run dev        # Next.js development server
npm run build      # Production build
npm run start      # Production server
npm run lint       # ESLint
npm run type-check # TypeScript type checking (tsc --noEmit)

# Testing Commands (Vitest + Playwright)
npm test                 # Run tests in watch mode
npm run test:run         # Run all tests once
npm run test:ui          # Open Vitest UI (interactive)
npm run test:coverage    # Run tests with coverage report
npm run test:e2e         # Run E2E tests (Playwright)
npm run test:e2e:ui      # Playwright UI mode
npm run test:all         # Run unit + E2E tests

# Run specific tests
npm test -- kpi-calculator     # Run specific test file
npm test -- age-gender         # Run tests matching pattern
```

## Architecture Overview

### Monorepo Structure
```
/mrm_simple
├── apps/
│   └── web/                    # Next.js 14 frontend (main application)
├── packages/
│   └── shared/                 # Shared TypeScript types and utilities
└── package.json                # Root workspace configuration
```

### Core Technologies
- **Next.js 14** with App Router (TypeScript)
- **Supabase** for backend services (auth, database, edge functions)
- **PostgreSQL** database with SFTP data ingestion
- **shadcn/ui** components with Tailwind CSS
- **Recharts** for data visualization
- **Google Generative AI** for insights analysis

### Key Architectural Patterns

**Data Layer:**
- SFTP Source Tables: `empleados_sftp`, `motivos_baja`, `incidencias` (direct SFTP import)
- Support Tables: `prenomina_horizontal`, `user_profiles`, `user_empresa_access`, `sync_settings`
- Audit Tables: `sftp_file_structure`, `sftp_import_log`, `sftp_file_versions`, `sftp_record_diffs`
- KPI calculation engine in `apps/web/src/lib/kpi-calculator.ts`
- Supabase client configuration in `apps/web/src/lib/supabase.ts`
- Shared retention filters in `apps/web/src/lib/filters/retention.ts`
- **NOTA**: La tabla `asistencia_diaria` fue ELIMINADA (migración `drop_asistencia_diaria`)

**Frontend Organization:**
- App Router structure in `apps/web/src/app/`
- Shared components in `apps/web/src/components/`
- Business logic in `apps/web/src/lib/`
- Shared types in `packages/shared/src/types.ts`
 - Admin SFTP UI: `apps/web/src/components/sftp-import-admin.tsx` (exposed at `/admin`)

**KPI Calculation System (Corrected September 2025):**
The system implements HR-specific formulas with accurate calculations:

**Core Formulas:**
- **Activos**: Count(empleados activos) - Uses empleados_sftp table for headcount
- **Activos Promedio**: (Empleados_Inicio_Período + Empleados_Fin_Período) / 2 - Correct average for rotation calculations
- **Rotación Mensual**: (Bajas_del_Período / Activos_Promedio) × 100 - Standard HR rotation formula using motivos_baja
- **Días**: Count(DISTINCT fechas from incidencias table) - Unique activity days
- **Bajas**: Count(empleados with fecha_baja in period) - Terminations from motivos_baja table
- **Incidencias**: Count(incidencia records from incidencias table) - Total incidents (8,880+ records)
- **Inc prom x empleado**: Incidencias / Activos_Promedio - Incidents per employee
- **Días Laborados**: (Activos / 7) × 6 - Estimated work days (6 days/week)
- **%incidencias**: (Incidencias / Días_Laborados) × 100 - Incident percentage
- **Horas Ordinarias/Extras**: Calculated from prenomina_horizontal (374 records)

**SFTP Tables Architecture:**
- empleados_sftp: Master employee data (1,051 records) - 33 columnas completas
- motivos_baja: **FUENTE DE VERDAD** para bajas - Termination records (676 records) with dates and reasons
  - **ARQUITECTURA CRÍTICA**: `motivos_baja` es la fuente primaria para calcular bajas
  - `getEmpleadosSFTP()` sincroniza automáticamente `fecha_baja` desde `motivos_baja` durante el load
  - Garantiza coincidencia 100% con archivo SFTP original (236 bajas en 2025)
- incidencias: Detailed incident records (8,880 records) with codes, timestamps, locations
- prenomina_horizontal: Weekly payroll data (374 records) with hours breakdown per day

**Realistic Value Ranges:**
- Activos Promedio: 70-85 employees (not 6)
- Rotación Mensual: 5-15% (not 200-800%)
- Inc prom x empleado: 0.3-0.7 incidents
- %incidencias: 3-8% monthly

**Documentation References:**
- Complete formulas: `docs/KPI_FORMULAS.md`
- Dashboard tabs: `docs/DASHBOARD_TABS.md`

**AI Analysis Engine:**
- AI insights generation in `apps/web/src/lib/ai-analyzer.ts`
- Google Gemini integration in `apps/web/src/lib/gemini-ai.ts`
- Automatic trend detection and anomaly identification
- Confidence scoring and impact classification

**Data Ingestion:**
- SFTP client implementation in `apps/web/src/lib/sftp-client.ts`
- API routes: `apps/web/src/app/api/sftp/route.ts`, `.../import-sftp-real-data/route.ts`, `.../import-real-sftp-force/route.ts`
- Admin UI at `/admin` to list, test, and import from SFTP
- Note: legacy debug endpoints and an unused edge function were removed

### Component Architecture

**Main Dashboard Components:**
- `dashboard-page.tsx` - Main dashboard with tabs (Personal, Incidencias, Retención, Tendencias)
- `kpi-card.tsx` - Individual KPI display with variance
- `kpi-chart.tsx` - Recharts-based visualization component
- `ai-insights.tsx` - AI-powered insights display
- `retroactive-adjustment.tsx` - KPI adjustment with audit trail
- `filter-panel.tsx` - Dashboard filtering system

### Database Schema - Tablas Actuales (Verificadas con MCP Supabase)

**Última verificación:** Enero 2026 | **Project ID:** `ufdlwhdrrvktthcxwpzt`

---

#### TABLAS PRINCIPALES DE DATOS (SFTP)

**1. empleados_sftp (1,051 registros) - Master Employee Data**
```sql
-- Identificación
id: SERIAL PRIMARY KEY
numero_empleado: INTEGER UNIQUE NOT NULL  -- Número único de empleado
apellidos: VARCHAR NOT NULL
nombres: VARCHAR NOT NULL
nombre_completo: VARCHAR
gafete: VARCHAR

-- Datos Personales
genero: VARCHAR
imss: VARCHAR
fecha_nacimiento: DATE
estado: VARCHAR

-- Fechas Laborales
fecha_ingreso: DATE NOT NULL
fecha_antiguedad: DATE
fecha_baja: DATE
activo: BOOLEAN DEFAULT true  -- Estado actual del empleado

-- Organización
empresa: VARCHAR
registro_patronal: VARCHAR
codigo_puesto: VARCHAR
puesto: VARCHAR
codigo_depto: VARCHAR
departamento: VARCHAR
codigo_cc: VARCHAR
cc: VARCHAR
subcuenta_cc: VARCHAR
clasificacion: VARCHAR
codigo_area: VARCHAR
area: VARCHAR
ubicacion: VARCHAR

-- Nómina
tipo_nomina: VARCHAR
turno: VARCHAR
prestacion_ley: VARCHAR
paquete_prestaciones: VARCHAR

-- Metadata
fecha_creacion: TIMESTAMPTZ DEFAULT NOW()
fecha_actualizacion: TIMESTAMPTZ DEFAULT NOW()
```

**2. motivos_baja (676 registros) - Termination Records**
```sql
id: SERIAL PRIMARY KEY
numero_empleado: INTEGER NOT NULL  -- FK a empleados_sftp.numero_empleado
fecha_baja: DATE NOT NULL
tipo: VARCHAR NOT NULL  -- Clasificación del tipo de baja
motivo: VARCHAR NOT NULL  -- Motivo específico de la terminación
descripcion: TEXT
observaciones: TEXT  -- Campo adicional para notas
fecha_creacion: TIMESTAMPTZ DEFAULT NOW()
```

**3. incidencias (8,880 registros) - Incident Details**
```sql
id: SERIAL PRIMARY KEY
emp: INTEGER NOT NULL  -- Número de empleado
nombre: TEXT
fecha: DATE NOT NULL
turno: SMALLINT
horario: TEXT  -- Formato: 0830_1700
incidencia: TEXT  -- Descripción de la incidencia
entra: TIME  -- Hora de entrada
sale: TIME  -- Hora de salida
ordinarias: NUMERIC DEFAULT 0  -- Horas ordinarias
numero: INTEGER
inci: VARCHAR  -- Código de incidencia (VAC, INC, FJ, FI, etc.)
status: SMALLINT  -- Status numérico
ubicacion2: TEXT  -- Ubicación calculada desde CSV
fecha_creacion: TIMESTAMPTZ DEFAULT NOW()
```

**Códigos de Incidencia (inci):**
| Código | Descripción |
|--------|-------------|
| VAC | Vacaciones |
| INC | Incapacidad |
| FJ | Falta Justificada |
| FI | Falta Injustificada |
| SUSP | Suspensión |
| ENFE | Enfermedad |
| MAT1/MAT3 | Maternidad |
| PSIN | Permiso Sin Goce |
| PCON | Permiso Con Goce |
| FEST | Día Festivo |
| PATER | Permiso Paternidad |
| JUST | Justificación |

**4. prenomina_horizontal (374 registros) - Weekly Payroll**
```sql
id: SERIAL PRIMARY KEY
numero_empleado: INTEGER NOT NULL
nombre: VARCHAR NOT NULL
semana_inicio: DATE NOT NULL  -- Lunes de la semana
semana_fin: DATE NOT NULL  -- Domingo de la semana

-- Por cada día (lun, mar, mie, jue, vie, sab, dom):
{dia}_fecha: DATE
{dia}_horas_ord: NUMERIC DEFAULT 0  -- Horas ordinarias
{dia}_horas_te: NUMERIC DEFAULT 0  -- Horas extras
{dia}_incidencia: VARCHAR  -- Código de incidencia

-- Totales (columnas generadas automáticamente)
total_horas_ord: NUMERIC GENERATED  -- Suma automática de horas ordinarias
total_horas_te: NUMERIC GENERATED  -- Suma automática de horas extras
total_horas_semana: NUMERIC GENERATED CHECK (>=0 AND <=168)

fecha_creacion: TIMESTAMPTZ DEFAULT NOW()
fecha_actualizacion: TIMESTAMPTZ DEFAULT NOW()
```

---

#### TABLAS DE USUARIOS Y ACCESO

**5. user_profiles (1 registro) - User Accounts**
```sql
id: UUID PRIMARY KEY  -- FK a auth.users.id
email: TEXT UNIQUE NOT NULL
empresa: TEXT
role: TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user'))
created_at: TIMESTAMPTZ DEFAULT NOW()
updated_at: TIMESTAMPTZ DEFAULT NOW()
```

**6. user_empresa_access (0 registros) - Multi-Company Access**
```sql
user_id: UUID  -- FK a auth.users.id
empresa: TEXT
is_primary: BOOLEAN DEFAULT false
created_at: TIMESTAMPTZ DEFAULT NOW()
updated_at: TIMESTAMPTZ DEFAULT NOW()
PRIMARY KEY (user_id, empresa)
```

**7. sync_settings (1 registro) - Sync Configuration**
```sql
singleton: BOOLEAN PRIMARY KEY DEFAULT true
frequency: TEXT DEFAULT 'weekly' CHECK (IN ('manual', 'daily', 'weekly', 'monthly'))
day_of_week: TEXT DEFAULT 'monday'
run_time: TIME DEFAULT '02:00:00'
last_run: TIMESTAMPTZ
next_run: TIMESTAMPTZ
created_at: TIMESTAMPTZ DEFAULT NOW()
updated_at: TIMESTAMPTZ DEFAULT NOW()
```

---

#### TABLAS DE AUDITORÍA SFTP (Bitácora)

**8. sftp_file_structure (18 registros) - Structure History**
```sql
id: SERIAL PRIMARY KEY
filename: VARCHAR NOT NULL
file_type: VARCHAR NOT NULL
columns_json: JSONB NOT NULL  -- Array de nombres de columnas
row_count: INTEGER
checksum: VARCHAR(64)
imported_at: TIMESTAMPTZ DEFAULT NOW()
```

**9. sftp_import_log (0 registros) - Import Audit Log**
```sql
id: SERIAL PRIMARY KEY
trigger_type: VARCHAR DEFAULT 'manual'
status: VARCHAR DEFAULT 'pending'
structure_changes: JSONB DEFAULT '{"added": [], "removed": [], "renamed": []}'
has_structure_changes: BOOLEAN DEFAULT false
results: JSONB DEFAULT '{}'
requires_approval: BOOLEAN DEFAULT false
approved_by: TEXT
approved_at: TIMESTAMPTZ
rejection_reason: TEXT
started_at: TIMESTAMPTZ DEFAULT NOW()
completed_at: TIMESTAMPTZ
created_at: TIMESTAMPTZ DEFAULT NOW()
```

**10. sftp_file_versions (15 registros) - File Version History**
```sql
id: SERIAL PRIMARY KEY
original_filename: VARCHAR NOT NULL
versioned_filename: VARCHAR NOT NULL  -- Formato: archivo_2026_01_09_14_30_00.xlsx
file_type: VARCHAR NOT NULL
file_date: DATE DEFAULT CURRENT_DATE
file_timestamp: TIMESTAMPTZ DEFAULT NOW()
file_size_bytes: INTEGER
row_count: INTEGER
column_count: INTEGER
columns_json: JSONB
checksum_sha256: VARCHAR  -- Hash SHA256 para integridad
storage_path: TEXT
import_log_id: INTEGER  -- FK a sftp_import_log.id
created_at: TIMESTAMPTZ DEFAULT NOW()
```

**11. sftp_record_diffs (0 registros) - Record-Level Changes**
```sql
id: SERIAL PRIMARY KEY
import_log_id: INTEGER  -- FK a sftp_import_log.id
file_version_id: INTEGER  -- FK a sftp_file_versions.id
table_name: VARCHAR NOT NULL
record_key: VARCHAR NOT NULL
row_hash_previous: VARCHAR
row_hash_current: VARCHAR  -- SHA256 de todos los campos
change_type: VARCHAR CHECK (IN ('insert', 'update', 'delete', 'no_change'))
fields_changed: JSONB  -- Array de campos modificados
old_values: JSONB
new_values: JSONB
detected_at: TIMESTAMPTZ DEFAULT NOW()
```

**12. labs (0 registros) - Laboratory Reference**
```sql
id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
name: TEXT UNIQUE NOT NULL
contact: TEXT
convenio_url: TEXT
created_at: TIMESTAMPTZ DEFAULT NOW()
```

---

#### ⚠️ TABLA ELIMINADA
**asistencia_diaria** - Fue eliminada en migración `drop_asistencia_diaria` (2026-01-09).
Los datos de asistencia ahora se obtienen de `incidencias` y `prenomina_horizontal`.

---

**Data Flow Actualizado (Enero 2026):**
```
SFTP Files → Base de Datos Supabase
    ↓
empleados_sftp (1,051 registros)
motivos_baja (676 registros) ← FUENTE DE VERDAD para bajas
incidencias (8,880 registros)
prenomina_horizontal (374 registros)
    ↓
getEmpleadosSFTP() sincroniza automáticamente:
  - Carga motivos_baja PRIMERO
  - Sincroniza fecha_baja → PlantillaRecord[]
  - Garantiza coincidencia 100% (236 bajas en 2025)
    ↓
KPI Calculator usa PlantillaRecord[] sincronizado
    ↓
Dashboard muestra datos correctos
```

- `sftp_file_versions` + `sftp_record_diffs` proveen auditoría granular

## SFTP Admin Workflow

1) Configure env in `apps/web/.env.local`:
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
```
2) Run `npm run dev` (root) and open `/admin`.
3) Click “Actualizar Lista” to fetch SFTP files; “Probar Conexión” to validate.
4) Use “FORZAR IMPORTACIÓN REAL” or “Importación Estándar” to populate tables.

Notes:
- The API fails fast if SFTP env vars are missing (no insecure defaults).
- Excel/CSV parsing is handled server-side; batch inserts are used.

### SFTP Structure Change Detection (v2.0)

The system automatically detects structural changes (column additions/removals) in SFTP files and requires admin approval before proceeding with imports that have such changes.

**Workflow:**
1. User clicks "Actualizar Información (Manual)" in `/admin`
2. System downloads files and compares column structure with last import
3. If structural changes detected → Shows approval UI with added/removed columns
4. Admin approves → Import proceeds and new structure is saved as reference
5. If no structural changes → Import proceeds automatically

**Key Components:**
- `apps/web/src/lib/sftp-structure-comparator.ts` - Structure comparison logic
- `apps/web/src/app/api/sftp/approve/route.ts` - Approval endpoint
- `apps/web/src/app/api/import-sftp-real-data/route.ts` - Main import with structure check

**Principle:**
> "Solo pausar cuando cambia la ESTRUCTURA del archivo. Los datos (registros) fluyen automáticamente."

*(Ver sección "Database Schema - Tablas Actuales" para detalles completos de sftp_file_structure y sftp_import_log)*

### Type System

**Shared Types Location:** `packages/shared/src/types.ts`

**Key Interfaces:**
- `Employee`, `Department` - Core entity types
- `KPI`, `KPICategory` - KPI calculation types
- `AIInsight` - AI analysis results
- `ChartData`, `DrillDownData` - Visualization data types
- `FilterOptions` - Dashboard filtering
- `KPIAdjustment` - Retroactive adjustments audit

### Environment Configuration

**Required Environment Variables (apps/web/.env.local):**
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
```

### Development Notes

**Key Business Logic Files:**
- KPI calculations: `apps/web/src/lib/kpi-calculator.ts`
- KPI helpers (critical formulas): `apps/web/src/lib/utils/kpi-helpers.ts`
- AI analysis: `apps/web/src/lib/ai-analyzer.ts`
- Data ingestion: `apps/web/src/lib/sftp-client.ts`
- Supabase admin: `apps/web/src/lib/supabase-admin.ts`
- Normalizers: `apps/web/src/lib/normalizers.ts`
- Filters: `apps/web/src/lib/filters/filters.ts`

**UI Component System:**
- Uses shadcn/ui component library
- Tailwind CSS for styling
- Responsive design patterns
- Chart components with Recharts integration

**Data Flow:**
1. SFTP → API routes → `empleados_sftp`, `motivos_baja`, `incidencias`, `prenomina_horizontal`
2. Tables → KPI Calculator → Dashboard
3. KPI data → AI Analyzer → Insights
4. User interactions → Filters → Real-time updates

**Testing & Quality:**
- TypeScript strict mode enabled
- ESLint configuration with Next.js rules
- Type checking with `npm run type-check`
- Shared types prevent interface mismatches between frontend and backend
- **Comprehensive test suite:** 212 tests with 98% success rate, 80% coverage
- **Testing framework:** Vitest (unit/component) + Playwright (E2E)
- **CI/CD:** GitHub Actions runs tests automatically on PRs
- **Test documentation:** See `apps/web/TESTING.md` and `tabs/TEST_COVERAGE_EXHAUSTIVO.md`

## Coding Conventions & Best Practices

- TypeScript strict; avoid `any`. Narrow `unknown` in catch blocks.
- File naming: kebab-case files, PascalCase components.
- Imports: use `@/` alias for `apps/web/src`.
- Keep SFTP secrets in env; never hardcode credentials.
- Prefer server-side parsing (Excel/CSV) and batch inserts.
- For filters/derived data, use shared pure functions and memoization when applicable.
- Remove dead code and debug endpoints; keep repo minimal and secure.

## Testing Guidelines

### Test Structure

**Test files are located in `__tests__` directories:**
- Unit tests: `src/lib/__tests__/`
- Component tests: `src/components/__tests__/`
- Table tests: `src/components/tables/__tests__/`
- E2E tests: `e2e/`

**Test naming convention:** `T{tab}.{component}.{number}: Description`
- Example: `T1.10.1: Renderiza columnas correctas`
- Tab numbers: 1=Resumen, 2=Incidencias, 3=Rotación, 4=Tendencias

### Critical Test Areas

**KPI Helpers (`src/lib/utils/kpi-helpers.ts`):**
These functions calculate ALL rotation metrics and are business-critical:
- `calculateActivosPromedio()` - Average active employees
- `calcularRotacionConDesglose()` - Monthly rotation with voluntary/involuntary breakdown
- `calcularRotacionAcumulada12mConDesglose()` - 12-month rolling rotation
- `calcularRotacionYTDConDesglose()` - Year-to-date rotation

**All KPI helper functions MUST have tests. Never modify these without running tests first.**

### Running Tests During Development

```bash
# Before modifying KPI formulas
npm test -- kpi-helpers     # Verify helpers tests pass

# Before modifying filters
npm test -- filters         # Verify filter logic

# Before modifying components
npm test -- {component-name}  # Run specific component tests

# Before committing
npm run test:run            # All tests must pass
npm run type-check          # No TypeScript errors
```

### Mock Data

Use centralized mock data from `src/test/mockData.ts`:
- `mockPlantilla` - Sample employee data (empleados_sftp)
- `mockMotivosBaja` - Sample termination data
- `mockIncidencias` - Sample incident data (reemplaza mockAsistenciaDiaria)
- `mockPrenomina` - Sample weekly payroll data
- `createMockEmpleado()` - Helper to create custom test employees

### CI/CD

GitHub Actions (`.github/workflows/tests.yml`) automatically runs:
- Unit tests (Vitest)
- E2E tests (Playwright)
- Coverage reporting
- Lint + Type check

**PRs are blocked if tests fail.**

## Root Commands (Workspaces)

From repo root:
```
npm run dev        # dev server for apps/web
npm run build      # build apps/web
npm run start      # start production for apps/web
npm run lint       # ESLint (Next config)
npm run type-check # TypeScript check (apps/web)
```

## Clasificación de Códigos de Incidencia

| Categoría | Códigos | Descripción |
|-----------|---------|-------------|
| Vacaciones | VAC | Vacaciones (separado) |
| Faltas | FI, SUSP | Falta Injustificada, Suspensión |
| Salud | ENFE, MAT1, MAT3, ACCI, INCA | Enfermedad, Maternidad, Accidente, Incapacidad |
| Permisos | PSIN, PCON, FEST, PATER, JUST, FJ | Permisos varios (sin VAC) |

## Clasificación de Motivos de Baja (Actualizado Enero 2026)

**Fuente:** `apps/web/src/lib/normalizers.ts` → `MOTIVOS_REALES` (21 motivos únicos)

**Rotación Involuntaria (isMotivoClave = true):**
| Motivo | Casos | Descripción |
|--------|-------|-------------|
| Rescisión por desempeño | 12 | Terminación por bajo rendimiento |
| Rescisión por disciplina | 8 | Terminación por faltas disciplinarias |
| Término del contrato | 36 | Fin de contrato temporal |

**Rotación Voluntaria (isMotivoClave = false):**
| Motivo | Casos | Descripción |
|--------|-------|-------------|
| Baja Voluntaria | 421 | Renuncia genérica |
| Otra razón | 67 | Motivo no especificado |
| Abandono / No regresó | 46 | Abandono de trabajo |
| Regreso a la escuela | 15 | Retorno a estudios |
| Otro trabajo mejor compensado | 8 | Mejor oferta laboral |
| Trabajo muy difícil | 8 | Condiciones de trabajo |
| Cambio de domicilio | 4 | Mudanza |
| Falta quien cuide hijos | 4 | Cuidado de dependientes |
| No le gustó el tipo de trabajo | 4 | Desagrado por funciones |
| Problema de transporte | 4 | Dificultad de acceso |
| Ausentismo | 3 | Faltas recurrentes |
| Falta de oportunidades | 2 | Sin crecimiento |
| Cambio de ciudad | 1 | Mudanza mayor |
| Jubilación | 1 | Retiro |
| Motivos de salud | 1 | Problemas de salud |
| No le gustó el ambiente | 1 | Ambiente laboral |
| No le gustaron las instalaciones | 1 | Infraestructura |
| Poco salario y prestaciones | 1 | Compensación insuficiente |
| Problemas con jefe inmediato | 1 | Conflicto con supervisor |

**Funciones de normalizers.ts:**
- `normalizeMotivo(raw)`: Limpia encoding UTF-8 corrupto y mapea a nombres legibles
- `isMotivoClave(raw)`: Retorna `true` para motivos involuntarios (rescisión/término)