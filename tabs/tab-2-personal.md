# Tab 2: Personal (Headcount)

## Resumen Ejecutivo

Análisis demográfico de la plantilla: distribuciones por departamento, puesto, género, edad y antigüedad.

---

## Fuentes de Datos y Relaciones

| Tabla | Propósito | Columna Clave |
|-------|-----------|---------------|
| `empleados_sftp` | Datos maestros de empleados | `numero_empleado` (PK) |

**Nota**: Este tab usa únicamente `empleados_sftp`. No requiere JOINs con otras tablas.

### Campos Principales

| Campo | Uso |
|-------|-----|
| numero_empleado | Identificador único |
| nombres, apellidos | Nombre completo |
| departamento | Agrupación por departamento |
| puesto | Agrupación por cargo |
| area | Agrupación por área |
| fecha_ingreso | Cálculo de antigüedad y altas |
| fecha_baja | Identificar bajas y activos |
| genero | Distribución por género |
| fecha_nacimiento | Cálculo de edad |

---

## KPI Cards

### 1. Activos
**Fórmula**: `COUNT(*) WHERE fecha_baja IS NULL AND fecha_ingreso <= hoy`

### 2. Altas del Período
**Fórmula**: `COUNT(*) WHERE fecha_ingreso BETWEEN inicio AND fin`

### 3. Bajas del Período
**Fórmula**: `COUNT(*) WHERE fecha_baja BETWEEN inicio AND fin`

### 4. Movimiento Neto
**Fórmula**: `Altas - Bajas`

| Resultado | Significado |
|-----------|-------------|
| Positivo (+) | Plantilla creció |
| Negativo (-) | Plantilla decreció |
| Cero | Sin cambio neto |

---

## Gráficas

| Gráfica | Campo agrupación | Fórmula |
|---------|------------------|---------|
| Por Departamento | departamento | `COUNT(*) WHERE activo GROUP BY departamento` |
| Por Clasificación | clasificacion | `COUNT(*) WHERE activo GROUP BY clasificacion` |
| Por Género | genero | `COUNT(*) WHERE activo GROUP BY genero` |
| Por Edad | fecha_nacimiento | `YEARS_BETWEEN(hoy, fecha_nacimiento)` |
| Antigüedad por Área | area, fecha_ingreso | `MONTHS_BETWEEN(hoy, fecha_ingreso)` |
| Antigüedad por Depto | departamento, fecha_ingreso | `MONTHS_BETWEEN(hoy, fecha_ingreso)` |

### Grupos de Antigüedad

| Grupo | Criterio |
|-------|----------|
| < 3 meses | `meses < 3` |
| 3-6 meses | `meses >= 3 AND < 6` |
| 6-12 meses | `meses >= 6 AND < 12` |
| 12+ meses | `meses >= 12` |

---

## Tablas Demográficas

### Tabla 1: Edad × Género
**Campos**: fecha_nacimiento, genero

| Rango Edad | Cálculo |
|------------|---------|
| 18-25 | `edad >= 18 AND edad <= 25` |
| 26-35 | `edad >= 26 AND edad <= 35` |
| 36-45 | `edad >= 36 AND edad <= 45` |
| 46-55 | `edad >= 46 AND edad <= 55` |
| 56+ | `edad >= 56` |

### Tabla 2: Antigüedad × Género
**Campos**: fecha_ingreso, genero

| Rango | Cálculo |
|-------|---------|
| < 3 meses | `meses < 3` |
| 3-6 meses | `meses >= 3 AND < 6` |
| 6-12 meses | `meses >= 6 AND < 12` |
| 1-2 años | `meses >= 12 AND < 24` |
| 2-5 años | `meses >= 24 AND < 60` |
| 5+ años | `meses >= 60` |

---

## Variaciones

**Fórmula**: `((Valor actual - Valor anterior) / Valor anterior) × 100`

| Métrica | Verde | Rojo |
|---------|-------|------|
| Activos | Aumento (+) | Disminución (-) |
| Altas | Aumento (+) | Disminución (-) |
| Bajas | Disminución (-) | Aumento (+) |

---

## Notas Técnicas

1. **Activo**: `fecha_baja IS NULL`
2. **Antigüedad**: `MONTHS_BETWEEN(fecha_referencia, fecha_ingreso)`
3. **Edad**: `YEARS_BETWEEN(hoy, fecha_nacimiento)`
4. **Normalización**: Caracteres especiales (ej: `LOG?STICA` → `Logística`)
