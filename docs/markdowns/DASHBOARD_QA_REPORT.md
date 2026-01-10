# Dashboard MRM - Reporte de QA y Análisis de Filtros

**Fecha:** 2026-01-09
**Última Actualización:** 2026-01-10
**Versión del Dashboard:** diciembre 2025
**Método de Prueba:** Playwright Browser Automation

---

## Resumen Ejecutivo

Se realizó un análisis exhaustivo del Dashboard MRM de KPIs de RRHH utilizando pruebas automatizadas con Playwright. Se identificaron inicialmente **4 bugs** y **2 inconsistencias menores**. Tras las correcciones, **3 bugs han sido resueltos**.

### Clasificación de Hallazgos

| Severidad | Cantidad Original | Resueltos | Pendientes |
|-----------|-------------------|-----------|------------|
| 🔴 Crítico | 2 | 1 | 1 |
| 🟠 Alto | 2 | 2 | 0 |
| 🟡 Medio | 2 | 0 | 2 |

---

## Estado Actual de Bugs

### 🔴 BUG-001: Tab Tendencias - API No Encontrada (404) - ⏳ PENDIENTE

**Severidad:** CRÍTICA
**Tab:** Tendencias
**Estado:** ⏳ PENDIENTE

**Descripción:**
El Tab Tendencias falla completamente al cargar. Muestra error "Error al cargar tendencias - Not Found".

**Causa Raíz:**
La API `/api/ml/models/rotation/trends` retorna HTTP 404. El endpoint no existe en el proyecto.

**Impacto:**
- "Predicción de rotación individual" → No funciona
- "Riesgo de rotación por segmento" → No funciona

**Recomendación:**
1. Crear el endpoint `/api/ml/models/rotation/trends` en `apps/web/src/app/api/ml/models/rotation/trends/route.ts`
2. O deshabilitar temporalmente el tab Tendencias si la funcionalidad ML no está lista

---

### ✅ BUG-002: Tab Resumen - Filtro Ubicación Rompe Incidencias/Permisos - RESUELTO

**Severidad:** CRÍTICA
**Tab:** Resumen
**Estado:** ✅ RESUELTO (2026-01-10)

**Problema Original:**
Al aplicar el filtro "Ubicación" (CAD, CORPORATIVO, FILIALES) en Tab Resumen:
- KPI "Incidencias" mostraba: **0**
- KPI "Permisos" mostraba: **0**

**Solución Aplicada:**
Se eliminó el filtro redundante de `ubicacion2` en incidencias que buscaba un campo inexistente. El filtro de Ubicación ahora filtra correctamente por la columna `cc` de `empleados_sftp` usando `normalizeCCToUbicacion()`.

**Verificación:**
- Con filtro CAD+CORPORATIVO: Empleados = 315, Permisos = 2 ✅
- KPIs se actualizan correctamente ✅
- Gráficas muestran datos filtrados ✅

**Archivo Modificado:**
- `apps/web/src/components/dashboard-page.tsx`

---

### ✅ BUG-003: Tab Rotación - Filtro Ubicación No Afecta KPIs - RESUELTO

**Severidad:** ALTA
**Tab:** Rotación
**Estado:** ✅ RESUELTO (2026-01-10)

**Problema Original:**
Al aplicar el filtro "Ubicación" en Tab Rotación, los KPIs principales NO cambiaban.

**Verificación Post-Corrección:**

| KPI | Sin Filtro | Con Filtro (CAD+CORP) | Estado |
|-----|------------|----------------------|--------|
| Activos Promedio | 364 | 316 | ✅ Filtra correctamente |
| Bajas Voluntarias | 17 | 14 | ✅ Filtra correctamente |
| Rotación Mensual | 4.7% | 4.4% | ✅ Filtra correctamente |
| Rotación Acumulada | 68.0% | 66.4% | ✅ Filtra correctamente |

**Solución:**
La corrección de BUG-002 en `dashboard-page.tsx` también resolvió este bug, ya que ambos usaban la misma lógica de filtrado centralizada.

---

### ✅ BUG-004: Inconsistencia entre Tabs - Filtro Ubicación - RESUELTO

**Severidad:** ALTA
**Tabs Afectados:** Resumen, Incidencias, Rotación
**Estado:** ✅ RESUELTO (2026-01-10)

**Estado Actual del Filtro Ubicación por Tab:**

| Tab | Comportamiento del Filtro Ubicación |
|-----|-------------------------------------|
| Resumen | ✅ Funciona correctamente |
| Personal | ✅ Funciona correctamente |
| Incidencias | ✅ Funciona correctamente |
| Rotación | ✅ Funciona correctamente |
| Tendencias | ⏳ Tab no funciona (BUG-001 - endpoint 404) |

---

## Inconsistencias Menores (Pendientes)

### 🟡 INC-001: Discrepancia en Conteo de Activos

**Tab:** Personal
**Estado:** ⏳ PENDIENTE

**Descripción:**
- KPI "Activos al cierre": **361**
- Tabla "Distribución por Edad y Género" Total: **365**
- Diferencia: 4 empleados

**Posible Causa:**
Diferente momento de cálculo o criterios de filtrado entre componentes.

---

### 🟡 INC-002: Warning de React - Keys Duplicadas

**Estado:** ⏳ PENDIENTE

**Consola:**
```
Warning: Each child in a list should have a unique "key" prop.
Check the render method of `VisualizationContainer`.
```

**Archivo:** `apps/web/src/components/visualization-container.tsx:25`

**Impacto:** No afecta funcionalidad, pero indica mala práctica de React.

---

## Matriz de Pruebas por Tab - ACTUALIZADA

### Tab Resumen ✅
| Prueba | Resultado |
|--------|-----------|
| Carga inicial | ✅ OK |
| KPIs visibles | ✅ OK |
| Filtro Año | ✅ OK |
| Filtro Mes | ✅ OK |
| Filtro Ubicación | ✅ OK (BUG-002 resuelto) |
| Gráficas | ✅ OK |

### Tab Personal ✅
| Prueba | Resultado |
|--------|-----------|
| Carga inicial | ✅ OK |
| KPIs visibles | ✅ OK |
| Filtro Ubicación | ✅ OK |
| Tablas de distribución | ✅ OK |
| Gráficas | ✅ OK |

### Tab Incidencias ✅
| Prueba | Resultado |
|--------|-----------|
| Carga inicial | ✅ OK |
| KPIs visibles | ✅ OK |
| Filtro Ubicación | ✅ OK |
| Gráficas | ✅ OK |
| Heatmap | ✅ OK |

### Tab Rotación ✅
| Prueba | Resultado |
|--------|-----------|
| Carga inicial | ✅ OK |
| KPIs visibles | ✅ OK |
| Gráficas comparativas | ✅ OK |
| Tablas de rotación | ✅ OK |
| Filtro Ubicación | ✅ OK (BUG-003 resuelto) |
| Heatmap de bajas | ✅ OK |

### Tab Tendencias ⏳
| Prueba | Resultado |
|--------|-----------|
| Carga inicial | ⏳ BUG-001 pendiente |
| Sub-tab "Predicción individual" | ⏳ 404 Error |
| Sub-tab "Riesgo por segmento" | ⏳ 404 Error |

---

## Arquitectura de Filtros - Análisis Técnico

### Dos Tipos de "Ubicación"

El sistema maneja dos campos diferentes para ubicación:

1. **`ubicacion`** (tabla `empleados_sftp`)
   - Campo: Centro de trabajo
   - Valores: CAD, SMMTY, SMSLP, etc.
   - Filtro UI: "Centro de trabajo"

2. **`ubicacionesIncidencias`** (derivado de `empleados_sftp.cc`)
   - Campo: Clasificación de ubicación derivada del Centro de Costo
   - Valores: CAD, CORPORATIVO, FILIALES
   - Filtro UI: "Ubicación"
   - Función: `normalizeCCToUbicacion(cc)` en `apps/web/src/lib/normalizers.ts`

### Interface de Filtros
```typescript
interface RetentionFilterOptions {
  years: number[]
  months: number[]
  departamentos: string[]
  puestos: string[]
  clasificaciones: string[]
  ubicaciones: string[]              // empleados_sftp.ubicacion (Centro de trabajo)
  ubicacionesIncidencias: string[]   // Derivado de empleados_sftp.cc → normalizeCCToUbicacion()
  empresas: string[]
  areas: string[]
  motivoFilter: 'involuntaria' | 'voluntaria' | 'all'
  includeInactive: boolean
}
```

### Solución Implementada
El filtro `ubicacionesIncidencias` ahora filtra empleados basándose en su columna `cc` (Centro de Costo), que se normaliza a CAD/CORPORATIVO/FILIALES mediante la función `normalizeCCToUbicacion()`. Esta lógica se aplica de manera centralizada en `apps/web/src/lib/filters/filters.ts`.

---

## Resumen de Correcciones

| Bug | Estado | Fecha | Descripción |
|-----|--------|-------|-------------|
| BUG-001 | ⏳ Pendiente | - | API ML endpoint no existe |
| BUG-002 | ✅ Resuelto | 2026-01-10 | Filtro Ubicación en Tab Resumen |
| BUG-003 | ✅ Resuelto | 2026-01-10 | Filtro Ubicación en Tab Rotación |
| BUG-004 | ✅ Resuelto | 2026-01-10 | Inconsistencia de filtros entre tabs |
| INC-001 | ⏳ Pendiente | - | Discrepancia en conteo de activos |
| INC-002 | ⏳ Pendiente | - | Warning de React keys |

---

## Conclusión

El Dashboard MRM ahora tiene **todos los filtros funcionando correctamente** en los tabs principales (Resumen, Personal, Incidencias, Rotación). El único bug crítico pendiente es **BUG-001** relacionado con el Tab Tendencias que requiere la implementación del endpoint de ML `/api/ml/models/rotation/trends`.

**Estado de producción:** ✅ Listo para uso (excepto Tab Tendencias)

---

*Reporte generado y actualizado mediante pruebas Playwright - Claude Code*
