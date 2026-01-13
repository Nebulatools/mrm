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

## Notas Técnicas

1. **Empleados activos**: Solo se consideran empleados con `fecha_baja = NULL`.

2. **Filtros aplicados**: Todos los cálculos respetan los filtros seleccionados (departamento, puesto, año, etc.).

3. **Antigüedad**: Se calcula en meses desde `fecha_ingreso` hasta la fecha actual o de referencia.

4. **Edad**: Se calcula desde `fecha_nacimiento` si está disponible en los datos.
