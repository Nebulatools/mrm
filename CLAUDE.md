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
/hr-kpi-dashboard
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
- Legacy SFTP tables: `plantilla`, `incidencias`, `act` (raw data ingestion)
- Normalized tables: `employees`, `departments`, `absence_records`, `payroll_records`
- KPI calculation engine in `apps/web/src/lib/kpi-calculator.ts`
- Supabase client configuration in `apps/web/src/lib/supabase.ts`

**Frontend Organization:**
- App Router structure in `apps/web/src/app/`
- Shared components in `apps/web/src/components/`
- Business logic in `apps/web/src/lib/`
- Shared types in `packages/shared/src/types.ts`

**KPI Calculation System:**
The system implements specific business formulas (CORRECTED 2025):
- **Activos**: Count of unique employees in ACT table for the period
- **Activos Prom**: Average active employees (NOT employees/days) - represents headcount
- **Rotación Mensual**: `(Bajas del Período / Activos Prom) * 100` - only departures within the specific period
- **Inc prom x empleado**: `Incidencias/Activos Prom`
- **%incidencias**: `Incidencias/días Laborados`

**AI Analysis Engine:**
- AI insights generation in `apps/web/src/lib/ai-analyzer.ts`
- Google Gemini integration in `apps/web/src/lib/gemini-ai.ts`
- Automatic trend detection and anomaly identification
- Confidence scoring and impact classification

**Data Ingestion:**
- SFTP client implementation in `apps/web/src/lib/sftp-client.ts`
- Import logging and error handling
- Edge Functions for serverless data processing

### Component Architecture

**Main Dashboard Components:**
- `dashboard-page.tsx` - Main dashboard with tabs (Personal, Incidencias, Retención, Tendencias)
- `kpi-card.tsx` - Individual KPI display with variance
- `kpi-chart.tsx` - Recharts-based visualization component
- `ai-insights.tsx` - AI-powered insights display
- `retroactive-adjustment.tsx` - KPI adjustment with audit trail
- `filter-panel.tsx` - Dashboard filtering system

### Database Schema - Complete Reference

**Primary Tables (Supabase PostgreSQL):**

**1. PLANTILLA (Employee Master Data)**
```sql
id: SERIAL PRIMARY KEY
emp_id: VARCHAR(20) UNIQUE -- Employee ID (e.g., 'ACT001', 'TEC005')
nombre: VARCHAR(200) -- Full name
departamento: VARCHAR(100) -- Department (RH, Tecnología, Ventas, Marketing, Operaciones, Finanzas)
activo: BOOLEAN -- Employment status (true=active, false=terminated)
fecha_ingreso: DATE -- Hire date
fecha_baja: DATE NULL -- Termination date (NULL if active)
puesto: VARCHAR(100) -- Job title
area: VARCHAR(100) -- Functional area within department
motivo_baja: VARCHAR(200) NULL -- Termination reason (NULL if active)
created_at: TIMESTAMP DEFAULT NOW()
updated_at: TIMESTAMP DEFAULT NOW()
```

**2. ACT (Daily Activity Records)**
```sql
id: SERIAL PRIMARY KEY
emp_id: VARCHAR(20) -- References PLANTILLA.emp_id
fecha: DATE -- Activity date
presente: BOOLEAN -- Attendance status
created_at: TIMESTAMP DEFAULT NOW()
```

**3. INCIDENCIAS (Incident Records)**
```sql
id: SERIAL PRIMARY KEY
emp_id: VARCHAR(20) -- References PLANTILLA.emp_id
fecha: DATE -- Incident date
tipo: VARCHAR(100) -- Incident type (Tardanza, Falta injustificada, etc.)
descripcion: TEXT -- Incident description
created_at: TIMESTAMP DEFAULT NOW()
```

**Data Relationships:**
- PLANTILLA is the master table (115 total records as of Sept 2025)
- ACT links to PLANTILLA via emp_id (activity tracking)
- INCIDENCIAS links to PLANTILLA via emp_id (incident tracking)

**Current Data Distribution:**
- **Active Employees**: 73 (activo = true)
- **Terminated Employees**: 42 (activo = false, distributed across 2025)
- **Departments**: RH (15), Tecnología (25), Ventas (15), Marketing (10), Operaciones (8), Finanzas (varies)
- **Monthly Terminations 2025**: Jan(2), Feb(3), Mar(4), Apr(2), May(3), Jun(1), Jul(2), Aug(4), Sep+

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
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
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
1. SFTP → Edge Functions → Legacy tables
2. Legacy tables → KPI Calculator → Dashboard
3. KPI data → AI Analyzer → Insights
4. User interactions → Filters → Real-time updates

**Testing & Quality:**
- TypeScript strict mode enabled
- ESLint configuration with Next.js rules
- Type checking with `npm run type-check`
- Shared types prevent interface mismatches between frontend and backend