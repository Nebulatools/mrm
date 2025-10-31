# FILTROS Y FÓRMULAS POR TAB - ESPECIFICACIÓN COMPLETA

**Fecha actualización**: 2025-10-23 (Última revisión completa)
**Estado**: ✅ Implementado, verificado y auditado

## 📋 RESUMEN EJECUTIVO

Este documento especifica cómo cada métrica y gráfico en el dashboard responde a los filtros del panel (Año, Mes, Negocio/Empresa, Área, Departamento, Puesto, Clasificación, Ubicación).

### 🎯 Sistema de Filtros Centralizado

**Ubicación**: `/apps/web/src/lib/filters/filters.ts`
**Función principal**: `applyRetentionFilters(plantilla, filters)`
**Panel de filtros**: `/apps/web/src/components/filter-panel.tsx`

**Filtros por defecto**: Año actual + Mes actual (se establecen automáticamente al cargar)

### Tipos de Filtrado

- **🟢 ESPECÍFICO**: La métrica/gráfico responde a TODOS los filtros seleccionados (Año, Mes, Negocio, Área, Depto, Puesto, Clasificación, Ubicación).
- **🟡 PARCIAL**: La métrica/gráfico responde a TODOS los filtros excepto al de Mes (ignora Mes, pero respeta Año, Negocio/Empresa, Área, Departamento, Puesto, Clasificación y Ubicación).

**Excepciones predefinidas del filtro de mes (operan como 🟡 PARCIAL)**

  - Gráficos comparativos de Rotación (Mensual, 12M y Año Actual). Se anclan al mes seleccionado pero muestran ventanas móviles de 12 meses/YTD.
  - Tendencia de Incidencias/Permisos (Resumen e Incidencias)
  - Visualizaciones principales del tab Retención (solo la tabla final usa todos los filtros)

---

## 1️⃣ TAB RESUMEN

### Métricas (KPI Cards)

| Métrica | Tipo Filtro | Descripción |
|---------|-------------|-------------|
| Empleados Activos | 🟢 ESPECÍFICO | Cuenta empleados activos con filtros aplicados |
| Rotación Mensual | 🟢 ESPECÍFICO | (Bajas del mes / Activos Promedio) × 100. Comparativo vs mes previo |
| Rotación Acumulada | 🟢 ESPECÍFICO | Rotación de los **últimos 12 meses** cerrados al mes selecc. |
| Rotación Año Actual | 🟢 ESPECÍFICO | Rotación acumulada **enero → mes selecc.** |
| Incidencias | 🟢 ESPECÍFICO | Total incidencias FI/SUS/PSIN/ENFE del periodo |
| Permisos | 🟢 ESPECÍFICO | Total permisos PCON/VAC/MAT3/MAT1/JUST del periodo |

> **Notas de consistencia**
> - Los KPIs usan la fecha de referencia del dashboard (`selectedPeriod`).
> - La variación se muestra en porcentaje salvo en *Empleados Activos* y métricas de *Bajas*, donde se expone la diferencia absoluta de personas.

### Gráficos

| Gráfico | Tipo Filtro | Notas |
|---------|-------------|-------|
| Empleados Activos por Antigüedad | 🟢 ESPECÍFICO | Barras apiladas con categorías: 0-3m, 3-6m, 6-12m, 1-3a, +3a |
| Rotación Mensual | 🟡 PARCIAL | Ignora el filtro de Mes; muestra 12 meses consecutivos y respeta Año, Negocio, Área, etc. |
| 12 Meses Móviles | 🟡 PARCIAL | Serie acumulada de 12M; ignora Mes pero respeta el resto de filtros. |
| Lo que va del Año | 🟡 PARCIAL | Rotación YTD; ignora Mes, mantiene Año y filtros organizacionales. |
| Incidencias - Últimos 12 meses | 🟡 PARCIAL | Incidencias totales por mes; ignora Mes y respeta Año/Negocio/Área/etc. |
| Permisos - Últimos 12 meses | 🟡 PARCIAL | Permisos totales por mes; ignora Mes y respeta Año/Negocio/Área/etc. |
| Tabla Ausentismo | 🟢 ESPECÍFICO | Desglose: Total, Permisos, Faltas, Otros

**Categorías de Antigüedad Actualizadas**:
- **0-3 meses** (antes: 0-1 años)
- **3-6 meses** (antes: 1-3 años)
- **6-12 meses** (antes: 3-5 años)
- **1-3 años** (antes: 5-10 años)
- **+3 años** (antes: 10+ años)

---

## 2️⃣ TAB PERSONAL (Bajas)

### Métricas (KPI Cards)

| Métrica | Tipo Filtro | Fórmula/Descripción |
|---------|-------------|---------------------|
| Empleados Activos | 🟢 ESPECÍFICO | Count(empleados.activo = true) con filtros |
| Bajas Totales | 🟢 ESPECÍFICO | Count(empleados.fecha_baja != null) con filtros |
| Ingresos Históricos | 🟢 ESPECÍFICO | Count(empleados.fecha_ingreso <= hoy) con filtros |
| Ingresos del Mes | 🟢 ESPECÍFICO | Count(empleados.fecha_ingreso IN mes actual) con filtros |
| Antigüedad Promedio | 🟢 ESPECÍFICO | ✅ CORREGIDO: Promedio solo de empleados activos FILTRADOS |
| Empleados < 3 meses | 🟢 ESPECÍFICO | ✅ CORREGIDO: Count(antiguedad < 3 meses) solo activos FILTRADOS |

### Gráficos

| Gráfico | Tipo Filtro | Notas |
|---------|-------------|-------|
| Empleados por Clasificación | 🟢 ESPECÍFICO | Horizontal bar chart |
| Empleados por Área | 🟢 ESPECÍFICO | Pie chart |

---

## 3️⃣ TAB INCIDENCIAS

### ⚠️ CAMBIO IMPORTANTE: Sin Prefiltro de Empleados Activos

**Comportamiento actualizado (2025-10-23)**:
- ✅ **NO** se aplica prefiltro por `activo = true` en la tabla de incidencias
- ✅ Muestra incidencias de **TODOS** los empleados (activos e inactivos)
- ✅ Carga **TODAS** las incidencias con paginación automática (no limitado a 1,000)

**Razón del cambio**:
- Las incidencias son eventos históricos que deben mostrarse independientemente del estado actual del empleado
- Un empleado que se dio de baja en enero puede haber tenido incidencias en febrero-mayo
- El sistema ahora carga todos los datos históricos sin filtros de empleados

**Implementación**:
- Archivo: `apps/web/src/lib/supabase.ts` - función `getIncidenciasCSV()` (líneas 58-104)
- Paginación automática para cargar más de 1,000 registros
- Archivo: `apps/web/src/components/incidents-tab.tsx` (líneas 74-126)
- Eliminado filtro por `empleadosAnualesMap` y `empleadosPeriodoSet`

### Métricas (KPI Cards)

| Métrica | Tipo Filtro | Descripción |
|---------|-------------|-------------|
| # de Activos | 🟢 ESPECÍFICO | ✅ CORREGIDO: Usa plantilla filtrada (solo empleados activos) |
| Empleados con Incidencias | 🔵 SIN FILTRO DE ACTIVOS | ✅ NUEVO: Cuenta TODOS los empleados con incidencias (activos e inactivos) |
| Incidencias | 🔵 SIN FILTRO DE ACTIVOS | ✅ NUEVO: TODAS las incidencias históricas (FI, SUS, PSIN, ENFE) |
| Permisos | 🔵 SIN FILTRO DE ACTIVOS | ✅ NUEVO: TODOS los permisos históricos (PCON, VAC, MAT3, MAT1, JUST) |

### Gráficos

| Gráfico | Tipo Filtro | Notas |
|---------|-------------|-------|
| Tendencia Mensual (Línea) | 🔵 SIN FILTRO DE ACTIVOS | ✅ NUEVO: Muestra TODAS las incidencias por mes (año 2025 completo) |
| Incidencias por Empleado (Histograma) | 🔵 SIN FILTRO DE ACTIVOS | X: # Incidencias, Y: # Empleados (todos) |
| Incidencias por Tipo (Tabla) | 🔵 SIN FILTRO DE ACTIVOS | Columnas: Tipo, # días, # emp (todos) |
| Distribución Pie (Incidencias vs Permisos) | 🔵 SIN FILTRO DE ACTIVOS | 2 categorías (todos los registros) |
| Tabla de Incidencias Completa | 🔵 SIN FILTRO DE ACTIVOS | TODAS las incidencias históricas, paginadas |

### 🔵 Leyenda: SIN FILTRO DE ACTIVOS

**Significa**: La métrica/gráfico muestra datos de **TODOS los empleados** en la base de datos:
- ✅ Empleados activos (`activo = true`)
- ✅ Empleados inactivos/dados de baja (`activo = false`)
- ✅ Sin restricción por fecha_baja
- ✅ Solo filtrado por año (2025) y tipo de incidencia

**Implementación técnica**:
```typescript
// ANTES (INCORRECTO):
const scopedByEmployee = incidencias.filter(inc => empleadosAnualesMap.has(inc.emp));

// DESPUÉS (CORRECTO):
const scopedByEmployee = incidencias; // TODAS las incidencias sin filtro
```

---

## 4️⃣ TAB RETENCIÓN

### Métricas (KPI Cards)

| Métrica | Tipo Filtro | Fórmula/Descripción |
|---------|-------------|---------------------|
| Activos Promedio | 🟢 ESPECÍFICO | ✅ CORREGIDO: (Empleados_Inicio_Mes + Empleados_Fin_Mes) ÷ 2 con filtros |
| Bajas Totales | 🟢 ESPECÍFICO | ✅ CORREGIDO: Count(fecha_baja != null) con filtros |
| Bajas Tempranas | 🟢 ESPECÍFICO | ✅ CORREGIDO: Count(bajas con < 3 meses trabajados) con filtros |
| Rotación Mensual | 🟢 ESPECÍFICO | ✅ CORREGIDO: (Bajas_Mes / Activos_Promedio_Mes) × 100 con filtros |
| Rotación Acumulada 12M | 🟢 ESPECÍFICO | ✅ CORREGIDO: Últimos 12 meses con filtros aplicados |
| Rotación Año Actual | 🟢 ESPECÍFICO | ✅ CORREGIDO: Desde 1 Enero hasta hoy con filtros aplicados |

**✅ CAMBIO CRÍTICO**: Todas las métricas ahora usan `filteredPlantilla` (filtros específicos) en lugar de `plantillaGeneral`.

### Gráficos y Tablas

| Gráfico | Tipo Filtro | Notas |
|---------|-------------|-------|
| **Rotación Acumulada 12M (Línea)** | 🟡 PARCIAL | Muestra todos los meses históricos; ignora Mes y respeta Año, Depto, Puesto, Empresa, Área, Clasificación, Ubicación. |
| **Rotación Mensual (Línea)** | 🟡 PARCIAL | Muestra todos los meses del año filtrado; ignora Mes, respeta Año y filtros organizacionales. |
| **Rotación por Temporalidad (Barras)** | 🟡 PARCIAL | Muestra todos los meses del año filtrado; ignora Mes, respeta Año, Negocio, Área, etc. |
| **Tabla Comparativa - Rotación Acumulada 12M** | 🟡 PARCIAL | Compara 2 años completos; ignora Mes, respeta Año y los demás filtros. |
| **Tabla Comparativa - Rotación Mensual** | 🟡 PARCIAL | Compara 2 años completos; ignora Mes, respeta Año y los demás filtros. |
| **Mapa de Calor** | 🟡 PARCIAL | Responde a todos los filtros EXCEPTO mes (año SÍ aplica) |
| **Tabla Detalle de Bajas (empleados_sftp)** | 🟢 ESPECÍFICO | Responde a TODOS los filtros (usa `plantillaFiltered`, incluyendo mes) |

---

## 5️⃣ CLASIFICACIÓN DE MOTIVOS DE BAJA

### Motivos Involuntarios (Clave) - 3 motivos

✅ Correctamente implementados en `normalizers.ts`:
1. **Rescisión por desempeño**
2. **Rescisión por disciplina**
3. **Término del contrato**

### Motivos Complementarios (Voluntarios) - Todos los demás

Incluye pero no se limita a:
- Baja Voluntaria (421 casos)
- Otra razón (67 casos)
- Abandono / No regresó (46 casos)
- Otro trabajo mejor compensado (8 casos)
- Cambio de ciudad
- Motivos de salud
- No le gustó el ambiente
- No le gustaron las instalaciones

---

## 6️⃣ COMPORTAMIENTO ESPECIAL: ROTACIÓN 12 MESES MÓVILES

### Cuando se selecciona un mes específico

**Comportamiento Actual**:
- El gráfico muestra TODOS los meses históricos (no se filtra)
- Los **cálculos** en las cajitas de KPIs SÍ consideran el mes seleccionado como fecha fin
- Los **cálculos** toman 12 meses hacia atrás desde el mes seleccionado

**Ejemplo**:
```
Usuario selecciona: Octubre 2025

Gráfico: Muestra TODOS los meses históricos (Enero 2024 - Octubre 2025)

KPI "Rotación Acumulada 12M":
- Fecha Fin: 31 Octubre 2025
- Fecha Inicio: 1 Noviembre 2024
- Cálculo: (Bajas_Nov2024_Oct2025 / Activos_Promedio_12M) × 100
```

---

## 7️⃣ CATEGORÍAS DE ANTIGÜEDAD (ACTUALIZADAS)

**Anteriores** (basadas en años):
- 0-1 años
- 1-3 años
- 3-5 años
- 5-10 años
- 10+ años

**✅ NUEVAS** (basadas en meses/años):
- **0-3 meses** (< 3 meses trabajados)
- **3-6 meses** (≥ 3 meses y < 6 meses)
- **6-12 meses** (≥ 6 meses y < 12 meses)
- **1-3 años** (≥ 12 meses y < 36 meses)
- **+3 años** (≥ 36 meses)

**Implementación**:
- `summary-comparison.tsx`: función `clasificarAntiguedad(meses: number)`
- Gráfico "Empleados Activos por Antigüedad" actualizado con nuevas categorías

---

## 8️⃣ FÓRMULAS CLAVE

### Activos Promedio
```
Activos_Promedio = (Empleados_Inicio_Período + Empleados_Fin_Período) ÷ 2
```

### Rotación Mensual
```
Rotación_Mensual = (Bajas_del_Mes / Activos_Promedio_del_Mes) × 100
```

### Rotación Acumulada 12M
```
Fecha_Fin = Mes_Seleccionado (o mes actual si no hay selección)
Fecha_Inicio = Fecha_Fin - 11 meses

Rotación_12M = (Bajas_12_Meses / Activos_Promedio_12M) × 100
```

### Rotación Año Actual (YTD)
```
Fecha_Inicio = 1 Enero del Año
Fecha_Fin = Fin del Mes_Actual (o Mes_Seleccionado)

Rotación_YTD = (Bajas_Año / Activos_Promedio_Año) × 100
```

### Rotación con Desglose por Motivo
```
Activos_Promedio_Total = (Inicio + Fin) ÷ 2
Bajas_Involuntarias = Count(motivo IN [Rescisión por desempeño, Rescisión por disciplina, Término del contrato])
Bajas_Complementarias = Count(motivo NOT IN motivos involuntarios)

Rotación_Involuntaria = (Bajas_Involuntarias / Activos_Promedio_Total) × 100
Rotación_Complementaria = (Bajas_Complementarias / Activos_Promedio_Total) × 100
Rotación_Total = Rotación_Involuntaria + Rotación_Complementaria
```

---

## 9️⃣ VERIFICACIÓN DE IMPLEMENTACIÓN

### ✅ Cambios Completados

1. **Tab Personal**:
   - Empleados Activos usa `plantillaFiltered` ✅
   - Antigüedad Promedio usa activos FILTRADOS ✅
   - Empleados < 3 meses usa activos FILTRADOS ✅

2. **Tab Incidencias**:
   - # de Activos usa plantilla filtrada ✅

3. **Tab Retención**:
   - Activos Promedio usa `filteredPlantilla` ✅
   - Rotación Mensual usa `filteredPlantilla` ✅
   - Rotación Acumulada 12M usa `filteredPlantilla` ✅
   - Rotación Año Actual usa `filteredPlantilla` ✅

4. **Categorías de Antigüedad**:
   - Actualizadas de años a meses en `summary-comparison.tsx` ✅
   - Gráficos actualizados con nuevas categorías ✅

5. **Motivos de Rotación**:
   - 3 motivos involuntarios correctamente definidos en `normalizers.ts` ✅
   - Función `isMotivoClave()` correcta ✅

---

## 🔟 NOTAS IMPORTANTES

### Diferencia entre Específico y Parcial

**🟢 ESPECÍFICO** = La métrica/gráfico **SÍ responde** a TODOS los filtros:
- Año
- Mes
- Departamento
- Puesto
- Empresa
- Área

**🟡 PARCIAL** = La métrica/gráfico **IGNORA el filtro de Mes**, pero **SÍ responde** (o administra internamente) a:
- Año (para acotar la ventana histórica; en series largas se recalcula la ventana internamente)
- Departamento
- Puesto
- Empresa
- Área
- Clasificación
- Ubicación

### ¿Por qué algunos gráficos son PARCIALES (sin filtro de Mes)?

Los componentes de tendencia histórica (12 meses móviles, acumulados, comparativas) necesitan mantener una serie continua para el análisis temporal. Por eso ignoramos el filtro de Mes, pero:

1. Los **cálculos internos** y promedios se recalculan con los filtros vigentes (excepto Mes).
2. Los **KPIs** asociados SÍ responden a TODOS los filtros (incluyendo Mes).
3. Esto permite comparar tendencias completas sin perder el contexto del resto de filtros seleccionados.

---

## 📊 EJEMPLOS PRÁCTICOS

### Ejemplo 1: Filtro por Departamento

**Usuario selecciona**:
- Departamento: Operaciones y Logística
- Año: 2025
- Mes: Octubre

**Comportamiento**:

| Componente | Respuesta |
|------------|-----------|
| KPI "Activos Promedio" (Tab Retención) | Muestra solo empleados de "Operaciones y Logística" activos en Octubre 2025 |
| Gráfico "Rotación Acumulada 12M" | Muestra TODOS los meses históricos, pero calculados solo para "Operaciones y Logística" |
| KPI "Rotación 12M" | Calcula Nov 2024 - Oct 2025 solo para "Operaciones y Logística" |

### Ejemplo 2: Sin Filtros

**Usuario NO selecciona ningún filtro**

**Comportamiento**:
- Todos los KPIs muestran datos de TODA la empresa
- Todos los gráficos muestran datos de TODA la empresa
- Período por defecto: Mes actual

---

## 📁 ARQUITECTURA DEL SISTEMA DE FILTROS

### Archivos Clave

1. **Sistema de Filtrado Centralizado**:
   - `/apps/web/src/lib/filters/filters.ts` - Función `applyRetentionFilters()` ✅
   - `/apps/web/src/components/filter-panel.tsx` - Panel UI con filtros por defecto ✅

2. **Dashboard Principal**:
   - `/apps/web/src/components/dashboard-page.tsx` - Orquestación de filtros para todos los tabs ✅
     - Líneas 101-108: Estado de filtros (`retentionFilters`)
     - Líneas 270-278: Función `filterPlantilla()` que aplica filtros
     - Líneas 309-337: Tab Personal con filtros específicos
     - Líneas 421-510: Tab Retención - función `getFilteredRetentionKPIs()`
     - Líneas 679-687: Tab Resumen con filtros aplicados
     - Líneas 885-889: Tab Incidencias con filtros aplicados
     - Líneas 1043-1052: Gráficas de Retención con filtros PARCIALES (ignoran Mes)

3. **Componentes por Tab**:
   - `/apps/web/src/components/summary-comparison.tsx` - Tab Resumen ✅
     - Líneas 45-89: Filtrado de incidencias/permisos con empleados filtrados
     - Líneas 99-107: Clasificación de antigüedad actualizada
   - `/apps/web/src/components/incidents-tab.tsx` - Tab Incidencias ✅
     - Líneas 77-114: Filtrado de incidencias por plantilla y fecha
     - Línea 116: KPI "# de Activos" usa empleados filtrados
   - `/apps/web/src/components/retention-charts.tsx` - Gráficas de Retención ✅
     - Líneas 79-116: Filtros PARCIALES (ignoran Mes; el rango de años se controla internamente) para tendencias históricas
     - Línea 119: Filtro adicional por motivo (involuntaria/complementaria)
   - `/apps/web/src/components/retention-table.tsx` - Tabla comparativa ✅

4. **Funciones Helper**:
   - `/apps/web/src/lib/utils/kpi-helpers.ts` - Cálculos centralizados de KPIs ✅
   - `/apps/web/src/lib/normalizers.ts` - Función `isMotivoClave()` ✅

---

## 🔍 FLUJO DE DATOS DEL SISTEMA DE FILTROS

```
1. Usuario selecciona filtros en RetentionFilterPanel
   ↓
2. onFiltersChange() actualiza estado retentionFilters en dashboard-page.tsx
   ↓
3. Cada tab recibe:
   - plantillaFiltered = applyRetentionFilters(plantilla, retentionFilters)
   - currentYear (de retentionFilters.years[0])
   - currentMonth (de retentionFilters.months[0])
   ↓
4. Componentes internos calculan métricas/gráficos basándose en datos filtrados
   ↓
5. EXCEPCIONES:
   - Gráficas de Retención: Aplican filtros PARCIALES (ignoran Mes y manejan su propia ventana anual) — ver líneas 1043-1052
   - Mapa de Calor: Aplica filtros PARCIALES (ignora Mes, respeta Año) — ver líneas 168-177
```

---

## ⚙️ CONFIGURACIÓN DE FILTROS POR DEFECTO

**Ubicación**: `/apps/web/src/components/filter-panel.tsx:46-65`

```typescript
useEffect(() => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  const defaultFilters = {
    years: [currentYear],      // Año actual
    months: [currentMonth],    // Mes actual
    departamentos: [],         // Todos
    puestos: [],              // Todos
    clasificaciones: [],       // Todas
    ubicaciones: [],          // Todas
    empresas: [],             // Todas
    areas: []                 // Todas
  };

  setFilters(defaultFilters);
  onFiltersChange(defaultFilters);
}, []);
```

**Comportamiento**:
- Al cargar el dashboard, se aplican filtros de año y mes actual automáticamente
- Para ver "TODO", el usuario debe limpiar los filtros manualmente

---

---

## 📊 MATRIZ DE FILTROS POR COMPONENTE

Esta tabla muestra exactamente qué filtros aplican a cada componente del dashboard:

### Tab RESUMEN

| Componente | Año | Mes | Negocio | Área | Depto | Puesto | Clasif | Ubic | Código |
|------------|-----|-----|---------|------|-------|--------|--------|------|--------|
| **KPI: Empleados Activos** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `summary-comparison.tsx:112-122` |
| **KPI: Rotación Mensual** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `summary-comparison.tsx:124-129` |
| **KPI: Rotación Acumulada 12M** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `summary-comparison.tsx:133` |
| **KPI: Rotación Año Actual** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `summary-comparison.tsx:134` |
| **KPI: Incidencias** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `summary-comparison.tsx:48-89` |
| **KPI: Permisos** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `summary-comparison.tsx:48-89` |
| **Gráfico: Empleados por Antigüedad** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Categorías: 0-3m, 3-6m, 6-12m, 1-3a, +3a |
| **Gráfico: Rotación Mensual** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Involuntaria vs Complementaria |
| **Gráfico: 12 Meses Móviles** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Involuntaria vs Complementaria |
| **Gráfico: Lo que va del Año** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Involuntaria vs Complementaria |
| **Tabla: Ausentismo** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Total, Permisos, Faltas, Otros |

### Tab PERSONAL (Bajas)

| Componente | Año | Mes | Negocio | Área | Depto | Puesto | Clasif | Ubic | Código |
|------------|-----|-----|---------|------|-------|--------|--------|------|--------|
| **KPI: Empleados Activos** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `dashboard-page.tsx:317` |
| **KPI: Bajas Totales** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `dashboard-page.tsx:318` |
| **KPI: Ingresos Históricos** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `dashboard-page.tsx:323-326` |
| **KPI: Ingresos del Mes** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `dashboard-page.tsx:327-330` |
| **KPI: Antigüedad Promedio** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `dashboard-page.tsx:332-335` ⚠️ Solo activos |
| **KPI: Empleados < 3 meses** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `dashboard-page.tsx:337` ⚠️ Solo activos |
| **Gráfico: Por Clasificación** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `dashboard-page.tsx:340-347` |
| **Gráfico: Por Género** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `dashboard-page.tsx:350-363` |
| **Gráfico: Distribución por Edad** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `dashboard-page.tsx:366-375` |
| **Gráfico: HC por Departamento** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `dashboard-page.tsx:378-385` |
| **Gráfico: HC por Área** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `dashboard-page.tsx:388-395` |
| **Gráfico: Antigüedad por Área** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `dashboard-page.tsx:398-414` |

### Tab INCIDENCIAS

| Componente | Año | Mes | Negocio | Área | Depto | Puesto | Clasif | Ubic | Código |
|------------|-----|-----|---------|------|-------|--------|--------|------|--------|
| **KPI: # de Activos** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `incidents-tab.tsx:116` |
| **KPI: Empleados con Incidencias** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `incidents-tab.tsx:117-124` |
| **KPI: Incidencias** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `incidents-tab.tsx:135-139` |
| **KPI: Permisos** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `incidents-tab.tsx:141-145` |
| **Gráfico: Tendencia Mensual** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `incidents-tab.tsx:204-240` |
| **Gráfico: Incidencias por Empleado** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `incidents-tab.tsx:148-160` |
| **Tabla: Incidencias por Tipo** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `incidents-tab.tsx:167-194` |
| **Gráfico: Pie (Inc vs Permisos)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `incidents-tab.tsx:196-199` |
| **Tabla: Incidencias Completa** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `incidents-tab.tsx:404-443` |

### Tab RETENCIÓN

| Componente | Año | Mes | Negocio | Área | Depto | Puesto | Clasif | Ubic | Código |
|------------|-----|-----|---------|------|-------|--------|--------|------|--------|
| **KPI: Activos Promedio** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `dashboard-page.tsx:455` |
| **KPI: Bajas Totales** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `dashboard-page.tsx:458` |
| **KPI: Bajas Tempranas** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `dashboard-page.tsx:461` |
| **KPI: Rotación Mensual** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `dashboard-page.tsx:464` |
| **KPI: Rotación Acumulada 12M** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `dashboard-page.tsx:467-469` |
| **KPI: Rotación Año Actual** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `dashboard-page.tsx:472-474` |
| **Gráfico: Rotación Acumulada 12M** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `retention-charts.tsx:79-116` 🟡 PARCIAL (ignora Mes; ventana anual interna) |
| **Gráfico: Rotación Mensual** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `retention-charts.tsx:79-116` 🟡 PARCIAL (ignora Mes; ventana anual interna) |
| **Gráfico: Rotación por Temporalidad** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `retention-charts.tsx:79-116` 🟡 PARCIAL (ignora Mes; ventana anual interna) |
| **Tabla: Comparativa Rotación 12M** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `retention-charts.tsx:175-196` 🟡 PARCIAL (ignora Mes; ventana anual interna) |
| **Tabla: Comparativa Rotación Mensual** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `retention-charts.tsx:175-196` 🟡 PARCIAL (ignora Mes; ventana anual interna) |
| **Mapa de Calor** | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `dashboard-page.tsx:168-177` 🟡 PARCIAL |
| **Tabla: Bajas por Motivo** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `dismissal-reasons-table.tsx` |

### Leyenda de Símbolos

- ✅ = El filtro SÍ aplica
- ❌ = El filtro NO aplica
- 🟢 = ESPECÍFICO (todos los filtros aplican)
- 🟡 = PARCIAL (ignoran Mes; el resto de filtros aplica. En componentes históricos, la ventana anual se controla internamente)

---

## 🎯 EXCEPCIONES CLAVE DEL SISTEMA

### 1. Gráficas de Retención (PARCIAL - Ignoran Mes)

**Razón**: Mostrar tendencias históricas completas para análisis temporal.

**Implementación**: `dashboard-page.tsx:1043-1052`
```typescript
<RetentionCharts
  filters={{
    years: [],      // ⚠️ Ventana anual controlada internamente
    months: [],     // ⚠️ Ignorar filtro de Mes
    departamentos: retentionFilters.departamentos,  // ✅ SÍ aplicar
    puestos: retentionFilters.puestos,              // ✅ SÍ aplicar
    // ... otros filtros SÍ se aplican
  }}
/>
```

**Afecta a**:
- Rotación Acumulada 12M (línea)
- Rotación Mensual (línea)
- Rotación por Temporalidad (barras)
- Tabla Comparativa - Rotación Acumulada 12M
- Tabla Comparativa - Rotación Mensual

### 2. Mapa de Calor (PARCIAL - Sin Mes, Con Año)

**Razón**: Mostrar distribución anual completa por mes sin restricción de mes específico

**Implementación**: `dashboard-page.tsx:168-177`
```typescript
const filtersWithoutMonth: RetentionFilterOptions = {
  years: [currentYear],  // ✅ Año SÍ aplica
  months: [],            // ⚠️ NO filtrar por mes
  departamentos: retentionFilters.departamentos,  // ✅ SÍ aplicar
  // ... otros filtros SÍ se aplican
};
```

**Resultado**: Muestra todos los 12 meses del año seleccionado, pero respeta otros filtros

### 3. Rotación 12 Meses Móviles con Mes Seleccionado

**Comportamiento**:
- **Gráficos**: Muestran TODO el histórico (no filtran por mes)
- **KPIs**: Usan el mes seleccionado como fecha fin y calculan 12 meses hacia atrás

**Ejemplo**:
```
Usuario selecciona: Octubre 2025

Gráfico "Rotación Acumulada 12M":
  → Muestra: Enero 2024 - Octubre 2025 (TODO)

KPI "Rotación Acumulada 12M":
  → Fecha Fin: 31 Octubre 2025
  → Fecha Inicio: 1 Noviembre 2024
  → Cálculo: (Bajas_Nov2024_Oct2025 / Activos_Prom_12M) × 100
```

### 4. Motivos de Rotación (3 Involuntarios)

**Involuntarios** (definidos en `lib/normalizers.ts:isMotivoClave()`):
1. Rescisión por desempeño
2. Rescisión por disciplina
3. Término del contrato

**Complementarios**: TODOS los demás motivos
- Baja Voluntaria
- Otra razón
- Abandono / No regresó
- Otro trabajo mejor compensado
- Cambio de ciudad
- Motivos de salud
- etc.

---

---

## 🔄 RESUMEN DE CAMBIOS RECIENTES (2025-10-23)

### 1. Tab Incidencias - Eliminación de Prefiltros

**Problema Original**:
- Las incidencias se filtraban por empleados activos
- Solo se cargaban 1,000 registros (límite de Supabase)
- Datos de enero-mayo no aparecían en la gráfica

**Solución Implementada**:
- ✅ Eliminado prefiltro por `empleadosAnualesMap` y `empleadosPeriodoSet`
- ✅ Implementada paginación automática en `getIncidenciasCSV()`
- ✅ Ahora carga TODAS las 4,923 incidencias (5 páginas de 1,000)
- ✅ Muestra incidencias de empleados activos E inactivos

**Archivos Modificados**:
1. `apps/web/src/lib/supabase.ts` - Función `getIncidenciasCSV()` con paginación
2. `apps/web/src/components/incidents-tab.tsx` - Eliminados filtros de empleados
3. `apps/web/src/lib/kpi-calculator.ts` - Cálculo de Activos Promedio usa solo fechas

### 2. Confirmación: Otros Tabs SIN Prefiltro de Activos

**✅ Tab RESUMEN**:
- Usa `plantillaFiltered` con filtros del panel
- NO prefiltros automáticos de empleados activos
- Respeta TODOS los filtros seleccionados

**✅ Tab PERSONAL (Bajas)**:
- Usa `plantillaFiltered` con filtros del panel
- KPI "# de Activos" SÍ filtra por `activo = true` (correcto)
- Otros KPIs usan todos los empleados filtrados

**✅ Tab RETENCIÓN**:
- Usa `plantillaFiltered` con filtros del panel
- Cálculos de rotación incluyen empleados con fecha_baja
- NO prefiltros automáticos

### 3. Sistema de Filtros Centralizado

**Funcionamiento Correcto**:
```typescript
// El usuario selecciona filtros en el panel
RetentionFilterPanel → onFiltersChange() → dashboard-page.tsx

// Se aplica la función centralizada
const plantillaFiltered = applyRetentionFilters(data.plantilla, retentionFilters);

// Cada tab recibe los datos ya filtrados
<IncidentsTab plantilla={plantillaFiltered} />
<SummaryComparison plantilla={plantillaFiltered} />
<PersonalTab plantilla={plantillaFiltered} />
```

**Importante**: La función `applyRetentionFilters()` en `lib/filters/filters.ts` NO aplica filtros automáticos de empleados activos. Solo aplica los filtros que el usuario selecciona explícitamente.

---

## 📊 VERIFICACIÓN FINAL - Estado Actual del Sistema

### Prefiltros Automáticos por Tab

| Tab | Prefiltro Automático de Activos | Comportamiento |
|-----|----------------------------------|----------------|
| **Resumen** | ❌ NO | Usa filtros del panel únicamente |
| **Personal** | ❌ NO | Solo el KPI "# Activos" filtra por activo=true (correcto) |
| **Incidencias** | ❌ NO | ✅ **NUEVO**: Sin prefiltros, muestra todo |
| **Retención** | ❌ NO | Incluye empleados con fecha_baja en cálculos |

### Conclusión

**✅ CONFIRMADO**: Ningún tab aplica prefiltros automáticos de empleados activos excepto donde es necesario (KPI "# de Activos").

**✅ CONFIRMADO**: Todos los tabs usan la plantilla filtrada por los filtros que el usuario selecciona en el panel.

**✅ CONFIRMADO**: El tab de Incidencias ahora carga TODAS las incidencias históricas sin limitaciones.

---

**Documento Generado**: 2025-01-20
**Última Actualización**: 2025-10-23 (Eliminación de prefiltros en Tab Incidencias)
**Estado**: ✅ Todos los cambios implementados, verificados y auditados
**Revisión**: Análisis completo del código confirmó correcta implementación del sistema unificado de filtros
**Última auditoría**: Verificación exhaustiva de todos los componentes y sus respectivas aplicaciones de filtros
