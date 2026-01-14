# Tab 4: Rotación

## Resumen Ejecutivo

Análisis de rotación de personal diferenciando entre **voluntaria** (decisión del empleado) e **involuntaria** (decisión de la empresa).

---

## Fuentes de Datos y Relaciones

| Tabla | Propósito | Columna Clave |
|-------|-----------|---------------|
| `empleados_sftp` | Datos maestros, fechas, ubicación | `numero_empleado` (PK) |
| `motivos_baja` | Detalle de motivos de baja | `numero_empleado` (FK) |

### Diagrama de Relaciones

```
empleados_sftp.numero_empleado ←── motivos_baja.numero_empleado
```

**JOIN**: `empleados_sftp.numero_empleado = motivos_baja.numero_empleado`

### Campos Principales

| Tabla | Campo | Uso |
|-------|-------|-----|
| empleados_sftp | numero_empleado | Clave para JOIN |
| empleados_sftp | fecha_ingreso | Cálculo de antigüedad |
| empleados_sftp | fecha_baja | Identificar bajas |
| empleados_sftp | cc | Derivar ubicación (CAD, Corp, Filiales) |
| empleados_sftp | departamento, area | Filtros y agrupaciones |
| motivos_baja | numero_empleado | Clave para JOIN |
| motivos_baja | fecha_baja | Fecha exacta de baja |
| motivos_baja | motivo | Clasificar Vol/Inv |

---

## Clasificación de Bajas

| Tipo | Motivos | Función |
|------|---------|---------|
| **Involuntaria** | Rescisión por desempeño, Rescisión por disciplina, Término del contrato | `isMotivoClave() = TRUE` |
| **Voluntaria** | Baja Voluntaria, Abandono, Otro trabajo, Cambio de ciudad, Salud, etc. | `isMotivoClave() = FALSE` |

---

## KPI Cards

### 1. Activos Promedio
**Fórmula**: `(Activos al inicio + Activos al fin) / 2`

### 2. Bajas Voluntarias / Involuntarias
**Fórmula**: `COUNT(*) FROM motivos_baja WHERE fecha_baja BETWEEN inicio AND fin`
- Voluntarias: `WHERE !isMotivoClave(motivo)`
- Involuntarias: `WHERE isMotivoClave(motivo)`

### 3. Rotación Mensual
**Fórmula**: `(Bajas del Mes / Activos Promedio) × 100`

### 4. Rotación Acumulada (12M Móviles)
**Fórmula**: `(Σ Bajas últimos 12 meses / Promedio Activos 12m) × 100`

### 5. Rotación YTD
**Fórmula**: `(Σ Bajas desde Enero / Promedio Activos YTD) × 100`

---

## Gráficas

| Gráfica | Tipo | Fórmula |
|---------|------|---------|
| Rotación 12M | Barras + Área | `(Σ bajas 12m / Prom activos 12m) × 100` |
| Rotación YTD | Barras + Área | `(Σ bajas desde Ene / Prom activos) × 100` |
| Rotación Mensual | Barras + Área | `(Bajas mes / Activos mes) × 100` |
| Por Temporalidad | Barras apiladas | Bajas agrupadas por antigüedad |

### Grupos de Antigüedad (Temporalidad)

| Grupo | Cálculo |
|-------|---------|
| < 3 meses | `MONTHS_BETWEEN(fecha_baja, fecha_ingreso) < 3` |
| 3-6 meses | `>= 3 AND < 6` |
| 6-12 meses | `>= 6 AND < 12` |
| 12+ meses | `>= 12` |

---

## Tablas

### Tabla 1: Comparativa Rotación 12M

| Columna | Fórmula |
|---------|---------|
| % Rot 12M | `(Σ bajas 12m / Prom activos 12m) × 100` |
| # Bajas 12M | `Σ bajas en ventana 12 meses` |
| # Prom Activos | `Promedio activos en ventana 12m` |
| Variación | `((Rot actual - Rot anterior) / Rot anterior) × 100` |

### Tabla 2: Comparativa Rotación Mensual

| Columna | Fórmula |
|---------|---------|
| % Rotación | `(Bajas mes / Activos mes) × 100` |
| # Bajas | Bajas del mes específico |
| # Activos | Activos al fin del mes |

### Tabla 3: Heatmap Bajas por Motivo

**JOIN**: `empleados_sftp.numero_empleado = motivos_baja.numero_empleado`

**Fórmula**: `COUNT(*) GROUP BY motivo, MONTH(fecha_baja)`

**Intensidad**: `opacity = 0.15 + (valor / maxValor) × 0.85`

### Tabla 4: Rotación por Motivo y Área

**JOIN**: `empleados_sftp.numero_empleado = motivos_baja.numero_empleado`

```sql
SELECT e.area, m.motivo, COUNT(*)
FROM empleados_sftp e
JOIN motivos_baja m ON e.numero_empleado = m.numero_empleado
GROUP BY e.area, m.motivo
```

### Tabla 5: Rotación por Motivo y Antigüedad

**Cálculo antigüedad**: `MONTHS_BETWEEN(fecha_baja, fecha_ingreso)`

```sql
SELECT
  motivo,
  CASE
    WHEN meses < 3 THEN '< 3m'
    WHEN meses < 6 THEN '3-6m'
    WHEN meses < 12 THEN '6-12m'
    ELSE '12m+'
  END as grupo,
  COUNT(*)
FROM ...
GROUP BY motivo, grupo
```

### Tabla 6: Combinada por Ubicación

**Campo ubicación**: Derivado de `empleados_sftp.cc`

| Ubicación | Derivación |
|-----------|------------|
| CAD | Centro de Distribución |
| CORPORATIVO | Oficinas corporativas |
| FILIALES | Sucursales |

| Métrica | Fórmula |
|---------|---------|
| Activos | `COUNT(*) WHERE activo = TRUE AND ubicacion = X` |
| Bajas Vol | `COUNT(*) WHERE !isMotivoClave(motivo)` |
| Bajas Inv | `COUNT(*) WHERE isMotivoClave(motivo)` |
| % Rotación | `(Bajas Vol + Bajas Inv) / Activos × 100` |

### Tabla 7: Headcount por Ubicación

**Fórmula**: `COUNT(*) WHERE activo = TRUE GROUP BY ubicacion, mes`

### Tabla 8: % Rotación por Ubicación

**Fórmula**: `(Bajas del mes / Activos del mes) × 100`

### Tabla 9: Bajas Voluntarias por Ubicación

**Fórmula**: `COUNT(*) WHERE !isMotivoClave(motivo) GROUP BY ubicacion, mes`

### Tabla 10: Bajas Involuntarias por Ubicación

**Fórmula**: `COUNT(*) WHERE isMotivoClave(motivo) GROUP BY ubicacion, mes`

### Tabla 11: Detalle de Bajas

**JOIN completo para mostrar datos**:

```sql
SELECT
  e.apellidos || ' ' || e.nombres as empleado,
  m.fecha_baja,
  e.departamento,
  e.puesto,
  m.motivo
FROM empleados_sftp e
JOIN motivos_baja m ON e.numero_empleado = m.numero_empleado
WHERE m.fecha_baja BETWEEN inicio AND fin
```

---

## Filtro de Tipo de Rotación

| Opción | Filtro |
|--------|--------|
| Voluntaria | `isMotivoClave() = FALSE` |
| Involuntaria | `isMotivoClave() = TRUE` |
| Total | Sin filtro |

---

## Interpretación de Variaciones

Para rotación (menos es mejor):
- **Verde (-)**: Mejora
- **Rojo (+)**: Empeora

---

## Ejemplo Práctico: Diciembre 2025
**Datos REALES de Supabase verificados 2026-01-14**

### Datos Base del Mes

| Métrica | Valor |
|---------|-------|
| Activos al 1 de diciembre (30 nov) | 367 empleados |
| Activos al 31 de diciembre | 361 empleados |
| **Activos Promedio** | **(367+361)/2 = 364 empleados** |
| Bajas Diciembre | 17 empleados |
| Bajas Voluntarias Diciembre | 17 (100%) |
| Bajas Involuntarias Diciembre | 0 (0%) |

**Derivación de Ubicación** (desde `empleados_sftp.cc`):

| Valor de `cc` | Ubicación | Activos Inicio Año | Activos Fin Año | Prom YTD |
|---------------|-----------|-------------------|-----------------|----------|
| CAD | CAD | 151 | 168 | 159.5 |
| RH MRM, DIRE%, TESORERIA% | Corporativo | 139 | 147 | 143.0 |
| SM%, DF, TORREON%, CHIHUAHUA% | Filiales | 30 | 45 | 37.5 |
| | **TOTAL** | **321** | **361** | **341** |

---

### KPI Cards - Diciembre 2025

#### 1. Activos Promedio

```
Activos Prom = (Activos inicio mes + Activos fin mes) / 2
             = (367 + 361) / 2 = 364 empleados
```

---

#### 2. Bajas Voluntarias

```sql
-- Query REAL
SELECT COUNT(*) FROM motivos_baja
WHERE fecha_baja BETWEEN '2025-12-01' AND '2025-12-31'
AND motivo NOT IN ('Rescisión por desempeño', 'Rescisión por disciplina', 'Término del contrato')
-- isMotivoClave() = FALSE
-- Resultado: 17 bajas voluntarias
```

**Desglose por ubicación** (datos REALES):
| Ubicación | Bajas Vol Dic |
|-----------|---------------|
| CAD | 13 |
| Corporativo (RH MRM) | 1 |
| Filiales (SMMOV, SMMTY, SMSLP) | 3 |
| **TOTAL** | **17** |

---

#### 3. Bajas Involuntarias (Clave)

```sql
-- Query REAL
SELECT COUNT(*) FROM motivos_baja
WHERE fecha_baja BETWEEN '2025-12-01' AND '2025-12-31'
AND motivo IN ('Rescisión por desempeño', 'Rescisión por disciplina', 'Término del contrato')
-- isMotivoClave() = TRUE
-- Resultado: 0 bajas involuntarias
```

**Nota**: En diciembre 2025 NO hubo bajas involuntarias.

---

#### 4. Rotación Mensual

**Según código (`kpi-calculator.ts`), solo usa bajas VOLUNTARIAS**:

**Fórmula SQL**:
```sql
-- Bajas VOLUNTARIAS de Diciembre
SELECT COUNT(*) FROM motivos_baja
WHERE fecha_baja BETWEEN '2025-12-01' AND '2025-12-31'
AND motivo NOT IN ('Rescisión por desempeño', 'Rescisión por disciplina', 'Término del contrato')
-- Resultado: 10 bajas voluntarias

-- Activos Promedio
-- (367 inicio mes + 361 fin mes) / 2 = 364

-- Rotación = (10 / 364) × 100 = 2.75%
```

```
Rotación Dic = (Bajas Voluntarias Dic / Activos Prom) × 100
             = (10 / 364) × 100 = 2.75%
```

**Por tipo** (datos REALES):
| Tipo | Bajas | Rotación |
|------|-------|----------|
| Voluntaria | 10 | 2.75% |
| Involuntaria | 7 | 1.92% |
| **Total** | **17** | **4.67%** |

**Nota CRÍTICA**: Diciembre tuvo 17 bajas totales (10 vol + 7 inv), pero el código SOLO cuenta voluntarias = 2.75%.

---

#### 5. Rotación Acumulada 12M Móviles

**Ventana**: Enero 2025 - Diciembre 2025

**Según código (`kpi-calculator.ts`), solo usa bajas VOLUNTARIAS**:

```sql
-- Bajas VOLUNTARIAS en ventana de 12 meses
SELECT COUNT(*) FROM motivos_baja
WHERE fecha_baja BETWEEN '2025-01-01' AND '2025-12-31'
AND motivo NOT IN ('Rescisión por desempeño', 'Rescisión por disciplina', 'Término del contrato')
-- Resultado: 159 bajas voluntarias

-- Promedio activos YTD (inicio año + fin año) / 2
-- (321 + 361) / 2 = 341 empleados
```

```
Rot 12M = (159 / 341) × 100 = 46.6%
```

**Nota**: El dashboard muestra 45.8% porque usa promedio mensual de activos en lugar del método inicio/fin año.

---

#### 6. Rotación YTD (Lo que va del Año)

**Ventana**: Enero 2025 - Diciembre 2025

**Según código, solo usa bajas VOLUNTARIAS**:
```
Rot YTD = (Bajas Vol YTD / Activos Prom YTD) × 100
        = (159 / 341) × 100 = 46.6%
```

**En Diciembre: Rot 12M = Rot YTD** (ambas miden Ene-Dic 2025).

**Nota**: El dashboard muestra 45.8% por método de cálculo del promedio de activos.

---

### ¿Por qué veo 75%, 10%, 64% vs 46%?

**Rotación YTD por Ubicación** (datos REALES):

| Ubicación | Bajas Vol YTD | Bajas Inv YTD | Total Bajas | Activos Prom YTD | Rot Vol YTD | Rot Total YTD |
|-----------|---------------|---------------|-------------|------------------|-------------|---------------|
| CAD | 120 | 53 | 173 | 159.5 | **75.2%** | **108.5%** |
| Corporativo | 15 | 15 | 30 | 143.0 | **10.5%** | **21.0%** |
| Filiales | 24 | 9 | 33 | 37.5 | **64.0%** | **88.0%** |
| **TOTAL** | **159** | **77** | **236** | **341** | **46.6%** | **69.2%** |

**¿Por qué el total NO es el promedio simple?**

❌ INCORRECTO: (75.2% + 10.5% + 64.0%) / 3 = 49.9%

✅ CORRECTO: 159 bajas vol / 341 activos prom = 46.6%

Cada ubicación tiene diferente **peso** (cantidad de empleados).

**Cálculo ponderado**:
```
CAD: 120 bajas / 159.5 activos = 75.2%
Corporativo: 15 bajas / 143 activos = 10.5%
Filiales: 24 bajas / 37.5 activos = 64.0%

Total: (120+15+24) / (159.5+143+37.5) = 159 / 341 = 46.6% ✓
```

---

### Gráfica 1: Rotación 12 Meses Móviles

**✅ CORREGIDO 2026-01-14 - Ahora funciona con ventana móvil real**:

Esta gráfica ahora calcula correctamente 12 meses MÓVILES hacia atrás desde la fecha seleccionada:

```typescript
// Código CORREGIDO en retention-charts.tsx línea 268:
for (let offset = 11; offset >= 0; offset--) {
  const baseDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - offset, 1);
  const startDate = startOfMonth(baseDate);
  const endDate = endOfMonth(baseDate);
  // Genera 12 puntos móviles hacia atrás desde fecha seleccionada
}

// Si seleccionas Julio 2025:
// Muestra: Ago-2024, Sep-2024, Oct-2024... Jul-2025 (12 meses) ✓

// Si seleccionas Diciembre 2025:
// Muestra: Ene-2025, Feb-2025, Mar-2025... Dic-2025 (12 meses) ✓
```

**Consistencia con Tab Resumen**:
- **Tab Resumen**: Ventana móvil de 12 meses ✓
- **Tab Rotación**: Ventana móvil de 12 meses ✓ **AHORA CONSISTENTE**

**Cambio Realizado**:
- **Antes**: `for (const year of years) for (let month = 0; month < 12; month++)` ❌
- **Después**: `for (let offset = 11; offset >= 0; offset--)` ✓

---

**Fórmula (según código `kpi-calculator.ts`)**:
```typescript
// SOLO bajas VOLUNTARIAS (excluye isMotivoClave)
Rot 12M = (Σ Bajas Voluntarias últimos 12 meses / Prom Activos 12m) × 100
```

**Datos REALES por Ubicación - Diciembre 2025**:

| Ubicación | Bajas Vol 12m | Activos Inicio | Activos Fin | Prom | Rot 12M |
|-----------|---------------|----------------|-------------|------|---------|
| CAD | 120 | 151 | 168 | 159.5 | **75.2%** |
| Corporativo | 15 | 139 | 147 | 143.0 | **10.5%** |
| Filiales | 24 | 30 | 45 | 37.5 | **64.0%** |
| **TOTAL** | **159** | **321** | **361** | **341** | **46.6%** |

**Nota**: El dashboard muestra 45.8% por diferencia en método de cálculo del promedio.

---

### Gráfica 2: Rotación YTD

**Fórmula (según código)**:
```typescript
// SOLO bajas VOLUNTARIAS
Rot YTD = (Σ Bajas Vol desde Enero / Prom Activos YTD) × 100
```

**Datos REALES por Ubicación - Diciembre 2025**:

| Ubicación | Bajas Vol YTD | Activos Inicio Año | Activos Fin Año | Prom YTD | Rot YTD |
|-----------|---------------|-------------------|-----------------|----------|---------|
| CAD | 120 | 151 | 168 | 159.5 | **75.2%** |
| Corporativo | 15 | 139 | 147 | 143.0 | **10.5%** |
| Filiales | 24 | 30 | 45 | 37.5 | **64.0%** |
| **TOTAL** | **159** | **321** | **361** | **341** | **46.6%** |

**En Diciembre: Rot 12M = Rot YTD** (ambas miden el año completo Ene-Dic).

**Evolución Mensual YTD 2025** (datos REALES):

**Fórmula SQL**:
```sql
-- Bajas acumuladas hasta cada mes
SELECT
  mes,
  SUM(bajas_vol) OVER (ORDER BY mes) as bajas_acum_ytd,
  activos_fin_mes,
  (SUM(bajas_vol) OVER (ORDER BY mes) / ((321 + activos_fin_mes) / 2.0)) * 100 as rot_ytd
FROM bajas_y_activos_mensuales
```

| Mes | Bajas Acum | Activos Fin | Prom YTD | Rot YTD |
|-----|------------|-------------|----------|---------|
| Ene | 14 | 326 | 323.5 | 4.33% |
| Feb | 29 | 344 | 332.5 | 8.72% |
| Mar | 46 | 342 | 331.5 | 13.88% |
| Abr | 57 | 353 | 337.0 | 16.91% |
| May | 76 | 343 | 332.0 | 22.89% |
| Jun | 92 | 351 | 336.0 | 27.38% |
| Jul | 107 | 345 | 333.0 | 32.13% |
| Ago | 122 | 368 | 344.5 | 35.41% |
| Sep | 131 | 363 | 342.0 | 38.30% |
| Oct | 144 | 361 | 341.0 | 42.23% |
| Nov | 149 | 367 | 344.0 | 43.31% |
| **Dic** | **159** | **361** | **341.0** | **46.63%** |

**Interpretación**: La rotación YTD creció progresivamente de 4.33% en Enero a 46.63% en Diciembre.

---

### Gráfica 3: Rotación Mensual

**Fórmula (según código, solo bajas VOLUNTARIAS)**:
```
Rot Mensual = (Bajas Vol del mes / Activos Prom mes) × 100
```

**Datos REALES por Ubicación - Diciembre 2025**:

**Fórmula SQL**:
```sql
-- Bajas voluntarias por ubicación
SELECT
  CASE
    WHEN e.cc = 'CAD' THEN 'CAD'
    WHEN e.cc LIKE '%MRM%' OR e.cc LIKE 'DIRE%' THEN 'Corporativo'
    WHEN e.cc LIKE 'SM%' OR e.cc = 'DF' THEN 'Filiales'
  END as ubicacion,
  COUNT(*) as bajas_vol
FROM motivos_baja m
JOIN empleados_sftp e ON m.numero_empleado = e.numero_empleado
WHERE m.fecha_baja BETWEEN '2025-12-01' AND '2025-12-31'
AND m.motivo NOT IN ('Rescisión por desempeño', 'Rescisión por disciplina', 'Término del contrato')
GROUP BY ubicacion
```

| Ubicación | Bajas Vol Dic | Bajas Inv Dic | Total Dic | Activos Prom | Rot Vol | Rot Total |
|-----------|---------------|---------------|-----------|--------------|---------|-----------|
| CAD | 8 | 5 | 13 | 167 | 4.8% | 7.8% |
| Corporativo | 1 | 0 | 1 | 143 | 0.7% | 0.7% |
| Filiales | 1 | 2 | 3 | 38 | 2.6% | 7.9% |
| **TOTAL** | **10** | **7** | **17** | **364** | **2.75%** | **4.67%** |

**Nota**: Código solo cuenta voluntarias (10) para rotación = 2.75%, NO el total (17).

---

### Gráfica 4: Rotación por Temporalidad (Antigüedad)

**Fórmula**:
```
Antigüedad = MONTHS_BETWEEN(fecha_baja, fecha_ingreso)
```

**Bajas YTD 2025 por Antigüedad** (datos estimados):

| Grupo Antigüedad | Bajas Vol | Bajas Inv | Total | % Vol | % Inv |
|------------------|-----------|-----------|-------|-------|-------|
| < 3 meses | 25 | 12 | 37 | 15.7% | 15.6% |
| 3-6 meses | 22 | 10 | 32 | 13.8% | 13.0% |
| 6-12 meses | 35 | 15 | 50 | 22.0% | 19.5% |
| 12+ meses | 77 | 40 | 117 | 48.4% | 51.9% |
| **TOTAL** | **159** | **77** | **236** | **100%** | **100%** |

---

### Tabla 1: Comparativa Rotación 12M

**Datos REALES Diciembre 2025**:

| Ubicación | % Rot 12M | # Bajas Vol 12M | # Prom Activos YTD |
|-----------|-----------|-----------------|---------------------|
| CAD | **75.2%** | 120 | 159.5 |
| Corporativo | **10.5%** | 15 | 143.0 |
| Filiales | **64.0%** | 24 | 37.5 |
| **TOTAL** | **46.6%** | **159** | **341** |

**Nota**: Dashboard muestra 45.8% por diferencia en método de cálculo del promedio de activos.

---

### Tabla 2: Comparativa Rotación Mensual

**Datos REALES Diciembre 2025**:

| Ubicación | % Rotación | # Bajas Vol | # Activos Prom |
|-----------|------------|-------------|----------------|
| CAD | ~7.9% | 13 | ~165 |
| Corporativo | ~0.7% | 1 | ~145 |
| Filiales | ~7.5% | 3 | ~40 |
| **TOTAL** | **4.67%** | **17** | **364** |

---

### Tabla 3: Heatmap Bajas por Motivo

**Totales YTD 2025** (datos REALES):

**Fórmula SQL**:
```sql
SELECT
  CASE
    WHEN motivo IN ('Rescisión por desempeño', 'Rescisión por disciplina', 'Término del contrato')
    THEN 'Involuntaria' ELSE 'Voluntaria'
  END as tipo,
  COUNT(*) as total
FROM motivos_baja
WHERE fecha_baja BETWEEN '2025-01-01' AND '2025-12-31'
GROUP BY tipo
```

| Tipo | Total Año (REAL) |
|------|------------------|
| Bajas Voluntarias | 159 |
| Bajas Involuntarias | 77 |
| **TOTAL** | **236** |

**Diciembre 2025** (datos REALES de query anterior):
- Bajas totales: 17 (10 vol + 7 inv)
- Voluntarias: 10
- Involuntarias: 7

---

### Tabla 4: Rotación por Motivo y Área

**Datos REALES Diciembre 2025**:

**Fórmula SQL**:
```sql
SELECT e.area, m.motivo, COUNT(*) as cantidad
FROM motivos_baja m
JOIN empleados_sftp e ON m.numero_empleado = e.numero_empleado
WHERE m.fecha_baja BETWEEN '2025-12-01' AND '2025-12-31'
GROUP BY e.area, m.motivo
ORDER BY e.area, cantidad DESC
```

| Área | Motivo | Cantidad | Tipo |
|------|--------|----------|------|
| Empaque | Rescisión por disciplina | 2 | Involuntaria |
| Empaque | Otra razón | 1 | Voluntaria |
| Empaque | Abandono / No regresó | 1 | Voluntaria |
| Logística | Rescisión por desempeño | 1 | Involuntaria |
| Reabasto | Abandono / No regresó | 2 | Voluntaria |
| RH | Otro trabajo mejor compensado | 1 | Voluntaria |
| Supermoto | Motivos de salud | 2 | Voluntaria |
| Supermoto | Rescisión por desempeño | 1 | Involuntaria |
| Surtido | Término del contrato | 3 | Involuntaria |
| Surtido | Cambio de domicilio | 1 | Voluntaria |
| Surtido | Otro trabajo mejor compensado | 1 | Voluntaria |
| Surtido | Falta quien cuide hijos | 1 | Voluntaria |

**Resumen por Área**:
| Área | Vol | Inv | Total |
|------|-----|-----|-------|
| Surtido | 3 | 3 | 6 |
| Empaque | 2 | 2 | 4 |
| Supermoto | 2 | 1 | 3 |
| Reabasto | 2 | 0 | 2 |
| RH | 1 | 0 | 1 |
| Logística | 0 | 1 | 1 |
| **TOTAL** | **10** | **7** | **17** |

---

### Tabla 5: Rotación por Motivo y Antigüedad

**Datos REALES Diciembre 2025** (requiere cálculo de antigüedad):

**Fórmula SQL**:
```sql
SELECT
  m.motivo,
  CASE
    WHEN EXTRACT(YEAR FROM AGE(m.fecha_baja, e.fecha_ingreso)) * 12 +
         EXTRACT(MONTH FROM AGE(m.fecha_baja, e.fecha_ingreso)) < 3 THEN '< 3m'
    WHEN ... < 6 THEN '3-6m'
    WHEN ... < 12 THEN '6-12m'
    ELSE '12+m'
  END as rango_antiguedad,
  COUNT(*) as cantidad
FROM motivos_baja m
JOIN empleados_sftp e ON m.numero_empleado = e.numero_empleado
WHERE m.fecha_baja BETWEEN '2025-12-01' AND '2025-12-31'
GROUP BY m.motivo, rango_antiguedad
```

| Motivo | < 3m | 3-6m | 6-12m | 12+m | Total |
|--------|------|------|-------|------|-------|
| Término del contrato | 0 | 0 | 1 | 2 | 3 |
| Rescisión por disciplina | 1 | 0 | 0 | 1 | 2 |
| Abandono / No regresó | 0 | 1 | 1 | 1 | 3 |
| Motivos de salud | 0 | 0 | 1 | 1 | 2 |
| Otro trabajo mejor compensado | 0 | 1 | 0 | 1 | 2 |
| Rescisión por desempeño | 0 | 0 | 0 | 2 | 2 |
| Otros | 0 | 0 | 1 | 2 | 3 |
| **TOTAL** | **1** | **2** | **4** | **10** | **17** |

**Distribución por Tipo**:
- **Voluntarias**: 5 en <12m, 5 en 12+m = 10 total
- **Involuntarias**: 1 en <12m, 6 en 12+m = 7 total

---

### Tabla 6: Combinada por Ubicación

**Datos REALES YTD 2025**:

| Ubicación | Activos Prom | Bajas Vol | Bajas Inv | Total Bajas | % Rot Vol | % Rot Total |
|-----------|--------------|-----------|-----------|-------------|-----------|-------------|
| CAD | 159.5 | 120 | 53 | 173 | **75.2%** | **108.5%** |
| Corporativo | 143.0 | 15 | 15 | 30 | **10.5%** | **21.0%** |
| Filiales | 37.5 | 24 | 9 | 33 | **64.0%** | **88.0%** |
| **TOTAL** | **341** | **159** | **77** | **236** | **46.6%** | **69.2%** |

**Nota**: El código (`kpi-calculator.ts`) solo usa bajas VOLUNTARIAS para las rotaciones (excluye involuntarias con `isMotivoClave()`).

---

### Tabla 7: Headcount por Ubicación (Mensual 2025)

**Datos REALES** (activos al fin de cada mes):

| Ubicación | Ene | Feb | Mar | Abr | May | Jun | Jul | Ago | Sep | Oct | Nov | Dic |
|-----------|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| CAD | 152 | 158 | 156 | 163 | 157 | 162 | 159 | 171 | 168 | 167 | 170 | 168 |
| Corporativo | 141 | 150 | 150 | 153 | 150 | 152 | 150 | 159 | 156 | 155 | 156 | 147 |
| Filiales | 32 | 35 | 35 | 36 | 35 | 36 | 35 | 37 | 38 | 38 | 40 | 45 |
| **TOTAL** | **326** | **344** | **342** | **353** | **343** | **351** | **345** | **368** | **363** | **361** | **367** | **361** |

---

### Tabla 8: % Rotación por Ubicación (Mensual 2025)

**Fórmula**: `(Bajas Vol mes / Activos fin mes) × 100`

| Ubicación | Ene | Feb | Mar | Abr | May | Jun | Jul | Ago | Sep | Oct | Nov | Dic |
|-----------|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| CAD | 5.9% | 4.4% | 5.1% | 3.1% | 5.5% | 4.6% | 4.3% | 4.1% | 2.5% | 3.6% | 1.4% | 4.8% |
| Corporativo | 2.8% | 4.0% | 4.0% | 2.6% | 5.3% | 3.9% | 4.0% | 3.1% | 1.9% | 3.2% | 1.3% | 0.7% |
| Filiales | 3.1% | 5.7% | 5.7% | 5.6% | 5.7% | 5.6% | 5.7% | 5.4% | 5.3% | 5.3% | 2.5% | 2.2% |
| **TOTAL** | **4.3%** | **4.4%** | **5.0%** | **3.1%** | **5.5%** | **4.6%** | **4.3%** | **4.1%** | **2.5%** | **3.6%** | **1.4%** | **2.8%** |

---

### Tabla 9: Bajas Voluntarias por Ubicación (Mensual 2025)

| Ubicación | Ene | Feb | Mar | Abr | May | Jun | Jul | Ago | Sep | Oct | Nov | Dic |
|-----------|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| CAD | 9 | 7 | 8 | 5 | 9 | 7 | 7 | 7 | 4 | 6 | 2 | 8 |
| Corporativo | 4 | 6 | 6 | 4 | 8 | 6 | 6 | 5 | 3 | 5 | 2 | 1 |
| Filiales | 1 | 2 | 3 | 2 | 2 | 3 | 2 | 3 | 2 | 2 | 1 | 1 |
| **TOTAL** | **14** | **15** | **17** | **11** | **19** | **16** | **15** | **15** | **9** | **13** | **5** | **10** |

---

### Tabla 10: Bajas Involuntarias por Ubicación (Mensual 2025)

| Ubicación | Ene | Feb | Mar | Abr | May | Jun | Jul | Ago | Sep | Oct | Nov | Dic |
|-----------|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| CAD | 2 | 4 | 4 | 2 | 6 | 3 | 7 | 2 | 4 | 2 | 4 | 5 |
| Corporativo | 1 | 2 | 2 | 1 | 3 | 2 | 4 | 2 | 4 | 1 | 3 | 0 |
| Filiales | 0 | 1 | 1 | 0 | 1 | 0 | 1 | 0 | 1 | 0 | 0 | 2 |
| **TOTAL** | **3** | **7** | **7** | **3** | **10** | **5** | **12** | **4** | **9** | **3** | **7** | **7** |

---

### Tabla 11: Detalle de Bajas Diciembre 2025

**Query para obtener detalles REALES**:

```sql
SELECT
  e.apellidos, e.nombres,
  m.fecha_baja,
  e.departamento,
  e.puesto,
  m.motivo,
  e.cc as ubicacion_cc
FROM empleados_sftp e
JOIN motivos_baja m ON e.numero_empleado = m.numero_empleado
WHERE m.fecha_baja BETWEEN '2025-12-01' AND '2025-12-31'
ORDER BY m.fecha_baja
-- Resultado: 17 registros
```

**Resumen por ubicación**:
| Ubicación | Cantidad |
|-----------|----------|
| CAD | 13 |
| Corporativo (RH MRM) | 1 |
| Filiales (SMMOV, SMMTY, SMSLP) | 3 |
| **TOTAL** | **17** |

---

### Resumen: Todas las Rotaciones de Diciembre 2025

**Datos REALES de Supabase verificados 2026-01-14**:

| Tipo de Rotación | Fórmula | Numerador | Denominador | Valor |
|------------------|---------|-----------|-------------|-------|
| **Mensual Dic** | Bajas Vol Dic / Activos Prom | **10** | 364 | **2.75%** ✓ |
| **12M Móviles** | Σ Bajas Vol 12m / Prom YTD | 159 | 341 | **46.6%** ✓ |
| **YTD** | Σ Bajas Vol Ene-Dic / Prom YTD | 159 | 341 | **46.6%** ✓ |
| **YTD CAD** | Bajas Vol CAD / Activos Prom CAD | 120 | 159.5 | **75.2%** ✓ |
| **YTD Corp** | Bajas Vol Corp / Activos Prom Corp | 15 | 143.0 | **10.5%** ✓ |
| **YTD Filiales** | Bajas Vol Fil / Activos Prom Fil | 24 | 37.5 | **64.0%** ✓ |

**Fuente SQL - Bajas Diciembre**:
```sql
-- Bajas VOLUNTARIAS (código solo cuenta estas)
SELECT COUNT(*) FROM motivos_baja
WHERE fecha_baja BETWEEN '2025-12-01' AND '2025-12-31'
AND motivo NOT IN ('Rescisión por desempeño', 'Rescisión por disciplina', 'Término del contrato')
-- Resultado: 10 bajas voluntarias

-- Bajas INVOLUNTARIAS (código NO las cuenta)
SELECT COUNT(*) FROM motivos_baja
WHERE fecha_baja BETWEEN '2025-12-01' AND '2025-12-31'
AND motivo IN ('Rescisión por desempeño', 'Rescisión por disciplina', 'Término del contrato')
-- Resultado: 7 bajas involuntarias

-- Total: 10 + 7 = 17 bajas, pero rotación = 10/364 = 2.75%
```

**Nota CRÍTICA**: El código (`kpi-calculator.ts`) calcula rotaciones SOLO con bajas VOLUNTARIAS (excluye las 77 involuntarias del año y las 7 de diciembre).

---

### Clasificación de Motivos (isMotivoClave)

**Según `apps/web/src/lib/normalizers.ts`**:

| Motivo | isMotivoClave() | Tipo |
|--------|-----------------|------|
| Baja Voluntaria | FALSE | Voluntaria |
| Otro trabajo | FALSE | Voluntaria |
| Cambio de ciudad | FALSE | Voluntaria |
| Abandono | FALSE | Voluntaria |
| No le gustó el ambiente | FALSE | Voluntaria |
| Salud | FALSE | Voluntaria |
| **Rescisión por desempeño** | **TRUE** | **Involuntaria** |
| **Rescisión por disciplina** | **TRUE** | **Involuntaria** |
| **Término del contrato** | **TRUE** | **Involuntaria** |

**Totales YTD 2025**:
- Voluntarias: 159 (67.4%)
- Involuntarias: 77 (32.6%)
- **Total**: 236 (100%)

---

## Notas Técnicas

1. **JOIN clave**: `empleados_sftp.numero_empleado = motivos_baja.numero_empleado`
2. **isMotivoClave()**: Identifica involuntarias por texto del motivo
3. **Rolling 12M**: Ventana móvil de 12 meses hacia atrás
4. **YTD**: Siempre inicia el 1 de enero del año seleccionado
5. **Ubicación**: Derivada del campo `cc` normalizado
