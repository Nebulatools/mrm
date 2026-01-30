# Indicadores de Rotación — Guía de Cálculo

## Fuentes de Datos (Supabase)

| Tabla | Uso | Registros |
|-------|-----|-----------|
| `empleados_sftp` | Lista maestra de empleados, fecha_ingreso, fecha_baja, ubicacion2 | ~1,051 |
| `motivos_baja` | Historial de bajas con motivo y fecha_baja | ~676 |

**Columna clave:** `empleados_sftp.ubicacion2` → segmenta por CAD, CORPORATIVO, FILIALES.

**Clasificación de motivos:**
- **Involuntaria** (`isMotivoClave = true`): Rescisión por desempeño, Rescisión por disciplina, Término del contrato
- **Voluntaria** (`isMotivoClave = false`): Todos los demás (Baja Voluntaria, Abandono, Otro trabajo, etc.)

---

## Indicadores por Ubicación

### 1. Rotación Mensual (Tabla "Resumen Anual" — Tab Rotación)

**Qué muestra:** Porcentaje de rotación de **un solo mes**, incluyendo TODAS las bajas (voluntarias + involuntarias).

**Fórmula:**
```
% Rotación Mensual = (Bajas del mes / Activos Promedio del mes) × 100

Activos Promedio = (Empleados al inicio del mes + Empleados al final del mes) / 2
```

**Ejemplo Dic 2025 — CAD:**
```
Bajas en diciembre: 13
Activos inicio dic: ~200  |  Activos fin dic: ~190
Activos Promedio: (200 + 190) / 2 = 195
% Rotación = 13 / 195 × 100 = 6.65%
```

**Archivo:** `apps/web/src/components/rotacion/tables/rotation-combined-table.tsx` (línea 229)

---

### 2. Rotación Acumulada 12 Meses Móviles (Gráfica "Rotación - 12 Meses Móviles" — Tab Resumen)

**Qué muestra:** Porcentaje de rotación **acumulada en los últimos 12 meses**, filtrada por tipo (voluntaria o involuntaria según selección del usuario).

**Fórmula:**
```
% Rotación 12M = (Bajas en últimos 12 meses / Activos Promedio del período 12M) × 100

Período: Desde 11 meses atrás hasta fin del mes actual
Ejemplo para dic 2025: ene 2025 → dic 2025
```

**Ejemplo Dic 2025 — CAD (Voluntaria):**
```
Bajas voluntarias ene-dic 2025: 121
Activos Promedio 12 meses: ~185
% Rotación Voluntaria 12M = 121 / 185 × 100 = 65.4% (≈65.6% en gráfica)
```

**Archivo:** `apps/web/src/lib/utils/kpi-helpers.ts` → `calcularRotacionAcumulada12mConDesglose()` (línea 558)
**Componente:** `apps/web/src/components/resumen/summary-comparison.tsx` (línea 410)

---

### 3. Rotación YTD (Year To Date)

**Qué muestra:** Porcentaje de rotación **desde enero hasta el mes seleccionado** del año.

**Fórmula:**
```
% Rotación YTD = (Bajas desde enero hasta mes actual / Activos Promedio del período) × 100
```

**Archivo:** `apps/web/src/lib/utils/kpi-helpers.ts` → `calcularRotacionYTDConDesglose()` (línea 590)

---

## ¿Por qué los números son diferentes?

| Aspecto | Gráfica 12M Móviles | Tabla Resumen Anual |
|---------|---------------------|---------------------|
| **Período** | 12 meses acumulados | 1 solo mes |
| **Tipo de bajas** | Solo voluntarias (por defecto) | Todas (vol + invol) |
| **Ejemplo CAD Dic 2025** | 121 bajas vol / 185 prom = **65.6%** | 13 bajas totales / 195 prom = **6.65%** |
| **Ejemplo CORP Dic 2025** | 22 bajas vol / 144 prom = **15.3%** | 1 baja / 131 prom = **0.76%** |
| **Ejemplo FIL Dic 2025** | 16 bajas vol / 27 prom = **58.8%** | 3 bajas / 35.5 prom = **8.45%** |

**En resumen:** La gráfica suma 12 meses de bajas voluntarias (número grande), la tabla muestra solo las bajas de ese mes (número chico). Ambas dividen entre activos promedio del período correspondiente.

---

## Fórmulas Auxiliares

### Activos Promedio (`calculateActivosPromedio`)
```
Activos Promedio = (Activos al inicio del período + Activos al final del período) / 2

Un empleado está "activo" en una fecha si:
  - fecha_ingreso ≤ fecha
  - Y (no tiene fecha_baja O fecha_baja > fecha)
```
**Archivo:** `apps/web/src/lib/utils/kpi-helpers.ts` → `calculateActivosPromedio()`, `countActivosEnFecha()`

### Prioridad de fecha_baja (Recontrataciones)
```
Si empleados_sftp.fecha_baja = NULL → empleado ACTIVO (sin importar historial en motivos_baja)
Si empleados_sftp.fecha_baja = fecha → empleado dado de baja en esa fecha
```
Esto maneja correctamente empleados recontratados que tienen bajas históricas pero están activos actualmente.

---

*Última actualización: Enero 2026*
