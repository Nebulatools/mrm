# Granularity Feature Plan - HR KPI Dashboard

## Feature Overview

**Objective**: Enable users to click on any KPI card, graph, or indicator in the dashboard to see the underlying database data with full transparency.

**User Flow**:
1. User clicks KPI card/graph/indicator in any tab
2. Redirected to `/dashboard/data/[dataSourceId]`
3. User sees filtered database table(s) showing exactly what data powers that component
4. If component uses multiple tables, shows both tables with their relationship (PK/FK)

## Confirmed Design Decisions

| Decision | Choice |
|----------|--------|
| **Scope** | All 40+ elements at once |
| **Table Relationships** | Visual ER diagram showing PK→FK connection |
| **Data Viewer Filtering** | Pre-filtered by dashboard + search/sort within results |
| **URL Structure** | `/dashboard/data/[sourceId]` (e.g., `/dashboard/data/rotacion-bajas-voluntarias`) |

---

## Database Tables Involved

| Table | Records | Primary Key | Foreign Keys |
|-------|---------|-------------|--------------|
| `empleados_sftp` | 1,051 | `id`, `numero_empleado` (unique) | - |
| `motivos_baja` | 676 | `id` | `numero_empleado` → `empleados_sftp` |
| `incidencias` | 8,880 | `id` | `emp` → `empleados_sftp.numero_empleado` |
| `prenomina_horizontal` | 374 | `id` | `numero_empleado` → `empleados_sftp` (logical) |

---

## Components to Implement

### Phase 1: Core Infrastructure

- [ ] **1.1 Create DataSource Configuration System**
  - File: `apps/web/src/lib/data-sources/config.ts`
  - Define all clickable components with their data sources
  - Include: tables used, columns needed, filter mappings, PK/FK relationships

- [ ] **1.2 Create Data Source Types**
  - File: `packages/shared/src/types.ts` (extend)
  - Types: `DataSourceConfig`, `TableSchema`, `ColumnMapping`, `FilterMapping`

- [ ] **1.3 Create Data Viewer Page**
  - Route: `apps/web/src/app/dashboard/data/[sourceId]/page.tsx`
  - Dynamic page that receives sourceId and shows filtered data

- [ ] **1.4 Create DataTable Component**
  - File: `apps/web/src/components/data-viewer/data-table.tsx`
  - Reusable table component with:
    - Column headers with types
    - Pagination
    - Search/filter capability
    - Export option (CSV)

- [ ] **1.5 Create TableRelationship Component**
  - File: `apps/web/src/components/data-viewer/table-relationship.tsx`
  - Shows visual diagram when 2 tables are used
  - Displays PK/FK connection

### Phase 2: TAB 1 - RESUMEN (5 clickable elements)

- [ ] **2.1 SummaryComparison KPIs - Headcount Section**
  - KPI: "Activos al cierre"
  - Tables: `empleados_sftp`
  - Columns: `numero_empleado`, `nombre_completo`, `fecha_ingreso`, `fecha_baja`, `activo`, `departamento`, `area`
  - Filter: `activo=true` AND `fecha_ingreso <= endDate` AND (`fecha_baja IS NULL` OR `fecha_baja > endDate`)

- [ ] **2.2 SummaryComparison KPIs - Ingresos**
  - KPI: "Ingresos del período"
  - Tables: `empleados_sftp`
  - Columns: `numero_empleado`, `nombre_completo`, `fecha_ingreso`, `departamento`, `puesto`, `area`
  - Filter: `fecha_ingreso` BETWEEN startDate AND endDate

- [ ] **2.3 SummaryComparison KPIs - Bajas**
  - KPI: "Bajas del período"
  - Tables: `empleados_sftp` + `motivos_baja`
  - Columns empleados: `numero_empleado`, `nombre_completo`, `fecha_baja`, `departamento`
  - Columns motivos: `motivo`, `tipo`, `descripcion`
  - Relationship: `empleados_sftp.numero_empleado` = `motivos_baja.numero_empleado`
  - Filter: `fecha_baja` BETWEEN startDate AND endDate

- [ ] **2.4 SummaryComparison KPIs - Rotación**
  - KPI: "Rotación Mensual/Acumulada/YTD"
  - Tables: `empleados_sftp` + `motivos_baja`
  - Columns: Same as 2.3 plus calculation explanation
  - Filter: Period-specific bajas + activos for denominator

- [ ] **2.5 SummaryComparison KPIs - Incidencias**
  - KPI: "% Incidencias"
  - Tables: `incidencias` + `empleados_sftp`
  - Columns incidencias: `emp`, `nombre`, `fecha`, `inci`, `incidencia`, `ubicacion2`
  - Columns empleados: `departamento`, `area`, `puesto`
  - Relationship: `incidencias.emp` = `empleados_sftp.numero_empleado`
  - Filter: `fecha` BETWEEN startDate AND endDate + employee filters

### Phase 3: TAB 2 - PERSONAL (11 clickable elements)

- [ ] **3.1 KPI Card: Activos al cierre**
  - Same as 2.1

- [ ] **3.2 KPI Card: Ingresos (Mes)**
  - Same as 2.2

- [ ] **3.3 KPI Card: Bajas (Mes)**
  - Same as 2.3

- [ ] **3.4 KPI Card: Antigüedad Promedio**
  - Tables: `empleados_sftp`
  - Columns: `numero_empleado`, `nombre_completo`, `fecha_ingreso`, `fecha_antiguedad`, calculated `meses_antiguedad`
  - Filter: Active employees in period

- [ ] **3.5 KPI Card: Empl. < 3 meses**
  - Tables: `empleados_sftp`
  - Columns: Same as 3.4
  - Filter: Active + seniority < 3 months

- [ ] **3.6 Chart: Clasificación**
  - Tables: `empleados_sftp`
  - Columns: `numero_empleado`, `nombre_completo`, `clasificacion`, `departamento`
  - Filter: Active in period, grouped by `clasificacion`

- [ ] **3.7 Chart: Distribución por Edad**
  - Tables: `empleados_sftp`
  - Columns: `numero_empleado`, `nombre_completo`, `fecha_nacimiento`, calculated `edad`
  - Filter: Active in period

- [ ] **3.8 Chart: Antigüedad por Área**
  - Tables: `empleados_sftp`
  - Columns: `numero_empleado`, `nombre_completo`, `area`, `fecha_antiguedad`, calculated `bin_antiguedad`
  - Filter: Active in period, grouped by `area`

- [ ] **3.9 Chart: Antigüedad por Departamento**
  - Tables: `empleados_sftp`
  - Columns: Same as 3.8 but grouped by `departamento`

- [ ] **3.10 Table: Age & Gender Cross-Tab**
  - Tables: `empleados_sftp`
  - Columns: `numero_empleado`, `nombre_completo`, `fecha_nacimiento`, `genero`, calculated `rango_edad`
  - Filter: Active in period

- [ ] **3.11 Table: Seniority & Gender Cross-Tab**
  - Tables: `empleados_sftp`
  - Columns: `numero_empleado`, `nombre_completo`, `fecha_antiguedad`, `genero`, calculated `bin_antiguedad`
  - Filter: Active in period

### Phase 4: TAB 3 - INCIDENCIAS (11 clickable elements)

- [ ] **4.1 KPI Card: Incidencias (Total)**
  - Tables: `incidencias` + `empleados_sftp`
  - Columns incidencias: `emp`, `nombre`, `fecha`, `inci`, `incidencia`
  - Relationship: emp → numero_empleado
  - Filter: `fecha` in period + incident codes (FI, SUSP, ENFE, etc.)

- [ ] **4.2 KPI Card: Inc prom x empleado**
  - Same as 4.1 (shows calculation breakdown)

- [ ] **4.3 KPI Card: Ausentismos (Total)**
  - Tables: `incidencias`
  - Columns: `emp`, `nombre`, `fecha`, `inci`, `incidencia`, `ubicacion2`
  - Filter: All absence codes including VAC

- [ ] **4.4 KPI Card: Permisos**
  - Tables: `incidencias`
  - Columns: Same as 4.3
  - Filter: Only permit codes (PSIN, PCON, FEST, PATER, JUST)

- [ ] **4.5 Chart: Incidencias por Tipo (Pie)**
  - Tables: `incidencias`
  - Columns: `inci`, COUNT(*), `incidencia`
  - Filter: Period + grouped by `inci`

- [ ] **4.6 Chart: Ausentismos por Tipo (Pie)**
  - Tables: `incidencias`
  - Columns: Same as 4.5
  - Filter: Only absence codes

- [ ] **4.7 Chart: Ausentismos Mensual (Line)**
  - Tables: `incidencias`
  - Columns: `fecha` (month), COUNT(*)
  - Filter: Year filter, grouped by month

- [ ] **4.8 Chart: Ausentismos por Ubicación (Bar)**
  - Tables: `incidencias`
  - Columns: `ubicacion2`, COUNT(*), sample records
  - Filter: Period + grouped by `ubicacion2`

- [ ] **4.9 Chart: Ausentismos por Día de Semana**
  - Tables: `incidencias`
  - Columns: `fecha`, calculated `dia_semana`, COUNT(*)
  - Filter: Period + grouped by day of week

- [ ] **4.10 AbsenteeismTable (existing)**
  - Tables: `incidencias` + `empleados_sftp`
  - Full columns from both tables
  - Filter: All dashboard filters applied

- [ ] **4.11 Make AbsenteeismTable row-clickable**
  - Clicking a row shows employee detail from `empleados_sftp`

### Phase 5: TAB 4 - ROTACIÓN (14 clickable elements)

- [ ] **5.1 KPI Card: Activos Promedio**
  - Tables: `empleados_sftp`
  - Columns: `numero_empleado`, `nombre_completo`, `fecha_ingreso`, `fecha_baja`
  - Shows: Employees at period start + employees at period end

- [ ] **5.2 KPI Card: Bajas Voluntarias**
  - Tables: `empleados_sftp` + `motivos_baja`
  - Filter: `motivo` NOT IN (involuntary motivos)

- [ ] **5.3 KPI Card: Bajas Involuntarias (secondary)**
  - Tables: Same as 5.2
  - Filter: `motivo` IN (Rescisión por desempeño, Rescisión por disciplina, Término del contrato)

- [ ] **5.4 KPI Card: Rotación Mensual**
  - Tables: `empleados_sftp` + `motivos_baja`
  - Shows: Numerator (bajas) + Denominator (activos promedio)

- [ ] **5.5 KPI Card: Rotación Acumulada 12M**
  - Same tables, 12-month window

- [ ] **5.6 KPI Card: Rotación YTD**
  - Same tables, Jan 1 to period end

- [ ] **5.7 Chart: Monthly Retention (Composed)**
  - Tables: `empleados_sftp` + `motivos_baja`
  - Columns: month, bajas count, activos count, rotation %
  - Filter: Selected year

- [ ] **5.8 Chart: Yearly Comparison**
  - Same as 5.7 but multiple years

- [ ] **5.9 Chart: Bajas por Temporalidad**
  - Tables: `empleados_sftp` + `motivos_baja`
  - Columns: `fecha_ingreso`, `fecha_baja`, calculated `tenure_bin`
  - Filter: Bajas in period grouped by tenure

- [ ] **5.10 Heatmap: Bajas por Motivo**
  - Tables: `motivos_baja`
  - Columns: `fecha_baja` (month), `motivo`, COUNT(*)
  - Filter: Year, grouped by month × motivo

- [ ] **5.11 Table: Rotation by Motive & Area**
  - Tables: `motivos_baja` + `empleados_sftp`
  - Columns motivos: `motivo`, COUNT(*)
  - Columns empleados: `area`
  - Filter: Period + grouped by motivo × area

- [ ] **5.12 Table: Rotation by Motive & Seniority**
  - Same as 5.11 but grouped by tenure bin

- [ ] **5.13 Table: Rotation by Motive & Month**
  - Tables: `motivos_baja`
  - Grouped by motivo × month

- [ ] **5.14 DismissalReasonsTable (existing)**
  - Tables: `empleados_sftp` + `motivos_baja`
  - Full detail of terminated employees
  - Make rows clickable for employee detail

### Phase 6: Shared Components & Polish

- [ ] **6.1 Create ClickableWrapper HOC**
  - File: `apps/web/src/components/data-viewer/clickable-wrapper.tsx`
  - Wraps any component to make it clickable with data source link
  - Props: `dataSourceId`, `children`, `filters`

- [ ] **6.2 Add visual click indicator**
  - Cursor pointer on hover
  - Subtle border/shadow animation
  - Small "Ver datos" icon on hover

- [ ] **6.3 Breadcrumb navigation**
  - Show path: Dashboard > Tab Name > Component Name > Data View
  - Allow easy return to dashboard with filters preserved

- [ ] **6.4 Filter persistence**
  - Pass current filters via URL params or context
  - Data view page applies same filters as dashboard

- [ ] **6.5 Formula explanation panel**
  - Show calculation formula for KPIs
  - Example: "Rotación = (Bajas / Activos Promedio) × 100"

- [ ] **6.6 Export functionality**
  - CSV download of visible data
  - Include filter info in export

- [ ] **6.7 Empty state handling**
  - Message when no data matches filters
  - Suggest filter adjustments

### Phase 7: Testing & Documentation

- [ ] **7.1 Unit tests for data source configs**
- [ ] **7.2 Integration tests for data viewer page**
- [ ] **7.3 E2E tests for click-to-data flow**
- [ ] **7.4 Update CLAUDE.md with new architecture**
- [ ] **7.5 Create user guide for granularity feature**

---

## Data Source Configuration Schema

```typescript
interface DataSourceConfig {
  id: string;                    // Unique identifier (e.g., "personal-activos-cierre")
  name: string;                  // Display name (e.g., "Activos al Cierre")
  description: string;           // What this data represents
  tab: 'resumen' | 'personal' | 'incidencias' | 'rotacion';
  componentType: 'kpi-card' | 'chart' | 'table';

  tables: TableConfig[];         // Tables used (1 or 2)
  relationship?: {               // If 2 tables
    type: 'inner' | 'left';
    sourceTable: string;
    sourceColumn: string;
    targetTable: string;
    targetColumn: string;
  };

  filterMapping: FilterMapping;  // How dashboard filters apply
  formula?: string;              // Calculation formula (for KPIs)
}

interface TableConfig {
  name: string;                  // Database table name
  alias?: string;                // Display alias
  columns: ColumnConfig[];       // Columns to show
  primaryKey: string;
}

interface ColumnConfig {
  name: string;                  // Column name in DB
  displayName: string;           // User-friendly name
  type: 'text' | 'number' | 'date' | 'boolean' | 'calculated';
  calculation?: string;          // If calculated, the formula
  visible: boolean;              // Show in data view
}

interface FilterMapping {
  dateField?: string;            // Which column to filter by date
  employeeIdField?: string;      // Which column links to employees
  applyDepartmentFilter?: boolean;
  applyAreaFilter?: boolean;
  applyPuestoFilter?: boolean;
  customFilters?: Record<string, any>;
}
```

---

## Route Structure

```
/dashboard                    # Main dashboard with 4 tabs
/dashboard/data/[sourceId]    # Data viewer for specific component
  ?year=2025
  &month=12
  &departamento=IT
  &area=Desarrollo
  ...
```

---

## Verification Plan

1. **Manual Testing**: Click each of the 41+ clickable elements and verify correct data display
2. **Filter Verification**: Apply filters on dashboard, click element, verify same filters in data view
3. **Multi-table Verification**: For components using 2 tables, verify relationship display
4. **Edge Cases**: Test with empty results, single record, thousands of records

---

## Estimated Clickable Elements

| Tab | KPI Cards | Charts | Tables | Total |
|-----|-----------|--------|--------|-------|
| Resumen | 5 | 0 | 0 | 5 |
| Personal | 5 | 4 | 2 | 11 |
| Incidencias | 4 | 5 | 1 | 10 |
| Rotación | 5 | 4 | 5 | 14 |
| **Total** | **19** | **13** | **8** | **40** |

Plus additional row-click functionality on detail tables = ~40-45 clickable data sources.
