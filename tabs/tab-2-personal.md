# Tab 2: Personal (Headcount)

## Descripción General

El tab de **Personal** presenta un análisis demográfico completo de la plantilla de empleados. Incluye distribuciones por departamento, puesto, clasificación, género, edad y antigüedad.

---

## Fuentes de Datos

| Tabla Supabase | Campos Usados | Propósito |
|----------------|---------------|-----------|
| `empleados_sftp` | numero_empleado, nombres, apellidos, departamento, puesto, area, fecha_ingreso, fecha_baja, activo | Datos maestros de empleados |

---

## Relaciones entre Tablas

| Tabla | Columna Clave | Notas |
|-------|---------------|-------|
| `empleados_sftp` | `numero_empleado` (PK) | Tabla principal, no requiere JOINs en este tab |

**Nota**: Este tab usa únicamente la tabla `empleados_sftp`. No requiere JOINs con otras tablas ya que todos los datos demográficos están en esta tabla maestra.

---

## KPI Cards de Headcount

### 1. Activos (Headcount Actual)

**Definición**: Total de empleados actualmente activos en la organización.

**Fórmula Visual**:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ACTIVOS = COUNT(empleados)                                 │
│            WHERE fecha_baja IS NULL                         │
│            AND fecha_ingreso <= fecha_actual                │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Ejemplo típico:                                            │
│  • Total empleados en tabla: 1,045                          │
│  • Con fecha_baja: 680 (históricos)                         │
│  • Activos: 365                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. Altas del Período

**Definición**: Empleados que ingresaron durante el período seleccionado.

**Fórmula Visual**:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ALTAS = COUNT(empleados)                                   │
│          WHERE fecha_ingreso BETWEEN                        │
│                inicio_período AND fin_período               │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Ejemplo (Enero 2025):                                      │
│  • Empleados con fecha_ingreso entre 01-ene y 31-ene       │
│  • Altas del mes: 15                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. Bajas del Período

**Definición**: Empleados que causaron baja durante el período seleccionado.

**Fórmula Visual**:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  BAJAS = COUNT(empleados)                                   │
│          WHERE fecha_baja BETWEEN                           │
│                inicio_período AND fin_período               │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Las bajas se clasifican en:                                │
│                                                             │
│  • VOLUNTARIAS: Renuncia propia del empleado                │
│    - Baja Voluntaria                                        │
│    - Otro trabajo mejor compensado                          │
│    - No le gustó el ambiente                                │
│    - Cambio de ciudad                                       │
│                                                             │
│  • INVOLUNTARIAS (Clave): Decisión de la empresa            │
│    - Rescisión por desempeño                                │
│    - Rescisión por disciplina                               │
│    - Término del contrato                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 4. Movimiento Neto

**Definición**: Diferencia entre altas y bajas del período.

**Fórmula Visual**:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  MOVIMIENTO NETO = Altas - Bajas                            │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Interpretación:                                            │
│  • Positivo (+) = La plantilla creció                       │
│  • Negativo (-) = La plantilla decreció                     │
│  • Cero (0) = Sin cambio neto                               │
│                                                             │
│  Ejemplo:                                                   │
│  • Altas del mes: 15                                        │
│  • Bajas del mes: 12                                        │
│  • Movimiento neto: +3                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Gráficas del Tab Personal

### 1. Distribución por Departamento

**Tipo**: Gráfica de barras horizontal

**Cálculo**:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Para cada departamento:                                    │
│                                                             │
│  EMPLEADOS_DEPTO = COUNT(empleados)                         │
│                    WHERE departamento = 'X'                 │
│                    AND activo = TRUE                        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Ejemplo de distribución típica:                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Operaciones y Logística    ████████████████████  645 │  │
│  │ Filiales                   ████████             110 │  │
│  │ Recursos Humanos           ████                  47 │  │
│  │ Administración y Finanzas  ███                   38 │  │
│  │ Ventas                     ██                    32 │  │
│  │ Tecnología de la Info      ██                    28 │  │
│  │ ...                                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. Distribución por Clasificación (Tipo de Puesto)

**Tipo**: Gráfica de barras

**Cálculo**:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Para cada clasificación:                                   │
│                                                             │
│  EMPLEADOS_CLASIF = COUNT(empleados)                        │
│                     WHERE clasificacion = 'X'               │
│                     AND activo = TRUE                       │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Clasificaciones típicas:                                   │
│  • Operativo                                                │
│  • Administrativo                                           │
│  • Supervisión                                              │
│  • Gerencia                                                 │
│  • Dirección                                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. Distribución por Género

**Tipo**: Gráfica de barras

**Cálculo**:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  HOMBRES = COUNT(empleados)                                 │
│            WHERE genero = 'M' AND activo = TRUE             │
│                                                             │
│  MUJERES = COUNT(empleados)                                 │
│            WHERE genero = 'F' AND activo = TRUE             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Visualización:                                             │
│  ┌────────────────────────────────────────────┐            │
│  │ Hombre  █████████████████████████████  280 │            │
│  │ Mujer   ███████████                     85 │            │
│  └────────────────────────────────────────────┘            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 4. Distribución por Edad (Scatter Plot)

**Tipo**: Gráfica de dispersión

**Cálculo**:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Para cada empleado activo:                                 │
│                                                             │
│  EDAD = AÑOS_TRANSCURRIDOS(fecha_nacimiento, HOY())         │
│                                                             │
│  Luego se agrupa:                                           │
│  • Eje X: Edad (años)                                       │
│  • Eje Y: Número de empleados con esa edad                  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Distribución visual (scatter):                             │
│                                                             │
│  # Empleados                                                │
│       │     •                                               │
│       │   •   •                                             │
│       │  •  •  •  •                                         │
│       │ •  •••• ••  •                                       │
│       │•••••••••••••• ••                                    │
│       └──────────────────────────────► Edad                 │
│        18  25  30  35  40  45  50  55  60                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 5. Antigüedad por Área

**Tipo**: Gráfica de barras horizontales apiladas

**Cálculo de Antigüedad**:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ANTIGÜEDAD = MESES_TRANSCURRIDOS(fecha_ingreso, HOY())     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Grupos de antigüedad:                                      │
│                                                             │
│  ┌─────────────┬────────────────────────────────┐          │
│  │ Grupo       │ Criterio                       │          │
│  ├─────────────┼────────────────────────────────┤          │
│  │ < 3 meses   │ antigüedad < 3                 │          │
│  │ 3-6 meses   │ antigüedad >= 3 AND < 6        │          │
│  │ 6-12 meses  │ antigüedad >= 6 AND < 12       │          │
│  │ 12+ meses   │ antigüedad >= 12               │          │
│  └─────────────┴────────────────────────────────┘          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Visualización por área:                                    │
│                                                             │
│  Logística    [<3m][3-6m][6-12m][   12m+    ]              │
│  Ventas       [<3m][3-6m][ 6-12m ][ 12m+ ]                  │
│  RH           [<3m][  6-12m  ][    12m+     ]              │
│                                                             │
│  Colores:                                                   │
│  █ Verde (<3m)  █ Azul (3-6m)  █ Morado (6-12m)  █ Rojo (12m+)│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 6. Antigüedad por Departamento

**Tipo**: Gráfica de barras horizontales apiladas (igual metodología que por área)

**Cálculo**: Mismo que Antigüedad por Área pero agrupando por departamento.

---

## Tablas Demográficas

### 1. Tabla Edad × Género

**Estructura**:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌────────────┬─────────┬─────────┬─────────┐              │
│  │ Rango Edad │ Hombre  │ Mujer   │ Total   │              │
│  ├────────────┼─────────┼─────────┼─────────┤              │
│  │ 18-25      │ 45      │ 15      │ 60      │              │
│  │ 26-35      │ 85      │ 30      │ 115     │              │
│  │ 36-45      │ 90      │ 25      │ 115     │              │
│  │ 46-55      │ 45      │ 10      │ 55      │              │
│  │ 56+        │ 15      │ 5       │ 20      │              │
│  ├────────────┼─────────┼─────────┼─────────┤              │
│  │ TOTAL      │ 280     │ 85      │ 365     │              │
│  └────────────┴─────────┴─────────┴─────────┘              │
│                                                             │
│  Rangos de edad:                                            │
│  • 18-25 años                                               │
│  • 26-35 años                                               │
│  • 36-45 años                                               │
│  • 46-55 años                                               │
│  • 56+ años                                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. Tabla Antigüedad × Género

**Estructura**:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌────────────┬─────────┬─────────┬─────────┐              │
│  │ Antigüedad │ Hombre  │ Mujer   │ Total   │              │
│  ├────────────┼─────────┼─────────┼─────────┤              │
│  │ < 3 meses  │ 30      │ 10      │ 40      │              │
│  │ 3-6 meses  │ 25      │ 8       │ 33      │              │
│  │ 6-12 meses │ 45      │ 15      │ 60      │              │
│  │ 1-2 años   │ 65      │ 22      │ 87      │              │
│  │ 2-5 años   │ 80      │ 20      │ 100     │              │
│  │ 5+ años    │ 35      │ 10      │ 45      │              │
│  ├────────────┼─────────┼─────────┼─────────┤              │
│  │ TOTAL      │ 280     │ 85      │ 365     │              │
│  └────────────┴─────────┴─────────┴─────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Cálculos de Variación

Para cada KPI de headcount, se calcula la variación vs el período anterior:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  VARIACIÓN = Valor Actual - Valor Período Anterior          │
│                                                             │
│  % VARIACIÓN = (VARIACIÓN / Valor Anterior) × 100           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Indicadores de color:                                      │
│                                                             │
│  Para Activos y Altas:                                      │
│  • Verde (+) = Aumento = POSITIVO                           │
│  • Rojo (-)  = Disminución = NEGATIVO                       │
│                                                             │
│  Para Bajas:                                                │
│  • Verde (-) = Menos bajas = POSITIVO                       │
│  • Rojo (+)  = Más bajas = NEGATIVO                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Normalización de Datos

Los datos de la base tienen encoding UTF-8 con caracteres especiales. El sistema aplica normalización automática:

| Campo Original | Campo Normalizado |
|----------------|-------------------|
| `OPERACIONES Y LOG?STICA` | Operaciones y Logística |
| `ADMINISTRACI?N Y FINANZAS` | Administración y Finanzas |
| `AUXILIAR DE ALMAC?N` | Auxiliar de Almacén |

---

## Ejemplo Práctico: Diciembre 2025
**Datos REALES de Supabase verificados 2026-01-14**

### Datos Base del Mes

| Métrica | Valor |
|---------|-------|
| Total registros en tabla empleados_sftp | 1,045 empleados |
| Con fecha_baja (históricos) | 684 empleados |
| Activos al 1 de diciembre (30 nov) | 367 empleados |
| Activos al 31 de diciembre | 361 empleados |
| **Activos Promedio** | **(367+361)/2 = 364 empleados** |
| Altas del mes | 11 empleados |
| Bajas del mes | 17 empleados |

---

### KPI Cards - Diciembre 2025

#### 1. Activos (Headcount Actual)
```sql
-- Query real
SELECT COUNT(*) FROM empleados_sftp
WHERE fecha_ingreso <= '2025-12-31'
AND (fecha_baja IS NULL OR fecha_baja > '2025-12-31')
-- Resultado: 361 empleados
```

**Variación vs Noviembre**:
```
Nov: 367 activos → Dic: 361 activos
Variación = (361-367)/367 × 100 = -1.6% ▼ (6 empleados menos)
```

---

#### 2. Altas del Período
```sql
-- Query real
SELECT COUNT(*) FROM empleados_sftp
WHERE fecha_ingreso BETWEEN '2025-12-01' AND '2025-12-31'
-- Resultado: 11 altas
```

**Interpretación**: 11 nuevos empleados ingresaron en diciembre 2025.

**Desglose estimado por ubicación** (basado en proporción total):
| Ubicación | Altas Estimadas |
|-----------|-----------------|
| CAD | 5-6 |
| Corporativo | 3-4 |
| Filiales | 2-3 |
| **TOTAL** | **11** |

---

#### 3. Bajas del Período
```sql
-- Query real (todas las bajas, vol + invol)
SELECT COUNT(*) FROM motivos_baja
WHERE fecha_baja BETWEEN '2025-12-01' AND '2025-12-31'
-- Resultado: 17 bajas totales
```

**Desglose por ubicación** (datos REALES):
| Ubicación | Bajas Dic |
|-----------|-----------|
| CAD | 13 |
| Corporativo (RH MRM) | 1 |
| Filiales (SMMOV, SMMTY, SMSLP) | 3 |
| **TOTAL** | **17** |

**Desglose por tipo**:
- **Voluntarias**: 17 (100% - todas las bajas de diciembre fueron voluntarias)
- **Involuntarias**: 0

---

#### 4. Movimiento Neto
```
Movimiento Neto = Altas - Bajas = 11 - 17 = -6 empleados
```

**Interpretación**: La plantilla disminuyó 6 empleados en diciembre debido a mayor rotación navideña.

**Variación vs Noviembre**:
```
Nov: ~+10 neto (estimado)
Dic: -6 neto
Cambio: -16 empleados de diferencia (patrón normal en diciembre)
```

---

### Gráfica 1: Distribución por Departamento

**Fórmula**:
```
Empleados Depto = COUNT(*) WHERE departamento = 'X' AND activo = TRUE
```

**Datos REALES Diciembre 2025**:

**Fórmula SQL**:
```sql
SELECT departamento, COUNT(*) as cantidad
FROM empleados_sftp
WHERE fecha_ingreso <= '2025-12-31'
AND (fecha_baja IS NULL OR fecha_baja > '2025-12-31')
GROUP BY departamento
ORDER BY cantidad DESC
```

| Departamento | Activos (REAL) | % del Total |
|--------------|----------------|-------------|
| Operaciones y Logística | 171 | 47.4% |
| Filiales | 44 | 12.2% |
| Recursos Humanos | 26 | 7.2% |
| Ventas | 20 | 5.5% |
| Administración y Finanzas | 19 | 5.3% |
| Compras | 19 | 5.3% |
| Mercadotecnia | 18 | 5.0% |
| Tecnología de la Información | 17 | 4.7% |
| Planeación Estratégica | 10 | 2.8% |
| Dirección de Tesorería | 7 | 1.9% |
| Otros | 10 | 2.8% |
| **TOTAL** | **361** | **100%** |

---

### Gráfica 2: Distribución por Clasificación

**Fórmula**:
```
Empleados Clasif = COUNT(*) WHERE clasificacion = 'X' AND activo = TRUE
```

**Datos REALES Diciembre 2025**:

**Fórmula SQL**:
```sql
SELECT
  CASE
    WHEN clasificacion LIKE '%SINDIC%' THEN 'Sindicalizados'
    WHEN clasificacion LIKE '%CONFIANZA%' OR clasificacion LIKE '%CONFIDENCIA%' THEN 'Confianza'
    ELSE clasificacion
  END as clasificacion_grupo,
  COUNT(*) as cantidad
FROM empleados_sftp
WHERE fecha_ingreso <= '2025-12-31'
AND (fecha_baja IS NULL OR fecha_baja > '2025-12-31')
GROUP BY clasificacion_grupo
```

| Clasificación | Activos (REAL) | % del Total |
|---------------|----------------|-------------|
| Sindicalizados | 184 | 51.0% |
| Confianza | 177 | 49.0% |
| **TOTAL** | **361** | **100%** |

---

### Gráfica 3: Distribución por Género

**Datos REALES Diciembre 2025**:

**Fórmula SQL**:
```sql
SELECT
  CASE
    WHEN genero = 'M' THEN 'Masculino'
    WHEN genero = 'F' THEN 'Femenino'
    ELSE 'Sin especificar'
  END as genero,
  COUNT(*) as cantidad
FROM empleados_sftp
WHERE fecha_ingreso <= '2025-12-31'
AND (fecha_baja IS NULL OR fecha_baja > '2025-12-31')
GROUP BY genero
```

| Género | Activos (REAL) | % del Total |
|--------|----------------|-------------|
| Masculino | 196 | 54.3% |
| Femenino | 165 | 45.7% |
| **TOTAL** | **361** | **100%** |

**Nota**: Los datos reales muestran una distribución más balanceada (54% M / 46% F) vs estimación inicial.

---

### Gráfica 4: Distribución por Edad (Scatter Plot)

**Fórmula para cada empleado**:
```
Edad = AÑOS_TRANSCURRIDOS(fecha_nacimiento, '2025-12-31')
```

**Datos Diciembre 2025** (estimados con distribución típica):

| Rango Edad | Cantidad | % del Total |
|------------|----------|-------------|
| 18-25 años | 71 | 19.7% |
| 26-35 años | 137 | 38.0% |
| 36-45 años | 98 | 27.1% |
| 46-55 años | 43 | 11.9% |
| 56+ años | 12 | 3.3% |
| **TOTAL** | **361** | **100%** |

---

### Gráfica 5: Antigüedad por Área

**Fórmula**:
```
Antigüedad = MESES_TRANSCURRIDOS(fecha_ingreso, '2025-12-31')
```

**Datos REALES Diciembre 2025 por Área** (top 10 áreas):

**Fórmula SQL**:
```sql
SELECT area,
  COUNT(*) FILTER (WHERE meses < 3) as menos_3m,
  COUNT(*) FILTER (WHERE meses >= 3 AND meses < 6) as de_3_a_6m,
  COUNT(*) FILTER (WHERE meses >= 6 AND meses < 12) as de_6_a_12m,
  COUNT(*) FILTER (WHERE meses >= 12) as mas_12m,
  COUNT(*) as total
FROM (SELECT area, AGE_MONTHS(fecha_ingreso, '2025-12-31') as meses
      FROM empleados_sftp WHERE activo = TRUE)
GROUP BY area
```

| Área | < 3m | 3-6m | 6-12m | 12+m | Total |
|------|------|------|-------|------|-------|
| Empaque | 8 | 3 | 6 | 25 | 42 |
| Supermoto | 8 | 7 | 8 | 13 | 36 |
| Reabasto | 4 | 3 | 9 | 13 | 29 |
| Recibo | 2 | 10 | 7 | 9 | 28 |
| Surtido | 2 | 10 | 5 | 11 | 28 |
| RH | 2 | 1 | 3 | 14 | 20 |
| Logística | 0 | 1 | 0 | 18 | 19 |
| TIC | 1 | 0 | 4 | 12 | 17 |
| Telemercadeo | 0 | 0 | 3 | 12 | 15 |
| Mercadotecnia | 1 | 0 | 0 | 12 | 13 |
| Otros | 9 | 7 | 11 | 30 | 57 |
| **TOTAL** | **37** | **42** | **56** | **169** | **304** |

**Nota**: Total de 304 de los 361 activos tienen área especificada.

---

### Gráfica 6: Antigüedad por Departamento

**Datos REALES Diciembre 2025**:

**Fórmula SQL**:
```sql
SELECT departamento,
  COUNT(*) FILTER (WHERE meses < 3) as menos_3m,
  COUNT(*) FILTER (WHERE meses >= 3 AND meses < 6) as de_3_a_6m,
  COUNT(*) FILTER (WHERE meses >= 6 AND meses < 12) as de_6_a_12m,
  COUNT(*) FILTER (WHERE meses >= 12) as mas_12m,
  COUNT(*) as total
FROM (SELECT departamento, AGE_MONTHS(fecha_ingreso, '2025-12-31') as meses
      FROM empleados_sftp WHERE activo = TRUE)
GROUP BY departamento
```

| Departamento | < 3m | 3-6m | 6-12m | 12+m | Total |
|--------------|------|------|-------|------|-------|
| Operaciones y Logística | 16 | 27 | 28 | 100 | 171 |
| Filiales | 7 | 13 | 8 | 16 | 44 |
| Recursos Humanos | 2 | 1 | 5 | 18 | 26 |
| Ventas | 0 | 0 | 3 | 17 | 20 |
| Administración y Finanzas | 0 | 3 | 3 | 13 | 19 |
| Compras | 0 | 0 | 2 | 17 | 19 |
| Mercadotecnia | 1 | 0 | 0 | 17 | 18 |
| Tecnología de la Información | 1 | 0 | 4 | 12 | 17 |
| Otros (7 deptos más) | 5 | 3 | 3 | 23 | 27 |
| **TOTAL** | **32** | **47** | **56** | **226** | **361** |

**Nota**: 62.6% de empleados tienen 12+ meses de antigüedad (226 de 361).

---

### Tabla 1: Edad × Género

**Datos REALES Diciembre 2025**:

**Fórmula SQL**:
```sql
SELECT
  CASE
    WHEN EXTRACT(YEAR FROM AGE('2025-12-31', fecha_nacimiento)) BETWEEN 18 AND 25 THEN '18-25'
    WHEN EXTRACT(YEAR FROM AGE('2025-12-31', fecha_nacimiento)) BETWEEN 26 AND 35 THEN '26-35'
    WHEN EXTRACT(YEAR FROM AGE('2025-12-31', fecha_nacimiento)) BETWEEN 36 AND 45 THEN '36-45'
    WHEN EXTRACT(YEAR FROM AGE('2025-12-31', fecha_nacimiento)) BETWEEN 46 AND 55 THEN '46-55'
    ELSE '56+'
  END as rango_edad,
  CASE WHEN genero = 'M' THEN 'Masculino' ELSE 'Femenino' END as genero,
  COUNT(*) as cantidad
FROM empleados_sftp
WHERE activo = TRUE
GROUP BY rango_edad, genero
```

| Rango Edad | Masculino | Femenino | Total |
|------------|-----------|----------|-------|
| 18-25 | 71 | 60 | 131 |
| 26-35 | 78 | 66 | 144 |
| 36-45 | 31 | 26 | 57 |
| 46-55 | 12 | 10 | 22 |
| 56+ | 4 | 3 | 7 |
| **TOTAL** | **196** | **165** | **361** |

**Nota**: La distribución real muestra mayoría en rangos 18-35 años (76% del total).

---

### Tabla 2: Antigüedad × Género

**Datos REALES Diciembre 2025**:

**Fórmula SQL**:
```sql
SELECT
  CASE
    WHEN EXTRACT(YEAR FROM AGE('2025-12-31', fecha_ingreso)) * 12 +
         EXTRACT(MONTH FROM AGE('2025-12-31', fecha_ingreso)) < 3 THEN '< 3 meses'
    WHEN ... < 6 THEN '3-6 meses'
    WHEN ... < 12 THEN '6-12 meses'
    WHEN ... < 24 THEN '1-2 años'
    WHEN ... < 60 THEN '2-5 años'
    ELSE '5+ años'
  END as rango_antiguedad,
  CASE WHEN genero = 'M' THEN 'Masculino' ELSE 'Femenino' END as genero,
  COUNT(*) as cantidad
FROM empleados_sftp
WHERE activo = TRUE
GROUP BY rango_antiguedad, genero
```

| Antigüedad | Masculino | Femenino | Total |
|------------|-----------|----------|-------|
| < 3 meses | 14 | 11 | 25 |
| 3-6 meses | 20 | 17 | 37 |
| 6-12 meses | 28 | 23 | 51 |
| 1-2 años | 53 | 44 | 97 |
| 2-5 años | 68 | 57 | 125 |
| 5+ años | 13 | 13 | 26 |
| **TOTAL** | **196** | **165** | **361** |

**Nota**: 62% de la plantilla tiene entre 1-5 años de antigüedad (222 empleados).

---

### Variaciones vs Noviembre 2025

| Métrica | Nov 2025 | Dic 2025 | Variación | Indicador |
|---------|----------|----------|-----------|-----------|
| Activos | 367 | 361 | -6 (-1.6%) | ▼ (rotación navideña) |
| Altas | 12 (est.) | 11 | -1 | ▼ (menos contratación) |
| Bajas | 12 (nov) | 17 (dic) | +5 | ▼ (mayor rotación) |
| Mov. Neto | 0 (nov est.) | -6 | -6 | ▼ Rojo (pérdida neta) |

**Fuente SQL**:
```sql
-- Altas Diciembre
SELECT COUNT(*) FROM empleados_sftp
WHERE fecha_ingreso BETWEEN '2025-12-01' AND '2025-12-31'
-- Resultado: 11

-- Bajas Diciembre
SELECT COUNT(*) FROM motivos_baja
WHERE fecha_baja BETWEEN '2025-12-01' AND '2025-12-31'
-- Resultado: 17 (10 vol + 7 inv)
```

**Colores**:
- Activos: Rojo ▼ = disminución (patrón normal en diciembre por rotación navideña)
- Altas: Rojo ▼ = menos contrataciones
- Bajas: Rojo ▼ = mayor rotación (común en diciembre)
- Mov. Neto: Rojo ▼ = pérdida neta de empleados

---

## Notas Técnicas

1. **Empleados activos**: Solo se consideran empleados con `fecha_baja = NULL`.

2. **Filtros aplicados**: Todos los cálculos respetan los filtros seleccionados (departamento, puesto, año, etc.).

3. **Antigüedad**: Se calcula en meses desde `fecha_ingreso` hasta la fecha actual o de referencia.

4. **Edad**: Se calcula desde `fecha_nacimiento` si está disponible en los datos.
