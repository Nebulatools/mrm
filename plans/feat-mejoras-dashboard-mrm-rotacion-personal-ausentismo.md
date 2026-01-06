# feat: Mejoras Dashboard MRM - Rotación, Personal y Ausentismo

**Fecha:** 2025-01-05
**Tipo:** Enhancement

**Prioridad:** Alta

---

## Overview

Mejoras al dashboard de KPIs de Recursos Humanos para enfocar el análisis en **rotación voluntaria** como métrica primaria, agregar **segmentación por unidad de negocio** (Corporativo, CAD, Filiales), y añadir nuevas tablas de análisis demográfico y de rotación.

## Problem Statement / Motivación

El cliente requiere:
1. **Foco primario en rotación voluntaria** - Actualmente el default es involuntaria
2. **Segmentación por unidad de negocio** - Filtros por Corporativo, CAD, Filiales (en lugar de Negocio/Área/Departamento)
3. **Ausentismo por tipo** - Ver % segmentado por Faltas y Salud (en lugar de incidencias genéricas)
4. **Tablas adicionales** - Análisis demográfico en Personal y análisis de rotación detallado

---

## Proposed Solution

### Cambios por Tab

#### 🔵 TAB RESUMEN (`summary-comparison.tsx`)

| # | Cambio | Descripción | Línea aprox. |
|---|--------|-------------|--------------|
| 1 | **Filtros por Ubicación** | Cambiar tabs Negocio/Área/Departamento → Ubicación (Corporativo, CAD, Filiales) | ~1468-1502 |
| 2 | **Default Rotación Voluntaria** | Cambiar `useState('involuntaria')` → `useState('voluntaria')` | ~237 |
| 3 | **Comparación año anterior** | KPI Rotación Mensual: "vs mes anterior" → "vs mismo mes año anterior" | Cards KPI |

**Archivo:** `apps/web/src/components/summary-comparison.tsx`

---

#### 🟢 TAB PERSONAL (`dashboard-page.tsx`)

**EXISTENTE (NO TOCAR):**
- ✅ Clasificación (Confianza vs Sindicalizado)
- ✅ Género (Hombre/Mujer)
- ✅ Distribución por Edad (scatter)
- ✅ HC por Departamento
- ✅ HC por Área
- ✅ Antigüedad por Área

**AGREGAR - 2 Tablas nuevas:**

##### Tabla 1: Edad por Género
```
| Edad    | Femenino | Masculino | Total | %    |
|---------|----------|-----------|-------|------|
| 18-20   | 6        | 10        | 16    | 8%   |
| 21-25   | 16       | 29        | 45    | 23%  |
| 26-30   | 20       | 13        | 33    | 17%  |
| 31-35   | 15       | 18        | 33    | 17%  |
| 36-40   | 16       | 8         | 24    | 12%  |
| 41+     | 22       | 26        | 48    | 24%  | ← Resaltado
| Total   | 95       | 104       | 199   | 100% |
```

##### Tabla 2: Antigüedad por Género
```
| Antigüedad      | Femenino | Masculino | Total | %    |
|-----------------|----------|-----------|-------|------|
| Menor de 1 mes  | 5        | 8         | 13    | 7%   |
| 1 a 3 meses     | 10       | 13        | 23    | 12%  |
| 3 a 6 meses     | 10       | 14        | 24    | 12%  |
| 6 meses a 1 año | 12       | 11        | 23    | 12%  |
| 1-3 años        | 27       | 30        | 57    | 29%  | ← Resaltado
| 3-5 años        | 11       | 9         | 20    | 10%  |
| más de 5 años   | 20       | 19        | 39    | 20%  |
| Total           | 95       | 104       | 199   | 100% |
```

**Archivo nuevo:** `apps/web/src/components/tables/age-gender-table.tsx`
**Archivo nuevo:** `apps/web/src/components/tables/seniority-gender-table.tsx`

---

#### 🟡 TAB INCIDENCIAS (`incidents-tab.tsx`)

**Cambio:** Mostrar % de ausentismo segmentado por tipo:
- **Faltas** (FI, SUSP, PSIN) ← CORREGIDO: SUSP no SUS según Supabase
- **Salud** (ENFE)

En lugar del agrupamiento genérico actual de "incidencias".

**Archivo:** `apps/web/src/components/incidents-tab.tsx`

---

#### 🔴 TAB ROTACIÓN (`dashboard-page.tsx`)

**EXISTENTE (NO TOCAR):**
- ✅ 5 KPIs principales
- ✅ Toggle filtro Rotación
- ✅ RetentionCharts
- ✅ BajasPorMotivoHeatmap
- ✅ AbandonosOtrosSummary
- ✅ DismissalReasonsTable

**AGREGAR - 4 Tablas nuevas:**

##### Tabla 1: Headcount por Ubicación/Mes
```
| HEADCOUNT      | ENE | FEB | MAR | ABR | MAY | JUN | JUL | ... |
|----------------|-----|-----|-----|-----|-----|-----|-----|-----|
| ADMINISTRATIVO | 122 | 120 | 121 | 120 | 119 | 118 | 122 |     |
| CEDIS          | 182 | 191 | 191 | 202 | 191 | 197 | 187 |     |
| FILIALES       | 44  | 42  | 42  | 39  | 42  | 44  | 46  |     |
| **TOTAL**      | 348 | 353 | 354 | 361 | 352 | 359 | 355 |     |
```

##### Tabla 2: Bajas Voluntarias por Ubicación/Mes
```
| BAJAS VOLUNTARIAS | ENE | FEB | MAR | ABR | MAY | JUN | JUL | ... |
|-------------------|-----|-----|-----|-----|-----|-----|-----|-----|
| ADMINISTRATIVO    | 1   | 1   | 1   | 1   | 1   | 1   | 1   |     |
| CEDIS             | 10  | 12  | 16  | 6   | 14  | 4   | 13  |     |
| FILIALES          | 3   | 2   | 0   | 2   | 3   | 4   | 1   |     |
| **TOTAL**         | 14  | 15  | 17  | 9   | 18  | 9   | 15  |     |
```

##### Tabla 3: Bajas Involuntarias por Ubicación/Mes
```
| BAJAS INVOLUNTARIAS | ENE | FEB | MAR | ABR | MAY | JUN | JUL | ... |
|---------------------|-----|-----|-----|-----|-----|-----|-----|-----|
| ADMINISTRATIVO      | 0   | 1   | 4   | 2   | 0   | 0   | 0   |     |
| CEDIS               | 4   | 4   | 3   | 1   | 9   | 11  | 13  |     |
| FILIALES            | 0   | 1   | 0   | 0   | 0   | 0   | 0   |     |
| **TOTAL**           | 4   | 6   | 7   | 3   | 9   | 11  | 13  |     |
```

##### Tabla 4: % Rotación por Ubicación/Mes
```
| ROTACION       | ENE   | FEB   | MAR   | ABR   | MAY   | JUN   | JUL   | ... |
|----------------|-------|-------|-------|-------|-------|-------|-------|-----|
| ADMINISTRATIVO | 0.82% | 0.83% | 0.83% | 0.83% | 0.84% | 0.85% | 0.82% |     |
| CEDIS          | 5.49% | 6.28% | 8.38% | 2.97% | 7.33% | 2.03% | 6.95% |     |
| FILIALES       | 6.82% | 4.76% | 0.00% | 5.13% | 7.14% | 9.09% | 2.17% |     |
| **TOTAL**      | 4.02% | 4.25% | 4.80% | 2.49% | 5.11% | 2.51% | 4.23% |     |
```

##### Tabla 5: Rotación por Motivo y Área
```
| ÁREA               | ABANDONO | RESCISIÓN CONTRATO | MEJOR OFERTA | PROBLEMAS PERSONALES |
|--------------------|----------|---------------------|--------------|----------------------|
| REABASTO           | 15       | 11                  | 5            | 2                    |
| RECIBO             | 7        | 5                   | 3            | 3                    |
| SURTIDO            | 4        | 4                   | 4            |                      |
| SERVICIOS GENERALES| 1        | 1                   |              |                      |
| EMPAQUE            | 4        | 8                   |              | 2                    |
| ...                |          |                     |              |                      |
| **TOTAL**          | 32       | 34                  | 13           | 8                    |
| **%**              | 41%      | 30%                 | 14%          | 8%                   |
```

##### Tabla 6: Rotación por Motivo y Antigüedad
```
| MOTIVO                | 0-1 mes | 1-3 meses | 3-6 meses | 6m-1 año | 1-3 años |
|-----------------------|---------|-----------|-----------|----------|----------|
| ABANDONO              | 23      | 7         | 1         |          |          |
| RESCISION DE CONTRATO | 4       | 6         | 7         | 4        | 7        |
| MEJOR OFERTA LABORAL  | 5       | 1         | 2         | 3        | 2        |
| PROBLEMAS PERSONALES  |         | 2         |           | 7        | 3        |
| OTROS                 | 3       | 1         |           |          |          |
| **Total**             | 35      | 17        | 10        | 14       | 12       |
| **%**                 | 38%     | 19%       | 11%       | 15%      | 13%      |
```

##### Tabla 7: Motivo de Baja por Mes
```
| MOTIVO                | ENE | FEB | MAR | ABR | MAY | JUN | JUL | ... |
|-----------------------|-----|-----|-----|-----|-----|-----|-----|-----|
| ABANDONO              | 6   | 10  | 9   | 2   | 3   | 0   |     |     |
| RESCISION DE CONTRATO | 4   | 4   | 3   | 1   | 9   | 10  |     |     |
| MEJOR OFERTA LABORAL  | 2   | 1   | 1   | 4   | 5   | 1   |     |     |
| PROBLEMAS PERSONALES  | 1   | 1   | 2   | 0   | 1   | 1   |     |     |
| OTROS                 | 1   | 0   | 3   | 0   | 5   | 2   |     |     |
| **Total general**     | 14  | 16  | 18  | 7   | 23  | 14  |     |     |
```

**Archivos nuevos:**
- `apps/web/src/components/tables/rotation-headcount-table.tsx`
- `apps/web/src/components/tables/rotation-bajas-table.tsx`
- `apps/web/src/components/tables/rotation-by-location-table.tsx`
- `apps/web/src/components/tables/rotation-by-motive-area-table.tsx`
- `apps/web/src/components/tables/rotation-by-motive-seniority-table.tsx`
- `apps/web/src/components/tables/rotation-by-motive-month-table.tsx`

---

## Technical Considerations

### Campos de Base de Datos Requeridos (ACTUALIZADO según Supabase)

⚠️ **CORRECCIÓN IMPORTANTE**: Se usa el campo `cc` (Centro de Costo), NO `ubicacion`.

El campo `ubicacion` contiene nombres legales de empresa (no útil para segmentación de negocio).
El campo `cc` contiene los códigos de centro de costo que permiten la segmentación correcta.

```typescript
// Campo correcto para segmentación:
cc: string  // Centro de Costo

// Función de normalización implementada:
function normalizeCCToUbicacion(cc: string | null | undefined): string {
  if (!cc) return 'SIN UBICACIÓN';
  const upper = cc.toUpperCase().trim();

  // CAD = Centro de Distribución (683 empleados)
  if (upper === 'CAD') return 'CAD';

  // Corporativo = *MRM, DIRECCION, TESORERIA
  if (upper.includes('MRM') || upper.includes('DIRECCION') || upper.includes('TESORERIA'))
    return 'CORPORATIVO';

  // Filiales = SM*, DF, TORREON, CHIHUAHUA, YAMAHA, TERRAPARK, MOTOSTAFF
  if (upper.startsWith('SM') || upper === 'DF' || upper.includes('TORREON') ||
      upper.includes('CHIHUAHUA') || upper === 'YAMAHA' || upper.includes('TERRAPARK') ||
      upper === 'MOTOSTAFF')
    return 'FILIALES';

  return 'OTROS';
}
```

**Valores de CC reales en Supabase:**
- `CAD` → CAD (Centro de Distribución) - 683 empleados
- `*MRM`, `DIRECCION MRM`, `TESORERIA MRM` → CORPORATIVO
- `SM*`, `DF`, `TORREON`, `CHIHUAHUA`, `YAMAHA`, `TERRAPARK`, `MOTOSTAFF` → FILIALES

### Datos Reales de Supabase (Validados)

**Códigos de Incidencia (`inci` en asistencia_diaria):**
- `FI` - Falta Injustificada
- `SUSP` - Suspensión (NO "SUS")
- `PSIN` - Permiso Sin Goce
- `ENFE` - Enfermedad
- `VAC` - Vacaciones
- `MAT3`, `MAT1` - Maternidad
- `PCON` - Permiso Con Goce
- `FEST` - Festivo
- `PATER` - Paternidad
- `JUST` - Justificada

**Motivos de Baja (`motivo_baja` en plantilla):**
- Voluntarios: "Abandono / No regresó", "Otro trabajo mejor compensado", "Regreso a la escuela", etc.
- Involuntarios: "Término del contrato", "Rescisión por desempeño", etc.

**Género (`genero`):**
- "Masculino", "Femenino" (completos, no abreviaturas)

### Estructura de Archivos

```
apps/web/src/components/
├── summary-comparison.tsx        # MODIFICAR
├── dashboard-page.tsx            # MODIFICAR
├── incidents-tab.tsx             # MODIFICAR
└── tables/                       # CREAR CARPETA
    ├── age-gender-table.tsx      # NUEVO
    ├── seniority-gender-table.tsx # NUEVO
    ├── rotation-headcount-table.tsx # NUEVO
    ├── rotation-bajas-table.tsx  # NUEVO
    ├── rotation-by-location-table.tsx # NUEVO
    ├── rotation-by-motive-area-table.tsx # NUEVO
    ├── rotation-by-motive-seniority-table.tsx # NUEVO
    └── rotation-by-motive-month-table.tsx # NUEVO
```

### Dependencias

- shadcn/ui Table component (ya instalado)
- Recharts (ya instalado)
- No se requieren nuevas dependencias

---

## Acceptance Criteria

### Functional Requirements

- [ ] Tab Resumen muestra filtros por Ubicación (Corporativo, CAD, Filiales)
- [ ] Rotación Voluntaria es el default al cargar el dashboard
- [ ] KPI Rotación Mensual compara con el mismo mes del año anterior
- [ ] Tab Personal incluye tabla Edad/Género con rangos correctos
- [ ] Tab Personal incluye tabla Antigüedad/Género con rangos correctos
- [ ] Tab Incidencias muestra % por Faltas y % por Salud
- [ ] Tab Rotación incluye tabla Headcount por Ubicación/Mes
- [ ] Tab Rotación incluye tabla Bajas Voluntarias por Ubicación/Mes
- [ ] Tab Rotación incluye tabla Bajas Involuntarias por Ubicación/Mes
- [ ] Tab Rotación incluye tabla % Rotación por Ubicación/Mes
- [ ] Tab Rotación incluye tabla Rotación por Motivo/Área
- [ ] Tab Rotación incluye tabla Rotación por Motivo/Antigüedad
- [ ] Tab Rotación incluye tabla Motivo de Baja por Mes
- [ ] Todas las tablas existentes se mantienen intactas

### Non-Functional Requirements

- [ ] Las tablas nuevas siguen el estilo visual del dashboard existente
- [ ] Las tablas son responsivas
- [ ] Los datos se calculan correctamente de las tablas SFTP existentes
- [ ] No hay regresiones en funcionalidad existente

---

## Implementation Phases

### Phase 1: Tab Resumen (Prioridad Alta)
**Archivos:** `summary-comparison.tsx`

1. Cambiar tabs de filtro a Ubicación
2. Cambiar default de rotación a voluntaria
3. Modificar comparación de KPI a año anterior

**Esfuerzo estimado:** 2-3 horas

### Phase 2: Tab Personal (Prioridad Alta)
**Archivos:** `dashboard-page.tsx`, nuevos componentes de tabla

1. Crear componente `age-gender-table.tsx`
2. Crear componente `seniority-gender-table.tsx`
3. Integrar tablas en dashboard-page.tsx

**Esfuerzo estimado:** 3-4 horas

### Phase 3: Tab Incidencias (Prioridad Media)
**Archivos:** `incidents-tab.tsx`

1. Segmentar incidencias por tipo (Faltas vs Salud)
2. Mostrar % en lugar de # genéricos

**Esfuerzo estimado:** 2-3 horas

### Phase 4: Tab Rotación (Prioridad Alta)
**Archivos:** `dashboard-page.tsx`, nuevos componentes de tabla

1. Crear componentes de tabla (6 tablas)
2. Integrar en dashboard-page.tsx después de componentes existentes

**Esfuerzo estimado:** 6-8 horas

---

## Risk Analysis

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Campo `ubicacion` con valores inconsistentes | Media | Alto | Normalizar valores en queries |
| Performance con muchas tablas | Baja | Medio | Lazy loading de tablas |
| Datos faltantes en períodos | Media | Medio | Mostrar "-" o "N/A" |

---

## Referencias

### Archivos Existentes Analizados

- `apps/web/src/components/summary-comparison.tsx` - Tab Resumen (1519 líneas)
- `apps/web/src/components/dashboard-page.tsx` - Dashboard principal (~1850 líneas)
- `apps/web/src/components/incidents-tab.tsx` - Tab Incidencias (1334 líneas)
- `apps/web/src/lib/supabase.ts` - Cliente Supabase con campo ubicacion
- `apps/web/src/lib/filters/filters.ts` - Sistema de filtros con ubicaciones

### Screenshots de Referencia

- Tab Personal: Tablas Edad/Género y Antigüedad/Género
- Tab Rotación: Tablas Headcount, Bajas, Rotación por Ubicación
- Tab Rotación: Tabla Rotación por Motivo/Área
- Tab Rotación: Tablas Motivo/Antigüedad y Motivo/Mes

---

## Notas Importantes

⚠️ **NO ELIMINAR** ninguna gráfica o tabla existente - Solo agregar nuevas
⚠️ Mantener consistencia visual con componentes shadcn/ui existentes
⚠️ Verificar valores de `ubicacion` en la base de datos antes de implementar filtros

---

## 📊 Estado de Implementación - 2025-01-05

### ✅ COMPLETADO HOY (Commit 717baaf)

**PR #6:** https://github.com/Nebulatools/mrm/pull/6
**Branch:** `feat/mejoras-dashboard-rotacion-personal-ausentismo`

#### Mejoras Implementadas (8 de 13 totales - 60%):

**✅ Phase 1 - Tab Resumen** (2/3)
- [x] Default cambiado a "Rotación Voluntaria" (`summary-comparison.tsx:237`)
- [x] KPI Rotación Mensual compara vs mismo mes año anterior (`summary-comparison.tsx:679-687`)
- [ ] ❌ Filtros por Ubicación (BLOQUEADO - requiere ubicacion2)

**✅ Phase 2 - Tab Personal** (3/3)
- [x] Tabla Edad por Género creada (`tables/age-gender-table.tsx`)
- [x] Tabla Antigüedad por Género creada (`tables/seniority-gender-table.tsx`)
- [x] Integradas en dashboard-page.tsx (líneas 1585-1593)
- [x] UI mejorado con rounded corners y alternating colors

**✅ Phase 3 - Tab Incidencias** (3/3)
- [x] Código corregido: 'SUS' → 'SUSP' en todos los archivos
- [x] Nuevas tarjetas KPI: Faltas % y Salud % (`incidents-tab.tsx:679-708`)
- [x] Grid actualizado: 4 → 6 tarjetas (3 columnas) (`incidents-tab.tsx:944`)

**✅ Phase 4 - Tab Rotación** (3/7)
- [x] Tabla Rotación por Motivo/Área (`tables/rotation-by-motive-area-table.tsx`)
- [x] Tabla Rotación por Motivo/Antigüedad (`tables/rotation-by-motive-seniority-table.tsx`)
- [x] Tabla Motivo de Baja por Mes (`tables/rotation-by-motive-month-table.tsx`)
- [x] Integradas en dashboard-page.tsx (líneas 1849-1864)
- [x] UI mejorado con rounded corners y alternating colors
- [ ] ❌ Tabla Headcount por Ubicación/Mes (BLOQUEADO)
- [ ] ❌ Tabla Bajas por Ubicación/Mes (BLOQUEADO)
- [ ] ❌ Tabla % Rotación por Ubicación/Mes (BLOQUEADO)
- [ ] ❌ Tabla Bajas por Tipo (Vol/Invol) × Ubicación/Mes (BLOQUEADO)

#### Cambios Técnicos:
- ✅ TypeScript validation passing
- ✅ Fixed recharts type compatibility issues
- ✅ Consistent styling with existing tables (rounded corners, alternating rows, hover effects)
- ✅ 5 nuevos componentes en `/components/tables`
- ✅ 6 archivos modificados

---

## 🚧 PENDIENTE PARA MAÑANA

### **Paso 1: Resolver Campo ubicacion2** (Bloqueador Crítico)

**Decisión requerida:** ¿Cómo obtener ubicación para empleados?

#### **Opción A: Agregar columna a empleados_sftp** (RECOMENDADA)

```sql
-- Migration necesaria:
ALTER TABLE empleados_sftp ADD COLUMN ubicacion2 VARCHAR(50);
CREATE INDEX idx_empleados_ubicacion2 ON empleados_sftp(ubicacion2);

-- Poblar con una de estas estrategias:
-- 1) Si CSV trae la columna → import directo
-- 2) Derivar desde campo `cc` → función de mapeo
-- 3) Copiar desde tabla incidencias → JOIN por numero_empleado
```

**Ventajas:**
- ✅ Cobertura 100% de empleados
- ✅ Una fuente de verdad
- ✅ No requiere JOINs complejos

**Pasos de implementación:**
1. Verificar si `Validacion Alta de empleados.xls` trae columna "Ubicacion2"
2. Si NO trae → Crear función `getCategoriaUbicacion(cc: string)`
3. Ejecutar migration en Supabase
4. Actualizar importer SFTP para poblar ubicacion2
5. Reimportar datos

#### **Opción B: Mapeo desde campo `cc`** (Sin cambios DB)

```typescript
// En apps/web/src/lib/normalizers.ts
export function getCategoriaUbicacion(cc: string | null): string {
  if (!cc) return 'SIN UBICACIÓN';
  const upper = cc.toUpperCase().trim();

  if (upper === 'CAD') return 'CAD';
  if (upper.includes('MRM') || upper.includes('DIRECCION')) return 'CORPORATIVO';
  if (upper.startsWith('SM') || upper === 'DF') return 'FILIALES';

  return 'OTROS';
}
```

**Ventajas:**
- ✅ No requiere migration
- ✅ Implementable inmediatamente

**Desventajas:**
- ⚠️ Requiere validar mapeo con cliente
- ⚠️ Necesita conocer todos los valores de `cc`

**Pasos de implementación:**
1. Query Supabase: `SELECT DISTINCT cc FROM empleados_sftp ORDER BY cc`
2. Crear función de mapeo basada en valores reales
3. Aplicar en filtros y agrupaciones
4. Validar con cliente

---

### **Paso 2: Implementar Funcionalidades Bloqueadas** (4-6 horas)

Una vez resuelto ubicacion2:

#### **2.1 Actualizar Filtros (1-2 horas)**
```typescript
// En filter-panel.tsx
- Agregar filtro "Ubicación" con opciones: CAD, CORPORATIVO, FILIALES
- Reemplazar tabs Negocio/Área/Departamento en summary-comparison.tsx
```

#### **2.2 Crear Tablas por Ubicación (3-4 horas)**
```typescript
// Nuevos componentes:
- rotation-headcount-table.tsx       // Headcount × Mes × Ubicación
- rotation-bajas-voluntarias-table.tsx // Bajas Vol × Mes × Ubicación
- rotation-bajas-involuntarias-table.tsx // Bajas Invol × Mes × Ubicación
- rotation-percentage-table.tsx     // % Rotación × Mes × Ubicación
```

**Estructura de tablas:**
```
| UBICACIÓN      | ENE | FEB | MAR | ... | DIC | TOTAL |
|----------------|-----|-----|-----|-----|-----|-------|
| CAD            | 182 | 191 | 191 | ... | 187 | 2,245 |
| CORPORATIVO    | 122 | 120 | 121 | ... | 122 | 1,450 |
| FILIALES       | 44  | 42  | 42  | ... | 46  | 520   |
| TOTAL          | 348 | 353 | 354 | ... | 355 | 4,215 |
```

#### **2.3 Integrar en Dashboard (30 min)**
```typescript
// En dashboard-page.tsx - Tab Rotación
- Agregar imports de nuevas tablas
- Insertar componentes antes de DismissalReasonsTable
- Pasar ubicacion2 como prop
```

#### **2.4 Validación Final (30 min)**
- Verificar cálculos con datos reales
- Validar que totales cuadren
- Type-check passing
- Screenshot de todas las tablas

---

## 📋 Checklist para Mañana

### Pre-implementación:
- [ ] Decidir entre Opción A (migration) u Opción B (mapeo desde cc)
- [ ] Si Opción A: Verificar CSV trae columna Ubicacion2
- [ ] Si Opción B: Query valores de `cc` en Supabase
- [ ] Validar mapeo de centros de costo con cliente

### Implementación:
- [ ] Resolver campo ubicacion2 en empleados_sftp
- [ ] Crear/actualizar función de categorización
- [ ] Actualizar filtro panel con Ubicación
- [ ] Crear 4 tablas de rotación por ubicación
- [ ] Integrar en Tab Rotación
- [ ] Actualizar Tab Resumen con tabs de Ubicación

### Testing:
- [ ] Type-check passing
- [ ] Validar cálculos de headcount por ubicación
- [ ] Verificar totales cuadran en todas las tablas
- [ ] Screenshot de cada tabla nueva
- [ ] Validar responsiveness (mobile/tablet/desktop)

### Deploy:
- [ ] Commit cambios
- [ ] Push y crear PR
- [ ] Merge PR #6 (cambios de hoy)
- [ ] Merge PR nuevo (cambios de mañana)

---

## 🎯 Objetivo Final

**Meta:** Completar 100% del plan original (13/13 mejoras)
**Tiempo estimado restante:** 4-6 horas
**Bloqueador:** Campo ubicacion2 (decisión pendiente)

**Al completar, el dashboard tendrá:**
- ✅ Rotación voluntaria como default
- ✅ Comparación año anterior
- ✅ 2 tablas demográficas (Edad/Antigüedad × Género)
- ✅ 2 KPIs segmentados (Faltas/Salud)
- ✅ 3 tablas de análisis de rotación (Motivo × Área/Antigüedad/Mes)
- 🔜 Filtros por Ubicación (CAD/CORPORATIVO/FILIALES)
- 🔜 4 tablas de rotación por Ubicación × Mes

---

## 📞 Contacto y Próximos Pasos

**Para continuar mañana:**
1. Revisar y aprobar PR #6
2. Decidir solución para ubicacion2
3. Enviar valores reales de campo `cc` si se usa Opción B
4. Programar sesión de implementación (4-6 horas)

**Preguntas para el cliente:**
- ¿El CSV de empleados trae columna "Ubicacion2"?
- ¿Qué valores tiene el campo `cc` actualmente?
- ¿Cómo se clasifican los centros de costo? (CAD/CORPORATIVO/FILIALES)
