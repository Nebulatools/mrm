# 📊 Filtros y Fórmulas por Tab - Guía Definitiva

**Última actualización:** 19 de octubre de 2025

Esta guía explica **EXACTAMENTE** cómo funciona cada tab del dashboard, qué filtros aplica y qué fórmulas usa para calcular cada métrica.

---

## 🎯 Sistema de Filtros del Dashboard

### Filtros Disponibles en el Panel

El dashboard tiene un panel de filtros compartido:

| Filtro | Descripción | Ejemplo |
|--------|-------------|---------|
| **Año** | Año específico | 2024, 2025 |
| **Mes** | Mes específico | Enero, Octubre |
| **Empresa/Negocio** | Negocio específico | MOTO REPUESTOS MONTERREY |
| **Área** | Área funcional | Ventas, Operaciones |
| **Departamento** | Departamento específico | Operaciones y Logística |
| **Puesto** | Puesto del empleado | Auxiliar de Almacén |
| **Clasificación** | Tipo de contrato | CONFIANZA, SINDICALIZADO |
| **Ubicación** | Ubicación física | Planta Norte, CDMX |

### ⚠️ IMPORTANTE: Dos Tipos de Filtros

**🟢 ESPECÍFICO** (Con Filtros Aplicados)
- Usa **SOLO** los empleados que cumplen con los filtros seleccionados
- Ejemplo: Si seleccionas "Departamento: Ventas", solo usa empleados de Ventas
- **LA MAYORÍA de las métricas usa este tipo**

**🔴 GENERAL** (Sin Filtros / Todos los Empleados)
- Usa **TODOS** los empleados de la empresa
- Ignora los filtros seleccionados
- **MUY POCAS métricas usan este tipo** (solo 3-4 métricas específicas)

---

## 📑 TAB 1: RESUMEN

**Funcionalidad:** Este tab muestra comparaciones entre Negocio/Área/Departamento con gráficos de rotación y ausentismo.

### 🔢 Métricas del Tab Resumen (Tarjetas KPI)

#### 1. **Empleados Activos**
- **Filtro:** 🟢 ESPECÍFICO (usa filtros del panel)
- **Fórmula:**
  ```
  Empleados Activos = COUNT(empleados WHERE activo = TRUE AND cumple_filtros)
  ```
- **Archivo:** `summary-comparison.tsx` línea 333
- **Ejemplo:** Si filtras "Departamento: Ventas" → Muestra solo empleados activos de Ventas

#### 2. **Rotación Mensual**
- **Filtro:** 🟢 ESPECÍFICO (usa filtros del panel)
- **Fórmula:**
  ```
  Fecha Inicio = Primer día del mes actual
  Fecha Fin = Último día del mes actual

  Activos Inicio = COUNT(empleados activos al inicio del mes)
  Activos Fin = COUNT(empleados activos al fin del mes)
  Activos Promedio = (Activos Inicio + Activos Fin) / 2

  Bajas del Mes = COUNT(bajas WHERE fecha_baja BETWEEN Fecha Inicio AND Fecha Fin)

  Rotación Mensual (%) = (Bajas del Mes / Activos Promedio) × 100
  ```
- **Archivo:** `summary-comparison.tsx` líneas 57-95, 112
- **Ejemplo:** Rotación mensual de octubre 2025 para empleados filtrados

#### 3. **Rotación Acumulada (12 meses móviles)**
- **Filtro:** 🔴 GENERAL (ignora filtros, usa TODOS los empleados)
- **Fórmula:**
  ```
  Fecha Inicio = Fecha actual - 12 meses
  Fecha Fin = Fecha actual

  Bajas en 12 meses = COUNT(bajas WHERE fecha_baja BETWEEN Fecha Inicio AND Fecha Fin)

  Activos Promedio 12m = (Empleados al inicio del período + Empleados al fin) / 2

  Rotación Acumulada (%) = (Bajas en 12 meses / Activos Promedio 12m) × 100
  ```
- **Archivo:** `summary-comparison.tsx` línea 117 (usa `plantilla` completa)
- **Por qué es GENERAL:** Para tener un benchmark estable de la empresa completa

#### 4. **Rotación Año Actual (YTD - Year To Date)**
- **Filtro:** 🔴 GENERAL (ignora filtros, usa TODOS los empleados)
- **Fórmula:**
  ```
  Fecha Inicio = 1 de Enero del año actual
  Fecha Fin = Fecha actual

  Bajas del Año = COUNT(bajas WHERE fecha_baja BETWEEN Fecha Inicio AND Fecha Fin)

  Activos Promedio YTD = (Empleados al inicio del año + Empleados actuales) / 2

  Rotación Año Actual (%) = (Bajas del Año / Activos Promedio YTD) × 100
  ```
- **Archivo:** `summary-comparison.tsx` línea 118 (usa `plantilla` completa)
- **Por qué es GENERAL:** Para tener un benchmark anual de la empresa completa

#### 5. **Incidencias**
- **Filtro:** 🟢 ESPECÍFICO (usa filtros del panel)
- **Fórmula:**
  ```
  Códigos de Incidencia: FI, SUS, PSIN, ENFE

  Incidencias = COUNT(registros WHERE código IN (FI, SUS, PSIN, ENFE) AND cumple_filtros)
  ```
- **Archivo:** `summary-comparison.tsx` líneas 120-134
- **Ejemplo:** Incidencias del mes actual para empleados filtrados

#### 6. **Permisos**
- **Filtro:** 🟢 ESPECÍFICO (usa filtros del panel)
- **Fórmula:**
  ```
  Códigos de Permiso: PCON, VAC, MAT3

  Permisos = COUNT(registros WHERE código IN (PCON, VAC, MAT3) AND cumple_filtros)
  ```
- **Archivo:** `summary-comparison.tsx` líneas 129-134
- **Ejemplo:** Permisos del mes actual para empleados filtrados

### 📊 Gráficas del Tab Resumen

#### 7. **Empleados Activos por Antigüedad (Gráfica de Barras Apiladas)**
- **Filtro:** 🟢 ESPECÍFICO (usa filtros del panel)
- **Agrupación:** Por Negocio/Área/Departamento (según tab seleccionado)
- **Fórmula:**
  ```
  Para cada grupo (Negocio/Área/Departamento):
    Para cada empleado activo en el grupo:
      Antigüedad = Fecha Actual - Fecha de Ingreso (en años)

      Clasificar en categorías:
      - 0-1 años
      - 1-3 años
      - 3-5 años
      - 5-10 años
      - 10+ años

      Contar empleados en cada categoría
  ```
- **Archivo:** `summary-comparison.tsx` líneas 242-250 (Negocio), 274-281 (Área), 307-312 (Departamento)
- **Eje X:** Nombre del Negocio/Área/Departamento
- **Eje Y:** Cantidad de empleados
- **Colores:** Diferentes colores por categoría de antigüedad

#### 8. **Rotación Mensual (Gráfica de Línea)**
- **Filtro:** 🟢 ESPECÍFICO (usa filtros del panel)
- **Agrupación:** Por Negocio/Área/Departamento (según tab seleccionado)
- **Fórmula:**
  ```
  Para cada grupo (Negocio/Área/Departamento):
    Calcular rotación mensual del mes actual (ver fórmula #2)

    Separar en:
    - Voluntaria = Bajas NO clave (Baja voluntaria, Otra razón, etc.)
    - Involuntaria = Bajas clave (Rescisión por desempeño, disciplina, término del contrato)
  ```
- **Archivo:** `summary-comparison.tsx` líneas 254, 444-479
- **Eje X:** Nombre del Negocio/Área/Departamento
- **Eje Y:** Porcentaje de rotación
- **Líneas:** Verde = Voluntaria, Roja = Involuntaria
- **Nota:** Si no hay bajas en el mes actual, muestra mensaje "Sin bajas en el mes actual"

#### 9. **12 Meses Móviles (Gráfica de Línea)**
- **Filtro:** 🟢 ESPECÍFICO (usa filtros del panel)
- **Agrupación:** Por Negocio/Área/Departamento (según tab seleccionado)
- **Fórmula:**
  ```
  Para cada grupo (Negocio/Área/Departamento):
    Calcular rotación acumulada 12 meses (últimos 12 meses móviles)
    (ver fórmula #3)

    Separar en Voluntaria e Involuntaria
  ```
- **Archivo:** `summary-comparison.tsx` líneas 255, 484-491
- **Eje X:** Nombre del Negocio/Área/Departamento
- **Eje Y:** Porcentaje de rotación acumulada 12m
- **Líneas:** Verde = Voluntaria, Roja = Involuntaria

#### 10. **Lo que va del Año (Gráfica de Línea)**
- **Filtro:** 🟢 ESPECÍFICO (usa filtros del panel)
- **Agrupación:** Por Negocio/Área/Departamento (según tab seleccionado)
- **Fórmula:**
  ```
  Para cada grupo (Negocio/Área/Departamento):
    Calcular rotación YTD (desde enero hasta mes actual)
    (ver fórmula #4)

    Separar en Voluntaria e Involuntaria
  ```
- **Archivo:** `summary-comparison.tsx` líneas 256, 493-520
- **Eje X:** Nombre del Negocio/Área/Departamento
- **Eje Y:** Porcentaje de rotación YTD
- **Líneas:** Verde = Voluntaria, Roja = Involuntaria

#### 11. **Tabla de Ausentismo (Tabla)**
- **Filtro:** 🟢 ESPECÍFICO (usa filtros del panel)
- **Agrupación:** Por Negocio/Área/Departamento (según tab seleccionado)
- **Fórmula:**
  ```
  Para cada grupo (Negocio/Área/Departamento):
    Total Incidencias = COUNT(registros con código FI, SUS, PSIN, ENFE)
    Permisos = COUNT(registros con código PCON, VAC, MAT3)
    Faltas = COUNT(registros con código FJ, FI)
    Otros = Total - Permisos - Faltas
  ```
- **Archivo:** `summary-comparison.tsx` líneas 211-231, 523-582
- **Columnas:** Nombre, Total, Permisos, Faltas, Otros

---

## 👥 TAB 2: PERSONAL

**Funcionalidad:** Muestra métricas de headcount (empleados activos), ingresos, bajas y distribución demográfica.

### 🔢 Métricas del Tab Personal

#### 1. **Ingresos Nuevos (del mes actual)**
- **Filtro:** 🟢 ESPECÍFICO (usa filtros del panel)
- **Fórmula:**
  ```
  Mes Actual = Mes del filtro seleccionado (o mes actual si no hay filtro)
  Fecha Inicio = Primer día del mes
  Fecha Fin = Último día del mes

  Ingresos Nuevos = COUNT(empleados WHERE fecha_ingreso BETWEEN Fecha Inicio AND Fecha Fin AND cumple_filtros)
  ```
- **Archivo:** `dashboard-page.tsx` líneas 288-296
- **Ejemplo:** Si estamos en octubre 2025, muestra empleados que ingresaron en octubre 2025

#### 2. **Bajas (históricas)**
- **Filtro:** 🟢 ESPECÍFICO (usa filtros del panel)
- **Fórmula:**
  ```
  Bajas = COUNT(empleados WHERE fecha_baja IS NOT NULL AND cumple_filtros)
  ```
- **Archivo:** `dashboard-page.tsx` línea 284
- **Nota:** Es el total histórico de bajas, no solo del mes

#### 3. **Empleados Activos**
- **Filtro:** 🔴 GENERAL (ignora filtros, usa TODOS los empleados)
- **Fórmula:**
  ```
  Empleados Activos = COUNT(empleados WHERE activo = TRUE)
  ```
- **Archivo:** `dashboard-page.tsx` línea 283
- **Por qué es GENERAL:** Para mostrar el headcount total de la empresa

#### 4. **Antigüedad Promedio (en meses)**
- **Filtro:** 🔴 GENERAL (ignora filtros, usa TODOS los empleados activos)
- **Fórmula:**
  ```
  Para cada empleado activo:
    Antigüedad (meses) = (Fecha Actual - Fecha de Antigüedad) en meses

  Antigüedad Promedio = SUM(Antigüedad de todos los activos) / COUNT(activos)
  ```
- **Archivo:** `dashboard-page.tsx` líneas 299-301
- **Ejemplo:** Si suma de antigüedades = 4,920 meses y hay 82 empleados → Promedio = 60 meses (5 años)

#### 5. **Empleados < 3 meses**
- **Filtro:** 🔴 GENERAL (ignora filtros, usa TODOS los empleados activos)
- **Fórmula:**
  ```
  Empleados < 3 meses = COUNT(empleados WHERE activo = TRUE AND antigüedad < 3 meses)
  ```
- **Archivo:** `dashboard-page.tsx` línea 303
- **Por qué es GENERAL:** Indicador de onboarding reciente a nivel empresa

### 📊 Gráficas del Tab Personal

#### 6. **Clasificación (Barras Horizontales)**
- **Filtro:** 🟢 ESPECÍFICO (usa filtros del panel)
- **Fórmula:**
  ```
  Para cada clasificación (CONFIANZA, SINDICALIZADO, etc.):
    Contar empleados que cumplen filtros
  ```
- **Archivo:** `dashboard-page.tsx` líneas 306-313
- **Eje X:** Cantidad de empleados
- **Eje Y:** Clasificación (CONFIANZA, SINDICALIZADO)

#### 7. **Género (Barras Horizontales)**
- **Filtro:** 🟢 ESPECÍFICO (usa filtros del panel)
- **Fórmula:**
  ```
  Normalizar género:
    - H, HOMBRE, M, MASCULINO → HOMBRE
    - M, MUJER, F, FEMENINO → MUJER

  Para cada género normalizado:
    Contar empleados que cumplen filtros
  ```
- **Archivo:** `dashboard-page.tsx` líneas 316-329
- **Eje X:** Cantidad de empleados
- **Eje Y:** Género (HOMBRE, MUJER)

#### 8. **Distribución por Edad (Dispersión)**
- **Filtro:** 🟢 ESPECÍFICO (usa filtros del panel)
- **Fórmula:**
  ```
  Para cada empleado que cumple filtros:
    Edad = (Fecha Actual - Fecha de Nacimiento) en años

  Agrupar por edad:
    Para cada edad (ej: 25, 26, 27...):
      Contar empleados con esa edad
  ```
- **Archivo:** `dashboard-page.tsx` líneas 332-341
- **Eje X:** Edad (años)
- **Eje Y:** Cantidad de empleados
- **Tipo:** Scatter (dispersión)

#### 9. **HC por Departamento (Barras Verticales)**
- **Filtro:** 🟢 ESPECÍFICO (usa filtros del panel)
- **Fórmula:**
  ```
  Para cada departamento:
    Contar empleados activos que cumplen filtros

  Ordenar por cantidad (mayor a menor)
  ```
- **Archivo:** `dashboard-page.tsx` líneas 344-351
- **Eje X:** Departamentos (sin etiquetas por espacio)
- **Eje Y:** Cantidad de empleados
- **Nota:** Tooltip muestra nombre completo del departamento

#### 10. **HC por Área (Barras Verticales)**
- **Filtro:** 🟢 ESPECÍFICO (usa filtros del panel)
- **Fórmula:**
  ```
  Para cada área:
    Contar empleados activos que cumplen filtros

  Ordenar por cantidad (mayor a menor)
  ```
- **Archivo:** `dashboard-page.tsx` líneas 354-361
- **Eje X:** Áreas (sin etiquetas por espacio)
- **Eje Y:** Cantidad de empleados

#### 11. **Antigüedad por Área (Barras Horizontales Apiladas)**
- **Filtro:** 🟢 ESPECÍFICO (usa filtros del panel)
- **Fórmula:**
  ```
  Para cada empleado activo que cumple filtros:
    Antigüedad (meses) = Fecha Actual - Fecha de Antigüedad

    Clasificar en bins:
    - <3m: menos de 3 meses
    - 3-6m: 3 a 6 meses
    - 6-12m: 6 a 12 meses
    - 12m+: más de 12 meses

  Para cada área:
    Contar empleados en cada bin
  ```
- **Archivo:** `dashboard-page.tsx` líneas 364-380
- **Eje X:** Cantidad de empleados
- **Eje Y:** Áreas
- **Colores:** Verde (<3m), Azul (3-6m), Morado (6-12m), Rojo (12m+)

---

## 🚨 TAB 3: INCIDENCIAS

**Funcionalidad:** Muestra métricas de ausentismo (incidencias y permisos) con análisis por tipo y empleado.

### 🔢 Métricas del Tab Incidencias

#### 1. **# de Activos**
- **Filtro:** 🔴 GENERAL (ignora filtros, usa TODOS los empleados activos)
- **Fórmula:**
  ```
  # de Activos = COUNT(empleados WHERE activo = TRUE)
  ```
- **Archivo:** `incidents-tab.tsx` línea 104
- **Por qué es GENERAL:** Para calcular porcentajes sobre el total de la empresa

#### 2. **Empleados con Incidencias**
- **Filtro:** 🟢 ESPECÍFICO (usa filtros del panel)
- **Fórmula:**
  ```
  Códigos de Incidencia: FI, SUS, PSIN, ENFE

  Empleados con Incidencias = COUNT(DISTINCT numero_empleado
    WHERE tiene al menos 1 incidencia
    AND cumple_filtros)
  ```
- **Archivo:** `incidents-tab.tsx` líneas 105-112
- **Ejemplo:** 45 empleados únicos tienen al menos 1 incidencia

#### 3. **Incidencias (Total)**
- **Filtro:** 🟢 ESPECÍFICO (usa filtros del panel)
- **Fórmula:**
  ```
  Códigos de Incidencia: FI, SUS, PSIN, ENFE

  Incidencias = COUNT(registros WHERE código IN (FI, SUS, PSIN, ENFE) AND cumple_filtros)
  ```
- **Archivo:** `incidents-tab.tsx` líneas 123-127
- **Ejemplo:** 156 incidencias totales

#### 4. **Permisos (Total)**
- **Filtro:** 🟢 ESPECÍFICO (usa filtros del panel)
- **Fórmula:**
  ```
  Códigos de Permiso: PCON, VAC, MAT3

  Permisos = COUNT(registros WHERE código IN (PCON, VAC, MAT3) AND cumple_filtros)
  ```
- **Archivo:** `incidents-tab.tsx` líneas 129-133
- **Ejemplo:** 89 permisos totales

### 📊 Gráficas del Tab Incidencias

#### 5. **Tendencia Mensual - Incidencias y Permisos [Año Actual]**
- **Filtro:** 🔴 GENERAL (usa TODOS los empleados del año actual)
- **Fórmula:**
  ```
  Para cada mes del año actual (Ene - Dic):
    Incidencias = COUNT(registros WHERE código IN (FI, SUS, PSIN, ENFE) AND mes = mes_actual)
    Permisos = COUNT(registros WHERE código IN (PCON, VAC, MAT3) AND mes = mes_actual)
  ```
- **Archivo:** `incidents-tab.tsx` líneas 188-234
- **Eje X:** Meses (Ene - Dic del año actual)
- **Eje Y:** Cantidad de incidencias/permisos
- **Líneas:** Roja = Incidencias, Verde = Permisos
- **Por qué es GENERAL:** Para tener la tendencia anual completa de la empresa

#### 6. **Incidencias por Empleado (Histograma)**
- **Filtro:** 🟢 ESPECÍFICO (usa filtros del panel)
- **Fórmula:**
  ```
  Para cada empleado que cumple filtros:
    Contar cantidad de incidencias (solo FI, SUS, PSIN, ENFE)

  Agrupar por cantidad:
    - Empleados con 1 incidencia
    - Empleados con 2 incidencias
    - Empleados con 3 incidencias
    - etc.

  Para cada grupo:
    Contar empleados
  ```
- **Archivo:** `incidents-tab.tsx` líneas 136-148
- **Eje X:** Número de incidencias (1, 2, 3...)
- **Eje Y:** Cantidad de empleados

#### 7. **Incidencias por Tipo (Barras)**
- **Filtro:** 🟢 ESPECÍFICO (usa filtros del panel)
- **Fórmula:**
  ```
  Para cada código de incidencia/permiso:
    Días = COUNT(registros con ese código)
    Empleados = COUNT(DISTINCT numero_empleado con ese código)
  ```
- **Archivo:** `incidents-tab.tsx` líneas 150-163
- **Tipos:** FI, SUS, PSIN, ENFE, PCON, VAC, MAT3, etc.
- **Barras:** Azul = Días, Verde = Empleados

#### 8. **Distribución: Incidencias vs Permisos (Gráfica de Pastel)**
- **Filtro:** 🟢 ESPECÍFICO (usa filtros del panel)
- **Fórmula:**
  ```
  Incidencias = SUM(registros con código FI, SUS, PSIN, ENFE)
  Permisos = SUM(registros con código PCON, VAC, MAT3)

  Total = Incidencias + Permisos

  Porcentaje Incidencias = (Incidencias / Total) × 100
  Porcentaje Permisos = (Permisos / Total) × 100
  ```
- **Archivo:** `incidents-tab.tsx` líneas 165-175
- **Colores:** Rojo = Incidencias, Verde = Permisos

#### 9. **Tabla de Incidencias (Detallada)**
- **Filtro:** 🟢 ESPECÍFICO (usa filtros del panel)
- **Columnas:**
  - **Tipo:** Código de incidencia/permiso (FI, PCON, VAC, etc.)
  - **Días:** Cantidad total de registros con ese código
  - **Empleados:** Cantidad única de empleados con ese código
- **Archivo:** `incidents-tab.tsx` líneas 177-186

---

## 🎯 TAB 4: RETENCIÓN

**Funcionalidad:** Análisis detallado de rotación con desgloses por motivo (voluntaria/involuntaria) y tendencias históricas.

### ⚠️ IMPORTANTE: Filtro de Motivo

El Tab Retención tiene un **toggle especial** que filtra visualizaciones por:
- **Involuntaria:** Solo bajas con motivo clave (Rescisión por desempeño, disciplina, término del contrato)
- **Complementaria:** Todas las demás bajas (Baja voluntaria, Otra razón, etc.)

Este filtro es INDEPENDIENTE de los filtros del panel y solo afecta las gráficas, no las métricas.

### 🔢 Métricas del Tab Retención (Tarjetas KPI)

#### 1. **Activos Promedio**
- **Filtro:** 🔴 GENERAL (ignora filtros, usa TODOS los empleados)
- **Fórmula:**
  ```
  Mes Actual = Mes del filtro seleccionado

  Empleados al Inicio = COUNT(empleados activos al 1° día del mes)
  Empleados al Fin = COUNT(empleados activos al último día del mes)

  Activos Promedio = (Empleados al Inicio + Empleados al Fin) / 2
  ```
- **Archivo:** `dashboard-page.tsx` línea 423
- **Por qué es GENERAL:** Para tener el benchmark de la empresa completa

#### 2. **Bajas (Total y Involuntaria)**
- **Filtro:** 🟢 ESPECÍFICO (usa filtros del panel)
- **Fórmula:**
  ```
  Bajas Total = COUNT(empleados WHERE fecha_baja IS NOT NULL AND cumple_filtros)

  Motivos Involuntarios:
    - Rescisión por desempeño
    - Rescisión por disciplina
    - Término del contrato

  Bajas Involuntarias = COUNT(bajas WHERE motivo IN motivos_involuntarios)
  Bajas Complementarias = Bajas Total - Bajas Involuntarias
  ```
- **Archivo:** `dashboard-page.tsx` líneas 426-454
- **Muestra:** Valor principal + valor secundario (involuntaria)

#### 3. **Rotación Mensual (Total y Involuntaria)**
- **Filtro:** 🟢 ESPECÍFICO (usa filtros del panel)
- **Fórmula:**
  ```
  Bajas del Mes = COUNT(bajas WHERE fecha_baja en mes actual AND cumple_filtros)
  Activos Promedio = (Empleados al inicio del mes + Empleados al fin) / 2

  Rotación Mensual Total (%) = (Bajas del Mes / Activos Promedio) × 100

  Bajas Involuntarias del Mes = COUNT(bajas del mes con motivo involuntario)
  Rotación Involuntaria (%) = (Bajas Involuntarias / Activos Promedio) × 100

  Rotación Complementaria (%) = Rotación Total - Rotación Involuntaria
  ```
- **Archivo:** `dashboard-page.tsx` líneas 432, 457
- **Muestra:** Valor principal (total) + valor secundario (involuntaria)

#### 4. **Rotación Acumulada (Total y Involuntaria)**
- **Filtro:** 🔴 GENERAL (ignora filtros, usa TODOS los empleados)
- **Fórmula:**
  ```
  Período = Últimos 12 meses desde el mes actual

  Bajas en 12m = COUNT(bajas en el período)
  Activos Promedio 12m = (Empleados al inicio + Empleados al fin) / 2

  Rotación Acumulada (%) = (Bajas en 12m / Activos Promedio 12m) × 100

  (Se divide en Involuntaria y Complementaria usando los motivos clave)
  ```
- **Archivo:** `dashboard-page.tsx` líneas 436-438
- **Por qué es GENERAL:** Para benchmark de rotación anual de la empresa
- **Muestra:** Valor principal (total) + valor secundario (involuntaria)

#### 5. **Rotación Año Actual (Total y Involuntaria)**
- **Filtro:** 🔴 GENERAL (ignora filtros, usa TODOS los empleados)
- **Fórmula:**
  ```
  Período = Desde 1 de Enero hasta el mes actual

  Bajas del Año = COUNT(bajas en el período)
  Activos Promedio YTD = (Empleados al inicio del año + Empleados actuales) / 2

  Rotación Año Actual (%) = (Bajas del Año / Activos Promedio YTD) × 100

  (Se divide en Involuntaria y Complementaria usando los motivos clave)
  ```
- **Archivo:** `dashboard-page.tsx` líneas 442-444
- **Por qué es GENERAL:** Para benchmark anual de la empresa
- **Muestra:** Valor principal (total) + valor secundario (involuntaria)

### 📊 Gráficas del Tab Retención

**⚠️ TODAS las gráficas de retención se filtran por el toggle Involuntaria/Complementaria**

#### 6. **Rotación Mensual Histórica (Gráfica de Línea)**
- **Filtro:** 🔴 GENERAL (usa TODOS los empleados)
- **Filtro de Motivo:** ✅ SÍ (usa toggle Involuntaria/Complementaria)
- **Fórmula:**
  ```
  Para cada mes histórico (últimos 24 meses):
    Calcular rotación mensual (ver fórmula #3)

    Si toggle = "Involuntaria":
      Solo contar bajas con motivo involuntario

    Si toggle = "Complementaria":
      Solo contar bajas con motivo complementario
  ```
- **Archivo:** `retention-charts.tsx` líneas 65-166
- **Eje X:** Meses históricos
- **Eje Y:** Porcentaje de rotación mensual
- **Por qué es GENERAL:** Para ver la tendencia completa de la empresa

#### 7. **Rotación Acumulada 12 Meses Móviles (Gráfica de Línea)**
- **Filtro:** 🔴 GENERAL (usa TODOS los empleados)
- **Filtro de Motivo:** ✅ SÍ (usa toggle Involuntaria/Complementaria)
- **Fórmula:**
  ```
  Para cada mes histórico:
    Para ese mes, calcular rotación acumulada 12 meses móviles
    (últimos 12 meses desde ese mes)

    Si toggle = "Involuntaria":
      Solo contar bajas con motivo involuntario

    Si toggle = "Complementaria":
      Solo contar bajas con motivo complementario
  ```
- **Archivo:** `retention-charts.tsx` líneas 65-166
- **Eje X:** Meses históricos
- **Eje Y:** Porcentaje de rotación acumulada 12m
- **Por qué es GENERAL:** Para ver la tendencia histórica completa

#### 8. **Comparación Año Actual vs Anterior (Gráfica de Línea)**
- **Filtro:** 🔴 GENERAL (usa TODOS los empleados)
- **Filtro de Motivo:** ✅ SÍ (usa toggle Involuntaria/Complementaria)
- **Fórmula:**
  ```
  Para cada mes (Ene - Dic):
    Calcular rotación acumulada 12m del Año Actual
    Calcular rotación acumulada 12m del Año Anterior

    Si toggle = "Involuntaria":
      Solo contar bajas con motivo involuntario

    Si toggle = "Complementaria":
      Solo contar bajas con motivo complementario
  ```
- **Archivo:** `retention-charts.tsx` líneas 168-265
- **Eje X:** Meses (Ene - Dic)
- **Eje Y:** Porcentaje de rotación acumulada
- **Líneas:** Año Actual (azul) vs Año Anterior (gris)

#### 9. **Mapa de Calor: Bajas por Motivo y Mes**
- **Filtro:** 🔴 GENERAL (usa TODOS los empleados)
- **Filtro de Motivo:** ✅ SÍ (usa toggle Involuntaria/Complementaria)
- **Fórmula:**
  ```
  Para cada mes del año actual:
    Para cada motivo de baja:
      Contar cantidad de bajas

      Si toggle = "Involuntaria":
        Solo mostrar motivos involuntarios

      Si toggle = "Complementaria":
        Solo mostrar motivos complementarios
  ```
- **Archivo:** `bajas-por-motivo-heatmap.tsx`
- **Filas:** Motivos de baja
- **Columnas:** Meses (Ene - Dic)
- **Color:** Intensidad según cantidad (más oscuro = más bajas)

#### 10. **Tabla de Bajas por Motivo (Tabla con Desglose)**
- **Filtro:** 🔴 GENERAL (usa TODOS los empleados)
- **Filtro de Motivo:** ✅ SÍ (usa toggle Involuntaria/Complementaria)
- **Columnas:**
  - **Motivo de baja:** Nombre normalizado del motivo
  - **Cantidad de bajas:** Total de bajas con ese motivo
  - **Porcentaje del total:** Porcentaje sobre el total de bajas
  - **Listado detallado:** Empleados específicos con ese motivo (expandible)
- **Archivo:** `dismissal-reasons-table.tsx`

---

## 📋 RESUMEN DE FILTROS POR TAB

### Tab Resumen

| Métrica/Gráfica | Filtro Panel | Filtro Motivo | Agrupación |
|-----------------|--------------|---------------|------------|
| Empleados Activos (KPI) | 🟢 ESPECÍFICO | No | - |
| Rotación Mensual (KPI) | 🟢 ESPECÍFICO | No | - |
| Rotación Acumulada (KPI) | 🔴 GENERAL | No | - |
| Rotación Año Actual (KPI) | 🔴 GENERAL | No | - |
| Incidencias (KPI) | 🟢 ESPECÍFICO | No | - |
| Permisos (KPI) | 🟢 ESPECÍFICO | No | - |
| Empleados por Antigüedad (Gráfica) | 🟢 ESPECÍFICO | No | Negocio/Área/Depto |
| Rotación Mensual (Gráfica) | 🟢 ESPECÍFICO | No | Negocio/Área/Depto |
| 12 Meses Móviles (Gráfica) | 🟢 ESPECÍFICO | No | Negocio/Área/Depto |
| Lo que va del Año (Gráfica) | 🟢 ESPECÍFICO | No | Negocio/Área/Depto |
| Tabla Ausentismo | 🟢 ESPECÍFICO | No | Negocio/Área/Depto |

### Tab Personal

| Métrica/Gráfica | Filtro Panel | Notas |
|-----------------|--------------|-------|
| Ingresos Nuevos | 🟢 ESPECÍFICO | Del mes actual |
| Bajas | 🟢 ESPECÍFICO | Histórico |
| Empleados Activos | 🔴 GENERAL | Headcount total |
| Antigüedad Promedio | 🔴 GENERAL | Solo activos |
| Empleados < 3 meses | 🔴 GENERAL | Solo activos |
| Clasificación | 🟢 ESPECÍFICO | - |
| Género | 🟢 ESPECÍFICO | - |
| Distribución por Edad | 🟢 ESPECÍFICO | - |
| HC por Departamento | 🟢 ESPECÍFICO | Solo activos |
| HC por Área | 🟢 ESPECÍFICO | Solo activos |
| Antigüedad por Área | 🟢 ESPECÍFICO | Solo activos |

### Tab Incidencias

| Métrica/Gráfica | Filtro Panel | Período |
|-----------------|--------------|---------|
| # de Activos | 🔴 GENERAL | Actual |
| Empleados con Incidencias | 🟢 ESPECÍFICO | Todo el histórico |
| Incidencias | 🟢 ESPECÍFICO | Todo el histórico |
| Permisos | 🟢 ESPECÍFICO | Todo el histórico |
| Tendencia Mensual [Año] | 🔴 GENERAL | Solo año actual |
| Incidencias por Empleado | 🟢 ESPECÍFICO | Todo el histórico |
| Incidencias por Tipo | 🟢 ESPECÍFICO | Todo el histórico |
| Distribución Pastel | 🟢 ESPECÍFICO | Todo el histórico |
| Tabla Incidencias | 🟢 ESPECÍFICO | Todo el histórico |

### Tab Retención

| Métrica/Gráfica | Filtro Panel | Filtro Motivo |
|-----------------|--------------|---------------|
| Activos Promedio | 🔴 GENERAL | No |
| Bajas | 🟢 ESPECÍFICO | Muestra total + involuntaria |
| Rotación Mensual | 🟢 ESPECÍFICO | Muestra total + involuntaria |
| Rotación Acumulada | 🔴 GENERAL | Muestra total + involuntaria |
| Rotación Año Actual | 🔴 GENERAL | Muestra total + involuntaria |
| Rotación Mensual Histórica | 🔴 GENERAL | ✅ SÍ |
| Rotación Acumulada 12m | 🔴 GENERAL | ✅ SÍ |
| Comparación Anual | 🔴 GENERAL | ✅ SÍ |
| Mapa de Calor Bajas | 🔴 GENERAL | ✅ SÍ |
| Tabla Bajas por Motivo | 🔴 GENERAL | ✅ SÍ |

---

## 🎨 LEYENDA COMPLETA

### Tipos de Filtro

- **🟢 ESPECÍFICO:** Usa filtros del panel (Año, Mes, Departamento, Puesto, etc.)
- **🔴 GENERAL:** Ignora filtros del panel, usa TODOS los empleados

### Motivos de Baja

**Involuntarios (Motivos Clave):**
- Rescisión por desempeño
- Rescisión por disciplina
- Término del contrato

**Complementarios (Otros Motivos):**
- Baja voluntaria
- Otra razón
- Abandono / No regresó
- Cambio de ciudad
- Motivos de salud
- No le gustó el ambiente
- No le gustaron las instalaciones
- Otro trabajo mejor compensado

### Códigos de Incidencia

**Incidencias (Negativas):**
- **FI:** Falta Injustificada
- **SUS:** Suspensión
- **PSIN:** Permiso sin goce
- **ENFE:** Enfermedad

**Permisos (Autorizados):**
- **PCON:** Permiso con goce
- **VAC:** Vacaciones
- **MAT3:** Permiso maternal (3 meses)

---

## 📌 REGLAS IMPORTANTES

### ¿Cuándo se usa GENERAL vs ESPECÍFICO?

**Usa GENERAL (sin filtros) cuando:**
1. La métrica es un **benchmark de empresa completa** (ej: Rotación Acumulada, Rotación YTD)
2. Se necesita **comparar con el total** (ej: # de Activos para calcular porcentajes)
3. La métrica es **demográfica general** (ej: Antigüedad Promedio, Empleados < 3 meses)

**Usa ESPECÍFICO (con filtros) cuando:**
1. El usuario quiere **analizar un grupo específico** (ej: Solo Departamento de Ventas)
2. La métrica es **operativa del período actual** (ej: Rotación Mensual, Incidencias del mes)
3. Se necesita **comparación entre grupos** (ej: Gráficas de Negocio/Área/Departamento)

### ¿Por qué algunas métricas ignoran los filtros?

**Respuesta:** Para mantener **benchmarks estables** de la empresa completa.

**Ejemplo:** Si filtras "Departamento: Ventas", quieres ver:
- ✅ Cómo está Ventas comparado con otros departamentos (ESPECÍFICO)
- ✅ Cómo está Ventas comparado con la empresa completa (GENERAL como referencia)

Por eso, métricas como "Rotación Acumulada" y "Rotación Año Actual" usan GENERAL - sirven de referencia para comparar.

---

## ✅ VERIFICACIÓN RÁPIDA

**¿Cómo saber si una métrica usa filtros?**

1. Si es una **KPI card en Tab Resumen** con valores comparativos → probablemente ESPECÍFICO
2. Si es una **gráfica agrupada** por Negocio/Área/Departamento → probablemente ESPECÍFICO
3. Si es una **métrica de benchmark anual** (Rotación Acumulada, YTD) → probablemente GENERAL
4. Si es el **headcount total** o antigüedad promedio de la empresa → probablemente GENERAL

**Cuando tengas duda:** Las métricas ESPECÍFICAS son la mayoría (~80%), las GENERALES son pocas y específicas (~20%).

---

**Última actualización:** 19 de octubre de 2025
**Versión:** 2.0 - Documentación completa y verificada
