# Sistema de Filtros del Dashboard MRM

**Última actualización:** Enero 2025
**Archivo principal:** `apps/web/src/lib/filters/filters.ts`

---

## Resumen Ejecutivo

El sistema de filtros centraliza toda la lógica de filtrado del dashboard en un solo lugar. Permite filtrar empleados por múltiples dimensiones (tiempo, ubicación, organización) y se aplica consistentemente en todos los tabs.

---

## 1. Arquitectura de Filtros

### 1.1 Función Principal: `applyFiltersWithScope()`

```typescript
applyFiltersWithScope(plantilla, filters, scope)
```

**Parámetros:**
- `plantilla`: Array de empleados (`PlantillaRecord[]`)
- `filters`: Opciones de filtrado (`RetentionFilterOptions`)
- `scope`: Alcance del filtro (`'specific' | 'general' | 'year-only'`)

**Scopes disponibles:**

| Scope | Año | Mes | Otros Filtros |
|-------|-----|-----|---------------|
| `'specific'` | ✅ Sí | ✅ Sí | ✅ Sí |
| `'year-only'` | ✅ Sí | ❌ No | ✅ Sí |
| `'general'` | ❌ No | ❌ No | ✅ Sí |

### 1.2 Interface de Filtros

```typescript
interface RetentionFilterOptions {
  // Filtros temporales
  years: number[];           // Años seleccionados [2024, 2025]
  months: number[];          // Meses seleccionados [1-12]

  // Filtros organizacionales
  empresas?: string[];       // Negocio/Empresa
  areas?: string[];          // Área
  departamentos?: string[];  // Departamento
  puestos?: string[];        // Puesto
  clasificaciones?: string[];// Clasificación

  // Filtros de ubicación
  ubicaciones?: string[];    // Ubicación principal
  ubicacionesIncidencias?: string[]; // CAD/CORPORATIVO/FILIALES

  // Filtros especiales
  motivoFilter?: 'involuntaria' | 'voluntaria' | 'all';
  includeInactive?: boolean; // Incluir empleados con baja
}
```

---

## 2. Datasets Filtrados en Dashboard

El dashboard crea varios datasets con diferentes niveles de filtrado:

### 2.1 `plantillaFiltered` (Filtro Completo)
```typescript
const plantillaFiltered = applyFiltersWithScope(data.plantilla, retentionFilters, 'specific');
```
- Aplica **TODOS** los filtros incluyendo año y mes
- Usado por: tablas que deben respetar el mes seleccionado

### 2.2 `plantillaFilteredYearScope` (Sin Filtro de Mes)
```typescript
const plantillaFilteredYearScope = applyFiltersWithScope(data.plantilla, {
  ...retentionFilters,
  includeInactive: true,
}, 'year-only');
```
- Aplica todos los filtros **EXCEPTO** mes
- Usado por: gráficas/tablas que muestran meses en el eje X

### 2.3 `data.plantilla` (Sin Filtros de Tiempo)
- Datos crudos sin filtros de tiempo
- Usado por: análisis históricos que no deben limitarse por período

---

## 3. Tab Retención - Configuración de Tablas

### 3.1 Resumen de Filtros por Tabla

| Tabla | Dataset | Filtro Mes | Filtro Año | Motivos por Año |
|-------|---------|------------|------------|-----------------|
| **Rotación por Motivo y Área** | `plantillaFiltered` | ✅ Sí | ✅ Sí | ✅ Sí |
| **Rotación por Motivo y Antigüedad** | `data.plantilla` | ❌ No | ❌ No | ❌ No |
| **Rotación por Motivo y Mes** | `plantillaFilteredYearScope` | ❌ No | ✅ Sí | ✅ Sí |
| **Rotación Combinada (Ubicación)** | `plantillaFilteredYearScope` | ❌ No | ✅ Sí | ✅ Sí |
| **Detalle de Bajas** | `plantillaDismissalDetail` | ✅ Sí | ✅ Sí | - |

### 3.2 Lógica de Decisión

**¿La tabla muestra meses en el eje X?**
- **SÍ** → Usar `plantillaFilteredYearScope` (sin filtro de mes)
- **NO** → Usar `plantillaFiltered` (con filtro de mes)

**¿La tabla es análisis histórico (ej: antigüedad)?**
- **SÍ** → Usar `data.plantilla` (sin filtros de tiempo)
- **NO** → Aplicar filtros de tiempo según corresponda

---

## 4. JOIN entre `empleados_sftp` y `motivos_baja`

### 4.1 Problema Original

La tabla `empleados_sftp` NO tiene columna `motivo_baja`. El motivo se obtiene de la tabla `motivos_baja` mediante JOIN por `numero_empleado`.

### 4.2 Solución Implementada

```typescript
// 1. Filtrar motivos_baja por los años seleccionados
const filteredMotivosBaja = selectedYears.length > 0
  ? motivosBaja.filter(baja => {
      if (!baja.fecha_baja) return false;
      const bajaYear = new Date(baja.fecha_baja).getFullYear();
      return selectedYears.includes(bajaYear);
    })
  : motivosBaja;

// 2. Crear lookup map
const motivosMap = new Map<number, string>();
filteredMotivosBaja.forEach(baja => {
  motivosMap.set(baja.numero_empleado, baja.motivo);
});

// 3. JOIN: obtener motivo por numero_empleado
const rawMotivo = emp.numero_empleado
  ? motivosMap.get(emp.numero_empleado)
  : undefined;
const motivo = prettyMotivo(rawMotivo) || 'No especificado';
```

### 4.3 Importancia del Filtro por Año

**Sin filtro por año:**
- Empleados de 2025 podrían mostrar motivos de años anteriores
- Datos incorrectos y engañosos

**Con filtro por año:**
- Solo se muestran motivos del mismo período
- Si no hay datos de motivos para el año, aparece "No especificado"
- Refleja la realidad de los datos disponibles

---

## 5. Archivos Involucrados

### 5.1 Filtros Core
```
apps/web/src/lib/filters/filters.ts       # Lógica centralizada de filtros
apps/web/src/lib/filters/year-display.ts  # Utilidades para display de años
```

### 5.2 Componentes de Dashboard
```
apps/web/src/components/dashboard-page.tsx                    # Orquestador principal
apps/web/src/components/tables/rotation-by-motive-area-table.tsx
apps/web/src/components/tables/rotation-by-motive-seniority-table.tsx
apps/web/src/components/tables/rotation-by-motive-month-table.tsx
apps/web/src/components/tables/rotation-combined-table.tsx
apps/web/src/components/tables/rotation-bajas-voluntarias-table.tsx
apps/web/src/components/tables/rotation-bajas-involuntarias-table.tsx
```

### 5.3 Utilidades de Normalización
```
apps/web/src/lib/normalizers.ts   # prettyMotivo(), isMotivoClave(), etc.
apps/web/src/lib/types/records.ts # MotivoBajaRecord, PlantillaRecord
```

---

## 6. Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────┐
│                        SFTP Import                               │
│  empleados_sftp ──► motivos_baja ──► asistencia_diaria          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Dashboard Page                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ data.plantilla│    │  bajasData   │    │retentionFilters│   │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │                │
│         ▼                   │                   │                │
│  applyFiltersWithScope()◄───┼───────────────────┘                │
│         │                   │                                    │
│         ▼                   ▼                                    │
│  ┌──────────────────────────────────────────────────────┐       │
│  │              Datasets Filtrados                       │       │
│  │  • plantillaFiltered (todos los filtros)             │       │
│  │  • plantillaFilteredYearScope (sin mes)              │       │
│  │  • data.plantilla (sin filtros de tiempo)            │       │
│  └──────────────────────────────────────────────────────┘       │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │              Tablas de Rotación                       │       │
│  │  Cada tabla recibe:                                   │       │
│  │  • plantilla (dataset apropiado)                     │       │
│  │  • motivosBaja (para JOIN)                           │       │
│  │  • selectedYears (para filtrar motivos)              │       │
│  └──────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Clasificación de Motivos

### 7.1 Función `isMotivoClave()`

Determina si un motivo es **involuntario** (motivo clave):

```typescript
const MOTIVOS_CLAVE = [
  'bajo rendimiento',
  'daño',
  'despido',
  'falta de probidad',
  'incumplimiento',
  'insubordinacion',
  'rescisión por auditoria',
  // ... etc
];
```

### 7.2 Función `prettyMotivo()`

Normaliza y embellece los nombres de motivos para display.

---

## 8. Valores Esperados

### 8.1 Cuando `motivos_baja` tiene datos para el año
- Motivos aparecen correctamente clasificados
- Voluntarias vs Involuntarias calculadas correctamente

### 8.2 Cuando `motivos_baja` NO tiene datos para el año
- Todos los motivos aparecen como "No especificado"
- Bajas Involuntarias = 0 (sin motivo = voluntaria por defecto)
- **Esto es correcto** - refleja la falta de datos

---

## 9. Mantenimiento

### 9.1 Agregar Nuevo Filtro

1. Agregar campo a `RetentionFilterOptions` en `filters.ts`
2. Agregar a `buildNormalizedFilters()` si es filtro de texto
3. Agregar lógica de match en `applyRetentionFilters()`
4. Actualizar UI del panel de filtros

### 9.2 Agregar Nueva Tabla de Rotación

1. Crear componente en `components/tables/`
2. Definir props incluyendo:
   - `plantilla: PlantillaRecord[]`
   - `motivosBaja: MotivoBajaRecord[]`
   - `selectedYears?: number[]` (si aplica filtro de año)
3. Implementar JOIN con `motivosBaja` usando patrón de lookup map
4. Agregar a `dashboard-page.tsx` con dataset apropiado

---

## 10. Cambios Recientes (Enero 2025)

### 10.1 JOIN entre empleados_sftp y motivos_baja
- **Antes:** Se asumía que `empleados_sftp` tenía `motivo_baja` (incorrecto)
- **Ahora:** JOIN correcto por `numero_empleado` con tabla `motivos_baja`

### 10.2 Filtro de motivos por año
- **Antes:** Lookup usaba todos los motivos de todos los años
- **Ahora:** Lookup filtrado por `selectedYears` para integridad de datos

### 10.3 Consistencia de filtros en Tab Retención
- Definido claramente qué tablas usan qué scope de filtros
- Antigüedad usa datos históricos (sin filtro de tiempo)
- Tablas con meses en eje X usan `year-only` scope

---

## Apéndice A: Props de Tablas de Rotación

| Componente | Props |
|------------|-------|
| `RotationByMotiveAreaTable` | `plantilla`, `motivosBaja`, `selectedYears`, `refreshEnabled` |
| `RotationByMotiveSeniorityTable` | `plantilla`, `motivosBaja`, `refreshEnabled` |
| `RotationByMotiveMonthTable` | `plantilla`, `motivosBaja`, `selectedYears`, `refreshEnabled` |
| `RotationCombinedTable` | `plantilla`, `motivosBaja`, `selectedYears`, `refreshEnabled` |
| `RotationBajasVoluntariasTable` | `plantilla`, `motivosBaja`, `year`, `refreshEnabled` |
| `RotationBajasInvoluntariasTable` | `plantilla`, `motivosBaja`, `year`, `refreshEnabled` |
