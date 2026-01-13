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

## Notas Técnicas

1. **JOIN clave**: `empleados_sftp.numero_empleado = motivos_baja.numero_empleado`
2. **isMotivoClave()**: Identifica involuntarias por texto del motivo
3. **Rolling 12M**: Ventana móvil de 12 meses hacia atrás
4. **YTD**: Siempre inicia el 1 de enero del año seleccionado
5. **Ubicación**: Derivada del campo `cc` normalizado
