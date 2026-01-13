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

**Definición**: Número total de incidencias registradas en el período (todas las categorías).

**Fórmula Visual**:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  INCIDENCIAS = Σ registros en incidencias       │
│                donde fecha ENTRE                │
│                      inicio_período Y           │
│                      fin_período                │
│                                                 │
│  ────────────────────────────────────────────── │
│                                                 │
│  Incluye:                                       │
│  • Faltas (FI, SUSP)                           │
│  • Salud (ENFE, MAT3, MAT1)                    │
│  • Permisos (PSIN, PCON, FEST, PATER, JUST)    │
│  • Vacaciones (VAC)                             │
│                                                 │
└─────────────────────────────────────────────────┘
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

## Notas Técnicas

1. **Período por defecto**: El dashboard muestra el mes más reciente con datos completos.

2. **Actualización de datos**: Los datos se sincronizan desde SFTP mediante importación manual desde `/admin`.

3. **Caché**: Las consultas a Supabase se cachean para mejorar el rendimiento.

4. **Responsividad**: El dashboard se adapta a diferentes tamaños de pantalla (desktop, tablet, móvil).

5. **Código fuente de las gráficas**: `apps/web/src/components/summary-comparison.tsx`

6. **Código fuente de cálculos**: `apps/web/src/lib/retention-calculations.ts`
