# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Guidelines (IMPORTANT - READ FIRST)

Before making any changes to this codebase, follow these rules:

1. First think through the problem, read the codebase for relevant files.
2. Before you make any major changes, check in with me and I will verify the plan.
3. Please every step of the way just give me a high level explanation of what changes you made.
4. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
5. Maintain a documentation file that describes how the architecture of the app works inside and out.
6. Never speculate about code you have not opened. If the user references a specific file, you MUST read the file before answering. Make sure to investigate and read relevant files BEFORE answering questions about the codebase. Never make any claims about code before investigating unless you are certain of the correct answer - give grounded and hallucination-free answers.

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
- SFTP Source Tables: `empleados_sftp`, `motivos_baja`, `asistencia_diaria`, `incidencias` (direct SFTP import)
- KPI calculation engine in `apps/web/src/lib/kpi-calculator.ts`
- Supabase client configuration in `apps/web/src/lib/supabase.ts`
- Shared retention filters in `apps/web/src/lib/filters/retention.ts`

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
- **Días**: Count(DISTINCT fechas from asistencia_diaria table) - Unique activity days
- **Bajas**: Count(empleados with fecha_baja in period) - Terminations from motivos_baja table
- **Incidencias**: Count(incidencia records from asistencia_diaria) - Total incidents from attendance data
- **Inc prom x empleado**: Incidencias / Activos_Promedio - Incidents per employee
- **Días Laborados**: (Activos / 7) × 6 - Estimated work days (6 days/week)
- **%incidencias**: (Incidencias / Días_Laborados) × 100 - Incident percentage

**SFTP Tables Architecture:**
- empleados_sftp: Master employee data with all HR information
- motivos_baja: Termination records with dates and reasons
- asistencia_diaria: Daily attendance with incident tracking
- incidencias: Detailed incident records with codes, timestamps, and locations

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

### Database Schema - SFTP Tables

**SFTP Source Tables (Supabase PostgreSQL):**

**1. empleados_sftp (Master Employee Data)**
```sql
id: SERIAL PRIMARY KEY
numero_empleado: INTEGER UNIQUE NOT NULL
apellidos: VARCHAR(200) NOT NULL
nombres: VARCHAR(200) NOT NULL
nombre_completo: VARCHAR(400)
departamento: VARCHAR(100)
puesto: VARCHAR(100)
area: VARCHAR(100)
fecha_ingreso: DATE NOT NULL
fecha_baja: DATE
activo: BOOLEAN NOT NULL DEFAULT true
empresa: VARCHAR(200)
fecha_creacion: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

**2. motivos_baja (Termination Records)**
```sql
id: SERIAL PRIMARY KEY
numero_empleado: INTEGER NOT NULL
fecha_baja: DATE NOT NULL
tipo: VARCHAR(100) NOT NULL
motivo: VARCHAR(200) NOT NULL
descripcion: TEXT
fecha_creacion: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

**3. asistencia_diaria (Daily Attendance)**
```sql
id: SERIAL PRIMARY KEY
numero_empleado: INTEGER NOT NULL
fecha: DATE NOT NULL
horas_trabajadas: DECIMAL(4,2) DEFAULT 8.0
horas_incidencia: DECIMAL(4,2) DEFAULT 0.0
presente: BOOLEAN DEFAULT true
fecha_creacion: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
UNIQUE(numero_empleado, fecha)
```

**4. incidencias (Incident Details)**
```sql
id: SERIAL PRIMARY KEY
emp: INTEGER NOT NULL -- Número de empleado
nombre: TEXT
fecha: DATE NOT NULL
turno: SMALLINT
horario: TEXT -- Formato: 0830_1700
incidencia: TEXT -- Descripción de la incidencia
entra: TIME -- Hora de entrada
sale: TIME -- Hora de salida
ordinarias: NUMERIC DEFAULT 0 -- Horas ordinarias
numero: INTEGER
inci: VARCHAR -- Código de incidencia (VAC, INC, FJ, FI, etc.)
status: SMALLINT -- Status numérico de la incidencia
ubicacion2: TEXT -- Ubicación calculada desde CSV
fecha_creacion: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```
**Incident Codes (inci):**
- VAC: Vacaciones
- INC: Incapacidad
- FJ: Falta Justificada
- FI: Falta Injustificada
- RET: Retardo
- PERM: Permiso

**Data Flow:**
- SFTP Files → empleados_sftp, motivos_baja, asistencia_diaria, incidencias
- KPI calculations use these 4 tables directly
- The `incidencias` table provides detailed incident tracking with timestamps and classifications

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

**Database Tables (Bitácora):**

**4. sftp_file_structure (Structure History)**
```sql
id: SERIAL PRIMARY KEY
filename: VARCHAR(500) NOT NULL
file_type: VARCHAR(50) NOT NULL
columns_json: JSONB NOT NULL
row_count: INTEGER
checksum: VARCHAR(64)
imported_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

**5. sftp_import_log (Import Audit Log)**
```sql
id: SERIAL PRIMARY KEY
trigger_type: VARCHAR(50) NOT NULL DEFAULT 'manual'
status: VARCHAR(50) NOT NULL DEFAULT 'pending'
structure_changes: JSONB DEFAULT '{"added": [], "removed": []}'
has_structure_changes: BOOLEAN DEFAULT FALSE
results: JSONB DEFAULT '{}'
requires_approval: BOOLEAN DEFAULT FALSE
approved_by: TEXT
approved_at: TIMESTAMP WITH TIME ZONE
started_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
completed_at: TIMESTAMP WITH TIME ZONE
```

**Principle:**
> "Solo pausar cuando cambia la ESTRUCTURA del archivo. Los datos (registros) fluyen automáticamente."

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
1. SFTP → API routes → `empleados_sftp`, `motivos_baja`, `asistencia_diaria`, `incidencias`
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
- `mockPlantilla` - Sample employee data
- `mockMotivosBaja` - Sample termination data
- `mockAsistenciaDiaria` - Sample attendance data
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
