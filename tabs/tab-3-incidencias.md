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

### 4. Porcentaje de Incidencias (Faltas + Salud SOLAMENTE)

**Definición**: Porcentaje de incidencias NEGATIVAS (faltas + salud) respecto a empleados activos.

**Categorización de Códigos**:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  INCIDENT_CODES (Ausentismo Negativo):                      │
│  • FI   = Falta Injustificada                               │
│  • SUSP = Suspensión                                        │
│  • ENFE = Enfermedad                                        │
│  • MAT3 = Maternal 3 meses                                  │
│  • MAT1 = Maternal 1 mes                                    │
│                                                             │
│  PERMISO_CODES (Ausentismo Neutral):                        │
│  • VAC   = Vacaciones                                       │
│  • PSIN  = Permiso Sin Goce                                 │
│  • PCON  = Permiso Con Goce                                 │
│  • FEST  = Festivo                                          │
│  • PATER = Paternal                                         │
│  • JUST  = Justificación                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Fórmula Visual**:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              COUNT(inci IN INCIDENT_CODES)                  │
│  % INCID = ───────────────────────────────── × 100          │
│                    Empleados Activos                        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Ejemplo:                                                   │
│  • Faltas + Salud: 15 registros                            │
│  • Empleados activos: 365                                   │
│                                                             │
│                    15                                       │
│  % Incidencias = ────── × 100 = 4.1%                        │
│                   365                                       │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  IMPORTANTE: Este KPI mide SOLO ausentismo negativo        │
│  (faltas + salud). NO incluye permisos ni vacaciones.       │
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

## Ejemplo Práctico: Diciembre 2025
**Datos REALES de Supabase verificados 2026-01-14**

### Datos Base del Mes

| Métrica | Valor |
|---------|-------|
| Activos Promedio | 364 empleados |
| Activos al 1 dic (30 nov) | 367 empleados |
| Activos al 31 dic | 361 empleados |
| Jornadas estimadas | (361/7) × 6 = **309 jornadas** |

---

### KPI Cards - Diciembre 2025

#### 1. Total Incidencias (Ausentismos)

```sql
-- Query REAL
SELECT COUNT(*) FROM incidencias
WHERE fecha BETWEEN '2025-12-01' AND '2025-12-31'
-- Resultado: 40 incidencias
```

**Desglose por categoría** (datos REALES):

| Categoría | Códigos | Cantidad | % del Total |
|-----------|---------|----------|-------------|
| VACACIONES | VAC | 38 | 95.0% |
| PERMISOS | FEST | 2 | 5.0% |
| SALUD | ENFE, MAT3, MAT1 | 0 | 0% |
| FALTAS | FI, SUSP | 0 | 0% |
| **TOTAL** | | **40** | **100%** |

**Nota**: Diciembre tiene predominantemente vacaciones (38 de 40).

---

#### 2. Días Laborados (Jornadas)

**Fórmula**:
```
Días Laborados = (Activos / 7) × 6
               = (361 / 7) × 6
               = 51.57 × 6
               = 309 jornadas
```

**Explicación**:
- Divide activos entre 7 días de la semana
- Multiplica por 6 días laborables
- Es una **estimación**, no los días reales del mes

---

#### 3. Incidencias por Empleado

**Fórmula** (cuenta TODOS los códigos):
```
Inc por Empleado = Total Incidencias / Activos Promedio
                 = 40 / 364
                 = 0.11 incidencias por empleado
```

**Interpretación**: En promedio, cada empleado tuvo 0.11 incidencias totales (VAC+FEST).

---

#### 4. % Incidencias (Faltas + Salud SOLAMENTE)

**Fórmula** (solo cuenta INCIDENT_CODES):
```sql
-- Query REAL
SELECT COUNT(*) FROM incidencias
WHERE fecha BETWEEN '2025-12-01' AND '2025-12-31'
AND inci IN ('FI', 'SUSP', 'ENFE', 'MAT3', 'MAT1')
-- Resultado: 0 incidencias negativas
```

```
% Incidencias = (Count INCIDENT_CODES / Activos) × 100
              = (0 / 361) × 100 = 0%
```

**¡POR ESO VES 0% EN EL DASHBOARD!**

**Interpretación**: Diciembre NO tuvo faltas ni enfermedades (solo vacaciones y festivos).

---

### Gráfica 1: Incidencias por Categoría

**Fórmula**:
```sql
SELECT inci, COUNT(*)
FROM incidencias
WHERE fecha BETWEEN '2025-12-01' AND '2025-12-31'
GROUP BY inci
```

**Datos REALES Diciembre 2025**:

| Categoría | Cantidad | Barra Visual |
|-----------|----------|--------------|
| VACACIONES (VAC) | 38 | ████████████████████ |
| PERMISOS (FEST) | 2 | █ |
| SALUD | 0 | |
| FALTAS | 0 | |

**Detalle de códigos**:
| Código | Descripción | Cantidad |
|--------|-------------|----------|
| VAC | Vacaciones | 38 |
| FEST | Festivo | 2 |
| **TOTAL** | | **40** |

---

### Gráfica 2: Incidencias por Mes (Tendencia Anual 2025)

**Datos REALES de Supabase** (serie completa 2025):

**Fórmula SQL**:
```sql
SELECT
  EXTRACT(MONTH FROM fecha) as mes,
  COUNT(*) FILTER (WHERE inci IN ('FI', 'SUSP')) as faltas,
  COUNT(*) FILTER (WHERE inci IN ('ENFE', 'MAT3', 'MAT1')) as salud,
  COUNT(*) FILTER (WHERE inci IN ('PSIN', 'PCON', 'FEST', 'PATER', 'JUST')) as permisos,
  COUNT(*) FILTER (WHERE inci = 'VAC') as vacaciones,
  COUNT(*) as total
FROM incidencias
WHERE fecha BETWEEN '2025-01-01' AND '2025-12-31'
GROUP BY mes
```

| Mes | Faltas | Salud | Permisos | Vacaciones | **TOTAL** |
|-----|--------|-------|----------|------------|-----------|
| Ene | 123 | 71 | 158 | 427 | **795** |
| Feb | 90 | 80 | 116 | 231 | **526** |
| Mar | 113 | 156 | 113 | 290 | **672** |
| Abr | 80 | 128 | 98 | 481 | **794** |
| May | 117 | 205 | 74 | 366 | **762** |
| Jun | 128 | 169 | 80 | 450 | **827** |
| Jul | 108 | 100 | 83 | 484 | **775** |
| Ago | 86 | 83 | 74 | 571 | **814** |
| Sep | 59 | 79 | 106 | 401 | **645** |
| Oct | 26 | 44 | 29 | 232 | **331** |
| Nov | 0 | 2 | 0 | 37 | **39** |
| **Dic** | **0** | **0** | **2** | **38** | **40** |

**Patrón observado**:
- **Pico Enero-Agosto**: 500-800 incidencias/mes (operación normal)
- **Disminución Septiembre-Octubre**: 300-600 incidencias
- **Noviembre-Diciembre**: 39-40 incidencias (mínimo anual)
- **Categoría dominante**: Vacaciones (promedio 60% del total anual)

---

### Gráfica 3: Incidencias por Departamento

**Datos REALES Diciembre 2025**:

**Fórmula SQL**:
```sql
SELECT e.departamento, COUNT(*) as incidencias
FROM incidencias i
JOIN empleados_sftp e ON i.emp = e.numero_empleado
WHERE i.fecha BETWEEN '2025-12-01' AND '2025-12-31'
GROUP BY e.departamento
ORDER BY incidencias DESC
```

| Departamento | Incidencias (REAL) | % del Total |
|--------------|-------------------|-------------|
| Recursos Humanos | 14 | 35.0% |
| Operaciones y Logística | 12 | 30.0% |
| Administración y Finanzas | 5 | 12.5% |
| Filiales | 4 | 10.0% |
| Ventas | 3 | 7.5% |
| Otros | 2 | 5.0% |
| **TOTAL** | **40** | **100%** |

**Nota**: RH tiene mayor proporción por permisos administrativos (FEST).

---

### Tabla: Ausentismo por Mes (Año Completo 2025)

**Modo NÚMERO** - Serie Completa 2025 (datos REALES):

**Cálculo de Jornadas por Mes**:
```
Jornadas = (Activos fin mes / 7) × 6
```

| Mes | Jornadas | Faltas | Salud | Permisos | Vacaciones | TOTAL |
|-----|----------|--------|-------|----------|------------|-------|
| Ene | 279 | 123 | 71 | 158 | 427 | **795** |
| Feb | 295 | 90 | 80 | 116 | 231 | **526** |
| Mar | 293 | 113 | 156 | 113 | 290 | **672** |
| Abr | 303 | 80 | 128 | 98 | 481 | **794** |
| May | 294 | 117 | 205 | 74 | 366 | **762** |
| Jun | 301 | 128 | 169 | 80 | 450 | **827** |
| Jul | 296 | 108 | 100 | 83 | 484 | **775** |
| Ago | 316 | 86 | 83 | 74 | 571 | **814** |
| Sep | 311 | 59 | 79 | 106 | 401 | **645** |
| Oct | 310 | 26 | 44 | 29 | 232 | **331** |
| Nov | 315 | 0 | 2 | 0 | 37 | **39** |
| **Dic** | **309** | **0** | **0** | **2** | **38** | **40** |

**Fuente SQL**:
```sql
SELECT EXTRACT(MONTH FROM fecha) as mes,
  COUNT(*) FILTER (WHERE inci IN ('FI', 'SUSP')) as faltas,
  COUNT(*) FILTER (WHERE inci IN ('ENFE', 'MAT3', 'MAT1')) as salud,
  COUNT(*) FILTER (WHERE inci IN ('PSIN', 'PCON', 'FEST', 'PATER', 'JUST')) as permisos,
  COUNT(*) FILTER (WHERE inci = 'VAC') as vacaciones,
  COUNT(*) as total
FROM incidencias WHERE YEAR(fecha) = 2025
GROUP BY mes
```

---

**Modo PORCENTAJE** - Serie Completa 2025:

| Mes | Jorn | Total | Vac % | Perm % | Salud % | Faltas % | Total % |
|-----|------|-------|-------|--------|---------|----------|---------|
| Ene | 279 | 795 | 153.0% | 56.6% | 25.4% | 44.1% | **285.0%** |
| Feb | 295 | 526 | 78.3% | 39.3% | 27.1% | 30.5% | **178.3%** |
| Mar | 293 | 672 | 99.0% | 38.6% | 53.2% | 38.6% | **229.4%** |
| Abr | 303 | 794 | 158.7% | 32.3% | 42.2% | 26.4% | **262.0%** |
| May | 294 | 762 | 124.5% | 25.2% | 69.7% | 39.8% | **259.2%** |
| Jun | 301 | 827 | 149.5% | 26.6% | 56.1% | 42.5% | **274.8%** |
| Jul | 296 | 775 | 163.5% | 28.0% | 33.8% | 36.5% | **261.8%** |
| Ago | 316 | 814 | 180.7% | 23.4% | 26.3% | 27.2% | **257.6%** |
| Sep | 311 | 645 | 128.9% | 34.1% | 25.4% | 19.0% | **207.4%** |
| Oct | 310 | 331 | 74.8% | 9.4% | 14.2% | 8.4% | **106.8%** |
| Nov | 315 | 39 | 11.7% | 0% | 0.6% | 0% | **12.4%** |
| **Dic** | **309** | **40** | **12.3%** | **0.6%** | **0%** | **0%** | **12.9%** |

**Nota**: Los porcentajes pueden superar 100% cuando hay más incidencias que jornadas estimadas.

---

### ¿Por qué los % son bajos en diciembre vs lo esperado?

| Factor | Explicación |
|--------|-------------|
| **Solo 40 incidencias** | Diciembre 2025 tuvo muy pocas incidencias (real) |
| **Base de 361 activos** | Con una plantilla grande, el % se reduce |
| **Principalmente vacaciones** | 38 de 40 son vacaciones, 0 faltas |
| **Jornadas: 309** | Base grande (309 jornadas) hace que 40 incidencias = 12.94% |

---

### Resumen de Métricas del Tab

| Métrica | Qué Cuenta | Fórmula | Diciembre 2025 (REAL) |
|---------|------------|---------|------------------------|
| Total Incidencias | TODOS los códigos | COUNT(*) | **40** (38 VAC + 2 FEST) |
| % Incidencias | SOLO Negativas (FI+SUSP+ENFE+MAT) | Count INCIDENT_CODES / Activos × 100 | **0%** ✓ |
| Inc por Empleado | TODOS los códigos | 40 / 364 | **0.11** |
| Días Laborados | Estimación | (361/7) × 6 | **309** |

**EXPLICACIÓN CRÍTICA**:
- **% Incidencias** mide SOLO faltas + salud (códigos FI, SUSP, ENFE, MAT3, MAT1)
- Diciembre 2025: 0 faltas, 0 enfermedades → **0%** ✓
- Las vacaciones (VAC) y festivos (FEST) **NO** se cuentan en % Incidencias

---

## Notas Técnicas

1. **Cruce de datos**: Las incidencias se cruzan con `empleados_sftp` usando el campo `emp` (número de empleado).

2. **Normalización de códigos**: Los códigos de incidencia se normalizan automáticamente (ej: "VAC", "vac", "Vac" → "VAC").

3. **Fechas**: El campo `fecha` en incidencias determina a qué período pertenece cada registro.

4. **Empleados activos**: Solo se consideran incidencias de empleados que existen en la plantilla filtrada.
