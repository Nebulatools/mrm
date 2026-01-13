# Tab 3: Incidencias

## Resumen Ejecutivo

Análisis de ausencias, permisos y faltas. Agrupa datos en 4 categorías: Faltas, Salud, Permisos, Vacaciones.

---

## Fuentes de Datos y Relaciones

| Tabla | Propósito | Columna Clave |
|-------|-----------|---------------|
| `incidencias` | Registro diario de ausencias | `emp` (FK) |
| `empleados_sftp` | Datos del empleado para filtros | `numero_empleado` (PK) |

### Diagrama de Relaciones

```
empleados_sftp.numero_empleado ←── incidencias.emp
```

**JOIN**: `empleados_sftp.numero_empleado = incidencias.emp`

### Campos de incidencias

| Campo | Uso |
|-------|-----|
| emp | Número de empleado (FK) |
| fecha | Fecha de la incidencia |
| inci | Código de incidencia |
| descripcion | Descripción opcional |

---

## Categorías de Incidencias

| Categoría | Códigos |
|-----------|---------|
| **FALTAS** | FI (Falta Injustificada), SUSP (Suspensión) |
| **SALUD** | ENFE (Enfermedad), MAT3 (Maternal 3m), MAT1 (Maternal 1m) |
| **PERMISOS** | PSIN, PCON, FEST, PATER, JUST |
| **VACACIONES** | VAC |

**Total Ausentismo** = FALTAS + SALUD + PERMISOS + VACACIONES

---

## KPI Cards

### 1. Total Incidencias
**Fórmula**: `COUNT(*) FROM incidencias WHERE fecha BETWEEN inicio AND fin`

### 2. Días Laborados
**Fórmula**: `(Activos / 7) × 6`

Donde: 7 = días semana, 6 = días laborables

### 3. Incidencias por Empleado
**Fórmula**: `Total Incidencias / Activos Promedio`

| Rango | Interpretación |
|-------|----------------|
| 0.0-0.5 | Excelente |
| 0.5-1.0 | Bueno |
| 1.0-2.0 | Moderado |
| >2.0 | Crítico |

### 4. % Incidencias
**Fórmula**: `(Total Incidencias / Días Laborados) × 100`

---

## Gráficas

| Gráfica | Agrupación | Fórmula |
|---------|------------|---------|
| Por Categoría | inci (código) | `COUNT(*) GROUP BY categoría` |
| Por Mes | fecha | `COUNT(*) GROUP BY MONTH(fecha)` |
| Por Departamento | emp → departamento | JOIN con empleados_sftp |

### JOIN para Gráfica por Departamento

```sql
SELECT departamento, COUNT(*)
FROM incidencias i
JOIN empleados_sftp e ON i.emp = e.numero_empleado
WHERE fecha BETWEEN inicio AND fin
GROUP BY departamento
```

---

## Tabla de Ausentismo por Mes

| Fila | Fórmula |
|------|---------|
| JORNADAS | `(Activos del mes / 7) × 6` |
| VACACIONES | `COUNT(*) WHERE inci = 'VAC'` |
| FALTAS | `COUNT(*) WHERE inci IN ('FI', 'SUSP')` |
| SALUD | `COUNT(*) WHERE inci IN ('ENFE', 'MAT1', 'MAT3')` |
| PERMISOS | `COUNT(*) WHERE inci IN ('PSIN', 'PCON', 'FEST', 'PATER', 'JUST')` |
| TOTAL | `VACACIONES + FALTAS + SALUD + PERMISOS` |

### Modo Porcentaje

**Fórmula por celda**: `(Incidencias del tipo / Jornadas del mes) × 100`

---

## Filtros

| Filtro | Aplicación |
|--------|------------|
| Año/Mes | `fecha` en incidencias |
| Departamento | JOIN con empleados_sftp.departamento |
| Puesto | JOIN con empleados_sftp.puesto |
| Área | JOIN con empleados_sftp.area |

---

## Variaciones

**Fórmula**: `((Incidencias actual - anterior) / anterior) × 100`

- **Verde (-)**: Menos incidencias = Mejora
- **Rojo (+)**: Más incidencias = Empeora

---

## Notas Técnicas

1. **Cruce de datos**: `incidencias.emp = empleados_sftp.numero_empleado`
2. **Códigos normalizados**: Mayúsculas (VAC, FI, SUSP, etc.)
3. **Empleados filtrados**: Solo incidencias de empleados en plantilla activa
