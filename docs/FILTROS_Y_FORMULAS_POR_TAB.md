# FILTROS Y FÓRMULAS POR TAB - ESPECIFICACIÓN COMPLETA

**Fecha actualización**: 2025-01-20
**Estado**: ✅ Implementado y verificado

## 📋 RESUMEN EJECUTIVO

Este documento especifica cómo cada métrica y gráfico en el dashboard responde a los filtros del panel (Año, Mes, Departamento, Puesto, Empresa, Área).

### Tipos de Filtrado

- **🟢 ESPECÍFICO**: La métrica/gráfico responde a TODOS los filtros seleccionados
- **🟡 PARCIAL**: La métrica/gráfico responde a ALGUNOS filtros (se especifica cuáles)
- **🔴 GENERAL**: La métrica/gráfico NO responde a filtros de año/mes (pero SÍ a otros filtros)

---

## 1️⃣ TAB RESUMEN

### Métricas (KPI Cards)

| Métrica | Tipo Filtro | Descripción |
|---------|-------------|-------------|
| Empleados Activos | 🟢 ESPECÍFICO | Cuenta empleados activos con filtros aplicados |
| Rotación Mensual | 🟢 ESPECÍFICO | (Bajas del mes / Activos Promedio) × 100 |
| Rotación Acumulada | 🟢 ESPECÍFICO | Rotación últimos 12 meses con filtros |
| Rotación Año Actual | 🟢 ESPECÍFICO | Rotación YTD con filtros |
| Incidencias | 🟢 ESPECÍFICO | Total incidencias del mes con filtros |
| Permisos | 🟢 ESPECÍFICO | Total permisos del mes con filtros |

### Gráficos

| Gráfico | Tipo Filtro | Notas |
|---------|-------------|-------|
| Empleados Activos por Antigüedad | 🟢 ESPECÍFICO | Barras apiladas con categorías: 0-3m, 3-6m, 6-12m, 1-3a, +3a |
| Rotación Mensual | 🟢 ESPECÍFICO | Línea comparativa Voluntaria vs Involuntaria |
| 12 Meses Móviles | 🟢 ESPECÍFICO | Línea comparativa Voluntaria vs Involuntaria |
| Lo que va del Año | 🟢 ESPECÍFICO | Línea comparativa Voluntaria vs Involuntaria |
| Tabla Ausentismo | 🟢 ESPECÍFICO | Desglose: Total, Permisos, Faltas, Otros |

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

### Métricas (KPI Cards)

| Métrica | Tipo Filtro | Descripción |
|---------|-------------|-------------|
| # de Activos | 🟢 ESPECÍFICO | ✅ CORREGIDO: Usa plantilla filtrada |
| Empleados con Incidencias | 🟢 ESPECÍFICO | Empleados únicos con al menos 1 incidencia (FI, SUS, PSIN, ENFE) |
| Incidencias | 🟢 ESPECÍFICO | Total incidencias (FI, SUS, PSIN, ENFE) |
| Permisos | 🟢 ESPECÍFICO | Total permisos (PCON, VAC, MAT3) |

### Gráficos

| Gráfico | Tipo Filtro | Notas |
|---------|-------------|-------|
| Tendencia Mensual (Línea) | 🟢 ESPECÍFICO | Muestra todos los meses del año seleccionado |
| Incidencias por Empleado (Histograma) | 🟢 ESPECÍFICO | X: # Incidencias, Y: # Empleados |
| Incidencias por Tipo (Tabla) | 🟢 ESPECÍFICO | Columnas: Tipo, # días, # emp |
| Distribución Pie (Incidencias vs Permisos) | 🟢 ESPECÍFICO | 2 categorías |
| Tabla de Incidencias Completa | 🟢 ESPECÍFICO | 10 registros default, expandible |

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
| **Rotación Acumulada 12M (Línea)** | 🔴 GENERAL | Muestra TODOS los meses históricos. NO responde a filtros año/mes, pero SÍ a otros filtros (Depto, Puesto, Empresa, Área) |
| **Rotación Mensual (Línea)** | 🔴 GENERAL | Muestra TODOS los meses del año filtrado. NO responde a filtro de mes, pero SÍ a otros filtros |
| **Rotación por Temporalidad (Barras)** | 🔴 GENERAL | Muestra TODOS los meses del año filtrado. NO responde a filtro de mes, pero SÍ a otros filtros |
| **Tabla Comparativa - Rotación Acumulada 12M** | 🔴 GENERAL | Compara 2 años completos. NO responde a filtros año/mes, pero SÍ a otros filtros |
| **Tabla Comparativa - Rotación Mensual** | 🔴 GENERAL | Compara 2 años completos. NO responde a filtros año/mes, pero SÍ a otros filtros |
| **Mapa de Calor** | 🟡 PARCIAL | Responde a todos los filtros EXCEPTO mes (año SÍ aplica) |
| **Tabla Bajas por Motivo** | 🟢 ESPECÍFICO | Responde a TODOS los filtros |

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

### Diferencia entre Específico y General

**🟢 ESPECÍFICO** = La métrica/gráfico **SÍ responde** a TODOS los filtros:
- Año
- Mes
- Departamento
- Puesto
- Empresa
- Área

**🔴 GENERAL** = La métrica/gráfico **NO responde** a filtros de año/mes, pero **SÍ responde** a:
- Departamento
- Puesto
- Empresa
- Área

### ¿Por qué algunos gráficos son GENERALES?

Los gráficos de tendencia histórica (12 meses móviles, comparación anual) muestran TODOS los meses para permitir análisis temporal completo. Sin embargo:

1. Los **cálculos internos** SÍ responden a los demás filtros
2. Los **KPIs en las cajitas** SÍ responden a TODOS los filtros
3. Esto permite ver tendencias completas mientras se filtra por departamento, empresa, etc.

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

## 📁 ARCHIVOS AFECTADOS

1. `/apps/web/src/components/dashboard-page.tsx`
   - Tab Personal: líneas 283-304 ✅
   - Tab Retención: líneas 383-477 ✅

2. `/apps/web/src/components/summary-comparison.tsx`
   - Categorías de antigüedad: líneas 40-56 ✅
   - Funciones de cálculo: líneas 205-300 ✅
   - Gráficos: líneas 409-413 ✅

3. `/apps/web/src/components/incidents-tab.tsx`
   - KPI "# de Activos": línea 104 ✅

4. `/apps/web/src/lib/normalizers.ts`
   - Función `isMotivoClave()`: líneas 204-211 ✅

5. `/apps/web/src/lib/utils/kpi-helpers.ts`
   - Funciones centralizadas de cálculo ✅

6. `/apps/web/src/lib/filters/filters.ts`
   - Sistema de filtrado centralizado ✅

---

**Documento Generado**: 2025-01-20
**Estado**: ✅ Todos los cambios implementados y verificados
