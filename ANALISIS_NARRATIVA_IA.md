# Plan: Mejora del Sistema de Narrativa IA con Filtros

## Estado Actual del Sistema

### Flujo Completo
```
8 Filtros UI → retentionFilters (state)
    → use-plantilla-filters.ts (4 variantes de scope)
    → use-retention-kpis.ts (35+ métricas calculadas)
    → narrativePayload (useMemo en dashboard-page.tsx)
    → SmartNarrative component (clic "Generar")
    → POST /api/narrative (OpenAI gpt-4o-mini)
    → Texto narrativo
```

### Los 8 Filtros y Sus Datos Reales en Supabase

| # | Filtro UI | Campo `retentionFilters` | Columna `empleados_sftp` | Valores reales |
|---|-----------|--------------------------|--------------------------|----------------|
| 1 | Año | `years: number[]` | `fecha_ingreso`, `fecha_baja` | 2023-2026 |
| 2 | Mes | `months: number[]` | `fecha_ingreso`, `fecha_baja` | 1-12 |
| 3 | Negocio | `empresas: string[]` | `empresa` | MOTO REPUESTOS MONTERREY (931), MOTO TOTAL (118), REPUESTOS Y MOTOCICLETAS DEL NORTE (8) |
| 4 | Área | `areas: string[]` | `area` | Desconocido (470), Empaque (80), Surtido (62), Supermoto (59), Calidad (56), Recibo (49), Reabasto (44), RH (31), +15 más |
| 5 | Departamento | `departamentos: string[]` | `departamento` | OPERACIONES Y LOGÍSTICA (680), FILIALES (121), RECURSOS HUMANOS (50), ADMINISTRACIÓN Y FINANZAS (39), VENTAS (31), TI (29), +12 más |
| 6 | Puesto | `puestos: string[]` | `puesto` | AUX ALMACÉN REABA (168), AUX ALMACÉN EMPAQ (146), AUX ALMACÉN SURTI (132), VENTAS MOSTRADOR (57), +40 más |
| 7 | Clasificación | `clasificaciones: string[]` | `clasificacion` | Sindicalizados (717), Confianza (340) |
| 8 | Ubicación | `ubicaciones: string[]` | `ubicacion` | MRM MONTERREY (932), MOTO TOTAL MTY (49), +10 sucursales |

**Nota:** También existe `ubicacionesIncidencias` → columna `ubicacion2` con valores: CAD (740), CORPORATIVO (222), FILIALES (94).

### Cómo se Aplican los Filtros por Tab

| Tab | Scope | Año | Mes | Estructura (6 filtros) | Inactivos |
|-----|-------|-----|-----|------------------------|-----------|
| Resumen | `specific` | ✅ | ✅ | ✅ | ❌ |
| Personal | `specific` | ✅ | ✅ | ✅ | ❌ |
| Incidencias | `year-only` | ✅ | ❌ | ✅ | ❌ |
| Rotación | `year-only` | ✅ | ❌ | ✅ | ✅ |

### ¿Los filtros afectan la narrativa? **SÍ, todos.**

La cadena es: filtros → `useRetentionKPIs` (recalcula 35+ KPIs) → `narrativePayload` (useMemo con dependencia en filteredRetentionKPIs) → SmartNarrative.

Cuando cambias cualquier filtro, el `dataSignature` (JSON.stringify) cambia → narrativa se resetea → usuario debe hacer clic en "Generar" de nuevo.

---

## Problemas Identificados

### 🔴 P1: El prompt NO le dice a la IA qué filtros están activos
- El payload tiene `filtersSummary: ["CAD"]` y `filtersCount: 2`
- Pero el prompt en `route.ts` solo dice: "Contexto (JSON filtrado actual): {JSON}"
- La IA no sabe si está viendo toda la empresa o solo un departamento
- **Resultado:** Narrativa genérica que no menciona los filtros

### 🔴 P2: Los nombres de campos son crípticos para la IA
- Se envía `rotacionMensualClaves: 0.43` sin explicar qué significa
- La IA tiene que adivinar que "Claves" = involuntaria
- 35+ campos sin diccionario → la IA ignora o malinterpreta muchos

### 🟡 P3: Mismo prompt para 4 secciones diferentes
- overview, incidents, retention, personal usan el mismo prompt base
- No hay instrucciones de qué métricas priorizar por sección
- La narrativa de "Incidencias" habla de rotación porque domina el payload

### 🟡 P4: dataSources muestra totales sin filtrar
- `empleados_sftp.rows: 1051` es el total, no el filtrado
- Si filtras "Depto: VENTAS" (31 empleados), la IA ve 1,051

### 🟢 P5: Prompt de Ejecutivo muy limitado (45 palabras)
- Solo 2 frases para el nivel ejecutivo
- Para Detalle solo 120 palabras / 3-5 bullets
- Podría ser más elaborado sin ser excesivo

---

## Plan de Implementación

### Fase 1: Mejorar el Prompt (route.ts)

**Archivo:** `apps/web/src/app/api/narrative/route.ts`

**Cambios:**

1. Agregar sección de **contexto de filtros** al prompt:
```
CONTEXTO DE FILTROS ACTIVOS:
Período: {periodLabel} (comparado con el mes anterior)
Filtros aplicados ({filtersCount}): {filtrosActivos detallados}
Población analizada: {N} empleados (de {total} totales)
→ Si hay filtros, SIEMPRE inicia tu análisis mencionándolos.
```

2. Agregar **diccionario de métricas** para que la IA entienda cada campo:
```
DICCIONARIO DE MÉTRICAS:
- rotacionMensual: % de rotación total del mes (bajas/activos promedio × 100)
- rotacionMensualVoluntaria: Solo renuncias voluntarias
- rotacionMensualClaves: Solo despidos/término contrato (involuntaria)
- rotacionAcumulada: Rotación rolling últimos 12 meses
- rotacionAnioActual: Rotación acumulada del año (YTD)
- activosPromedio: Promedio de empleados activos inicio+fin del período / 2
- bajasVoluntarias/Involuntarias: Cantidad de bajas del mes
- ingresosMes: Nuevas contrataciones del mes
- antigPromMesesActual: Antigüedad promedio en meses
- *Anterior: Valor del mes previo para comparación
- *Variacion: Cambio porcentual vs mes anterior
```

3. Crear **prompts especializados por sección**:
```
[retention]: Analiza rotación, bajas, retención y antigüedad. Compara voluntarias vs involuntarias.
[incidents]: Analiza incidencias, faltas, permisos y ausentismo. Identifica patrones.
[overview]: Panorama balanceado de todos los indicadores clave.
[personal]: Analiza demografía, distribución por área/depto, y composición del equipo.
```

4. Mejorar **formato de salida por nivel**:
```
[manager/Ejecutivo]: 3-4 frases (≤80 palabras). Titular impactante + contexto + conclusión + recomendación clave.
[analyst/Detalle]: 5-8 bullets técnicos (≤200 palabras). Variaciones %, anomalías, correlaciones, comparativos.
```

5. Subir `max_tokens` de 320 → 500 para dar espacio al análisis más elaborado.

### Fase 2: Mejorar el Payload (dashboard-page.tsx)

**Archivo:** `apps/web/src/components/dashboard-page.tsx`

**Cambios al `narrativePayload`:**

1. Agregar campo `filtrosActivos` con descripciones legibles:
```typescript
filtrosActivos: {
  periodo: "Diciembre 2025",
  periodoComparacion: "Noviembre 2025",
  empresas: retentionFilters.empresas,      // ["MOTO REPUESTOS MONTERREY"]
  areas: retentionFilters.areas,             // ["Empaque", "Surtido"]
  departamentos: retentionFilters.departamentos,
  puestos: retentionFilters.puestos,
  clasificaciones: retentionFilters.clasificaciones,
  ubicaciones: retentionFilters.ubicaciones,
  poblacionFiltrada: plantillaFiltered.length,  // Conteo REAL filtrado
  poblacionTotal: data.plantilla.length,         // Total para contexto
}
```

2. Eliminar `dataSources` (no aporta valor, confunde a la IA con totales sin filtrar)

---

## Archivos a Modificar

| Archivo | Cambio | Impacto |
|---------|--------|---------|
| `apps/web/src/app/api/narrative/route.ts` | Prompt mejorado con filtros, diccionario, secciones, niveles | ALTO |
| `apps/web/src/components/dashboard-page.tsx` | narrativePayload con filtrosActivos | MEDIO |

**Solo 2 archivos.** Sin cambios en arquitectura, hooks, ni componentes.

## Verificación

1. Seleccionar Dic 2025 sin filtros → generar narrativa → debe dar panorama general
2. Seleccionar Dic 2025 + Depto "OPERACIONES Y LOGÍSTICA" → narrativa debe mencionar el departamento
3. Seleccionar Dic 2025 + Clasificación "Sindicalizados" → narrativa debe mencionar sindicalizados
4. Verificar que números en narrativa coincidan con KPI cards
5. Probar nivel Ejecutivo y Detalle → verificar que Ejecutivo sea conciso y Detalle sea técnico
6. Probar en tab Rotación vs tab Incidencias → verificar que el contenido sea relevante a cada sección
