# Plan: Corrección de Inconsistencias en KPIs y Gráficas de Rotación

## Resumen Ejecutivo

Este plan corrige 3 problemas principales identificados en el dashboard:
1. **Cálculo inconsistente de Incidencias/Permisos** entre tab Resumen y tab Incidencias
2. **Gráfica "Rotación 12 meses móviles" duplicada** en tab Resumen (debe mostrar datos acumulados 12M como en tab Rotación)
3. **Formato de labels y ejes X** con información redundante o incorrecta

## Análisis de Datos (desde Supabase)

**Datos reales de incidencias (Diciembre 2025):**
- Total incidencias: 902
- Empleados con incidencias: 239
- Faltas injustificadas: 84
- Vacaciones: 637

**Empleados activos promedio:** ~75-85 empleados

**Confirmación del usuario:**
- Los números del tab Incidencias son correctos
- Debe usarse la fórmula `(Incidencias / Días Laborados) × 100`
- Todos los tabs deben mostrar los mismos valores

## Problema 1: Cálculo de Incidencias y Permisos

### Situación Actual

**Tab Resumen** (`summary-comparison.tsx:544-545`):
```typescript
const incidenciasPct = empleadosActivos > 0 ? (totalIncidencias / empleadosActivos) * 100 : 0;
const permisosPct = empleadosActivos > 0 ? (permisos / empleadosActivos) * 100 : 0;
```
- Fórmula: `(Incidencias / Empleados Activos) × 100`
- Interpreta: % de empleados afectados
- Resultado INCORRECTO: depende de empleados, no de días

**Tab Incidencias** (`kpi-calculator.ts:393-400`):
```typescript
const diasLaborados = Math.round((activosActuales / 7) * 6);
const porcentajeIncidencias = diasLaborados > 0
  ? (incidenciasCount / diasLaborados) * 100
  : 0;
```
- Fórmula: `(Incidencias / Días Laborados) × 100`
- Interpreta: % de días con incidencias
- Resultado CORRECTO: normaliza por días laborables

### Problema de Clasificación

**Inconsistencia entre archivos:**

`summary-comparison.tsx:36-44` define:
```typescript
const INCIDENT_CODES = new Set([...FALTAS_CODES, ...SALUD_CODES]); // FI, SUSP, ENFE, MAT3, MAT1
const PERMISO_CODES = new Set([...PERMISOS_CODES, ...VACACIONES_CODES]); // PSIN, PCON, FEST, PATER, JUST, VAC
```

`normalizers.ts:330-333` define (OFICIAL):
```typescript
INCIDENT_CANONICAL_CODES = ['FI', 'SUSP', 'PSIN', 'ENFE', 'ACCI']
PERMISO_CANONICAL_CODES = ['PCON', 'VAC', 'MAT3', 'MAT1', 'JUST', 'PAT', 'FEST']
```

**Decisión:** Usar la clasificación de `normalizers.ts` como fuente única de verdad.

### Solución

**Archivo:** `apps/web/src/components/summary-comparison.tsx`

**PASO 1: Corregir constantes de clasificación (líneas 36-44)**

La clasificación correcta YA está definida, solo corregir la línea 44:

```typescript
// Mantener (YA CORRECTAS):
const FALTAS_CODES = new Set(["FI", "SUSP"]); // ✅ Correcto
const SALUD_CODES = new Set(["ENFE", "MAT3", "MAT1"]); // ✅ Correcto
const PERMISOS_CODES = new Set(["PSIN", "PCON", "FEST", "PATER", "JUST"]); // ✅ Correcto
const VACACIONES_CODES = new Set(["VAC"]); // ✅ Correcto (separado)
const INCIDENT_CODES = new Set([...FALTAS_CODES, ...SALUD_CODES]); // ✅ Correcto

// CAMBIAR SOLO ESTA LÍNEA:
// ANTES (LÍNEA 44):
const PERMISO_CODES = new Set([...PERMISOS_CODES, ...VACACIONES_CODES]); // ❌ Incluye VAC

// DESPUÉS:
const PERMISO_CODES = new Set(PERMISOS_CODES); // ✅ SIN VAC (vacaciones separadas)
```

**Razón:** Las vacaciones deben contarse en una card separada, no como permisos.

**PASO 2: Actualizar cálculo de porcentajes (líneas 543-545)**

Corregir fórmula según definición del jefe: **días laborados = suma de todos los días activos de todos los empleados**

```typescript
// ANTES (MUY INCORRECTO):
const incidenciasPct = empleadosActivos > 0 ? (totalIncidencias / empleadosActivos) * 100 : 0;
const permisosPct = empleadosActivos > 0 ? (permisos / empleadosActivos) * 100 : 0;

// DESPUÉS (CORRECTO):
// ✅ Calcular días laborables del mes (lunes a sábado = 6 días/semana)
const diasLaborablesMes = contarDiasLaborablesMes(startOfMonth(referencia), endOfMonth(referencia));
const diasLaborados = empleadosActivos * diasLaborablesMes; // Total días-empleado

const incidenciasPct = diasLaborados > 0 ? (totalIncidencias / diasLaborados) * 100 : 0;
const permisosPct = diasLaborados > 0 ? (permisos / diasLaborados) * 100 : 0;
```

**Agregar función helper (arriba en el archivo):**

```typescript
// Helper: Contar días laborables en un mes (lunes a sábado)
function contarDiasLaborablesMes(inicio: Date, fin: Date): number {
  let count = 0;
  let current = new Date(inicio);

  while (current <= fin) {
    const dayOfWeek = current.getDay(); // 0=domingo, 1=lunes, ..., 6=sábado
    if (dayOfWeek >= 1 && dayOfWeek <= 6) { // lunes a sábado
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}
```

**PASO 3: Actualizar override de KPIs (líneas 566-568)**

```typescript
// ANTES:
const activos = result.empleadosActivos || 1;
result.incidencias = activos > 0 ? (incidentsKPIsOverride.incidencias / activos) * 100 : 0;
result.permisos = activos > 0 ? (incidentsKPIsOverride.permisos / activos) * 100 : 0;

// DESPUÉS:
const activos = result.empleadosActivos || 1;
const diasLaborablesMesOverride = contarDiasLaborablesMes(startOfMonth(referencia), endOfMonth(referencia));
const diasLaboradosOverride = activos * diasLaborablesMesOverride;

result.incidencias = diasLaboradosOverride > 0
  ? (incidentsKPIsOverride.incidencias / diasLaboradosOverride) * 100
  : 0;
result.permisos = diasLaboradosOverride > 0
  ? (incidentsKPIsOverride.permisos / diasLaboradosOverride) * 100
  : 0;
```

**PASO 4: Verificar filtros (líneas 505-515)**

Asegurarse que `incidenciasDelMes` está filtrando correctamente:

```typescript
// Verificar que este filtro esté aplicado correctamente
const incidenciasDelMes = incidencias.filter(i => {
  const incDate = new Date(i.fecha);
  return incDate >= startOfMonth(referencia) && incDate <= endOfMonth(referencia);
});
```

## Problema 1.B: Actualizar kpi-calculator.ts

El archivo `apps/web/src/lib/kpi-calculator.ts` también tiene la fórmula incorrecta de días laborados.

**Archivo:** `apps/web/src/lib/kpi-calculator.ts`

**Ubicación:** Líneas 392-403

**CAMBIAR:**

```typescript
// ANTES (LÍNEAS 392-403):
// 8. Días Laborados - ((Activos)/7)*6
const diasLaborados = Math.round((activosActuales / 7) * 6);
const prevDiasLaborados = Math.round((prevActivosActuales / 7) * 6);

// 9. %incidencias - Incidencias/días Laborados
const porcentajeIncidencias = diasLaborados > 0
  ? (incidenciasCount / diasLaborados) * 100
  : 0;
const prevPorcentajeIncidencias = prevDiasLaborados > 0
  ? (prevIncidenciasCount / prevDiasLaborados) * 100
  : 0;

// DESPUÉS:
// 8. Días Laborados - Empleados × Días laborables del mes
const diasLaborablesMes = contarDiasLaborables(startDate, endDate);
const diasLaborados = activosActuales * diasLaborablesMes;
const prevDiasLaborablesMes = contarDiasLaborables(prevStartDate, prevEndDate);
const prevDiasLaborados = prevActivosActuales * prevDiasLaborablesMes;

// 9. %incidencias - Incidencias/días Laborados
const porcentajeIncidencias = diasLaborados > 0
  ? (incidenciasCount / diasLaborados) * 100
  : 0;
const prevPorcentajeIncidencias = prevDiasLaborados > 0
  ? (prevIncidenciasCount / prevDiasLaborados) * 100
  : 0;
```

**Agregar función helper al inicio del archivo:**

```typescript
// Helper: Contar días laborables en un período (lunes a sábado)
function contarDiasLaborables(inicio: Date, fin: Date): number {
  let count = 0;
  let current = new Date(inicio);

  while (current <= fin) {
    const dayOfWeek = current.getDay(); // 0=domingo, 1=lunes, ..., 6=sábado
    if (dayOfWeek >= 1 && dayOfWeek <= 6) { // lunes a sábado
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}
```

---

## Problema 2: Gráfica "Rotación 12 meses móviles" en Tab Resumen

### Situación Actual

**Tab Resumen** (`summary-comparison.tsx:960-967`):
```typescript
const rollingChartData = rotationSeries.map(point => {
  const row: Record<string, number | string> = { mes: point.label };
  ubicacionSeriesConfig.forEach(({ key }) => {
    const value = getRotationValue(point.negocios[key]?.rolling);  // ← Usa .rolling
    row[key] = Number(value.toFixed(2));
  });
  return row;
});
```

**Tab Rotación** (`retention-charts.tsx:709-833`):
- Muestra correctamente rotación acumulada 12M con eje X dinámico
- Datos: `rotacionAcumulada12m` por mes
- Agrupación: por MES (no por ubicación)

### Análisis

El usuario confirmó que:
- La gráfica del tab Rotación ("Rotación Acumulada 12 meses móviles") es correcta
- El tab Resumen debe mantener la misma estructura pero agrupado por UBICACIÓN
- El tab Rotación está agrupado por MES

**Diferencia clave:**
- Tab Resumen: series por UBICACIÓN (Matriz, Fénix, Villahermosa, etc.)
- Tab Rotación: serie única por MES con comparativo año anterior

### Decisión

**MANTENER** el uso de `.rolling` (rotación acumulada 12M) en la gráfica del tab Resumen, ya que:
1. Es consistente con el concepto de "12 meses móviles" = acumulado de últimos 12 meses
2. La diferencia con el tab Rotación es la agrupación (ubicación vs mes), no el cálculo
3. El usuario confirmó que la gráfica del tab Rotación es correcta

**NO HAY CAMBIOS NECESARIOS** en la línea 963 de `summary-comparison.tsx`.

## Problema 3: Formato de Labels y Ejes X

### 3.1 Eje X con meses y año

**Archivo:** `apps/web/src/components/retention-charts.tsx`

**Ubicación:** Línea 727

**ANTES:**
```typescript
return {
  mes: `${monthLabel} ${yearShort}`,  // ← Muestra "ene 25", "feb 25", etc.
  rotacionAcumulada: d.rotacionAcumulada12m ?? 0,
  year: d.year,
  month: d.month
};
```

**DESPUÉS:**
```typescript
return {
  mes: monthLabel,  // ← Solo "ene", "feb", etc.
  rotacionAcumulada: d.rotacionAcumulada12m ?? 0,
  year: d.year,
  month: d.month
};
```

### 3.2 Label "12M Móviles" debe mostrar solo el año

**Archivo:** `apps/web/src/components/retention-charts.tsx`

**Ubicación:** Línea 822

**ANTES:**
```typescript
<Bar
  dataKey="rotacionAcumulada"
  name="12M Móviles"  // ← Label genérico
  fill={getModernColor(0)}
  radius={[4, 4, 0, 0]}
  maxBarSize={18}
  label={renderBarLabelPercent}
/>
```

**DESPUÉS:**
```typescript
<Bar
  dataKey="rotacionAcumulada"
  name={`${currentDate.getFullYear()}`}  // ← Mostrar año actual (ej: "2025")
  fill={getModernColor(0)}
  radius={[4, 4, 0, 0]}
  maxBarSize={18}
  label={renderBarLabelPercent}
/>
```

### 3.3 Quitar "YTD" del label "Rotación - Lo que va del Año"

**Archivo:** `apps/web/src/components/retention-charts.tsx`

**Ubicación:** Línea 879

**ANTES:**
```typescript
<Bar
  dataKey={`rotacionYTD${selectedYearForCharts}`}
  name={`${selectedYearForCharts} YTD`}  // ← "2025 YTD" es redundante
  fill={getModernColor(0)}
  radius={[4, 4, 0, 0]}
  maxBarSize={18}
  label={renderBarLabelPercent}
/>
```

**DESPUÉS:**
```typescript
<Bar
  dataKey={`rotacionYTD${selectedYearForCharts}`}
  name={`${selectedYearForCharts}`}  // ← Solo "2025"
  fill={getModernColor(0)}
  radius={[4, 4, 0, 0]}
  maxBarSize={18}
  label={renderBarLabelPercent}
/>
```

## Archivos a Modificar

### 1. `apps/web/src/components/summary-comparison.tsx`
- **Línea 44:** Cambiar `PERMISO_CODES` para NO incluir VAC
- **Agregar función helper:** `contarDiasLaborablesMes()` al inicio del archivo
- **Líneas 543-545:** Cambiar cálculo usando `empleados × días_mes`
- **Líneas 566-568:** Actualizar override con misma lógica

### 2. `apps/web/src/lib/kpi-calculator.ts`
- **Agregar función helper:** `contarDiasLaborables()` al inicio del archivo
- **Líneas 392-403:** Cambiar fórmula de días laborados a `empleados × días_período`

### 3. `apps/web/src/components/retention-charts.tsx`
- **Línea 727:** Cambiar `mes: ${monthLabel} ${yearShort}` a `mes: monthLabel`
- **Línea 822:** Cambiar `name="12M Móviles"` a `name=${currentDate.getFullYear()}`
- **Línea 879:** Cambiar `name=${selectedYearForCharts} YTD` a `name=${selectedYearForCharts}`

### 4. `docs/KPI_FORMULAS.md` (Opcional)
- **Líneas 133-147:** Actualizar documentación de fórmula "Días Laborados" y "%Incidencias"

## Impacto Esperado

### Datos reales de Diciembre 2025 (desde Supabase):
- Empleados activos: 353
- Incidencias (Faltas + Salud): FI(84) + SUSP(23) + ENFE(38) = **145 registros**
- Permisos (sin VAC): PSIN(54) + PCON(36) + FEST(27) = **117 registros**
- Vacaciones (separado): VAC = **637 registros**
- Días laborables en diciembre: **26 días** (lunes a sábado)
- Días laborados TOTALES: 353 × 26 = **9,178 días-empleado**

### Antes de los cambios:
- ❌ Tab Resumen usa fórmula `incidencias / empleados` = 145/353 = 41%
- ❌ `PERMISO_CODES` incluye VAC (línea 44)
- ❌ Fórmula incorrecta: `(Activos / 7) × 6` no representa días reales
- ❌ Valores no coinciden entre tabs
- ❌ Gráficas con labels "ene 25", "feb 25", "12M Móviles", "2025 YTD"

### Después de los cambios:
- ✅ Ambos tabs usan fórmula correcta: `incidencias / (empleados × días_mes)`
- ✅ `PERMISO_CODES` SIN VAC (vacaciones en card separada)
- ✅ Incidencias: (145 / 9,178) × 100 = **1.58%** ← Valor razonable!
- ✅ Permisos: (117 / 9,178) × 100 = **1.27%** ← Valor razonable!
- ✅ Gráficas con labels limpios: "ene", "feb", "2025", sin "YTD" redundante
- ✅ Consistencia total en todo el dashboard

**NOTA:** Los porcentajes ahora son correctos porque:
1. Permisos (1.27%) NO incluye vacaciones
2. Vacaciones se cuenta en card separada
3. Usa días laborados REALES: `Empleados × Días_Laborables_Mes`
4. Ejemplo dic 2025: 353 empleados × 26 días = 9,178 días-empleado
5. 145 incidencias / 9,178 = 1.58% (razonable para un mes)

## Validación

### Pruebas Manuales

1. **Verificar cálculo de Incidencias:**
   - Abrir tab Resumen, ver card "Incidencias"
   - Abrir tab Incidencias, ver misma card
   - Confirmar que ambos muestran el mismo porcentaje

2. **Verificar cálculo de Permisos:**
   - Repetir prueba anterior para card "Permisos"
   - Ambos tabs deben coincidir

3. **Verificar labels de gráficas:**
   - Tab Rotación → Gráfica "Rotación Acumulada (12 meses móviles)"
   - Eje X debe mostrar solo "ene", "feb", "mar" (sin año)
   - Leyenda debe mostrar solo "2025" (sin "12M Móviles")

4. **Verificar gráfica YTD:**
   - Tab Rotación → Gráfica "Rotación - Lo que va del Año"
   - Leyenda debe mostrar solo "2025" (sin "YTD")

### Consultas SQL de Verificación

```sql
-- Verificar empleados activos promedio
SELECT COUNT(*) as activos
FROM empleados_sftp
WHERE activo = true;

-- Verificar incidencias de diciembre 2025
SELECT COUNT(*) as total_incidencias
FROM incidencias
WHERE fecha >= '2025-12-01' AND fecha < '2026-01-01';

-- Calcular días laborados manualmente
-- Si activos = 75: diasLaborados = (75 / 7) * 6 ≈ 64 días

-- Verificar porcentaje: incidencias / diasLaborados * 100
-- Ejemplo: 902 / 64 ≈ 1409% (esto parece alto, verificar datos)
```

### Tests Automatizados

Ejecutar tests existentes:
```bash
npm test -- kpi-helpers     # Verificar funciones de cálculo
npm test -- summary-comparison  # Verificar componente Resumen
npm test -- retention-charts    # Verificar componente Rotación
npm run type-check          # Verificar TypeScript
```

## Notas Técnicas

### Fórmula "Días Laborados"
```
diasLaborados = (empleadosActivos / 7) × 6
```
- Asume semana laboral de 6 días (lunes a sábado)
- Divide empleados entre 7 para obtener "equipos" semanales
- Multiplica por 6 días laborables

### Consistencia entre tabs

**Principio:** Misma fórmula, diferentes agrupaciones
- Tab Resumen: KPIs generales + series por ubicación
- Tab Incidencias: Desglose detallado de incidencias
- Tab Rotación: Series por mes con comparativos históricos

**Todos deben usar la misma fórmula base para KPIs compartidos.**

## Riesgos y Mitigaciones

### Riesgo 1: Cambio en valores mostrados
- **Impacto:** Los usuarios verán valores diferentes en las cards de Resumen
- **Mitigación:** Comunicar que es una corrección de fórmula para consistencia

### Riesgo 2: Labels demasiado simples
- **Impacto:** "ene", "feb" sin año puede causar confusión
- **Mitigación:** El título de la gráfica indica el período, y la descripción menciona "últimos 12 meses"

### Riesgo 3: Tests pueden fallar
- **Impacto:** Tests con valores esperados hardcodeados
- **Mitigación:** Actualizar tests para reflejar nueva fórmula

## Próximos Pasos (Opcional)

Después de implementar estas correcciones:

1. **Documentar fórmulas:** Actualizar `docs/KPI_FORMULAS.md` con la fórmula correcta
2. **Agregar tooltips:** Mostrar fórmula al hacer hover sobre las cards
3. **Unificar cálculos:** Mover lógica de `diasLaborados` a `kpi-helpers.ts`
4. **Tests de integración:** Agregar tests E2E que verifiquen consistencia entre tabs
