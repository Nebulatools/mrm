# FÓRMULAS KPI DASHBOARD HR

**Documento Ejecutivo Completo** | Última actualización: Enero 2026
**Base de Datos:** 1,051 empleados históricos | 8,880 incidencias 2025 | 676 bajas registradas

---

## RESUMEN RÁPIDO

| Tab | KPIs | Gráficas | Tablas |
|-----|------|----------|--------|
| Resumen | 6 | 6 | 1 |
| Incidencias | 4 | 6 | 2 |
| Rotación | 4 | 4 | 6 |

**Datos de Ejemplo:** Diciembre 2025

---

# TAB 1: RESUMEN

## KPI Cards (6)

### 1. Empleados Activos
```
Activos = COUNT(empleados WHERE fecha_ingreso ≤ fecha_fin
          AND (fecha_baja IS NULL OR fecha_baja > fecha_fin))
```
**Comparación:** vs mes anterior

**Ejemplo Real (Dic 2025):**
- **361 activos** (vs 367 en nov = -6 empleados, -1.6%)
- Fuente: `empleados_sftp` tabla

---

### 2. Rotación Mensual
```
Rotación % = (Bajas del mes ÷ Activos Promedio) × 100

Activos Promedio = (Activos inicio mes + Activos fin mes) ÷ 2
```
**Default:** Muestra VOLUNTARIA | **Toggle:** Total, Involuntaria, Voluntaria

**Ejemplo Real (Dic 2025):**
- **10 bajas voluntarias** ÷ 363.5 activos prom × 100 = **2.75%**
- (366 inicio + 361 fin) ÷ 2 = 363.5 activos promedio
- Archivo: `kpi-helpers.ts` → `calculateActivosPromedio()`

---

### 3. Rotación 12 Meses Móviles
```
Rotación 12M % = (Bajas últimos 12 meses ÷ Activos Promedio 12M) × 100
```
**Período:** Ventana rodante de 12 meses (Dic 2024 - Dic 2025)

**Ejemplo Real (Dic 2025):**
- **177 bajas voluntarias** ÷ 344.5 activos prom × 100 = **51.38%**
- Ventana: 1 Dic 2024 al 31 Dic 2025
- Archivo: `kpi-helpers.ts` → `calcularRotacionAcumulada12mConDesglose()`

---

### 4. Rotación Año Actual (YTD)
```
Rotación YTD % = (Bajas desde 1-Ene ÷ Activos Promedio YTD) × 100
```
**Período:** 1 de enero hasta fin del mes actual (1 Ene - 31 Dic 2025)

**Ejemplo Real (Ene-Dic 2025):**
- **159 bajas voluntarias** ÷ 341 activos prom × 100 = **46.63%**
- (321 inicio año + 361 fin año) ÷ 2 = 341 activos promedio
- Archivo: `kpi-helpers.ts` → `calcularRotacionYTDConDesglose()`

---

### 5. % Incidencias
```
% Incidencias = (Total Incidencias ÷ Días Laborados) × 100

Días Laborados = Activos × Días del mes
```
**Códigos:** FI, SUSP, ENFE, MAT1, MAT3, ACCI, INCA

**Ejemplo Real (Dic 2025):**
- **148 incidencias** ÷ 11,191 días laborados × 100 = **1.32%**
- Días laborados = 361 activos × 31 días = 11,191
- Desglose: 107 Faltas + 41 Salud = 148 total

---

### 6. % Permisos
```
% Permisos = (Total Permisos ÷ Días Laborados) × 100
```
**Códigos:** PSIN, PCON, FEST, PATER, JUST (SIN Vacaciones)

**Ejemplo Real (Dic 2025):**
- **117 permisos** ÷ 11,191 días laborados × 100 = **1.05%**
- Vacaciones (VAC) se reportan por separado: 637 registros = 5.69%

---

## Gráficas Tab Resumen (6)

### 1. Empleados Activos por Antigüedad
- **Tipo:** Barras apiladas por ubicación
- **Eje X:** Ubicaciones (CAD, CORPORATIVO, FILIALES)
- **Eje Y:** Número de empleados
- **Categorías:** 0-3 meses, 3-6 meses, 6-12 meses, 1-3 años, +3 años
```
Antigüedad (meses) = (Fecha_Actual - Fecha_Ingreso) ÷ 30.44
```

---

### 2. Rotación Mensual (por Ubicación)
- **Tipo:** Líneas (CAD, CORPORATIVO, FILIALES)
- **Eje X:** ene-dic (FIJO, solo año seleccionado)
- **Eje Y:** % Rotación mensual
- **Toggle:** Total, Involuntaria, Voluntaria (default)
```
Rotación % = (Bajas ubicación en mes ÷ Activos Prom ubicación) × 100
```

---

### 3. Rotación - 12 Meses Móviles (por Ubicación)
- **Tipo:** Líneas (CAD, CORPORATIVO, FILIALES)
- **Eje X:** Últimos 12 meses DINÁMICOS (Feb 24, Mar 24... Ene 25)
- **Eje Y:** % Rotación 12M
- **Toggle:** Total, Involuntaria, Voluntaria (default)
```
Rotación 12M % = Bajas ubicación 12M ÷ Activos Prom ubicación 12M × 100
```

---

### 4. Rotación - Lo que va del Año (YTD por Ubicación)
- **Tipo:** Líneas acumuladas (CAD, CORPORATIVO, FILIALES)
- **Eje X:** ene-dic (FIJO)
- **Eje Y:** % Rotación YTD
- **Toggle:** Total, Involuntaria, Voluntaria (default)
```
Rotación YTD % = Bajas acumuladas ubicación desde Ene ÷ Activos Prom ubicación × 100
```

---

### 5. Incidencias - Últimos 12 Meses (por Ubicación)
- **Tipo:** Líneas (CAD, CORPORATIVO, FILIALES)
- **Eje X:** Últimos 12 meses dinámicos
- **Eje Y:** % de empleados con incidencias
```
% Incidencias = (Empleados únicos con incidencias ÷ Activos ubicación) × 100
```

---

### 6. Permisos - Últimos 12 Meses (por Ubicación)
- **Tipo:** Líneas (CAD, CORPORATIVO, FILIALES)
- **Eje X:** Últimos 12 meses dinámicos
- **Eje Y:** % de empleados con permisos
```
% Permisos = (Empleados únicos con permisos ÷ Activos ubicación) × 100
```

---

## Tablas Tab Resumen (1)

### Tabla: Detalle por Ubicación
| Ubicación | Activos | Rot. Mensual | Rot. 12M | Rot. YTD | Incidencias | Permisos |

---

# TAB 2: INCIDENCIAS

## KPI Cards (4)

### 1. # de Activos
```
Activos = COUNT(empleados activos en fecha)
```
**Ejemplo Real (Dic 2025):** 361 activos

---

### 2. Empleados con Incidencias
```
% = (Empleados únicos con incidencias ÷ Activos) × 100
```
**Códigos:** FI, SUSP, ENFE, MAT1, MAT3, ACCI, INCA

**Ejemplo Real (Dic 2025):**
- **54 empleados únicos** con incidencias
- 54 ÷ 361 × 100 = **15.0%**
- Archivo: `incidents-tab.tsx` → Usa `COUNT(DISTINCT emp)`

---

### 3. Incidencias
```
% = (Total incidencias ÷ Días Laborados) × 100

Días Laborados = Activos × Días del mes
```

**Ejemplo Real (Dic 2025):**
- **148 incidencias** (107 Faltas + 41 Salud)
- 148 ÷ 11,191 × 100 = **1.32%**
- Archivo: `incidents-tab.tsx` → Suma de categorías Faltas + Salud

---

### 4. Permisos
```
% = (Total permisos ÷ Días Laborados) × 100
```
**Códigos:** PSIN, PCON, FEST, PATER, JUST (SIN VAC)

**Ejemplo Real (Dic 2025):**
- **117 permisos** ÷ 11,191 × 100 = **1.05%**
- Vacaciones (VAC = 637) se excluyen y reportan por separado
- Archivo: `incidents-tab.tsx` → Filtro: `inci NOT IN ('VAC')`

---

## Códigos de Incidencias (ACTUALIZADO Ene 2026)

| Grupo | Códigos | Descripción | Ej. Real Dic 2025 |
|-------|---------|-------------|-------------------|
| **Faltas** | FI, SUSP | Falta Injustificada, Suspensión | 107 registros (0.96%) |
| **Salud** | ENFE, MAT1, MAT3, ACCI, INCA | Enfermedad, Maternidad, Accidente, Incapacidad | 41 registros (0.37%) |
| **Permisos** | PSIN, PCON, FEST, PATER, JUST | Permisos autorizados | 117 registros (1.05%) |
| **Vacaciones** | VAC | Vacaciones (separado) | 637 registros (5.69%) |

**Fuente de Datos:** Tabla `incidencias` (8,880 registros en 2025)
**Normalización:** `normalizers.ts` → `normalizeIncidenciaCode()`

---

## Gráficas Tab Incidencias (6)

### 1. Tendencia Mensual (4 categorías)
- **Tipo:** Líneas (4 series)
- **Eje X:** Últimos 12 meses
- **Series:** Faltas, Salud, Permisos, Vacaciones
```
% Categoría = COUNT(incidencias categoría) ÷ Días laborables × 100
```

---

### 2. Distribución de Ausentismos (Pastel)
- **Tipo:** Pastel/Donut
- **Categorías:** Faltas, Salud, Permisos, Vacaciones
```
% Categoría = COUNT(categoría) ÷ Total ausentismos × 100
```

---

### 3. Ausentismo vs Permisos por Día
- **Tipo:** Barras agrupadas por día
- **Ausentismos:** TODOS los códigos incluyendo VAC
- **Permisos:** PSIN, PCON, FEST, PATER, JUST (SIN VAC)

---

### 4. Incidencias por Ubicación
- **Tipo:** Barras horizontales
- **Ubicaciones:** CAD, CORPORATIVO, FILIALES
```
Total = COUNT(incidencias por ubicación en período)
```

---

### 5. Top Incidencias por Código
- **Tipo:** Barras horizontales
- **Ordenamiento:** Por frecuencia descendente
```
Frecuencia = COUNT(incidencias por código)
```

---

### 6. Incidencias por Departamento
- **Tipo:** Barras horizontales
- **Ordenamiento:** Por cantidad descendente
```
% = (Incidencias departamento ÷ Activos departamento) × 100
```

---

## Tablas Tab Incidencias (2)

### Tabla 1: Ausentismos por Motivo (Mensual)
**Archivo:** `absenteeism-table.tsx`
| Motivo | ENE | FEB | MAR | ... | DIC |
|--------|-----|-----|-----|-----|-----|
| **DÍAS ACTIVOS** | 10,108 | 9,399 | 10,725 | ... | 11,193 |
| VACACIONES | 4% | 3% | 3% | ... | 6% |
| FALTAS | 1% | 1% | 1% | ... | 1% |
| SALUD | 1% | 1% | 1% | ... | 0% |
| PERMISOS | (calculado) | (calculado) | (calculado) | ... | (calculado) |
| **TOTAL** | (suma) | (suma) | (suma) | ... | (suma) |

```
DÍAS ACTIVOS = Σ(días activos de cada empleado en el mes)
  Para cada empleado:
    días = MIN(fecha_baja o fin_mes) - MAX(fecha_ingreso o inicio_mes) + 1

% Categoría = (COUNT(incidencias categoría) ÷ DÍAS ACTIVOS) × 100

Ejemplo Diciembre 2025:
  DÍAS ACTIVOS: 11,193 días
  VAC: 637 incidencias ÷ 11,193 = 5.7%
  FALTAS: 107 ÷ 11,193 = 1.0%
  SALUD: 41 ÷ 11,193 = 0.4%
```

**IMPORTANTE:** Esta tabla usa scope `'year-only'` (sin filtro de mes) porque muestra todos los meses en columnas.
**Corrección aplicada:** Línea 1820 de `incidents-tab.tsx` → Usa `empleadosAnuales` en lugar de `empleadosPeriodo`

---

### Tabla 2: Detalle de Incidencias
| Empleado | Fecha | Código | Descripción | Ubicación | Departamento |

**Fuente:** Tabla `incidencias` con JOIN a `empleados_sftp` para enriquecer datos
**Paginación:** Muestra 10 por defecto, botón "Mostrar todo"

---

### Tabla 3: Resumen por Código
| Código | Descripción | Cantidad | % del Total |

**Archivo:** `incidents-tab.tsx` → Agrupación por `inci` con conteo

---

# TAB 3: ROTACIÓN

## KPI Cards (4)

### 1. Activos Promedio
```
Activos Promedio = (Activos Inicio + Activos Fin) ÷ 2
```
**Ejemplo Real (Dic 2025):**
- (366 inicio + 361 fin) ÷ 2 = **363.5 activos promedio**
- Archivo: `kpi-helpers.ts` → `calculateActivosPromedio()`

---

### 2. Rotación Mensual
```
% = (Bajas mes ÷ Activos Promedio) × 100
```
**Toggle:** Total, Voluntaria (default), Involuntaria

**Ejemplo Real (Dic 2025):**
- **Voluntaria:** 10 ÷ 363.5 × 100 = **2.75%**
- **Involuntaria:** 7 ÷ 363.5 × 100 = **1.93%**
- **Total:** 17 ÷ 363.5 × 100 = **4.68%**
- Motivo más común: "Abandono / No regresó"

---

### 3. Rotación 12M Móviles
```
% = (Bajas 12M ÷ Activos Promedio 12M) × 100
```
**Período:** Últimos 12 meses hasta mes actual (Dic 2024 - Dic 2025)

**Ejemplo Real (Dic 2025):**
- **Voluntaria:** 177 ÷ 344.5 × 100 = **51.38%**
- Ventana completa de 12 meses rodantes
- Archivo: `kpi-helpers.ts` → `calcularRotacionAcumulada12mConDesglose()`

---

### 4. Rotación YTD
```
% = (Bajas YTD ÷ Activos Promedio YTD) × 100
```
**Período:** 1-Ene hasta mes actual (Ene-Dic 2025)

**Ejemplo Real (Ene-Dic 2025):**
- **Voluntaria:** 159 ÷ 341 × 100 = **46.63%**
- Acumulado desde inicio de año
- Archivo: `kpi-helpers.ts` → `calcularRotacionYTDConDesglose()`

---

## Clasificación de Bajas (ACTUALIZADO Ene 2026)

| Tipo | Motivos | Función | Ej. Real 2025 |
|------|---------|---------|---------------|
| **INVOLUNTARIA** | Rescisión por desempeño<br>Rescisión por disciplina<br>Término del contrato | `isMotivoClave() = true` | 77 bajas (32%) |
| **VOLUNTARIA** | Baja Voluntaria<br>Abandono / No regresó<br>Otra razón<br>Otros 18 motivos | `isMotivoClave() = false` | 159 bajas (68%) |

**Fuente:** Tabla `motivos_baja` (676 registros) + `empleados_sftp.fecha_baja`
**Lógica:** `normalizers.ts` → `isMotivoClave(motivo)`

---

## Gráficas Tab Rotación (4)

### 1. Rotación Acumulada (12 meses móviles)
- **Tipo:** Barras + Línea comparativa
- **Eje X:** ene-dic (fijo)
- **Barras:** Año actual (rolling 12M a cada punto)
- **Línea:** Año anterior (mismo cálculo)
- **Toggle:** Total, Voluntaria, Involuntaria
```
Para cada mes M:
Rotación 12M = (Bajas desde M-11 hasta M ÷ Activos Promedio ventana) × 100
```

---

### 2. Rotación YTD (Año vs Año Anterior)
- **Tipo:** Barras + Línea comparativa
- **Eje X:** ene-dic (fijo)
- **Barras:** Año actual (acumulado desde enero)
- **Línea:** Año anterior
- **Toggle:** Total, Voluntaria, Involuntaria
```
Rotación YTD = (Bajas desde Ene hasta mes ÷ Activos Promedio período) × 100
```

---

### 3. Rotación Mensual (Año vs Año Anterior)
- **Tipo:** Barras + Línea comparativa
- **Eje X:** ene-dic (fijo)
- **Barras:** Año actual (rotación mensual)
- **Línea:** Año anterior
- **Toggle:** Total, Voluntaria, Involuntaria
```
Rotación Mensual % = (Bajas mes ÷ Activos Promedio mes) × 100
```

---

### 4. Rotación por Temporalidad (Antigüedad al momento de baja)
- **Tipo:** Barras agrupadas
- **Eje X:** Categorías de antigüedad
- **Categorías:** <3 meses, 3-6 meses, 6-12 meses, +12 meses
```
Antigüedad = fecha_baja - fecha_ingreso
Cantidad = COUNT(bajas donde antigüedad en rango)
```

---

## Tablas Tab Rotación (6)

### Tabla 1: Rotación Acumulada 12 Meses Móviles
**Archivo:** `retention-charts.tsx`
| Mes | Año Ant. % | # Bajas 12M | # Activos prom 12M | Año Act. % | # Bajas 12M | # Activos prom 12M | Variación |
|-----|-----------|-------------|-------------------|-----------|-------------|-------------------|-----------|
```
% Rot. 12M = (Bajas ventana 12M ÷ Activos Promedio 12M) × 100
Variación % = ((Actual - Anterior) ÷ Anterior) × 100
```

---

### Tabla 2: Rotación Mensual Comparativa
**Archivo:** `retention-charts.tsx`
| Mes | Año Ant. % | # Bajas | # Activos (fin) | Año Act. % | # Bajas | # Activos (fin) | Variación |
|-----|-----------|---------|-----------------|-----------|---------|-----------------|-----------|
```
% Rotación = (Bajas del mes ÷ Activos Promedio mes) × 100
```

---

### Tabla 3: Rotación por Motivo y Área
**Archivo:** `rotation-by-motive-area-table.tsx`
| Área | Motivo 1 | Motivo 2 | Motivo 3 | Motivo 4 | Motivo 5 | Total |
|------|----------|----------|----------|----------|----------|-------|
| TOTAL | n | n | n | n | n | N |
| % | % | % | % | % | % | 100% |
```
SOURCE: empleados_sftp (plantilla) WHERE fecha_baja IS NOT NULL
JOIN: motivos_baja para obtener motivo por numero_empleado
Top 5 motivos: ORDER BY frecuencia DESC LIMIT 5
% = (Total motivo ÷ Grand Total) × 100
```

---

### Tabla 4: Rotación por Motivo y Antigüedad
**Archivo:** `rotation-by-motive-seniority-table.tsx`
| Motivo | 0-1 mes | 1-3 meses | 3-6 meses | 6m-1 año | 1-3 años | 3-5 años | 5+ años | Total |
|--------|---------|-----------|-----------|----------|----------|----------|---------|-------|
```
SOURCE: empleados_sftp WHERE fecha_baja AND fecha_ingreso
Antigüedad = differenceInMonths(fecha_baja, fecha_ingreso)
Buckets: 0-1, 1-3, 3-6, 6-12, 12-36, 36-60, 60+ meses
Top 5 motivos por frecuencia
```

---

### Tabla 5: Motivo de Baja por Mes
**Archivo:** `rotation-by-motive-month-table.tsx`
| Motivo | ENE | FEB | MAR | ABR | MAY | JUN | JUL | AGO | SEP | OCT | NOV | DIC | Total |
|--------|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-------|
```
SOURCE: empleados_sftp WHERE fecha_baja
JOIN: motivos_baja para motivo
Filtro: año seleccionado
Mes = fecha_baja.getMonth() + 1
Top 5 motivos por frecuencia
Meses futuros = null (mostrado como '-')
```

---

### Tabla 6: Rotación por Ubicación - Resumen Anual
**Archivo:** `rotation-combined-table.tsx`
| MÉTRICA | UBICACIÓN | ENE | FEB | ... | DIC | PROMEDIO |
|---------|-----------|-----|-----|-----|-----|----------|
| Activos | CAD | n | n | ... | n | avg |
| Activos | CORPORATIVO | n | n | ... | n | avg |
| Activos | FILIALES | n | n | ... | n | avg |
| TOTAL | | n | n | ... | n | avg |
| Bajas Voluntarias | CAD | n | n | ... | n | avg |
| ... | ... | ... | ... | ... | ... | ... |
| Bajas Involuntarias | ... | ... | ... | ... | ... | ... |
| % Rotación | ... | % | % | ... | % | avg% |
```
UBICACIONES: ['CAD', 'CORPORATIVO', 'FILIALES']
MÉTRICAS: Activos, Bajas Voluntarias, Bajas Involuntarias, % Rotación

Activos = Headcount promedio del mes (inicio + fin) / 2
Involuntarias = bajas WHERE isMotivoClave(motivo) = true
Voluntarias = Total bajas - Involuntarias
% Rotación = (bajas mes ÷ avgHeadcount) × 100

Mapeo ubicación: normalizeCCToUbicacion(cc)
```

---

# CÁLCULOS BASE

## Activos Promedio (Denominador Universal)
```javascript
Activos_Inicio = COUNT(empleado) WHERE
  fecha_ingreso ≤ inicio_período AND
  (fecha_baja IS NULL OR fecha_baja > inicio_período)

Activos_Fin = COUNT(empleado) WHERE
  fecha_ingreso ≤ fin_período AND
  (fecha_baja IS NULL OR fecha_baja > fin_período)

Activos_Promedio = (Activos_Inicio + Activos_Fin) / 2
```

## Bajas en Período
```javascript
Bajas = COUNT(empleado) WHERE
  fecha_baja >= inicio_período AND
  fecha_baja <= fin_período

// Voluntarias
Bajas_Vol = Bajas WHERE motivo IN ('Renuncia', 'Abandono', 'Otras razones')

// Involuntarias
Bajas_Inv = Bajas WHERE motivo IN ('Rescisión por desempeño', 'Rescisión por disciplina', 'Término del contrato')
```

## Días Laborables
```javascript
Días_Laborables_Mes = COUNT(días lunes-sábado en período)
Días_Laborados = Activos × Días_Laborables_Mes
```

## Antigüedad
```javascript
// Para empleados activos
Antigüedad_Meses = (Fecha_Actual - Fecha_Ingreso) / 30.44

// Clasificación para gráfica de activos
if meses < 3: '0-3 meses'
if meses < 6: '3-6 meses'
if meses < 12: '6-12 meses'
if meses < 36: '1-3 años'
else: '+3 años'

// Clasificación para bajas (temporalidad)
if meses < 3: '<3 meses'
if meses < 6: '3-6 meses'
if meses < 12: '6-12 meses'
else: '+12 meses'
```

---

# MAPEO DE UBICACIONES

| Centro de Costo (cc) | Ubicación |
|---------------------|-----------|
| CAD | CAD |
| *MRM*, DIRECCION*, DIRE*, TESORERIA* | CORPORATIVO |
| SM*, DF, TORREON, CHIHUAHUA, YAMAHA, TERRAPARK, MOTOSTAFF | FILIALES |

---

# ARCHIVOS DE REFERENCIA

| Archivo | Contenido |
|---------|-----------|
| `kpi-helpers.ts` | Funciones de cálculo de rotación |
| `kpi-calculator.ts` | Cálculos generales de KPIs |
| `normalizers.ts` | Mapeo de códigos y ubicaciones |
| `summary-comparison.tsx` | Tab Resumen |
| `incidents-tab.tsx` | Tab Incidencias |
| `retention-charts.tsx` | Gráficas y tablas comparativas de Rotación |
| `dashboard-page.tsx` | Controlador principal |
| `rotation-by-motive-area-table.tsx` | Tabla: Rotación por Motivo y Área |
| `rotation-by-motive-seniority-table.tsx` | Tabla: Rotación por Motivo y Antigüedad |
| `rotation-by-motive-month-table.tsx` | Tabla: Motivo de Baja por Mes |
| `rotation-combined-table.tsx` | Tabla: Rotación por Ubicación - Resumen Anual |

---

# NOTAS IMPORTANTES

## Configuración de Filtros por Scope

**Archivo:** `filters/filters.ts` → `applyFiltersWithScope()`

| Scope | Años | Meses | Uso |
|-------|------|-------|-----|
| **`'specific'`** | ✅ | ✅ | Default para mayoría de componentes |
| **`'year-only'`** | ✅ | ❌ | Tablas mensuales (Ausentismos, Rotación por Mes) |
| **`'general'`** | ❌ | ❌ | Comparativos históricos sin restricción temporal |

**Componentes con scope especial:**
- `AbsenteeismTable` → `'year-only'` (muestra 12 meses en columnas)
- `RotationByMotiveMonthTable` → `'year-only'` (muestra 12 meses en columnas)
- Comparativos año anterior → `'general'` (necesita datos históricos sin filtro)

---

## Reglas de Negocio

1. **Toggle por defecto:** Las gráficas de rotación muestran **VOLUNTARIA** por defecto
2. **Vacaciones separadas:** VAC NO se incluye en "Permisos" de los KPI cards
3. **12M Móviles:** Ventana rodante de 12 meses hacia atrás desde mes actual
4. **Activos Promedio:** Es el denominador universal para TODAS las rotaciones
5. **Variación %:** Compara año actual vs año anterior (mismo período)
6. **Días activos:** Suma de días calendario de TODOS los empleados (considerando ingresos/bajas parciales)
7. **Códigos actualizados:** ACCI e INCA agregados a categoría SALUD (Enero 2026)

---

## Comparaciones en KPIs

| KPI | Comparación vs |
|-----|----------------|
| Rotación Mensual | Mismo mes año anterior |
| Rotación 12M | Mismo punto año anterior (ventana 12M) |
| Rotación YTD | Mismo punto año anterior (YTD) |
| Incidencias | Mes anterior |
| Permisos | Mes anterior |
| Activos | Mes anterior |

---

## Filtros Aplicables

**Filtros disponibles:**
- Año(s): Selección múltiple
- Mes(es): Selección múltiple (NO aplica a tablas mensuales)
- Empresa: MOTO REPUESTOS MONTERREY, MOTO TOTAL, REPUESTOS Y MOTOCICLETAS DEL NORTE
- Ubicación (Incidencias): CAD, CORPORATIVO, FILIALES
- Departamento: Múltiples opciones
- Área: Múltiples opciones
- Puesto: Múltiples opciones
- Clasificación: Múltiples opciones

**Default:** Sin filtros aplicados = muestra todos los datos disponibles

---

## Base de Datos (Enero 2026)

| Tabla | Registros | Período | Descripción |
|-------|-----------|---------|-------------|
| `empleados_sftp` | 1,051 | 2001-2026 | Master de empleados (364 activos, 687 con baja) |
| `motivos_baja` | 676 | 2023-2026 | Registros de bajas con motivo |
| `incidencias` | 8,880 | 2025 | Incidencias diarias (516 empleados únicos) |
| `prenomina_horizontal` | 374 | 2025 | Nómina semanal con horas |

---

## Correcciones Aplicadas (Enero 2026)

1. **Tabla Ausentismos (incidents-tab.tsx línea 1820):**
   - ❌ ANTES: `plantilla={empleadosPeriodo}` (scope `'specific'` con filtro de mes)
   - ✅ AHORA: `plantilla={empleadosAnuales}` (scope `'year-only'` sin filtro de mes)
   - **Motivo:** La tabla muestra 12 meses en columnas, necesita datos de todo el año

2. **Códigos de Salud actualizados:**
   - Agregados: ACCI (Accidente, 54 registros), INCA (Incapacidad, 1 registro)
   - Archivo: `normalizers.ts` + `absenteeism-table.tsx` + `CLAUDE.md`
   - Leyenda actualizada en `incidents-tab.tsx` línea 1269

3. **Histograma "Faltas por empleado":**
   - ❌ ANTES: Dividía entre empleados CON incidencias
   - ✅ AHORA: Divide entre TODOS los empleados activos (`activosCount`)
   - **Resultado:** Porcentajes más realistas y representativos

---

*Documento actualizado con datos reales de Diciembre 2025 y verificado contra base de datos Supabase*
*Última revisión: Enero 2026 | Dashboard HR MRM v2.0*
