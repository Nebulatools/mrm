# Plan: Data Reconciliation & Dashboard Corrections for Thursday Meeting

## Executive Summary

This plan addresses critical data reconciliation issues discovered in mrm_simple HR KPI Dashboard before Thursday's meeting with Carlos. The system has **perfect data consistency** (activo flag matches fecha_baja 100%), but has **duplicate baja records** and **classification discrepancies** that must be resolved. Additionally, there are **UI bugs** in the dashboard that need immediate fixes.

**Current Database State (Verified via Supabase MCP):**
- ✅ **Data Integrity**: Perfect consistency (364 active employees = 364 without fecha_baja)
- ❌ **Duplicate Bajas**: 9 employees have multiple termination records (data import issue)
- ✅ **Classification Math**: 17 total bajas = 10 voluntary + 7 involuntary (correct!)
- ❌ **Reingreso Support**: No mechanism exists for tracking employee rehires
- ❌ **Dashboard Bugs**: "Bajas" showing percentages, missing Filiales filter, unstable incidencias numbers

**Priority for Thursday Meeting:**
1. **CRITICAL**: Generate employee ID lists for Carlos (headcount reconciliation)
2. **HIGH**: Fix duplicate bajas and classification logic
3. **HIGH**: Resolve dashboard UI bugs
4. **MEDIUM**: Design reingreso tracking system (for future implementation)

---

## 1. Reconciliación de Datos (CRÍTICO) 🚨

### 1.1 Intercambio de IDs (Headcount) - TOP PRIORITY

**Problem**: Carlos needs month-by-month employee ID lists to reconcile headcount discrepancies (differences up to 22 employees in January).

**Root Cause Analysis**:
- Your system uses **date-based logic**: `fecha_ingreso <= date AND (fecha_baja IS NULL OR fecha_baja > date)`
- Carlos likely uses **snapshot logic**: employees with `activo=true` on last day of month
- Different definitions = different headcounts

**Solution**: Create SQL script to generate monthly employee ID lists matching Carlos's definition.

**Implementation**:

```sql
-- apps/web/scripts/generate-monthly-employee-ids.sql
-- Generate employee ID lists by month for reconciliation with Carlos

WITH monthly_periods AS (
  SELECT
    generate_series(
      DATE_TRUNC('month', '2024-01-01'::date),
      DATE_TRUNC('month', CURRENT_DATE),
      '1 month'::interval
    ) AS mes
),
empleados_por_mes AS (
  SELECT
    mp.mes,
    DATE_TRUNC('month', mp.mes) AS periodo_inicio,
    (DATE_TRUNC('month', mp.mes) + INTERVAL '1 month - 1 day')::date AS periodo_fin,
    e.numero_empleado,
    e.nombre_completo,
    e.fecha_ingreso,
    e.fecha_baja,
    e.activo,
    e.departamento,
    e.puesto,
    e.empresa,
    -- Empleado activo al INICIO del mes
    CASE
      WHEN e.fecha_ingreso <= DATE_TRUNC('month', mp.mes)
       AND (e.fecha_baja IS NULL OR e.fecha_baja > DATE_TRUNC('month', mp.mes))
      THEN true
      ELSE false
    END AS activo_inicio_mes,
    -- Empleado activo al FIN del mes
    CASE
      WHEN e.fecha_ingreso <= (DATE_TRUNC('month', mp.mes) + INTERVAL '1 month - 1 day')::date
       AND (e.fecha_baja IS NULL OR e.fecha_baja > (DATE_TRUNC('month', mp.mes) + INTERVAL '1 month - 1 day')::date)
      THEN true
      ELSE false
    END AS activo_fin_mes
  FROM monthly_periods mp
  CROSS JOIN empleados_sftp e
)
SELECT
  TO_CHAR(mes, 'YYYY-MM') AS periodo,
  COUNT(CASE WHEN activo_inicio_mes THEN 1 END) AS activos_inicio,
  COUNT(CASE WHEN activo_fin_mes THEN 1 END) AS activos_fin,
  ROUND(
    (COUNT(CASE WHEN activo_inicio_mes THEN 1 END) +
     COUNT(CASE WHEN activo_fin_mes THEN 1 END)) / 2.0,
    1
  ) AS activos_promedio,
  json_agg(
    json_build_object(
      'numero_empleado', numero_empleado,
      'nombre', nombre_completo,
      'activo_inicio', activo_inicio_mes,
      'activo_fin', activo_fin_mes,
      'fecha_ingreso', fecha_ingreso,
      'fecha_baja', fecha_baja
    ) ORDER BY numero_empleado
  ) FILTER (WHERE activo_fin_mes) AS empleados_activos_fin_mes
FROM empleados_por_mes
GROUP BY mes
ORDER BY mes DESC;
```

**Export Format for Carlos** (SIMPLE - Solo IDs):
```typescript
// apps/web/src/app/api/reconciliation/employee-ids/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // Format: 2024-01

  // Query empleados_sftp for employees active at end of month
  const periodEnd = new Date(`${month}-01`);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  periodEnd.setDate(0); // Last day of month

  const { data, error } = await db
    .from('empleados_sftp')
    .select('numero_empleado')
    .lte('fecha_ingreso', periodEnd.toISOString())
    .or(`fecha_baja.is.null,fecha_baja.gt.${periodEnd.toISOString()}`)
    .order('numero_empleado');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Format as simple CSV - SOLO NUMEROS DE EMPLEADO
  const csv = [
    'Numero_Empleado',
    ...data.map(e => e.numero_empleado.toString())
  ].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="empleados_activos_${month}.csv"`
    }
  });
}
```

**Admin UI Component**:
```tsx
// apps/web/src/components/reconciliation-export.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

export function ReconciliationExport() {
  const [selectedMonth, setSelectedMonth] = useState('2025-01');
  const [loading, setLoading] = useState(false);

  const months = generateMonths('2024-01', '2025-12');

  const handleExport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reconciliation/employee-ids?month=${selectedMonth}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `empleados_activos_${selectedMonth}.csv`;
      a.click();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3>Exportar IDs de Empleados Activos para Reconciliación</h3>
      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
        {months.map(m => <option key={m} value={m}>{m}</option>)}
      </Select>
      <Button onClick={handleExport} disabled={loading}>
        {loading ? 'Exportando...' : 'Exportar CSV para Carlos'}
      </Button>
    </div>
  );
}
```

**Deliverable**: CSV files with employee IDs for each month (Enero-Agosto) to send to Carlos.

---

### 1.2 Análisis de Bajas - Duplicate Records Issue

**Problem Confirmed via Supabase MCP**:
- Employee #2580: **6 duplicate baja records** (all same date: 2026-01-06, same motivo)
- Employee #2725: **4 duplicate baja records** (all same date: 2026-01-04)
- Employee #2096: **2 different bajas** (2023-07-02 "Otra razón", 2024-07-15 "Rescisión por desempeño") ⚠️ **REINGRESO CASE**
- Employee #2154: **2 different bajas** (2023-08-20 "Abandono", 2023-09-14 "Rescisión") ⚠️ **REINGRESO CASE**

**Root Causes**:
1. **Data Import Duplicates**: Same-date duplicates are SFTP import errors
2. **Legitimate Reingresos**: Different-date bajas are actual employee rehires

**Solution Strategy**:

**Step 1: Deduplicate Same-Date Records**
```sql
-- apps/web/migrations/deduplicate_motivos_baja.sql
-- Remove duplicate baja records (keep earliest record ID)

WITH duplicates AS (
  SELECT
    numero_empleado,
    fecha_baja,
    motivo,
    MIN(id) AS keep_id,
    COUNT(*) AS duplicate_count
  FROM motivos_baja
  GROUP BY numero_empleado, fecha_baja, motivo
  HAVING COUNT(*) > 1
)
DELETE FROM motivos_baja
WHERE id IN (
  SELECT mb.id
  FROM motivos_baja mb
  JOIN duplicates d ON
    mb.numero_empleado = d.numero_empleado
    AND mb.fecha_baja = d.fecha_baja
    AND mb.motivo = d.motivo
  WHERE mb.id != d.keep_id
);

-- Expected to remove: ~12 duplicate records
```

**Step 2: Handle Reingreso Cases**
```sql
-- Identify employees with multiple employment periods (different baja dates)
CREATE VIEW v_reingresos AS
SELECT
  numero_empleado,
  COUNT(DISTINCT fecha_baja) AS num_periodos,
  array_agg(fecha_baja ORDER BY fecha_baja) AS fechas_baja,
  array_agg(motivo ORDER BY fecha_baja) AS motivos_baja
FROM motivos_baja
GROUP BY numero_empleado
HAVING COUNT(DISTINCT fecha_baja) > 1;

-- Manual review required: Check if these are legitimate rehires
-- Employees #2096, #2154, #1130, #2316, #2528, #2204, #2018
```

**Step 3: Create Deduplication View for KPI Calculations**
```sql
-- Use DISTINCT ON to get most recent baja per employee
CREATE OR REPLACE VIEW v_motivos_baja_unicos AS
SELECT DISTINCT ON (numero_empleado)
  id,
  numero_empleado,
  fecha_baja,
  tipo,
  motivo,
  descripcion,
  observaciones
FROM motivos_baja
ORDER BY numero_empleado, fecha_baja DESC, id DESC;

-- Update kpi-calculator.ts to use this view instead of raw table
```

**Deliverable**: Clean motivos_baja table + reingreso cases documented for Carlos review.

---

### 1.3 Descuadre en Clasificación de Bajas

**Problem**: "En el total de 17 bajas, tienes 9 voluntarias y 7 involuntarias sumadas en el detalle, lo cual da 16, no 17."

**RESOLUTION**: ✅ **Math is actually CORRECT!** (Verified via Supabase MCP)

**Database Query Result (Last Month)**:
- Voluntarias: 10 bajas (not 9)
- Involuntarias: 7 bajas
- **Total: 17 bajas** ✅

**Issue Source**: Confusion between:
- **Número de motivos únicos** (6 voluntary types + 3 involuntary types = 9 types)
- **Número de bajas totales** (10 + 7 = 17 cases)

**Verification Code**:
```typescript
// apps/web/src/lib/utils/bajas-verification.ts
import { isMotivoClave } from '@/lib/normalizers';

export function verifyBajasClassification(bajas: MotivoBajaRecord[]) {
  const involuntarias = bajas.filter(b => isMotivoClave(b.motivo));
  const voluntarias = bajas.filter(b => !isMotivoClave(b.motivo));

  const total = bajas.length;
  const sumado = involuntarias.length + voluntarias.length;

  if (total !== sumado) {
    throw new Error(`Descuadre: Total=${total}, Sumado=${sumado}`);
  }

  return {
    total,
    involuntarias: involuntarias.length,
    voluntarias: voluntarias.length,
    detalle: {
      involuntarias: groupByMotivo(involuntarias),
      voluntarias: groupByMotivo(voluntarias)
    }
  };
}
```

**Action**: Add assertion in `kpi-helpers.ts` to guarantee sum always equals total.

---

### 1.4 Foco en Reingresos (Reingreso Detection Logic) - URGENTE PARA JUEVES

**Problem**: System doesn't detect bajas if employee was rehired later.

**Example Case** (Employee #2096):
- First employment: Unknown start → 2023-07-02 (baja: "Otra razón")
- Second employment: Unknown start → 2024-07-15 (baja: "Rescisión por desempeño")
- **Current issue**: Only most recent baja counted

**Current Logic** (`kpi-helpers.ts:256-281`):
```typescript
// Employee is active at period start if:
return fechaIngreso <= startDate && (!fechaBaja || fechaBaja > startDate);
```

**Problem**: This works for **single employment period** but breaks for **multiple periods**.

**Solution Design - IMPLEMENTATION REQUIRED BEFORE THURSDAY**:

**URGENT IMPLEMENTATION: Employment History Table**

**Migration File**: `apps/web/migrations/20260121_create_employment_periods.sql`
```sql
-- Create employment_periods table for tracking multiple employment spans
CREATE TABLE employment_periods (
  id SERIAL PRIMARY KEY,
  numero_empleado INT NOT NULL,
  periodo_num INT NOT NULL, -- 1st, 2nd, 3rd employment
  fecha_ingreso DATE NOT NULL,
  fecha_baja DATE,
  motivo_baja VARCHAR,
  es_reingreso BOOLEAN DEFAULT false,
  periodo_activo BOOLEAN DEFAULT false, -- TRUE if this is the current employment
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(numero_empleado, periodo_num),
  FOREIGN KEY (numero_empleado) REFERENCES empleados_sftp(numero_empleado)
);

-- Create index for performance
CREATE INDEX idx_employment_periods_numero ON employment_periods(numero_empleado);
CREATE INDEX idx_employment_periods_dates ON employment_periods(fecha_ingreso, fecha_baja);
CREATE INDEX idx_employment_periods_activo ON employment_periods(periodo_activo) WHERE periodo_activo = true;

-- Migrate existing single-period employees
INSERT INTO employment_periods (numero_empleado, periodo_num, fecha_ingreso, fecha_baja, motivo_baja, periodo_activo)
SELECT
  e.numero_empleado,
  1 AS periodo_num,
  e.fecha_ingreso,
  e.fecha_baja,
  (SELECT motivo FROM motivos_baja mb WHERE mb.numero_empleado = e.numero_empleado ORDER BY fecha_baja DESC LIMIT 1) as motivo_baja,
  e.activo as periodo_activo
FROM empleados_sftp e;

-- Create view for employees with reingresos
CREATE VIEW v_empleados_con_reingresos AS
SELECT
  numero_empleado,
  COUNT(*) as num_periodos,
  array_agg(periodo_num ORDER BY periodo_num) as periodos,
  array_agg(fecha_ingreso ORDER BY periodo_num) as ingresos,
  array_agg(fecha_baja ORDER BY periodo_num) as bajas
FROM employment_periods
GROUP BY numero_empleado
HAVING COUNT(*) > 1;

-- For known reingreso cases, we need to manually add second employment periods
-- This will be done with Carlos's help during Thursday meeting
-- For now, mark them in empleados_sftp
ALTER TABLE empleados_sftp ADD COLUMN tiene_reingresos BOOLEAN DEFAULT false;
ALTER TABLE empleados_sftp ADD COLUMN num_periodos_empleo INT DEFAULT 1;

UPDATE empleados_sftp e
SET
  tiene_reingresos = true,
  num_periodos_empleo = (
    SELECT COUNT(DISTINCT fecha_baja)
    FROM motivos_baja mb
    WHERE mb.numero_empleado = e.numero_empleado
  )
WHERE numero_empleado IN (
  SELECT numero_empleado
  FROM motivos_baja
  GROUP BY numero_empleado
  HAVING COUNT(DISTINCT fecha_baja) > 1
);
```

**Updated KPI Logic for Reingresos** (MUST IMPLEMENT BEFORE THURSDAY):
```typescript
// apps/web/src/lib/utils/kpi-helpers-reingresos.ts
import { EmploymentPeriod } from '@/types/employment';

export function calculateActivosConReingresos(
  employmentPeriods: EmploymentPeriod[],
  targetDate: Date
): number {
  // Group periods by employee
  const employeesByNumber = new Map<number, EmploymentPeriod[]>();

  for (const period of employmentPeriods) {
    if (!employeesByNumber.has(period.numero_empleado)) {
      employeesByNumber.set(period.numero_empleado, []);
    }
    employeesByNumber.get(period.numero_empleado)!.push(period);
  }

  // Count employees with at least one active period on target date
  let activosCount = 0;

  for (const periods of employeesByNumber.values()) {
    const hasActivePeriod = periods.some(period => {
      const ingreso = new Date(period.fecha_ingreso);
      const baja = period.fecha_baja ? new Date(period.fecha_baja) : null;

      return ingreso <= targetDate && (!baja || baja > targetDate);
    });

    if (hasActivePeriod) activosCount++;
  }

  return activosCount;
}

export function calculateBajasConReingresos(
  employmentPeriods: EmploymentPeriod[],
  startDate: Date,
  endDate: Date
): number {
  // Count terminations in period, excluding employees who were rehired AFTER their baja
  const bajasInPeriod = employmentPeriods.filter(period => {
    if (!period.fecha_baja) return false;

    const fechaBaja = new Date(period.fecha_baja);
    const inPeriod = fechaBaja >= startDate && fechaBaja <= endDate;

    if (!inPeriod) return false;

    // Check if employee was rehired later (has subsequent period)
    // If yes, this baja should NOT count in rotation for historical accuracy
    const employeeAllPeriods = employmentPeriods.filter(
      p => p.numero_empleado === period.numero_empleado
    );

    const hasLaterPeriod = employeeAllPeriods.some(
      p => p.periodo_num > period.periodo_num
    );

    // Only count if this is the FINAL termination (no later employment)
    return !hasLaterPeriod;
  });

  return bajasInPeriod.length;
}

// Update main KPI calculator to use employment_periods table
// apps/web/src/lib/kpi-calculator.ts
import { db } from '@/lib/supabase-admin';

export async function calculateKPIsWithReingresos(
  startDate: Date,
  endDate: Date,
  filters: FilterOptions
) {
  // Fetch employment periods instead of empleados_sftp
  const { data: periods, error } = await db
    .from('employment_periods')
    .select('*')
    .order('numero_empleado, periodo_num');

  if (error) throw error;

  // Use new reingreso-aware calculation functions
  const activosPromedio = calculateActivosPromedioReingresos(periods, startDate, endDate);
  const bajas = calculateBajasConReingresos(periods, startDate, endDate);
  const rotacion = activosPromedio > 0 ? (bajas / activosPromedio) * 100 : 0;

  return {
    activosPromedio,
    bajas,
    rotacion,
    // ... other KPIs
  };
}
```

**Type Definitions**:
```typescript
// packages/shared/src/types/employment.ts
export interface EmploymentPeriod {
  id: number;
  numero_empleado: number;
  periodo_num: number;
  fecha_ingreso: string;
  fecha_baja: string | null;
  motivo_baja: string | null;
  es_reingreso: boolean;
  periodo_activo: boolean;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
}
```

**Deliverable**: Fully functional reingreso tracking system BEFORE Thursday meeting.

---

## 2. Supervisión de Correcciones en el Dashboard (Para Antonio) 🔧

### 2.1 Error de Unidades: "Bajas" Mostrando Porcentajes

**BUG CONFIRMED**: `kpi-card.tsx:46-47`

**Current Code**:
```typescript
if (kpi.name.includes('%') || kpi.name.includes('Rotación') || kpi.category === 'retention') {
  return `${value.toFixed(1)}%`;  // ❌ Shows "12.0%" for counts
}
```

**Problem**: ALL cards with `category: 'retention'` are formatted as percentages, including:
- "Bajas Voluntarias" (count, not %)
- "Bajas Involuntarias" (count, not %)

**Fix**:
```typescript
// apps/web/src/components/kpi-card.tsx:46-51
const formatValue = (value: number, kpi: KPI): string => {
  // Only format as percentage if name explicitly indicates it
  if (kpi.name.includes('%') || kpi.name.includes('Rotación')) {
    return `${value.toFixed(1)}%`;
  }

  // "Bajas" are counts, not percentages
  if (kpi.name.includes('Bajas')) {
    return Math.round(value).toString();
  }

  // Default: whole numbers for counts
  return Math.round(value).toString();
};
```

**Test Case**:
```typescript
// apps/web/src/components/__tests__/kpi-card.test.tsx
describe('KPI Card Value Formatting', () => {
  it('T3.1.1: Bajas Voluntarias muestra número entero, no porcentaje', () => {
    const kpi: KPI = {
      name: 'Bajas Voluntarias',
      value: 12,
      category: 'retention',
      // ...
    };

    render(<KPICard kpi={kpi} />);

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.queryByText('12.0%')).not.toBeInTheDocument();
  });

  it('T3.1.2: Rotación Mensual Voluntaria muestra porcentaje', () => {
    const kpi: KPI = {
      name: 'Rotación Mensual Voluntaria',
      value: 5.2,
      category: 'retention',
      // ...
    };

    render(<KPICard kpi={kpi} />);

    expect(screen.getByText('5.2%')).toBeInTheDocument();
  });
});
```

**Verification**: Run `npm test -- kpi-card` before committing.

---

### 2.2 Filtro Desaparecido: "Ubicación" (CAD/CORPORATIVO/FILIALES)

**ISSUE CONFIRMED**: El filtro de "Ubicación" existe pero el dropdown está VACÍO (no muestra opciones).

**Expected Options**:
- CAD
- CORPORATIVO
- FILIALES

**Root Cause Investigation Required**:
```sql
-- Check what values exist in ubicacion field
SELECT ubicacion, COUNT(*) as cantidad
FROM empleados_sftp
WHERE ubicacion IS NOT NULL
GROUP BY ubicacion
ORDER BY cantidad DESC;

-- Check ubicacion2 from incidencias (this might be the source)
SELECT ubicacion2, COUNT(*) as cantidad
FROM incidencias
WHERE ubicacion2 IS NOT NULL
GROUP BY ubicacion2
ORDER BY cantidad DESC;
```

**Hypothesis**: The filter is trying to read from `empleados_sftp.ubicacion` but should be reading from normalized `ubicacion2` or a derived grouping.

**Solution - Fix Empty Dropdown**:

**Step 1: Diagnose the issue**
```typescript
// Check what's currently in the ubicaciones filter
// apps/web/src/components/filter-panel.tsx (find current ubicaciones logic)

// Likely issue: Reading from empleados_sftp.ubicacion which is empty/null
// Should read from: incidencias.ubicacion2 OR derive from CC field
```

**Step 2: Map ubicacion from CC field (Centro de Costo)**
```typescript
// apps/web/src/lib/normalizers.ts - Add ubicacion mapping
export function mapCCToUbicacion(cc: string | null): string {
  if (!cc) return 'DESCONOCIDO';

  const ccUpper = cc.toUpperCase().trim();

  // Based on existing CLAUDE.md logic:
  // "CC (Centro de Costo) mapping: Maps to ubicacion2 (CAD/CORPORATIVO/FILIALES)"
  if (ccUpper.includes('CAD')) return 'CAD';
  if (ccUpper.includes('CORPORATIVO') || ccUpper.includes('CORP')) return 'CORPORATIVO';

  // Default: FILIALES
  return 'FILIALES';
}

// Add to PlantillaRecord interface in types
export interface PlantillaRecord {
  // ... existing fields
  ubicacion_normalizada?: string; // Derived from CC
}
```

**Step 3: Update filter to use normalized ubicacion**
```typescript
// apps/web/src/lib/filters/filters.ts
export function applyRetentionFilters(
  plantilla: PlantillaRecord[],
  filters: RetentionFilterOptions
): PlantillaRecord[] {
  let filtered = plantilla;

  // Fix ubicaciones filter to use normalized values
  if (filters.ubicaciones && filters.ubicaciones.length > 0) {
    filtered = filtered.filter(emp => {
      const ubicacionNormalizada = mapCCToUbicacion(emp.cc);
      return filters.ubicaciones.includes(ubicacionNormalizada);
    });
  }

  return filtered;
}
```

**Step 4: Update filter panel to populate options**
```tsx
// apps/web/src/components/filter-panel.tsx
const ubicacionesOptions = useMemo(() => {
  const ubicaciones = new Set(
    plantilla.map(e => mapCCToUbicacion(e.cc))
  );
  return Array.from(ubicaciones).filter(u => u !== 'DESCONOCIDO').sort();
}, [plantilla]);

// Expected result: ['CAD', 'CORPORATIVO', 'FILIALES']
```

**Deliverable**: Fix ubicaciones dropdown to show CAD/CORPORATIVO/FILIALES options.

---

### 2.3 Segmentación de Incidencias

**Requirement**:
- Separate "Faltas y Salud" from "Permisos"
- Faltas = FI (Injustificadas) + SUSP (Suspensión)
- Salud = ENFE (Enfermedad) + MAT1/MAT3 (Maternidad) + INC (Incapacidad)

**Current Implementation** (from CLAUDE.md):
```yaml
Categoría         Códigos
Vacaciones        VAC
Faltas            FI, SUSP
Salud             ENFE, MAT1, MAT3, ACCI, INCA
Permisos          PSIN, PCON, FEST, PATER, JUST, FJ
```

**Verification Needed**: Check if current segmentation matches requirements.

**If changes needed**:
```typescript
// apps/web/src/lib/normalizers.ts
export const INCIDENCIA_CATEGORIES = {
  vacaciones: ['VAC'],
  faltas: ['FI', 'SUSP'],
  salud: ['ENFE', 'MAT1', 'MAT3', 'ACCI', 'INC', 'INCA'],
  permisos: ['PSIN', 'PCON', 'FEST', 'PATER', 'JUST', 'FJ']
} as const;

export function categorizeIncidencia(inci: string | null): string {
  if (!inci) return 'desconocido';

  const code = inci.toUpperCase();

  if (INCIDENCIA_CATEGORIES.vacaciones.includes(code)) return 'vacaciones';
  if (INCIDENCIA_CATEGORIES.faltas.includes(code)) return 'faltas';
  if (INCIDENCIA_CATEGORIES.salud.includes(code)) return 'salud';
  if (INCIDENCIA_CATEGORIES.permisos.includes(code)) return 'permisos';

  return 'otro';
}
```

**Dashboard Update**:
```tsx
// apps/web/src/app/dashboard/tabs/IncidentsTab.tsx
export function IncidentsTab() {
  const faltasSalud = incidencias.filter(i =>
    ['faltas', 'salud'].includes(categorizeIncidencia(i.inci))
  );

  const permisos = incidencias.filter(i =>
    categorizeIncidencia(i.inci) === 'permisos'
  );

  return (
    <div>
      <KPICard title="Faltas y Salud" value={faltasSalud.length} />
      <KPICard title="Permisos" value={permisos.length} />
    </div>
  );
}
```

**Deliverable**: Verify current implementation, update if needed.

---

### 2.4 Bug en Resumen: Números Cambian Arbitrariamente

**Problem**: Incidencias numbers change from 1.2 to 1.4 without reason in Resumen tab.

**Investigation Plan**:

**Step 1: Identify Source**
```bash
# Find where "Inc prom x empleado" is calculated
grep -r "Inc prom" apps/web/src/
grep -r "incidencias.*promedio" apps/web/src/lib/
```

**Step 2: Check for State Issues**
```typescript
// Look for:
// 1. useState with incorrect initialization
// 2. useEffect with missing dependencies
// 3. Memoization issues
// 4. Race conditions in data fetching
```

**Step 3: Add Stability Test**
```typescript
// apps/web/src/components/__tests__/resumen-tab.test.tsx
describe('Resumen Tab Stability', () => {
  it('T1.15.1: Inc prom x empleado permanece estable en re-renders', async () => {
    const { rerender } = render(<ResumenTab />);

    const initialValue = screen.getByTestId('inc-prom-empleado').textContent;

    // Re-render multiple times
    for (let i = 0; i < 5; i++) {
      rerender(<ResumenTab />);
      await waitFor(() => {
        expect(screen.getByTestId('inc-prom-empleado').textContent).toBe(initialValue);
      });
    }
  });
});
```

**Common Causes**:
- Floating point arithmetic inconsistencies
- Filter state not synchronized
- Data fetching race conditions
- Incorrect memoization dependencies

**Deliverable**: Identify and fix root cause of unstable numbers.

---

## 3. Validación de Supuestos (Ingeniería Inversa) 📋

**Problem**: Employees without departamento/area data were assigned based on similar profiles.

**Current State**: Check if normalization logic already handles this.

**Investigation**:
```sql
-- Count employees with missing classification data
SELECT
  COUNT(*) FILTER (WHERE departamento IS NULL) AS sin_departamento,
  COUNT(*) FILTER (WHERE area IS NULL) AS sin_area,
  COUNT(*) FILTER (WHERE puesto IS NULL) AS sin_puesto,
  COUNT(*) FILTER (WHERE clasificacion IS NULL) AS sin_clasificacion
FROM empleados_sftp;
```

**Documentation for Carlos**:
```markdown
# Supuestos de Clasificación - Empleados sin Datos

## Método de Asignación
- Empleados sin departamento/area fueron asignados basándose en:
  1. Puesto similar (mismo código_puesto)
  2. Ubicación similar (mismo CC/ubicación)
  3. Fecha de ingreso similar (mismo período)

## Casos Asignados
[Lista de numero_empleado con asignaciones inferidas]

## Solicitud de Validación
Por favor revisar y confirmar si las asignaciones son correctas.
Si hay errores, favor de proporcionar datos correctos.
```

**Deliverable**: Excel con asignaciones inferidas para aprobación de Carlos.

---

## 4. Preparación para la Reunión (Jueves) 🎯

### 4.1 Cambio de Fecha
✅ **Confirmado**: Reunión movida a Jueves (misma hora)

### 4.2 Ejemplos de Resumen AI

**Requirement**: 2-3 ejemplos redactados de cómo la IA presentará el resumen narrativo.

**Example 1: Executive Summary Style** (Formal, conciso)
```markdown
## Resumen Ejecutivo - Diciembre 2024

**Headcount**: 78 empleados activos (↓ 3 vs noviembre)
**Rotación**: 5.2% mensual (4 bajas voluntarias, 0 involuntarias)
**Incidencias**: 1.4 incidencias promedio por empleado (↑ 12% vs mes anterior)

**Insights Clave**:
- Rotación voluntaria se mantiene en rango normal (4-6%)
- Departamento de Almacén presenta mayor tasa de incidencias (2.1 vs 1.4 promedio)
- No se detectaron bajas por desempeño en el período

**Recomendaciones**:
- Investigar causas de incremento en incidencias en Almacén
- Mantener monitoreo de rotación voluntaria
```

**Example 2: Narrative Style** (Conversational, storytelling)
```markdown
## Análisis Mensual - Diciembre 2024

Durante diciembre, la plantilla cerró con 78 empleados activos, representando una disminución de 3 personas respecto al mes anterior. Esta reducción se debe exclusivamente a bajas voluntarias (4 casos), sin registrar terminaciones por desempeño o disciplina.

La rotación mensual de 5.2% se mantiene dentro del rango esperado para la operación. Los motivos principales fueron "Otra razón" (2 casos) y "Cambio de domicilio" (2 casos), lo cual sugiere factores personales más que problemas con la organización.

En cuanto a incidencias, observamos un incremento del 12% en el promedio por empleado (1.4 vs 1.2 del mes anterior). El área de Almacén concentra el 45% de las incidencias totales, con 2.1 incidencias por empleado vs 1.4 del promedio general.

**Punto de atención**: Almacén requiere análisis profundo de causas de ausentismo.
```

**Example 3: Data-Driven Style** (Métricas, tablas, números)
```markdown
## Dashboard de Métricas - Diciembre 2024

| Métrica | Valor | vs Mes Anterior | vs Año Anterior |
|---------|-------|-----------------|-----------------|
| Activos Promedio | 79.5 | -2.5 (-3.1%) | +5.2 (+7.0%) |
| Bajas Totales | 4 | -1 (-20%) | +1 (+33%) |
| Rotación Mensual | 5.2% | -1.2 pp | +0.8 pp |
| Rotación YTD | 48.7% | - | - |
| Inc/Empleado | 1.4 | +0.2 (+16.7%) | -0.1 (-6.7%) |

**Top 3 Departamentos por Rotación**:
1. Almacén: 8.3% (2 bajas / 24 activos)
2. Administración: 4.2% (1 baja / 24 activos)
3. Operaciones: 3.3% (1 baja / 30 activos)

**Distribución de Bajas**:
- Voluntarias: 100% (4/4)
- Involuntarias: 0% (0/4)
- Bajas tempranas (<3 meses): 25% (1/4)
```

**Deliverable**: Present these 3 styles to Carlos for selection during Thursday meeting.

---

## 5. Observaciones (Blind Spots) ⚠️

### 5.1 Fragilidad en Definición de "Activo"

**Issue**: Confusion between "cierre de mes" (snapshot) vs "activo en algún momento del mes" (period-based).

**Current Logic**:
```typescript
// Your system: Uses "Activos Promedio"
activosPromedio = (activos_inicio + activos_fin) / 2

// Carlos system: Likely uses "Snapshot al cierre"
activosCierre = COUNT(WHERE activo=true AND fecha_baja IS NULL OR fecha_baja > '2024-01-31')
```

**Solution**:
1. **Standardize on Carlos's definition** for reconciliation
2. **Document both calculations** in code comments
3. **Expose both metrics** in admin UI for debugging

**Implementation**:
```typescript
// apps/web/src/lib/utils/kpi-helpers.ts
export function calculateActivosVariants(
  plantilla: PlantillaRecord[],
  startDate: Date,
  endDate: Date
) {
  // Method 1: Snapshot at period end (Carlos's method)
  const activosCierre = plantilla.filter(emp =>
    emp.fecha_ingreso <= endDate &&
    (!emp.fecha_baja || emp.fecha_baja > endDate)
  ).length;

  // Method 2: Average active (HR best practice)
  const activosInicio = countActivosEnFecha(plantilla, startDate);
  const activosFin = countActivosEnFecha(plantilla, endDate);
  const activosPromedio = (activosInicio + activosFin) / 2;

  return {
    cierre: activosCierre,
    inicio: activosInicio,
    fin: activosFin,
    promedio: activosPromedio,
    metodo: 'Carlos usa cierre, nosotros usamos promedio'
  };
}
```

**Deliverable**: Add toggle in admin UI to compare both methods.

---

### 5.2 Riesgo de los Reingresos

**Issue**: System ignores historical baja if employee is currently active (reingreso).

**Example**:
- Employee #2096 terminated 2023-07-02, rehired sometime before 2024-07-15, terminated again 2024-07-15
- **Current bug**: April 2024 report would show employee as "active" (because current status is terminated after April)
- **Carlos's system**: Probably shows employee as "terminated on 2023-07-02" for historical reporting

**Root Cause**: Single-record-per-employee model breaks historical accuracy.

**Immediate Fix** (for Thursday):
```sql
-- Mark employees with multiple employment periods
ALTER TABLE empleados_sftp ADD COLUMN tiene_reingresos BOOLEAN DEFAULT false;

UPDATE empleados_sftp e
SET tiene_reingresos = true
WHERE EXISTS (
  SELECT 1 FROM motivos_baja mb
  WHERE mb.numero_empleado = e.numero_empleado
  GROUP BY mb.numero_empleado
  HAVING COUNT(DISTINCT fecha_baja) > 1
);

-- Add warning in dashboard for reingreso cases
```

**Long-term Fix** (post-Thursday):
- Implement `employment_periods` table (see section 1.4)
- Migrate historical data with Carlos's help
- Update all KPI calculations to handle multiple periods

**Deliverable**: Document reingreso cases, propose migration plan to Carlos.

---

## Critical Files to Modify

| File | Changes Required | Priority |
|------|------------------|----------|
| `apps/web/src/components/kpi-card.tsx` | Fix percentage formatting for "Bajas" | HIGH |
| `apps/web/src/components/filter-panel.tsx` | Add Filiales filter | HIGH |
| `apps/web/src/lib/filters/filters.ts` | Add filiales filter logic | HIGH |
| `apps/web/src/lib/utils/kpi-helpers.ts` | Add bajas classification assertion | MEDIUM |
| `apps/web/src/app/api/reconciliation/employee-ids/route.ts` | Create employee ID export endpoint | CRITICAL |
| `apps/web/migrations/deduplicate_motivos_baja.sql` | Remove duplicate baja records | HIGH |
| `apps/web/src/lib/normalizers.ts` | Verify incidencias categorization | MEDIUM |
| `apps/web/src/components/reconciliation-export.tsx` | Create admin UI for ID export | CRITICAL |

---

## Testing Strategy

### Pre-Deployment Tests
```bash
# 1. Run all existing tests
npm run test:run

# 2. Type check
npm run type-check

# 3. Verify KPI calculations
npm test -- kpi-helpers

# 4. Verify dashboard components
npm test -- kpi-card
npm test -- filter-panel

# 5. Manual testing checklist
- [ ] Export employee IDs for each month (Jan-Aug)
- [ ] Verify "Bajas" cards show numbers not percentages
- [ ] Check Filiales filter appears and works
- [ ] Verify incidencias segmentation is correct
- [ ] Confirm Resumen numbers are stable across re-renders
```

### Database Verification Queries
```sql
-- 1. Verify no activo/fecha_baja conflicts
SELECT COUNT(*) FROM empleados_sftp
WHERE (activo = true AND fecha_baja IS NOT NULL)
   OR (activo = false AND fecha_baja IS NULL);
-- Expected: 0

-- 2. Verify no duplicate bajas remain
SELECT numero_empleado, fecha_baja, motivo, COUNT(*)
FROM motivos_baja
GROUP BY numero_empleado, fecha_baja, motivo
HAVING COUNT(*) > 1;
-- Expected: 0 rows

-- 3. Verify bajas classification sums correctly
SELECT
  SUM(CASE WHEN motivo IN ('Rescisión por desempeño', 'Rescisión por disciplina', 'Término del contrato') THEN 1 ELSE 0 END) as involuntarias,
  SUM(CASE WHEN motivo NOT IN ('Rescisión por desempeño', 'Rescisión por disciplina', 'Término del contrato') THEN 1 ELSE 0 END) as voluntarias,
  COUNT(*) as total
FROM motivos_baja
WHERE fecha_baja >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
  AND fecha_baja < DATE_TRUNC('month', CURRENT_DATE);
-- Verify: involuntarias + voluntarias = total
```

---

## Deliverables Checklist for Thursday Meeting

### For Carlos:
- [ ] Monthly employee ID lists (CSV) - January through August 2025
- [ ] Duplicate bajas analysis report with employee numbers
- [ ] Reingreso cases documentation (employees #2096, #2154, #1130, etc.)
- [ ] Ingeniería inversa validation list (employees with inferred classifications)
- [ ] 3 AI summary style examples (Executive, Narrative, Data-Driven)

### Dashboard Fixes (for Antonio):
- [ ] "Bajas" cards show numbers instead of percentages
- [ ] Filiales filter added to Personal tab
- [ ] Incidencias segmentation verified/corrected
- [ ] Resumen tab numbers stability fixed

### Documentation:
- [ ] Headcount calculation methodology document (snapshot vs promedio)
- [ ] Reingreso handling proposal (employment_periods table design)
- [ ] Data quality report (duplicate elimination results)

---

## Timeline

**Tuesday EOD** (URGENTE):
- [ ] Create employment_periods table migration
- [ ] Migrate existing single-period data
- [ ] Update KPI calculation functions for reingresos
- [ ] Test reingreso logic with known cases (#2096, #2154, etc.)

**Wednesday EOD**:
- [ ] Export employee ID CSVs for Carlos (simple format - solo IDs)
- [ ] Fix "Bajas" percentage bug
- [ ] Fix ubicaciones filter dropdown (CAD/CORPORATIVO/FILIALES)
- [ ] Run duplicate bajas cleanup
- [ ] Prepare AI summary examples
- [ ] Document reingreso cases needing manual fecha_ingreso data

**Thursday Morning** (before meeting):
- [ ] Final verification of all deliverables
- [ ] Test all fixes in production
- [ ] Prepare demo of corrected dashboard with reingreso support

**During Thursday Meeting**:
- [ ] Share employee ID lists with Carlos
- [ ] Review reingreso cases together
- [ ] Get approval on AI summary style
- [ ] Validate ingeniería inversa classifications
- [ ] Agree on reingreso implementation plan

**Post-Meeting**:
- [ ] Implement approved reingreso solution
- [ ] Finalize any remaining data corrections
- [ ] Document lessons learned

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Employee IDs don't match Carlos's system | HIGH | HIGH | Export both snapshot and promedio methods, let Carlos choose |
| Duplicate bajas removal breaks historical data | MEDIUM | HIGH | Create backup before migration, test on copy first |
| Reingreso cases can't be resolved without Carlos's data | HIGH | MEDIUM | Document all cases, request historical hire dates from Carlos |
| Dashboard fixes introduce new bugs | LOW | MEDIUM | Comprehensive testing, rollback plan ready |
| Meeting postponed again | LOW | LOW | Have all deliverables ready early |

---

## Success Criteria

✅ **Meeting is successful if**:
1. Carlos approves employee ID lists match his system (±2 employees max discrepancy)
2. Bajas classification is confirmed correct (17 = 10 + 7)
3. Reingreso cases are identified and resolution plan agreed
4. Dashboard bugs are fixed and verified
5. AI summary style is selected

✅ **System is production-ready if**:
1. All tests pass (212 tests, >95% success rate)
2. No TypeScript errors
3. Database integrity verified (no conflicts, no duplicates)
4. Performance acceptable (<500ms for KPI calculations)
5. Reingreso cases documented for future implementation

---

## Open Questions for User

Before implementing, I need clarification on:

1. **Filiales Filter**: What exactly is "Filiales"? Is it:
   - A grouping of ubicaciones (CAD vs CORPORATIVO vs FILIALES)?
   - A specific field in the database?
   - Something else?

2. **Reingreso Priority**: Should we:
   - Implement full `employment_periods` table before Thursday?
   - Just document cases and implement after Carlos approves?
   - Use simple flag approach for now?

3. **Employee ID Export Format**: Does Carlos need:
   - Just the list of IDs?
   - Full employee details (nombre, departamento, puesto)?
   - Specific CSV format?

4. **AI Summary Style**: Do you have a preference among the 3 examples, or should Carlos choose during the meeting?
