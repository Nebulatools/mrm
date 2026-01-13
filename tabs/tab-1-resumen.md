# Tab 1: Resumen

## Resumen Ejecutivo

Vista consolidada que compara el período actual vs anterior. Muestra KPIs de headcount, rotación e incidencias.

---

## Fuentes de Datos y Relaciones

| Tabla | Propósito | Columna Clave |
|-------|-----------|---------------|
| `empleados_sftp` | Datos maestros de empleados | `numero_empleado` (PK) |
| `motivos_baja` | Historial de bajas con motivos | `numero_empleado` (FK) |
| `incidencias` | Registro de ausencias diarias | `emp` (FK → numero_empleado) |

### Diagrama de Relaciones

```
empleados_sftp.numero_empleado ←──┬── motivos_baja.numero_empleado
                                  └── incidencias.emp
```

**JOIN para bajas**: `empleados_sftp.numero_empleado = motivos_baja.numero_empleado`
**JOIN para incidencias**: `empleados_sftp.numero_empleado = incidencias.emp`

---

## KPI Cards

### 1. Empleados Activos
**Fórmula**: `COUNT(*) FROM empleados_sftp WHERE fecha_baja IS NULL`

### 2. Activos Promedio
**Fórmula**: `(Activos al inicio + Activos al fin) / 2`

Empleado activo en fecha X: `fecha_ingreso <= X AND (fecha_baja IS NULL OR fecha_baja > X)`

### 3. Total Bajas
**Fórmula**: `COUNT(*) FROM motivos_baja WHERE fecha_baja BETWEEN inicio AND fin`

### 4. Rotación Mensual
**Fórmula**: `(Bajas del Período / Activos Promedio) × 100`

| Rango | Interpretación |
|-------|----------------|
| 0-3% | Saludable |
| 3-6% | Moderada |
| 6-10% | Alta |
| >10% | Crítica |

### 5. Total Incidencias
**Fórmula**: `COUNT(*) FROM incidencias WHERE fecha BETWEEN inicio AND fin`

---

## Gráficas

| Gráfica | Datos | Fórmula |
|---------|-------|---------|
| Empleados por Antigüedad | empleados_sftp | `MONTHS_BETWEEN(hoy, fecha_ingreso)` agrupado |
| Rotación Mensual | empleados_sftp + motivos_baja | `(Bajas mes / Activos mes) × 100` |
| Rotación 12M Móviles | empleados_sftp + motivos_baja | `(Σ Bajas 12m / Prom Activos 12m) × 100` |
| Rotación YTD | empleados_sftp + motivos_baja | `(Σ Bajas desde Ene / Prom Activos YTD) × 100` |
| Incidencias 12M | empleados_sftp + incidencias | `(Empleados con incidencia / Activos) × 100` |
| Permisos 12M | empleados_sftp + incidencias | `(Empleados con permiso / Activos) × 100` |

---

## Tabla de Ausentismo

**Fuente**: `incidencias` JOIN `empleados_sftp` ON `emp = numero_empleado`

| Columna | Códigos incluidos |
|---------|-------------------|
| Faltas | FI, SUSP |
| Salud | ENFE, MAT1, MAT3 |
| Permisos | PSIN, PCON, FEST, PATER, JUST |
| Vacaciones | VAC |

**Fórmula Total**: `Faltas + Salud + Permisos + Vacaciones`

---

## Filtros

| Filtro | Campo en empleados_sftp |
|--------|-------------------------|
| Año/Mes | fecha_ingreso, fecha_baja |
| Departamento | departamento |
| Puesto | puesto |
| Área | area |
| Ubicación | cc (normalizado) |

---

## Toggle de Rotación

| Opción | Filtro aplicado |
|--------|-----------------|
| Voluntaria | `isMotivoClave() = FALSE` |
| Involuntaria | `isMotivoClave() = TRUE` |
| Total | Sin filtro |

**Motivos Involuntarios**: Rescisión por desempeño, Rescisión por disciplina, Término del contrato

---

## Variaciones

**Fórmula**: `((Valor actual - Valor anterior) / Valor anterior) × 100`

- **Verde**: Mejora (menos bajas/incidencias o más activos)
- **Rojo**: Empeora
