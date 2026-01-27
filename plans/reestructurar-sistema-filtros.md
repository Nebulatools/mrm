# Plan: Reestructuración del Sistema de Filtros HR Dashboard

**Fecha:** Enero 2026
**Complejidad:** Alta
**Estimación:** 2-3 días de implementación

---

## Resumen Ejecutivo

El dashboard HR tiene un sistema de filtros funcional pero con problemas de consistencia entre tabs y lógica dispersa. Este plan propone una reestructuración **incremental** (no desde cero) que unifique la lógica de filtrado, corrija inconsistencias, y garantice datos correctos en todos los tabs.

---

## 1. Diagnóstico del Estado Actual

### 1.1 Arquitectura Existente (Funcional)

```
┌─────────────────────────────────────────────────────────────────┐
│                        FilterPanel                               │
│  [Año] [Mes] [Negocio] [Área] [Depto] [Puesto] [Clasif] [Ubic]  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    usePlantillaFilters Hook                      │
│  Aplica 4 variantes de filtrado según el scope del tab          │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   Resumen     │   │  Incidencias  │   │   Rotación    │
│  "specific"   │   │    "year"     │   │  "year-only"  │
│ año+mes+estr  │   │  año+estr     │   │ año+estr+baja │
└───────────────┘   └───────────────┘   └───────────────┘
```

### 1.2 Problemas Identificados

| # | Problema | Impacto | Ubicación |
|---|----------|---------|-----------|
| 1 | **Encoding UTF-8 corrupto** en área y departamento | Filtros no coinciden | `empleados_sftp.area` → "Administraci?n" |
| 2 | **470 empleados con área "Desconocido"** (44.5%) | Datos incompletos | Columna `area` |
| 3 | **Heatmap ignora filtros estructurales** | Inconsistencia visual | `dashboard-page.tsx:432-441` |
| 4 | **Filtro de mes en Rotación** confuso | UX pobre | No filtra datos, solo navega |
| 5 | **Toggle voluntaria/involuntaria** solo visual | No afecta KPIs | `rotacion-tab.tsx:75-77` |
| 6 | **Inconsistencia en fuente de bajas** | Datos duplicados | `empleados_sftp.fecha_baja` vs `motivos_baja` |

### 1.3 Datos de Base de Datos (Verificados con MCP)

**Tablas principales:**
- `empleados_sftp`: 1,057 registros (239 activos en dic 2025)
- `motivos_baja`: 677 registros (fuente de verdad para rotación)
- `incidencias`: 8,973 registros (solo 2025-2026)

**Valores únicos para filtros:**
| Campo | Valores | Notas |
|-------|---------|-------|
| empresa | 3 | MOTO REPUESTOS MONTERREY (931), MOTO TOTAL (118), REPUESTOS Y MOTOCICLETAS (8) |
| ubicacion2 | 3 | CAD (740), CORPORATIVO (222), FILIALES (94) |
| area | 32 | ⚠️ "Desconocido" tiene 470 registros (44.5%) |
| departamento | ~15 | Encoding corrupto en algunos |
| clasificacion | ~5 | Confianza, Sindicalizado, etc. |

**Rotación 2025:**
- Total bajas: 236
- Involuntaria: 77 (32.6%) → Término contrato (45), Rescisión desempeño (22), Rescisión disciplina (10)
- Voluntaria: 159 (67.4%) → Otra razón (67), Abandono (66), Otros (26)

---

## 2. Decisiones de Arquitectura

### 2.1 NO hacer desde cero

La arquitectura actual es sólida. El sistema de 4 variantes de scope es correcto:
- `specific`: año + mes + estructura (Resumen, Personal)
- `year`: año + estructura sin mes (Incidencias)
- `year-only`: año + estructura + incluye inactivos (Rotación)
- `general`: solo estructura (Históricos)

**Decisión:** Mantener arquitectura, corregir implementación.

### 2.2 Fuente de verdad única

```
motivos_baja → ÚNICA fuente para bajas/rotación
empleados_sftp → ÚNICA fuente para plantilla activa
incidencias → ÚNICA fuente para ausencias/incidencias
```

### 2.3 Normalización centralizada

Toda normalización de texto (encoding, acentos, mayúsculas) debe pasar por `normalizers.ts`.

---

## 3. Plan de Implementación

### Fase 1: Corrección de Datos (Día 1 - AM)

#### 1.1 Migración: Limpiar encoding en área

```sql
-- Archivo: supabase/migrations/fix_encoding_area.sql
UPDATE empleados_sftp SET area =
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(area,
    'Administraci?n', 'Administración'),
    'Cr?dito', 'Crédito'),
    'Tecnolog?a', 'Tecnología'),
    'Planeaci?n', 'Planeación'),
    'N?minas', 'Nóminas');

UPDATE empleados_sftp SET departamento =
  REPLACE(REPLACE(REPLACE(departamento,
    'ADMINISTRACI?N', 'ADMINISTRACIÓN'),
    'TECNOLOG?A', 'TECNOLOGÍA'),
    'DIRECCI?N', 'DIRECCIÓN');
```

#### 1.2 Script: Mapear áreas "Desconocido"

```typescript
// Archivo: scripts/fix-area-desconocido.ts
// Mapear área basándose en departamento cuando area = 'Desconocido'

const DEPARTAMENTO_TO_AREA: Record<string, string> = {
  'CAD': 'Operaciones CAD',
  'VENTAS': 'Ventas',
  'RECURSOS HUMANOS': 'RH',
  'ADMINISTRACIÓN Y FINANZAS': 'Administración y Finanzas',
  'MERCADOTECNIA': 'Mercadotecnia',
  'TECNOLOGÍA DE LA INFORMACIÓN': 'Tic',
  // ... completar mapeo
};
```

### Fase 2: Unificar Sistema de Filtros (Día 1 - PM)

#### 2.1 Refactorizar `RetentionFilterOptions`

```typescript
// Archivo: apps/web/src/lib/filters/types.ts

export interface UnifiedFilterOptions {
  // === Filtros Temporales ===
  years: number[];
  months: number[];  // Vacío = todo el año

  // === Filtros Estructurales ===
  empresas: string[];      // Negocio
  areas: string[];         // Área organizacional
  departamentos: string[]; // Departamento
  puestos: string[];       // Puesto
  clasificaciones: string[]; // Clasificación (Confianza/Sindicalizado)
  ubicaciones: string[];   // Ubicación principal
  ubicaciones2: string[];  // CAD/CORPORATIVO/FILIALES

  // === Filtros de Rotación (solo tab Rotación) ===
  tipoRotacion: 'all' | 'voluntaria' | 'involuntaria';

  // === Opciones de Scope ===
  includeInactive: boolean;
}

export const DEFAULT_FILTERS: UnifiedFilterOptions = {
  years: [new Date().getFullYear()],
  months: [],
  empresas: [],
  areas: [],
  departamentos: [],
  puestos: [],
  clasificaciones: [],
  ubicaciones: [],
  ubicaciones2: [],
  tipoRotacion: 'all',
  includeInactive: false,
};
```

#### 2.2 Simplificar `applyFiltersWithScope`

```typescript
// Archivo: apps/web/src/lib/filters/core/filter-engine.ts

export type FilterScope = 'specific' | 'year' | 'year-only' | 'general';

export function applyFilters(
  data: PlantillaRecord[],
  filters: UnifiedFilterOptions,
  scope: FilterScope
): PlantillaRecord[] {
  // 1. Determinar qué filtros aplicar según scope
  const effectiveFilters = getEffectiveFilters(filters, scope);

  // 2. Aplicar filtros en orden
  return data
    .filter(emp => matchesTemporal(emp, effectiveFilters, scope))
    .filter(emp => matchesStructural(emp, effectiveFilters))
    .filter(emp => matchesActiveStatus(emp, effectiveFilters));
}

function getEffectiveFilters(
  filters: UnifiedFilterOptions,
  scope: FilterScope
): UnifiedFilterOptions {
  switch (scope) {
    case 'specific':
      return { ...filters }; // Todos los filtros
    case 'year':
      return { ...filters, months: [] }; // Sin mes
    case 'year-only':
      return { ...filters, months: [], includeInactive: true };
    case 'general':
      return { ...filters, years: [], months: [], includeInactive: true };
  }
}
```

### Fase 3: Corregir Tab Rotación (Día 2 - AM)

#### 3.1 Integrar `tipoRotacion` en filtros

El toggle voluntaria/involuntaria debe afectar los KPIs, no solo la visualización.

```typescript
// Archivo: apps/web/src/hooks/use-retention-kpis.ts

export function useRetentionKPIs(options: UseRetentionKPIsOptions) {
  const { plantilla, bajasData, filters } = options;

  // Filtrar bajas según tipoRotacion ANTES de calcular KPIs
  const bajasFiltered = useMemo(() => {
    if (filters.tipoRotacion === 'all') return bajasData;

    return bajasData.filter(baja => {
      const esInvoluntaria = isMotivoClave(baja.motivo);
      return filters.tipoRotacion === 'involuntaria'
        ? esInvoluntaria
        : !esInvoluntaria;
    });
  }, [bajasData, filters.tipoRotacion]);

  // Calcular KPIs con bajas filtradas
  const kpis = useMemo(() => {
    return calcularRotacionConDesglose(
      plantilla,
      bajasFiltered,
      selectedPeriod
    );
  }, [plantilla, bajasFiltered, selectedPeriod]);

  return kpis;
}
```

#### 3.2 Corregir Heatmap para respetar filtros

```typescript
// Archivo: apps/web/src/components/dashboard-page.tsx
// Línea ~432-461

// ANTES (ignora filtros estructurales):
const plantillaFiltrada = applyFiltersWithScope(plantilla, {
  years: [currentYear],
  months: [],
  includeInactive: true,
}, "year-only");

// DESPUÉS (respeta TODOS los filtros):
const plantillaFiltrada = applyFiltersWithScope(plantilla, {
  ...retentionFilters,  // ← Incluir filtros estructurales
  months: [],           // ← Sin mes (year-only scope)
  includeInactive: true,
}, "year-only");
```

#### 3.3 Clarificar UX del selector de mes en Rotación

El mes en Rotación NO filtra datos, solo navega el período de visualización.

```typescript
// Archivo: apps/web/src/components/rotacion/rotacion-tab.tsx

// Agregar tooltip explicativo
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="flex items-center gap-2">
        <Label>Período de análisis:</Label>
        <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
        <InfoIcon className="h-4 w-4 text-muted-foreground" />
      </div>
    </TooltipTrigger>
    <TooltipContent>
      <p>El tab de Rotación muestra datos del año completo.</p>
      <p>El mes seleccionado determina el período de comparación para KPIs.</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### Fase 4: Consistencia entre Tabs (Día 2 - PM)

#### 4.1 Matriz de comportamiento por tab

| Tab | Scope | Año | Mes | Estructura | Inactivos | tipoRotacion |
|-----|-------|-----|-----|------------|-----------|--------------|
| Resumen | `specific` | ✅ | ✅ | ✅ | ❌ | N/A |
| Personal | `specific` | ✅ | ✅ | ✅ | ❌ | N/A |
| Incidencias | `year` | ✅ | ❌ | ✅ | ❌ | N/A |
| Rotación | `year-only` | ✅ | ❌ | ✅ | ✅ | ✅ |

#### 4.2 Actualizar `usePlantillaFilters` para exponer scope

```typescript
// Archivo: apps/web/src/hooks/use-plantilla-filters.ts

export interface UsePlantillaFiltersReturn {
  // Datos filtrados por scope
  forResumen: PlantillaRecord[];      // specific
  forPersonal: PlantillaRecord[];     // specific
  forIncidencias: PlantillaRecord[];  // year
  forRotacion: PlantillaRecord[];     // year-only

  // Bajas filtradas (solo para Rotación)
  bajasForRotacion: MotivoBajaRecord[];

  // Incidencias filtradas
  incidenciasFiltered: IncidenciaRecord[];

  // Metadata
  activeFilterCount: number;
  filterSummary: string;
}
```

### Fase 5: Testing y Validación (Día 3)

#### 5.1 Tests de regresión para filtros

```typescript
// Archivo: apps/web/src/lib/filters/__tests__/unified-filters.test.ts

describe('UnifiedFilters', () => {
  describe('applyFilters con scope', () => {
    it('specific: aplica año + mes + estructura', () => {
      const result = applyFilters(mockPlantilla, {
        years: [2025],
        months: [12],
        departamentos: ['VENTAS'],
      }, 'specific');

      expect(result.every(e =>
        e.fecha_ingreso.getFullYear() <= 2025 &&
        e.departamento === 'VENTAS'
      )).toBe(true);
    });

    it('year-only: incluye inactivos sin filtrar mes', () => {
      const result = applyFilters(mockPlantilla, {
        years: [2025],
        months: [12], // Debe ignorarse
        includeInactive: true,
      }, 'year-only');

      // Verificar que hay empleados con fecha_baja
      expect(result.some(e => e.fecha_baja !== null)).toBe(true);
    });

    it('tipoRotacion filtra bajas correctamente', () => {
      const voluntarias = applyRotacionFilter(mockBajas, 'voluntaria');
      const involuntarias = applyRotacionFilter(mockBajas, 'involuntaria');

      expect(voluntarias.length + involuntarias.length).toBe(mockBajas.length);
      expect(involuntarias.every(b => isMotivoClave(b.motivo))).toBe(true);
    });
  });
});
```

#### 5.2 Validación con datos reales

```sql
-- Query de validación: comparar dashboard vs SQL directo

-- Bajas 2025 por tipo
SELECT
  CASE
    WHEN motivo IN ('Rescisión por disciplina', 'Rescisión por desempeño', 'Término del contrato')
    THEN 'INVOLUNTARIA'
    ELSE 'VOLUNTARIA'
  END as tipo,
  COUNT(*) as total
FROM motivos_baja
WHERE EXTRACT(YEAR FROM fecha_baja) = 2025
GROUP BY tipo;

-- Esperado: VOLUNTARIA=159, INVOLUNTARIA=77, Total=236
```

---

## 4. Archivos a Modificar

### Nuevos archivos

| Archivo | Propósito |
|---------|-----------|
| `lib/filters/types.ts` | Tipos unificados de filtros |
| `supabase/migrations/fix_encoding.sql` | Migración para encoding |
| `scripts/fix-area-desconocido.ts` | Script de limpieza de datos |

### Archivos a modificar

| Archivo | Cambios |
|---------|---------|
| `lib/filters/core/filter-engine.ts` | Simplificar, usar tipos unificados |
| `hooks/use-plantilla-filters.ts` | Exponer datos por tab, integrar tipoRotacion |
| `hooks/use-retention-kpis.ts` | Filtrar bajas por tipoRotacion |
| `components/dashboard-page.tsx` | Pasar filtros completos a heatmap |
| `components/rotacion/rotacion-tab.tsx` | Integrar toggle en filtros |
| `components/shared/filter-panel.tsx` | Mover toggle a panel de filtros |

### Archivos a eliminar (código muerto)

- Ninguno identificado - la arquitectura actual es limpia

---

## 5. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Regresión en cálculos de KPI | Media | Alto | Tests exhaustivos antes de cada cambio |
| Datos corruptos por migración | Baja | Alto | Backup antes de migración, validar con queries |
| Inconsistencia temporal durante refactor | Media | Medio | Desplegar por fases, feature flags |

---

## 6. Criterios de Aceptación

### Funcionales

- [ ] Filtros estructurales (empresa, área, depto, etc.) funcionan en TODOS los tabs
- [ ] Tab Rotación muestra datos correctos al filtrar por ubicacion2 (CAD/CORPORATIVO/FILIALES)
- [ ] Toggle voluntaria/involuntaria afecta los KPIs, no solo visualización
- [ ] Heatmap respeta filtros estructurales
- [ ] Encoding UTF-8 correcto en todos los campos

### Técnicos

- [ ] 100% de tests existentes pasan
- [ ] Nuevos tests para filtros unificados
- [ ] TypeScript sin errores
- [ ] Tiempo de carga < 2s con filtros activos

### Validación de Datos

- [ ] Bajas 2025: 236 total (159 voluntarias, 77 involuntarias)
- [ ] Activos diciembre 2025: ~239 empleados
- [ ] Rotación mensual promedio: ~8-12%

---

## 7. Secuencia de Implementación Recomendada

```
1. Backup de base de datos
   ↓
2. Migración de encoding (sin downtime)
   ↓
3. Crear lib/filters/types.ts (nuevos tipos)
   ↓
4. Refactorizar filter-engine.ts (mantener compatibilidad)
   ↓
5. Actualizar use-plantilla-filters.ts
   ↓
6. Actualizar use-retention-kpis.ts (integrar tipoRotacion)
   ↓
7. Actualizar dashboard-page.tsx (heatmap con filtros)
   ↓
8. Actualizar rotacion-tab.tsx (mover toggle a filtros)
   ↓
9. Ejecutar suite completa de tests
   ↓
10. Validar con queries SQL vs dashboard
```

---

## 8. Alternativa: Empezar desde Cero

**No recomendado** por las siguientes razones:

1. El sistema actual tiene 212+ tests funcionando
2. La arquitectura de 4 scopes es correcta conceptualmente
3. Los problemas son de implementación, no de diseño
4. Rehacer desde cero tomaría 2-3 semanas vs 2-3 días

**Cuándo SÍ rehacer desde cero:**
- Si los tests revelan > 30% de fallos después de los cambios
- Si se requiere cambio fundamental en modelo de datos
- Si hay requisitos nuevos que invalidan la arquitectura actual

---

## Referencias

- Análisis de tablas: `/ANALISIS_TABLAS_SUPABASE.txt`
- Documentación de filtros: `/apps/web/src/lib/filters/README.md`
- Tests existentes: `/apps/web/src/lib/filters/__tests__/`
- CLAUDE.md del proyecto: `/CLAUDE.md`
