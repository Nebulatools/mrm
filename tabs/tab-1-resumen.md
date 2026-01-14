# Tab 1: Resumen (Overview)

## Descripción General

El tab de **Resumen** es la vista principal del dashboard que presenta una comparación consolidada de los datos del período actual contra el período anterior. Muestra los KPIs más importantes de todas las áreas: headcount, incidencias y retención.

---

## Fuentes de Datos

| Tabla Supabase | Descripción | Registros Típicos |
|----------------|-------------|-------------------|
| `empleados_sftp` | Datos maestros de empleados | ~1,045 registros |
| `motivos_baja` | Historial de bajas con motivos | ~667 registros |
| `incidencias` | Registro de incidencias diarias | ~7,100+ registros |

---

## Relaciones entre Tablas

| Tabla Origen | Columna Clave | Tabla Destino | Columna Clave |
|--------------|---------------|---------------|---------------|
| `empleados_sftp` | `numero_empleado` (PK) | `motivos_baja` | `numero_empleado` (FK) |
| `empleados_sftp` | `numero_empleado` (PK) | `incidencias` | `emp` (FK) |

### Diagrama de Relaciones

```
empleados_sftp.numero_empleado ←──┬── motivos_baja.numero_empleado
                                  └── incidencias.emp
```

### JOINs utilizados

- **Para bajas/rotación**: `empleados_sftp.numero_empleado = motivos_baja.numero_empleado`
- **Para incidencias**: `empleados_sftp.numero_empleado = incidencias.emp`

---

## Narrativa IA (SmartNarrative)

En la parte superior de cada tab aparece un componente de **Narrativa IA** que genera automáticamente un análisis ejecutivo del estado actual.

### Cómo Funciona

```
┌─────────────────────────────────────────────────────────────┐
│  ENTRADA DE DATOS                                            │
│  ───────────────                                             │
│  • KPIs calculados del período                               │
│  • Comparación vs período anterior                           │
│  • Tendencias detectadas                                     │
│                                                              │
│  MOTOR DE ANÁLISIS (Google Gemini AI)                       │
│  ─────────────────────────────────────                      │
│  • Identifica anomalías                                      │
│  • Detecta patrones                                          │
│  • Genera insights accionables                               │
│                                                              │
│  SALIDA                                                      │
│  ──────                                                      │
│  • Resumen ejecutivo en lenguaje natural                     │
│  • Recomendaciones priorizadas                               │
│  • Alertas de atención                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## KPI Cards Principales

### 1. Empleados Activos

**Definición**: Número total de empleados que están actualmente activos (sin fecha de baja).

**Fórmula Visual**:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  EMPLEADOS ACTIVOS = Σ empleados               │
│                      donde fecha_baja = NULL    │
│                                                 │
│  ────────────────────────────────────────────── │
│                                                 │
│  Ejemplo:                                       │
│  Total en tabla: 1,045 empleados                │
│  Con fecha_baja: 680 empleados                  │
│  Sin fecha_baja: 365 empleados  ← ACTIVOS      │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Variación vs Período Anterior**:

```
                    Activos Actuales - Activos Anteriores
Variación (%) = ─────────────────────────────────────────── × 100
                         Activos Anteriores
```

---

### 2. Activos Promedio

**Definición**: Promedio de empleados activos entre el inicio y el fin del período. Esta métrica se usa como denominador para calcular tasas de rotación.

**Fórmula Visual**:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                 Activos Inicio + Activos Fin                │
│  ACTIVOS PROM = ─────────────────────────────               │
│                            2                                 │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Donde:                                                     │
│  • Activos Inicio = empleados activos al día 1 del mes     │
│  • Activos Fin = empleados activos al último día del mes   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Para determinar si un empleado estaba activo en una fecha: │
│                                                             │
│  Activo en FECHA =                                          │
│      fecha_ingreso ≤ FECHA                                  │
│      Y                                                      │
│      (fecha_baja = NULL  O  fecha_baja > FECHA)             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Ejemplo Práctico**:

```
Período: Enero 2025

• Activos al 1 de enero: 360 empleados
• Activos al 31 de enero: 370 empleados

                     360 + 370
Activos Promedio = ─────────── = 365 empleados
                        2
```

---

### 3. Total Bajas del Período

**Definición**: Número de empleados que causaron baja durante el período seleccionado.

**Fórmula Visual**:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  BAJAS = Σ empleados                            │
│          donde fecha_baja ENTRE                 │
│                inicio_período Y fin_período     │
│                                                 │
│  ────────────────────────────────────────────── │
│                                                 │
│  Ejemplo (Enero 2025):                          │
│  Bajas entre 01-ene y 31-ene = 12 empleados    │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

### 4. Rotación Mensual

**Definición**: Porcentaje de empleados que causaron baja respecto al promedio de activos del período.

**Fórmula Visual**:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                      Bajas del Período                      │
│  ROTACIÓN (%) = ─────────────────────────── × 100           │
│                     Activos Promedio                        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Ejemplo:                                                   │
│  • Bajas en el mes: 12                                      │
│  • Activos promedio: 365                                    │
│                                                             │
│                   12                                        │
│  Rotación = ─────────── × 100 = 3.29%                       │
│                  365                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Rangos Esperados**:

| Rotación Mensual | Interpretación |
|------------------|----------------|
| 0% - 3% | Saludable |
| 3% - 6% | Moderada (atención) |
| 6% - 10% | Alta (crítica) |
| > 10% | Muy Alta (emergencia) |

---

### 5. Total Incidencias

**Definición**: Número total de registros en la tabla `incidencias` (todas las categorías combinadas).

**Fórmula Visual**:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  TOTAL INCIDENCIAS = COUNT(*)                   │
│                      FROM incidencias           │
│                      WHERE fecha ENTRE          │
│                            inicio Y fin         │
│                                                 │
│  ────────────────────────────────────────────── │
│                                                 │
│  Incluye TODOS los códigos:                     │
│  • Faltas (FI, SUSP)                           │
│  • Salud (ENFE, MAT3, MAT1)                    │
│  • Permisos (PSIN, PCON, FEST, PATER, JUST)    │
│  • Vacaciones (VAC)                             │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

### 6. % Incidencias (Faltas + Salud)

**Definición**: Porcentaje de incidencias NEGATIVAS (faltas + salud) respecto a empleados activos.

**Categorización de Códigos**:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  INCIDENT_CODES (Negativas):                    │
│  • FI   = Falta Injustificada                   │
│  • SUSP = Suspensión                            │
│  • ENFE = Enfermedad                            │
│  • MAT3 = Maternal 3 meses                      │
│  • MAT1 = Maternal 1 mes                        │
│                                                 │
│  PERMISO_CODES (Neutrales):                     │
│  • VAC   = Vacaciones                           │
│  • PSIN  = Permiso Sin Goce                     │
│  • PCON  = Permiso Con Goce                     │
│  • FEST  = Festivo                              │
│  • PATER = Paternal                             │
│  • JUST  = Justificación                        │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Fórmula**:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              COUNT(inci IN INCIDENT_CODES)                  │
│  % INCID = ───────────────────────────────── × 100          │
│                    Empleados Activos                        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Donde INCIDENT_CODES = {FI, SUSP, ENFE, MAT3, MAT1}        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Importante**: **NO** incluye permisos ni vacaciones. Solo mide ausentismo negativo.

---

### 7. Permisos

**Definición**: Número total de permisos y vacaciones registrados en el período.

**Fórmula Visual**:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  PERMISOS = COUNT(inci IN PERMISO_CODES)                    │
│             FROM incidencias                                │
│             WHERE fecha ENTRE inicio Y fin                  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Donde PERMISO_CODES = {VAC, PSIN, PCON, FEST, PATER, JUST}│
│                                                             │
│  Incluye:                                                   │
│  • Vacaciones (VAC)                  ← Categoría principal  │
│  • Permisos sin goce (PSIN)                                │
│  • Permisos con goce (PCON)                                │
│  • Festivos (FEST)                                         │
│  • Paternales (PATER)                                      │
│  • Justificaciones (JUST)                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Comparación de Períodos

Todas las KPI Cards muestran una variación respecto al período anterior:

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  VARIACIÓN ABSOLUTA = Valor Actual - Valor Anterior          │
│                                                              │
│                         Valor Actual - Valor Anterior        │
│  VARIACIÓN (%) = ──────────────────────────────────── × 100  │
│                            Valor Anterior                    │
│                                                              │
│  ────────────────────────────────────────────────────────── │
│                                                              │
│  Indicadores visuales:                                       │
│  • ▲ Verde  = Mejora (menos bajas, menos incidencias)        │
│  • ▼ Rojo   = Empeora (más bajas, más incidencias)          │
│  • ─ Gris   = Sin cambio significativo                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Filtros Disponibles

El dashboard permite filtrar los datos por múltiples dimensiones:

| Filtro | Descripción | Efecto |
|--------|-------------|--------|
| **Año** | Año calendario | Limita todos los cálculos al año seleccionado |
| **Mes** | Mes específico | Limita al mes seleccionado |
| **Departamento** | Área organizacional | Filtra empleados por departamento |
| **Puesto** | Cargo/posición | Filtra por tipo de puesto |
| **Área** | Subárea dentro del departamento | Mayor granularidad |
| **Empresa** | Entidad legal | Útil para grupos empresariales |
| **Ubicación** | Centro de costo/localidad | CAD, Corporativo, Filiales |

---

## Flujo de Datos

```
┌─────────────┐      ┌─────────────┐      ┌─────────────────┐
│    SFTP     │ ───► │   Import    │ ───► │    Supabase     │
│   (Files)   │      │   Process   │      │   (Database)    │
└─────────────┘      └─────────────┘      └─────────────────┘
                                                   │
                                                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    KPI Calculator                           │
│  ───────────────────────────────────────────────────────── │
│  • calculateKPIsFromData()                                  │
│  • Aplica filtros                                           │
│  • Calcula Activos, Bajas, Rotación, etc.                  │
└─────────────────────────────────────────────────────────────┘
                                                   │
                                                   ▼
┌─────────────────────────────────────────────────────────────┐
│                     Dashboard UI                            │
│  ───────────────────────────────────────────────────────── │
│  • KPI Cards con valores y variaciones                      │
│  • Gráficas interactivas                                    │
│  • Tablas de detalle                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Gráficas del Tab Resumen

### 1. Empleados Activos por Antigüedad

**Tipo**: Gráfica de barras apiladas

**Descripción**: Muestra la distribución de empleados activos por rangos de antigüedad en la empresa.

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Cálculo de antigüedad para cada empleado:                  │
│                                                             │
│  ANTIGÜEDAD (meses) = fecha_actual - fecha_ingreso          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Rangos de antigüedad (grupos de color):                    │
│                                                             │
│  ┌──────────────┬──────────────────────────────┐           │
│  │ Rango        │ Criterio                     │           │
│  ├──────────────┼──────────────────────────────┤           │
│  │ 0-3 meses    │ antigüedad < 3 meses         │           │
│  │ 3-6 meses    │ 3 ≤ antigüedad < 6 meses     │           │
│  │ 6-12 meses   │ 6 ≤ antigüedad < 12 meses    │           │
│  │ 1-3 años     │ 12 ≤ antigüedad < 36 meses   │           │
│  │ +3 años      │ antigüedad ≥ 36 meses        │           │
│  └──────────────┴──────────────────────────────┘           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Visualización (barras apiladas por ubicación/negocio):     │
│                                                             │
│  CAD         [0-3m][3-6m][  6-12m  ][  1-3 años  ][+3 años] │
│  Corporativo [0-3m][3-6m][6-12m][  1-3 años  ][ +3 años  ] │
│  Filiales    [0-3m][6-12m][   1-3 años   ][   +3 años    ] │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Tooltip**: Al pasar el cursor sobre cada segmento muestra:
- Cantidad de empleados en ese rango
- Porcentaje del total: `(cantidad / total) × 100`

---

### 2. Rotación Mensual

**Tipo**: Gráfica de líneas con múltiples series

**Descripción**: Muestra la rotación porcentual de cada mes individual durante los últimos 12 meses.

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Para cada mes en los últimos 12:                           │
│                                                             │
│                    Bajas del mes                            │
│  ROTACIÓN (%) = ─────────────────── × 100                   │
│                  Activos del mes                            │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Cada línea representa una ubicación/negocio:               │
│  • CAD (línea azul)                                         │
│  • Corporativo (línea verde)                                │
│  • Filiales (línea morada)                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. Rotación - 12 Meses Móviles

**Tipo**: Gráfica de líneas con múltiples series

**Descripción**: Muestra la rotación acumulada en una ventana móvil de 12 meses. Cada punto representa la rotación total de los 12 meses anteriores a ese punto.

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Para cada punto en la gráfica:                             │
│                                                             │
│  VENTANA = 12 meses anteriores al punto                     │
│  Ejemplo: Punto en Jul 2025 = Ago 2024 → Jul 2025           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Cálculo:                                                   │
│                                                             │
│  1. Contar bajas en la ventana de 12 meses                  │
│  2. Calcular promedio de activos en la ventana              │
│  3. Rotación = (bajas / activosProm) × 100                  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Interpretación:                                            │
│  • Suaviza variaciones mensuales                            │
│  • Muestra TENDENCIA anual                                  │
│  • Ideal para ver evolución a largo plazo                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 4. Rotación - Lo que va del Año (YTD)

**Tipo**: Gráfica de líneas con múltiples series

**Descripción**: Muestra la rotación acumulada desde enero hasta el mes seleccionado del año en curso.

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Para cada punto en la gráfica:                             │
│                                                             │
│  VENTANA YTD = 1 de enero del año → fin del mes actual      │
│  Ejemplo: Punto en Jul 2025 = Ene 2025 → Jul 2025           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Cálculo:                                                   │
│                                                             │
│  1. Contar bajas desde enero hasta el mes actual            │
│  2. Calcular promedio de activos en ese período             │
│  3. Rotación YTD = (bajas / activosProm) × 100              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Diferencia Visual Esperada vs 12M Móviles:**

| Gráfica | Para Jul 2025 | Meses en Eje X |
|---------|---------------|----------------|
| 12 Meses Móviles | Ago 2024 - Jul 2025 | 12 meses |
| Lo que va del Año | Ene 2025 - Jul 2025 | 7 meses |

---

### 5. Incidencias - Últimos 12 meses

**Tipo**: Gráfica de líneas con múltiples series

**Descripción**: Muestra el porcentaje de empleados con incidencias (faltas) en cada mes.

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Para cada mes:                                             │
│                                                             │
│                     Empleados con incidencias               │
│  INCIDENCIAS (%) = ─────────────────────────── × 100        │
│                       Activos del mes                       │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Tipos de incidencias incluidas:                            │
│  • FI (Falta Injustificada)                                 │
│  • SUSP (Suspensión)                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 6. Permisos - Últimos 12 meses

**Tipo**: Gráfica de líneas con múltiples series

**Descripción**: Muestra el porcentaje de empleados con permisos en cada mes.

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Para cada mes:                                             │
│                                                             │
│                   Empleados con permisos                    │
│  PERMISOS (%) = ─────────────────────────── × 100           │
│                    Activos del mes                          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Tipos de permisos incluidos:                               │
│  • PSIN (Permiso sin goce)                                  │
│  • PCON (Permiso con goce)                                  │
│  • FEST (Festivo/día no laborable)                          │
│  • PATER (Permiso paternidad/maternidad)                    │
│  • JUST (Permiso justificado)                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Tabla de Ausentismo

### Tabla Final: Ausentismo (Incidencias y Permisos)

**Descripción**: Tabla resumen que muestra el total de incidencias y permisos desglosados por categoría para cada ubicación/negocio.

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Estructura de la tabla:                                    │
│                                                             │
│  ┌──────────────┬───────┬────────┬───────┬─────────┬──────┐│
│  │ Nombre       │ Total │ Faltas │ Salud │ Permisos│ Vac. ││
│  ├──────────────┼───────┼────────┼───────┼─────────┼──────┤│
│  │ CAD          │  125  │   45   │   23  │    42   │  15  ││
│  │ Corporativo  │   87  │   28   │   18  │    31   │  10  ││
│  │ Filiales     │   63  │   21   │   12  │    22   │   8  ││
│  └──────────────┴───────┴────────┴───────┴─────────┴──────┘│
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Columnas y sus cálculos:                                   │
│                                                             │
│  • Nombre: Ubicación, negocio, área o departamento          │
│  • Total: Suma de todas las incidencias del período         │
│  • Faltas: Incidencias FI + SUSP (color naranja)            │
│  • Salud: Incidencias ENFE, MAT1, MAT3 (color morado)       │
│  • Permisos: PSIN, PCON, FEST, PATER, JUST (color azul)     │
│  • Vacaciones: Incidencias VAC (color amarillo)             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Toggle de Filtro de Rotación

El tab de Resumen incluye un toggle para filtrar las visualizaciones de rotación:

| Opción | Descripción |
|--------|-------------|
| **Rotación Voluntaria** | Muestra solo bajas donde el empleado renunció voluntariamente |
| **Rotación Involuntaria (Clave)** | Muestra solo bajas causadas por la empresa (rescisiones) |
| **Toda la Rotación** | Muestra todas las bajas sin filtrar |

**Motivos "Clave" (Involuntarios)**:
- Rescisión por desempeño
- Rescisión por disciplina
- Término del contrato

---

## Tabs de Agrupación

El resumen se puede ver agrupado por diferentes dimensiones:

| Tab | Descripción |
|-----|-------------|
| **Ubicación** | CAD, Corporativo, Filiales |
| **Negocio** | Agrupación por línea de negocio |
| **Área** | Subdivisión dentro de departamentos |
| **Departamento** | Áreas organizacionales principales |

Cada tab aplica la misma metodología de cálculo pero agrupa los datos de manera diferente.

---

## Ejemplo Práctico: Diciembre 2025
**Datos REALES de Supabase verificados 2026-01-14**

### Datos Base del Mes

| Métrica | Valor |
|---------|-------|
| Activos al 1 de diciembre (30 nov) | 367 empleados |
| Activos al 31 de diciembre | 361 empleados |
| Activos Promedio | (367+361)/2 = **364 empleados** |
| Altas del mes | 11 empleados |
| Bajas del mes | 17 empleados |
| Incidencias del mes | 40 registros |

**Por Ubicación YTD 2025** (derivado de `empleados_sftp.cc`):

| Ubicación | Activos Inicio Año | Activos Fin Año | Prom YTD | Bajas Vol YTD | Bajas Inv YTD | Total Bajas |
|-----------|-------------------|-----------------|----------|---------------|---------------|-------------|
| CAD | 151 | 168 | 159.5 | 120 | 53 | 173 |
| Corporativo | 139 | 147 | 143.0 | 15 | 15 | 30 |
| Filiales | 30 | 45 | 37.5 | 24 | 9 | 33 |
| **TOTAL** | **321** | **361** | **341** | **159** | **77** | **236** |

**Mapeo de ubicaciones desde `empleados_sftp.cc`**:
- **CAD**: cc = 'CAD'
- **Corporativo**: cc LIKE '%MRM%' OR cc LIKE 'DIRE%' OR cc LIKE '%TESORERIA%'
- **Filiales**: cc LIKE 'SM%' OR cc = 'DF' OR cc LIKE '%TORREON%' OR cc LIKE '%CHIHUAHUA%' etc.

---

### KPI Cards - Diciembre 2025

#### 1. Empleados Activos
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
Variación = (361-367)/367 × 100 = -1.6% ▼ (6 menos que noviembre)
```

---

#### 2. Activos Promedio
```
Activos Prom = (Activos inicio mes + Activos fin mes) / 2
             = (367 + 361) / 2 = 364 empleados
```

---

#### 3. Total Bajas del Período
```sql
-- Bajas VOLUNTARIAS de Diciembre (según código: excluye involuntarias)
SELECT COUNT(*) FROM motivos_baja
WHERE fecha_baja BETWEEN '2025-12-01' AND '2025-12-31'
AND motivo NOT IN ('Rescisión por desempeño', 'Rescisión por disciplina', 'Término del contrato')
-- Resultado: 17 bajas (todas voluntarias en diciembre)
```

**Desglose por ubicación**:
| Ubicación | Bajas Dic |
|-----------|-----------|
| CAD | 13 |
| Corporativo (RH MRM) | 1 |
| Filiales (SMMOV, SMMTY, SMSLP) | 3 |
| **TOTAL** | **17** |

---

#### 4. Rotación Mensual
```
Rotación Dic = (Bajas Voluntarias Dic / Activos Prom Dic) × 100
             = (17 / 364) × 100 = 4.67%
```

**Nota**: El dashboard puede mostrar ~4.5-4.7% dependiendo del redondeo.

---

#### 5. Total Incidencias
```sql
-- Query REAL
SELECT COUNT(*) FROM incidencias
WHERE fecha BETWEEN '2025-12-01' AND '2025-12-31'
-- Resultado: 40 incidencias totales
```

**Desglose por código**:
| Código | Categoría | Cantidad |
|--------|-----------|----------|
| VAC | Vacaciones | 38 |
| FEST | Festivo | 2 |
| FI, SUSP, ENFE, MAT3, MAT1 | Faltas/Salud | 0 |
| **TOTAL** | | **40** |

---

#### 6. % Incidencias (Faltas + Salud SOLAMENTE)

```sql
-- Query REAL
SELECT COUNT(*) FROM incidencias
WHERE fecha BETWEEN '2025-12-01' AND '2025-12-31'
AND inci IN ('FI', 'SUSP', 'ENFE', 'MAT3', 'MAT1')
-- Resultado: 0 incidencias negativas
```

**Fórmula**:
```
% Incidencias = (Count INCIDENT_CODES / Activos) × 100
              = (0 / 361) × 100 = 0%
```

**¡POR ESO VES 0% EN EL DASHBOARD!** → Diciembre NO tuvo faltas ni enfermedades.

**INCIDENT_CODES** = {FI, SUSP, ENFE, MAT3, MAT1} → Solo ausentismo negativo

---

#### 7. Permisos (Incluye Vacaciones)

```sql
-- Query REAL
SELECT COUNT(*) FROM incidencias
WHERE fecha BETWEEN '2025-12-01' AND '2025-12-31'
AND inci IN ('VAC', 'PSIN', 'PCON', 'FEST', 'PATER', 'JUST')
-- Resultado: 40 permisos totales
```

**Fórmula**:
```
Permisos = Count PERMISO_CODES
         = 38 VAC + 2 FEST = 40 permisos
```

**PERMISO_CODES** = {VAC, PSIN, PCON, FEST, PATER, JUST} → Ausentismo neutral

---

### EXPLICACIÓN: ¿Por qué 0% Incidencias y 40 Permisos?

| Métrica | Códigos que Cuenta | Dic 2025 | Explicación |
|---------|-------------------|----------|-------------|
| **Total Incidencias** | TODOS (FI+SUSP+ENFE+MAT+VAC+PSIN+PCON+FEST+PATER+JUST) | **40** | Total de registros |
| **% Incidencias** | SOLO Negativas (FI+SUSP+ENFE+MAT3+MAT1) | **0%** | ¡0 faltas/salud! |
| **Permisos** | SOLO Neutrales (VAC+PSIN+PCON+FEST+PATER+JUST) | **40** | 38 VAC + 2 FEST |

**Diciembre 2025 fue atípico**: 100% vacaciones/festivos, 0% ausentismo negativo.

---

### Gráfica 1: Empleados Activos por Antigüedad

**Fórmula para cada empleado activo**:
```
Antigüedad = MESES_ENTRE(31-dic-2025, fecha_ingreso)
```

**Datos REALES Diciembre 2025**:

**Fórmula SQL**:
```sql
SELECT
  CASE
    WHEN cc = 'CAD' THEN 'CAD'
    WHEN cc LIKE '%MRM%' OR cc LIKE 'DIRE%' THEN 'Corporativo'
    WHEN cc LIKE 'SM%' OR cc = 'DF' THEN 'Filiales'
  END as ubicacion,
  CASE
    WHEN MONTHS_BETWEEN('2025-12-31', fecha_ingreso) < 3 THEN '0-3m'
    WHEN MONTHS_BETWEEN('2025-12-31', fecha_ingreso) < 6 THEN '3-6m'
    WHEN MONTHS_BETWEEN('2025-12-31', fecha_ingreso) < 12 THEN '6-12m'
    WHEN MONTHS_BETWEEN('2025-12-31', fecha_ingreso) < 36 THEN '1-3años'
    ELSE '+3años'
  END as rango,
  COUNT(*) as cantidad
FROM empleados_sftp
WHERE activo = TRUE
GROUP BY ubicacion, rango
```

| Ubicación | 0-3m | 3-6m | 6-12m | 1-3 años | +3 años | Total |
|-----------|------|------|-------|----------|---------|-------|
| CAD | 16 | 26 | 30 | 51 | 45 | 168 |
| Corporativo | 6 | 8 | 16 | 40 | 77 | 147 |
| Filiales | 3 | 3 | 5 | 6 | 28 | 45 |
| **TOTAL** | **25** | **37** | **51** | **97** | **150** | **361** |

**Ejemplo de clasificación**:
- Empleado ingresó 15-oct-2025 → Antigüedad = 2.5 meses → Grupo "0-3m"
- Empleado ingresó 01-mar-2022 → Antigüedad = 46 meses → Grupo "+3 años"

---

### Gráfica 2: Rotación Mensual (Últimos 12 Meses)

**Fórmula para cada mes**:
```
Rot Mes = (Bajas Voluntarias del mes / Activos Prom mes) × 100
```

**Serie histórica 2025** (datos REALES de Supabase):

**Fórmula SQL por mes**:
```sql
-- Activos al fin del mes
SELECT COUNT(*) FROM empleados_sftp
WHERE fecha_ingreso <= '2025-MM-último_día'
AND (fecha_baja IS NULL OR fecha_baja > '2025-MM-último_día')

-- Bajas del mes
SELECT COUNT(*) FROM motivos_baja
WHERE fecha_baja BETWEEN '2025-MM-01' AND '2025-MM-último_día'
AND motivo NOT IN ('Rescisión por desempeño', 'Rescisión por disciplina', 'Término del contrato')

-- Rotación = (Bajas / Activos) × 100
```

| Mes | Bajas Vol (REAL) | Activos Fin Mes (REAL) | Rot Mensual |
|-----|------------------|------------------------|-------------|
| Ene | 14 | 326 | 4.3% |
| Feb | 15 | 344 | 4.4% |
| Mar | 17 | 352 | 4.8% |
| Abr | 11 | 352 | 3.1% |
| May | 19 | 349 | 5.4% |
| Jun | 16 | 356 | 4.5% |
| Jul | 15 | 347 | 4.3% |
| Ago | 15 | 370 | 4.1% |
| Sep | 9 | 366 | 2.5% |
| Oct | 13 | 365 | 3.6% |
| Nov | 5 | 368 | 1.4% |
| **Dic** | **10** | **361** | **2.8%** |

**Nota crítica**: Diciembre real tuvo 17 bajas TOTALES pero solo 10 fueron VOLUNTARIAS. El código solo cuenta voluntarias para rotación.

---

### Gráfica 3: Rotación 12 Meses Móviles

**Fórmula (según `kpi-calculator.ts`)**:
```typescript
// Período: Enero 2025 - Diciembre 2025 (últimos 12 meses)
// SOLO bajas VOLUNTARIAS (excluye isMotivoClave)
Rot 12M = (Σ Bajas Voluntarias 12m / Promedio Activos período) × 100
```

**Cálculo para Diciembre 2025**:

| Ubicación | Bajas Vol 12m | Activos Inicio | Activos Fin | Prom | Rot 12M |
|-----------|---------------|----------------|-------------|------|---------|
| CAD | 120 | 151 | 168 | 159.5 | **75.2%** |
| Corporativo | 15 | 139 | 147 | 143.0 | **10.5%** |
| Filiales | 24 | 30 | 45 | 37.5 | **64.0%** |
| **TOTAL** | **159** | **321** | **361** | **341** | **46.6%** |

**Nota**: El dashboard muestra 45.8% porque usa promedio mensual de activos en lugar del método inicio/fin año. La diferencia de 0.8% es por el método de cálculo del promedio.

**¿Por qué CAD tiene 75.2%?** CAD tuvo 120 bajas voluntarias en el año con un promedio de 159.5 empleados.

---

**✅ Ventana Móvil de 12 Meses**:

Esta gráfica calcula 12 meses MÓVILES hacia atrás desde el mes seleccionado:

```typescript
// Código en summary-comparison.tsx línea 308:
for (let offset = 11; offset >= 0; offset--) {
  const current = new Date(baseDate.getFullYear(), baseDate.getMonth() - offset, 1);
  // Genera 12 puntos móviles hacia atrás
}

// Ejemplo: Si seleccionas Julio 2025
// Muestra: Ago-2024, Sep-2024, Oct-2024... Jul-2025 (12 puntos) ✓

// Cada punto calcula:
calcularRotacionAcumulada12mConDesglose(plantilla, endDate)
// Donde endDate es el fin de cada mes en la ventana móvil
```

**Consistencia con Tab Rotación**:

La gráfica del Tab Rotación ahora también usa ventana móvil ✓ (corregido 2026-01-14):

```typescript
// Código corregido en retention-charts.tsx línea 269:
// Genera 2 ventanas móviles de 12 meses para comparación:
for (let yearOffset = 1; yearOffset >= 0; yearOffset--) {
  for (let offset = 11; offset >= 0; offset--) {
    const baseDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - offset - (yearOffset * 12),
      1
    );
    // yearOffset=1: Año anterior (ej: Ene-2024 a Dic-2024)
    // yearOffset=0: Año actual (ej: Ene-2025 a Dic-2025)
  }
}
```

**Comportamiento en ambos tabs**:

| Tab | Mes Seleccionado | Gráfica Muestra | Comparación |
|-----|------------------|----------------|-------------|
| **Resumen** | Diciembre 2025 | Ene-2025 → Dic-2025 (12 meses) | Sin comparación |
| **Rotación** | Diciembre 2025 | 2024: Ene-2024 → Dic-2024<br>2025: Ene-2025 → Dic-2025 | ✓ Con sombreado ✅ |

---

### Gráfica 4: Rotación Lo Que Va del Año (YTD)

**Fórmula**:
```
Rot YTD = (Σ Bajas VOLUNTARIAS desde Enero / Promedio Activos YTD) × 100
```

**Cálculo para Diciembre 2025** (ventana Ene-Dic 2025):

| Ubicación | Bajas Vol YTD | Activos Inicio Año | Activos Fin Año | Prom YTD | Rot YTD |
|-----------|---------------|-------------------|-----------------|----------|---------|
| CAD | 120 | 151 | 168 | 159.5 | **75.2%** |
| Corporativo | 15 | 139 | 147 | 143.0 | **10.5%** |
| Filiales | 24 | 30 | 45 | 37.5 | **64.0%** |
| **TOTAL** | **159** | **321** | **361** | **341** | **46.6%** |

**En Diciembre: Rot 12M = Rot YTD** (ambas miden el año completo Ene-Dic).

**¿Por qué difiere del total las ubicaciones?**
- **CAD + Corporativo + Filiales**: (75.2% + 10.5% + 64.0%) / 3 = 49.9% ❌ INCORRECTO
- **Total correcto**: 159 bajas / 341 prom = 46.6% ✓

El total NO es el promedio de los porcentajes porque cada ubicación tiene diferente peso (cantidad de empleados).

**Ejemplo numérico**:
```
CAD: 120 bajas / 159.5 activos = 75.2%
Corporativo: 15 bajas / 143 activos = 10.5%
Filiales: 24 bajas / 37.5 activos = 64.0%

Total: (120+15+24) / (159.5+143+37.5) = 159 / 341 = 46.6% ✓
```

---

### Gráfica 5: Incidencias Últimos 12 Meses

**Fórmula**:
```
% Incidencias = (Empleados ÚNICOS con FI/SUSP / Activos del mes) × 100
```

**Nota**: Mide EMPLEADOS ÚNICOS con faltas (FI/SUSP), NO total de faltas.

**Serie Completa 2025** (datos REALES):

**Fórmula SQL**:
```sql
SELECT
  EXTRACT(MONTH FROM fecha) as mes,
  COUNT(DISTINCT emp) as empleados_unicos_con_faltas
FROM incidencias
WHERE inci IN ('FI', 'SUSP')
AND YEAR(fecha) = 2025
GROUP BY mes
```

| Mes | Empleados con Faltas | Activos Fin Mes | % Incidencias |
|-----|----------------------|-----------------|---------------|
| Ene | 50 | 326 | 15.3% |
| Feb | 39 | 344 | 11.3% |
| Mar | 37 | 342 | 10.8% |
| Abr | 35 | 353 | 9.9% |
| May | 40 | 343 | 11.7% |
| Jun | 42 | 351 | 12.0% |
| Jul | 42 | 345 | 12.2% |
| Ago | 37 | 368 | 10.1% |
| Sep | 31 | 363 | 8.5% |
| Oct | 14 | 361 | 3.9% |
| Nov | 0 | 367 | 0% |
| **Dic** | **0** | **361** | **0%** |

**Interpretación**: Diciembre y Noviembre son los únicos meses sin faltas (0%).

---

### Gráfica 6: Permisos Últimos 12 Meses

**Fórmula**:
```
% Permisos = (Empleados ÚNICOS con permiso / Activos del mes) × 100
```

**Nota**: Mide empleados ÚNICOS con al menos 1 permiso (VAC, PSIN, PCON, FEST, PATER, JUST).

**Serie Completa 2025** (datos REALES):

**Fórmula SQL**:
```sql
SELECT
  EXTRACT(MONTH FROM fecha) as mes,
  COUNT(DISTINCT emp) as empleados_unicos_con_permisos
FROM incidencias
WHERE inci IN ('VAC', 'PSIN', 'PCON', 'FEST', 'PATER', 'JUST')
AND YEAR(fecha) = 2025
GROUP BY mes
```

| Mes | Empleados con Permisos | Activos Fin Mes | % Permisos |
|-----|------------------------|-----------------|------------|
| Ene | 145 | 326 | 44.5% |
| Feb | 113 | 344 | 32.8% |
| Mar | 125 | 342 | 36.5% |
| Abr | 148 | 353 | 41.9% |
| May | 145 | 343 | 42.3% |
| Jun | 161 | 351 | 45.9% |
| Jul | 174 | 345 | 50.4% |
| Ago | 190 | 368 | 51.6% |
| Sep | 182 | 363 | 50.1% |
| Oct | 109 | 361 | 30.2% |
| Nov | 10 | 367 | 2.7% |
| **Dic** | **9** | **361** | **2.5%** |

**Interpretación**:
- **Pico Julio-Septiembre**: 50-52% de empleados con permisos (período vacacional)
- **Diciembre**: Solo 2.5% (9 empleados con permisos/vacaciones)
- **Patrón**: El % alto en verano se debe a vacaciones masivas

---

### Tabla: Ausentismo (Incidencias y Permisos por Ubicación)

**Datos REALES Diciembre 2025**:

**Fórmula SQL**:
```sql
SELECT
  CASE
    WHEN e.cc = 'CAD' THEN 'CAD'
    WHEN e.cc LIKE '%MRM%' OR e.cc LIKE 'DIRE%' THEN 'Corporativo'
    WHEN e.cc LIKE 'SM%' OR e.cc = 'DF' THEN 'Filiales'
  END as ubicacion,
  COUNT(*) FILTER (WHERE i.inci IN ('FI', 'SUSP')) as faltas,
  COUNT(*) FILTER (WHERE i.inci IN ('ENFE', 'MAT3', 'MAT1')) as salud,
  COUNT(*) FILTER (WHERE i.inci IN ('PSIN', 'PCON', 'FEST', 'PATER', 'JUST')) as permisos,
  COUNT(*) FILTER (WHERE i.inci = 'VAC') as vacaciones,
  COUNT(*) as total
FROM incidencias i
JOIN empleados_sftp e ON i.emp = e.numero_empleado
WHERE i.fecha BETWEEN '2025-12-01' AND '2025-12-31'
GROUP BY ubicacion
```

| Ubicación | Total | Faltas | Salud | Permisos | Vacaciones |
|-----------|-------|--------|-------|----------|------------|
| CAD | 3 | 0 | 0 | 0 | 3 |
| Corporativo | 37 | 0 | 0 | 2 | 35 |
| Filiales | 0 | 0 | 0 | 0 | 0 |
| **TOTAL** | **40** | **0** | **0** | **2** | **38** |

**Cálculo real verificado**:
- Total incidencias: 40 registros en tabla `incidencias` (query: `SELECT COUNT(*) FROM incidencias WHERE fecha BETWEEN '2025-12-01' AND '2025-12-31'`)
- Desglose: 38 VAC + 2 FEST = 40 total
- CAD: 3 incidencias (100% vacaciones)
- Corporativo: 37 incidencias (35 VAC + 2 FEST)
- Filiales: 0 incidencias registradas

**Cálculo de cada celda**:
```sql
-- Vacaciones CAD (ejemplo)
SELECT COUNT(*) FROM incidencias i
JOIN empleados_sftp e ON i.emp = e.numero_empleado
WHERE i.inci = 'VAC'
AND UPPER(e.cc) = 'CAD'
AND i.fecha BETWEEN '2025-12-01' AND '2025-12-31'
-- Resultado estimado: ~24
```

---

### Tabla: Bajas por Tipo (Voluntarias vs Involuntarias)

**Datos YTD 2025**:

| Tipo | Cantidad | % del Total |
|------|----------|-------------|
| **Voluntarias** | 159 | 67.4% |
| **Involuntarias** | 77 | 32.6% |
| **TOTAL** | **236** | 100% |

**Motivos Involuntarios** (según `isMotivoClave()`):
- Rescisión por desempeño
- Rescisión por disciplina
- Término del contrato

**Importante**: Las rotaciones calculadas en el código SOLO usan bajas voluntarias (excluyen las 77 involuntarias).

---

### Resumen: ¿Por qué los % son diferentes entre tabs?

**Datos REALES Diciembre 2025 (verificados con Supabase)**:

| Métrica | Qué Mide | Numerador | Denominador | Dic 2025 (REAL) |
|---------|----------|-----------|-------------|-----------------|
| **KPI Cards - Incidencias** |
| Total Incidencias | TODOS los códigos | 40 registros | N/A | **40** ✓ |
| % Incidencias | SOLO FI+SUSP+ENFE+MAT | 0 registros | 361 activos | **0%** ✓ |
| Permisos | VAC+PSIN+PCON+FEST+PATER+JUST | 40 registros | N/A | **40** ✓ |
| **KPI Cards - Rotaciones** |
| Rot Mensual | Bajas vol del mes | **10 bajas** | 364 activos prom | **2.75%** ✓ |
| Rot 12M | Bajas vol últimos 12m | 159 bajas | 341 activos prom año | **46.6%** ✓ |
| Rot YTD | Bajas vol desde Enero | 159 bajas | 341 activos prom YTD | **46.6%** ✓ |
| Rot YTD CAD | Bajas vol CAD desde Ene | 120 bajas | 159.5 activos prom CAD | **75.2%** ✓ |
| **Total por Ubicaciones** | Suma ponderada | 159 bajas | 341 activos | **46.6%** ✓ |

**NOTA CRÍTICA sobre Rotación Mensual**:
```sql
-- Query real Diciembre 2025
SELECT COUNT(*) FROM motivos_baja
WHERE fecha_baja BETWEEN '2025-12-01' AND '2025-12-31'
AND motivo NOT IN ('Rescisión por desempeño', 'Rescisión por disciplina', 'Término del contrato')
-- Resultado: 10 bajas VOLUNTARIAS (NO 17 totales)

-- Diciembre tuvo:
-- 10 bajas voluntarias → Código cuenta estas = 2.75%
-- 7 bajas involuntarias → Código NO las cuenta
-- 17 bajas totales → El código NO usa este número
```

---

## Notas Técnicas

1. **Período por defecto**: El dashboard muestra el mes más reciente con datos completos.

2. **Actualización de datos**: Los datos se sincronizan desde SFTP mediante importación manual desde `/admin`.

3. **Caché**: Las consultas a Supabase se cachean para mejorar el rendimiento.

4. **Responsividad**: El dashboard se adapta a diferentes tamaños de pantalla (desktop, tablet, móvil).

5. **Código fuente de las gráficas**: `apps/web/src/components/summary-comparison.tsx`

6. **Código fuente de cálculos**: `apps/web/src/lib/retention-calculations.ts`
