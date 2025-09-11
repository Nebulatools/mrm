# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- SFTP Source Tables: `empleados_sftp`, `motivos_baja`, `asistencia_diaria` (direct SFTP import)
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

**Data Flow:**
- SFTP Files → empleados_sftp, motivos_baja, asistencia_diaria
- KPI calculations use these 3 tables directly

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
- AI analysis: `apps/web/src/lib/ai-analyzer.ts`
- Data ingestion: `apps/web/src/lib/sftp-client.ts`
- Supabase admin: `apps/web/src/lib/supabase-admin.ts`

**UI Component System:**
- Uses shadcn/ui component library
- Tailwind CSS for styling
- Responsive design patterns
- Chart components with Recharts integration

**Data Flow:**
1. SFTP → API routes → `empleados_sftp`, `motivos_baja`, `asistencia_diaria`
2. Tables → KPI Calculator → Dashboard
3. KPI data → AI Analyzer → Insights
4. User interactions → Filters → Real-time updates

**Testing & Quality:**
- TypeScript strict mode enabled
- ESLint configuration with Next.js rules
- Type checking with `npm run type-check`
- Shared types prevent interface mismatches between frontend and backend

## Coding Conventions & Best Practices

- TypeScript strict; avoid `any`. Narrow `unknown` in catch blocks.
- File naming: kebab-case files, PascalCase components.
- Imports: use `@/` alias for `apps/web/src`.
- Keep SFTP secrets in env; never hardcode credentials.
- Prefer server-side parsing (Excel/CSV) and batch inserts.
- For filters/derived data, use shared pure functions and memoization when applicable.
- Remove dead code and debug endpoints; keep repo minimal and secure.

## Root Commands (Workspaces)

From repo root:
```
npm run dev        # dev server for apps/web
npm run build      # build apps/web
npm run start      # start production for apps/web
npm run lint       # ESLint (Next config)
npm run type-check # TypeScript check (apps/web)
```
