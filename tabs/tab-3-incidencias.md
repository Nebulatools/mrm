# Tab 3: Incidencias (Incidents)

## Descripción General

El tab de **Incidencias** presenta un análisis detallado de las ausencias, permisos y faltas de los empleados. Agrupa los datos en 4 categorías principales y proporciona métricas de ausentismo.

---

## Fuentes de Datos

| Tabla Supabase | Campos Usados | Propósito |
|----------------|---------------|-----------|
| `incidencias` | emp, fecha, inci (código), descripcion | Registro diario de incidencias |
| `empleados_sftp` | numero_empleado, departamento, puesto, area | Para cruzar y filtrar empleados |

---

## Relaciones entre Tablas

| Tabla Origen | Columna Clave | Tabla Destino | Columna Clave |
|--------------|---------------|---------------|---------------|
| `empleados_sftp` | `numero_empleado` (PK) | `incidencias` | `emp` (FK) |

### Diagrama de Relaciones

```
empleados_sftp.numero_empleado ←── incidencias.emp
```

### JOIN utilizado

```sql
SELECT e.departamento, COUNT(i.*)
FROM incidencias i
JOIN empleados_sftp e ON i.emp = e.numero_empleado
WHERE i.fecha BETWEEN inicio AND fin
GROUP BY e.departamento
```

---

## Categorías de Incidencias

El sistema agrupa todos los códigos de incidencia en 4 categorías principales:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  AUSENTISMOS = FALTAS + SALUD + PERMISOS + VACACIONES       │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  1. FALTAS                                                  │
│     ├── FI    = Falta Injustificada                         │
│     └── SUSP  = Suspensión                                  │
│                                                             │
│  2. SALUD                                                   │
│     ├── ENFE  = Enfermedad                                  │
│     ├── MAT3  = Permiso Maternal (3 meses)                  │
│     └── MAT1  = Permiso Maternal (1 mes)                    │
│                                                             │
│  3. PERMISOS (sin vacaciones)                               │
│     ├── PSIN  = Permiso Sin Goce de Sueldo                  │
│     ├── PCON  = Permiso Con Goce de Sueldo                  │
│     ├── FEST  = Día Festivo                                 │
│     ├── PATER = Permiso Paternal                            │
│     └── JUST  = Justificación                               │
│                                                             │
│  4. VACACIONES                                              │
│     └── VAC   = Vacaciones                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Nota Importante**: La categoría "PERMISOS" en el dashboard **NO incluye** vacaciones. Las vacaciones se muestran por separado.

---

## KPI Cards de Incidencias

### 1. Total Incidencias (Ausentismos)

**Definición**: Suma total de todas las incidencias del período.

**Fórmula Visual**:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  TOTAL INCIDENCIAS = FALTAS + SALUD + PERMISOS + VACACIONES │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Ejemplo (Enero 2025):                                      │
│  • Faltas: 45                                               │
│  • Salud: 120                                               │
│  • Permisos: 85                                             │
│  • Vacaciones: 250                                          │
│  • TOTAL: 500 incidencias                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. Días Laborados (Jornadas)

**Definición**: Estimación de días-hombre laborables en el período.

**Fórmula Visual**:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                      Activos                                │
│  DÍAS LABORADOS = ─────────── × 6                           │
│                        7                                    │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Donde:                                                     │
│  • Activos = empleados activos en el período                │
│  • 7 = días de la semana                                    │
│  • 6 = días laborables por semana                           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Ejemplo:                                                   │
│  • Activos en enero: 365 empleados                          │
│                                                             │
│                  365                                        │
│  Días Laborados = ─── × 6 = 313 días                        │
│                   7                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. Incidencias por Empleado

**Definición**: Promedio de incidencias por empleado activo.

**Fórmula Visual**:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                           Total Incidencias                 │
│  INC POR EMPLEADO = ───────────────────────                 │
│                         Activos Promedio                    │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Ejemplo:                                                   │
│  • Total incidencias: 500                                   │
│  • Activos promedio: 365                                    │
│                                                             │
│                    500                                      │
│  Inc/Empleado = ─────── = 1.37 incidencias                  │
│                   365                                       │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Rangos esperados:                                          │
│  ┌──────────────┬────────────────────────┐                 │
│  │ 0.0 - 0.5    │ Excelente              │                 │
│  │ 0.5 - 1.0    │ Bueno                  │                 │
│  │ 1.0 - 2.0    │ Moderado (atención)    │                 │
│  │ > 2.0        │ Alto (crítico)         │                 │
│  └──────────────┴────────────────────────┘                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 4. Porcentaje de Incidencias

**Definición**: Tasa de incidencias respecto a días laborados.

**Fórmula Visual**:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                       Total Incidencias                     │
│  % INCIDENCIAS = ────────────────────────── × 100           │
│                       Días Laborados                        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Ejemplo:                                                   │
│  • Total incidencias: 500                                   │
│  • Días laborados: 313                                      │
│                                                             │
│                   500                                       │
│  % Incidencias = ───── × 100 = 159.7%                       │
│                   313                                       │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  NOTA: Este porcentaje puede superar 100% si hay más        │
│  incidencias que días laborados estimados (ej: si hay       │
│  muchas vacaciones acumuladas)                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Gráficas del Tab Incidencias

### 1. Incidencias por Categoría

**Tipo**: Gráfica de barras

**Cálculo**:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Para cada categoría (FALTAS, SALUD, PERMISOS, VACACIONES): │
│                                                             │
│  TOTAL_CATEGORÍA = COUNT(incidencias)                       │
│                    WHERE código IN (códigos_categoría)      │
│                    AND fecha BETWEEN inicio AND fin         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Visualización:                                             │
│                                                             │
│  VACACIONES  ██████████████████████████████████████  250   │
│  SALUD       ██████████████████                     120   │
│  PERMISOS    ████████████                            85   │
│  FALTAS      ███████                                 45   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. Incidencias por Mes

**Tipo**: Gráfica de líneas o barras

**Cálculo**:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Para cada mes del año:                                     │
│                                                             │
│  INCIDENCIAS_MES = COUNT(incidencias)                       │
│                    WHERE MONTH(fecha) = mes                 │
│                    AND YEAR(fecha) = año_seleccionado       │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Tendencia mensual:                                         │
│                                                             │
│  │      •                                                   │
│  │    • • •    •                                            │
│  │  •      •  • •                                           │
│  │ •        ••   •  •                                       │
│  │•              ••  •                                      │
│  └──────────────────────────────────────────────────►       │
│    E  F  M  A  M  J  J  A  S  O  N  D                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. Incidencias por Departamento

**Tipo**: Gráfica de barras horizontales

**Cálculo**:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Para cada departamento:                                    │
│                                                             │
│  1. Identificar empleados del departamento                  │
│  2. Contar incidencias de esos empleados                    │
│                                                             │
│  INCIDENCIAS_DEPTO = COUNT(incidencias)                     │
│                      WHERE emp IN (empleados_depto)         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Operaciones y Logística  ██████████████████████████  450   │
│  Filiales                 ██████                      78   │
│  Recursos Humanos         ███                         35   │
│  Ventas                   ██                          28   │
│  ...                                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Tabla de Ausentismo por Mes

### Estructura de la Tabla

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌──────────────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐  │
│  │ Motivo       │ ENE  │ FEB  │ MAR  │ ABR  │ MAY  │ JUN  │ ...  │ DIC  │  │
│  ├──────────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤  │
│  │ JORNADAS     │ 313  │ 285  │ 310  │ 300  │ 320  │ 305  │ ...  │ 290  │  │
│  ├──────────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤  │
│  │ VACACIONES   │  45  │  38  │  52  │  48  │  55  │  60  │ ...  │  75  │  │
│  │ FALTAS       │   8  │   6  │   5  │   7  │   4  │   9  │ ...  │   5  │  │
│  │ SALUD        │  15  │  12  │  18  │  14  │  10  │  11  │ ...  │  20  │  │
│  │ PERMISOS     │  12  │  10  │   8  │  11  │  13  │   9  │ ...  │  15  │  │
│  ├──────────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤  │
│  │ TOTAL        │  80  │  66  │  83  │  80  │  82  │  89  │ ...  │ 115  │  │
│  └──────────────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Cálculo de Jornadas por Mes

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Para cada mes:                                             │
│                                                             │
│  1. Determinar inicio y fin del mes                         │
│  2. Contar empleados activos en ese período                 │
│  3. Aplicar fórmula de jornadas                             │
│                                                             │
│                      Activos en Mes                         │
│  JORNADAS_MES = ─────────────────────── × 6                 │
│                          7                                  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Empleado está activo en el mes si:                         │
│  • fecha_ingreso ≤ fin_mes                                  │
│  • Y (fecha_baja IS NULL O fecha_baja ≥ inicio_mes)         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Modo de Visualización: Número vs Porcentaje

La tabla permite alternar entre dos modos:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  MODO NÚMERO:                                               │
│  Muestra conteo absoluto de incidencias                     │
│  Ejemplo: FALTAS = 8                                        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  MODO PORCENTAJE:                                           │
│                                                             │
│                      Incidencias del Tipo                   │
│  % INCIDENCIA = ──────────────────────────── × 100          │
│                       Jornadas del Mes                      │
│                                                             │
│  Ejemplo:                                                   │
│  • Faltas en enero: 8                                       │
│  • Jornadas enero: 313                                      │
│                                                             │
│         8                                                   │
│  % = ─────── × 100 = 2.6%                                   │
│        313                                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Cálculo de Variaciones

Para cada KPI de incidencias:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  VARIACIÓN = Incidencias Período Actual                     │
│            - Incidencias Período Anterior                   │
│                                                             │
│                         Incidencias Actual - Anterior       │
│  % VARIACIÓN = ────────────────────────────────────── × 100 │
│                         Incidencias Anterior                │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Interpretación de colores:                                 │
│                                                             │
│  Para INCIDENCIAS (menos es mejor):                         │
│  • Verde (-) = Menos incidencias = MEJORA                   │
│  • Rojo (+)  = Más incidencias = EMPEORA                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Códigos de Incidencia Detallados

| Código | Nombre Completo | Categoría | Impacto |
|--------|-----------------|-----------|---------|
| FI | Falta Injustificada | FALTAS | Negativo |
| SUSP | Suspensión | FALTAS | Negativo |
| ENFE | Enfermedad | SALUD | Neutro |
| MAT3 | Maternal (3 meses) | SALUD | Neutro |
| MAT1 | Maternal (1 mes) | SALUD | Neutro |
| PSIN | Permiso Sin Goce | PERMISOS | Neutro |
| PCON | Permiso Con Goce | PERMISOS | Neutro |
| FEST | Día Festivo | PERMISOS | Neutro |
| PATER | Permiso Paternal | PERMISOS | Neutro |
| JUST | Justificación | PERMISOS | Neutro |
| VAC | Vacaciones | VACACIONES | Neutro |

---

## Filtros Aplicables

Los datos de incidencias se filtran según:

| Filtro | Efecto |
|--------|--------|
| **Año** | Limita incidencias al año seleccionado |
| **Mes** | Limita incidencias al mes específico |
| **Departamento** | Solo incidencias de empleados del departamento |
| **Puesto** | Solo incidencias de empleados con ese puesto |
| **Área** | Filtrado por área organizacional |

---

## Notas Técnicas

1. **Cruce de datos**: Las incidencias se cruzan con `empleados_sftp` usando el campo `emp` (número de empleado).

2. **Normalización de códigos**: Los códigos de incidencia se normalizan automáticamente (ej: "VAC", "vac", "Vac" → "VAC").

3. **Fechas**: El campo `fecha` en incidencias determina a qué período pertenece cada registro.

4. **Empleados activos**: Solo se consideran incidencias de empleados que existen en la plantilla filtrada.
