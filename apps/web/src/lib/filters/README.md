# Sistema de Filtros - Documentación

## Descripción General

El sistema de filtros proporciona 4 variantes de filtrado para diferentes tabs del dashboard, cada una con un alcance (scope) específico según las necesidades del negocio.

## Estructura del Directorio

```
lib/filters/
├── README.md                 # Esta documentación
├── index.ts                  # Barrel export - punto de entrada
├── core/
│   └── filter-engine.ts     # Motor principal de filtrado (antes filters.ts)
├── utils/
│   └── summary.ts           # Utilidades para resúmenes de filtros
└── __tests__/
    └── filters.test.ts      # Tests del sistema
```

## Las 4 Variantes de Filtros

### 1. **Specific Scope** - Tab Resumen/Personal
```typescript
plantillaFiltered = applyFiltersWithScope(plantilla, {
  years: [2024, 2025],
  months: [1, 2, 3],
  departamentos: ['Ventas'],
  puestos: ['Vendedor'],
  clasificaciones: ['CONFIANZA'],
  ubicaciones: ['CAD'],
  empresas: ['MRM'],
  areas: ['Comercial']
}, "specific");
```

**Aplica:** Año + Mes + Estructura organizacional (departamento, puesto, etc.)
**Uso:** Tab Resumen (comparaciones de KPIs), Tab Personal (demografía)

---

### 2. **Year Scope** - Tab Incidencias
```typescript
plantillaFilteredYearScope = applyFiltersWithScope(plantilla, {
  years: [2024],
  months: [],  // NO filtra por mes
  departamentos: ['Ventas'],
  areas: ['Comercial']
  // ... otros filtros estructurales
}, "year");
```

**Aplica:** Año + Estructura organizacional (SIN filtro de mes)
**Uso:** Tab Incidencias (necesita datos completos del año)
**Rationale:** Las incidencias se analizan por año completo, no por mes específico

---

### 3. **Year-Only Scope** - Tab Rotación
```typescript
plantillaRotacionYearScope = applyFiltersWithScope(plantilla, {
  ...retentionFilters,    // ✅ Incluye TODOS los filtros estructurales
  months: [],             // ✅ Pero sin mes (year-only)
  includeInactive: true
}, "year-only");
```

**Aplica:** Año + Estructura organizacional + includeInactive (SIN filtro de mes)
**Uso:** Tab Rotación (heatmap, tablas de rotación por motivo)
**Rationale:** Las tablas de rotación respetan los filtros seleccionados (departamento, área, ubicación) pero muestran datos del año completo (no solo un mes)

---

### 4. **General Scope** - Históricos/Sin Filtros
```typescript
plantillaFilteredGeneral = applyFiltersWithScope(plantilla, {
  departamentos: ['Ventas'],
  puestos: ['Vendedor']
  // Solo filtros estructurales, sin temporales
}, "general");
```

**Aplica:** Solo estructura organizacional (sin año/mes)
**Uso:** Análisis históricos, reportes generales
**Rationale:** Datos históricos completos sin restricción temporal

---

## Tabla de Uso por Tab

| Tab | Variante | Scope | Año | Mes | Estructura | Use Case |
|-----|----------|-------|-----|-----|------------|----------|
| Resumen | Specific | `"specific"` | ✅ | ✅ | ✅ | Comparación de KPIs mensuales |
| Personal | Specific | `"specific"` | ✅ | ✅ | ✅ | Análisis demográfico mensual |
| Incidencias | Year | `"year"` | ✅ | ❌ | ✅ | Análisis anual de incidencias |
| Rotación | Year-Only | `"year-only"` | ✅ | ❌ | ✅ | Bajas del año con filtros aplicados |
| Históricos | General | `"general"` | ❌ | ❌ | ✅ | Análisis sin temporalidad |

## Funciones Principales

### `applyFiltersWithScope()`
Motor principal de filtrado que recibe plantilla, opciones y scope.

**Firma:**
```typescript
function applyFiltersWithScope(
  plantilla: PlantillaRecord[],
  options: Partial<RetentionFilterOptions>,
  scope: "specific" | "year" | "year-only" | "general"
): PlantillaRecord[]
```

### `extractAvailableFiltersFromPlantilla()`
Extrae valores únicos disponibles para cada filtro desde la plantilla.

**Retorna:**
```typescript
{
  years: number[],
  months: number[],
  departamentos: string[],
  puestos: string[],
  areas: string[],
  // ...etc
}
```

### `summarizeFilters()`
Genera texto descriptivo de los filtros activos.

**Ejemplo:**
```typescript
// Input: { years: [2024], months: [1,2,3], departamentos: ['Ventas'] }
// Output: "2024 (Ene-Mar) • Ventas"
```

## Tipos

### `RetentionFilterOptions`
```typescript
interface RetentionFilterOptions {
  years: number[];
  months: number[];
  departamentos: string[];
  puestos: string[];
  clasificaciones: string[];
  ubicaciones: string[];
  ubicacionesIncidencias: string[];
  empresas: string[];
  areas: string[];
  includeInactive?: boolean;  // Para incluir empleados dados de baja
}
```

## Casos Especiales

### Rotación: Respeta filtros estructurales pero NO filtra por mes

Las tablas de rotación (Tab 3) aplican **filtros estructurales pero muestran datos anuales**:

1. **Filtros estructurales aplicados**: Si seleccionas departamento="Ventas", solo verás bajas de Ventas
2. **Sin filtro de mes**: Muestra todas las bajas del año completo (no solo el mes seleccionado)
3. **Análisis coherente**: Los filtros de área/departamento permiten enfocar el análisis

**Ejemplo:**
```
✅ Filtrar por departamento="Ventas" + año=2025 →
   Tablas muestran SOLO bajas de Ventas en 2025 (todos los meses)

✅ Sin filtros estructurales + año=2025 →
   Tablas muestran TODAS las bajas de 2025 (todas las áreas, todos los meses)
```

### Incidencias: ¿Por qué no filtrar por mes?

El Tab Incidencias (Tab 2) necesita datos del **año completo** porque:

1. **Patrones anuales**: Las incidencias se analizan como patrones de todo el año
2. **Gráficos mensuales**: Los gráficos muestran distribución por mes del año
3. **Comparaciones año-a-año**: Se comparan métricas anuales, no mensuales

## Imports Correctos

```typescript
// Importar desde el barrel export
import { applyFiltersWithScope, type RetentionFilterOptions } from '@/lib/filters';
import { summarizeFilters, extractAvailableFiltersFromPlantilla } from '@/lib/filters';

// NO importar directamente desde archivos internos
// ❌ import { applyFiltersWithScope } from '@/lib/filters/core/filter-engine';
```

## Ejemplo de Uso Completo

```typescript
import { applyFiltersWithScope, summarizeFilters } from '@/lib/filters';

function MyComponent() {
  // Tab Resumen: Mes específico con estructura
  const plantillaResumen = applyFiltersWithScope(plantilla, {
    years: [2024],
    months: [1],  // Enero
    departamentos: ['Ventas', 'Marketing'],
    areas: ['Comercial']
  }, "specific");

  // Tab Rotación: Año + estructura, sin mes
  const plantillaRotacion = applyFiltersWithScope(plantilla, {
    ...retentionFilters,  // Incluye filtros estructurales
    months: [],           // Pero sin mes
    includeInactive: true
  }, "year-only");

  // Texto descriptivo
  const filterText = summarizeFilters({
    years: [2024],
    months: [1],
    departamentos: ['Ventas']
  });
  // → "2024 (Ene) • Ventas"
}
```

## Performance

- **Memoización**: Usa `useMemo` en componentes para evitar recálculo innecesario
- **Scope óptimo**: Usa el scope más específico necesario para reducir procesamiento
- **Índices**: Los filtros aprovechan arrays de JavaScript sin búsquedas costosas

## Testing

Tests ubicados en `__tests__/filters.test.ts`:
- 212+ tests cubren todas las variantes y combinaciones
- Tests verifican edge cases y datos vacíos
- Validación de scopes y compatibilidad

## Mantenimiento

Al agregar un nuevo filtro:
1. Actualizar `RetentionFilterOptions` interface
2. Actualizar `applyFiltersWithScope()` para procesar nuevo filtro
3. Actualizar `extractAvailableFiltersFromPlantilla()` para extraer valores
4. Agregar tests para el nuevo filtro
5. Actualizar esta documentación con el nuevo filtro
