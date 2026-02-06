# 🐛 BUG: Bajas Involuntarias Parpadea de 9 → 10

## 📋 Descripción del Problema

Al refrescar el dashboard, el contador "Bajas Involuntarias" muestra **9** durante ~2 segundos y luego cambia a **10**.

**Evidencia visual:**
```
REFRESH → [9] → wait 2s → [10] ✅
```

---

## 🔍 Análisis de Causa Raíz

### Ubicación del Bug

**Archivo:** `apps/web/src/lib/utils/kpi-helpers.ts`
**Función:** `calcularRotacionConDesglose()` (líneas 446-545)
**Hook afectado:** `use-retention-kpis.ts` (línea 271)
**Componente UI:** `rotacion-tab.tsx` (línea 164)

### Causa: Race Condition en Carga de Datos

La función `calcularRotacionConDesglose` tiene **dos caminos de cálculo**:

```typescript
// Línea 489-499: CAMINO CORRECTO (10 bajas)
if (bajasData && bajasData.length > 0) {
  // Usa tabla motivos_baja como fuente canónica
  const bajasEnPeriodo = bajasData.filter(b => {
    const raw = typeof b.fecha_baja === 'string'
      ? b.fecha_baja.slice(0, 10)
      : formatDateKey(new Date(b.fecha_baja));
    return raw >= startKey && raw <= endKey;
  });
  totalBajas = bajasEnPeriodo.length;
  countInvoluntarias = bajasEnPeriodo.filter(b => isMotivoClave(b.motivo)).length;
  countVoluntarias = totalBajas - countInvoluntarias;
}

// Línea 500-514: FALLBACK (9 bajas - INCORRECTO)
else {
  // Fallback: usar empleados_sftp.fecha_baja (comportamiento original)
  const todasLasBajas = plantilla.filter(emp => {
    if (!emp.fecha_baja) return false;
    const raw = typeof emp.fecha_baja === 'string'
      ? emp.fecha_baja.slice(0, 10)
      : formatDateKey(new Date(emp.fecha_baja));
    return raw >= startKey && raw <= endKey;
  });
  totalBajas = todasLasBajas.length;
  countInvoluntarias = todasLasBajas.filter(emp =>
    isMotivoClave((emp as any).motivo_baja)
  ).length;
  countVoluntarias = totalBajas - countInvoluntarias;
}
```

### Secuencia del Bug

```
1. Usuario refresca página (F5)
   ↓
2. React re-renderiza componentes
   ↓
3. PRIMER RENDER: bajasData = [] (aún no cargado)
   → Usa fallback de empleados_sftp.fecha_baja
   → Cuenta 9 bajas involuntarias ❌
   ↓
4. Supabase query completa (2 segundos después)
   → bajasData = [677 registros de motivos_baja]
   ↓
5. SEGUNDO RENDER: bajasData = [...]
   → Usa motivos_baja (fuente correcta)
   → Cuenta 10 bajas involuntarias ✅
```

### ¿Por qué 9 vs 10?

**Diferencia de fuentes:**
- **empleados_sftp.fecha_baja**: Solo tiene la baja MÁS RECIENTE por empleado (snapshot actual)
- **motivos_baja**: Tiene el HISTORIAL COMPLETO de bajas (incluyendo rehires)

**Ejemplo de empleado con múltiples bajas:**
- Empleado #123 se dio de baja en Enero 2025
- Se reincorporó en Marzo 2025
- Se volvió a dar de baja en Diciembre 2025

**En empleados_sftp:**
```
empleado #123 → fecha_baja: 2025-12-31 (solo la última)
```

**En motivos_baja:**
```
{numero_empleado: 123, fecha_baja: 2025-01-15, motivo: "Rescisión por desempeño"} ← ESTA no aparece en empleados_sftp
{numero_empleado: 123, fecha_baja: 2025-12-31, motivo: "Baja Voluntaria"}
```

Por eso:
- **Fuente motivos_baja:** 10 bajas involuntarias ✅ (incluye bajas históricas)
- **Fuente empleados_sftp:** 9 bajas involuntarias ❌ (solo última baja por empleado)

---

## 🛠️ Soluciones Propuestas

### Opción 1: Loading State Adecuado (⭐ RECOMENDADA)

Mostrar skeleton/spinner hasta que `bajasData` esté cargado.

**Cambios requeridos:**
1. Agregar prop `bajasDataLoading` a `use-retention-kpis`
2. Mostrar `<KPICardSkeleton />` mientras carga
3. Solo renderizar valor cuando datos estén completos

**Pros:**
- ✅ No muestra valores incorrectos
- ✅ UX clara (usuario sabe que está cargando)
- ✅ No requiere cambios en lógica de negocio

**Contras:**
- ⚠️ Requiere modificar múltiples componentes

### Opción 2: Pre-cargar `bajasData` en Servidor (⚡ MEJOR PERFORMANCE)

Usar Server Components o `getServerSideProps` para cargar datos antes del render.

**Cambios requeridos:**
1. Mover query de `bajasData` a Server Component
2. Pasar datos pre-cargados como props

**Pros:**
- ✅ Elimina race condition completamente
- ✅ Mejor performance (datos disponibles inmediatamente)
- ✅ No hay parpadeo

**Contras:**
- ⚠️ Requiere refactor de arquitectura (usar App Router)

### Opción 3: Optimistic Update con useMemo (🔧 QUICK FIX)

Cachear último valor válido mientras carga nuevo.

**Cambios requeridos:**
```typescript
const [cachedBajasInvoluntarias, setCachedBajasInvoluntarias] = useState(0);

useEffect(() => {
  if (filteredRetentionKPIs.bajasInvoluntarias > 0) {
    setCachedBajasInvoluntarias(filteredRetentionKPIs.bajasInvoluntarias);
  }
}, [filteredRetentionKPIs.bajasInvoluntarias]);
```

**Pros:**
- ✅ Fix rápido
- ✅ Mínimos cambios

**Contras:**
- ⚠️ No elimina el problema raíz
- ⚠️ Puede mostrar valor desactualizado

### Opción 4: Remover Fallback (⚠️ RIESGOSO)

Eliminar path de `empleados_sftp.fecha_baja` y solo usar `motivos_baja`.

**Cambios requeridos:**
```typescript
// Línea 489
if (!bajasData || bajasData.length === 0) {
  return {
    total: 0,
    involuntaria: 0,
    voluntaria: 0,
    bajas: 0,
    bajasInvoluntarias: 0,
    bajasVoluntarias: 0,
    activosPromedio
  };
}

// Continuar con lógica de motivos_baja...
```

**Pros:**
- ✅ Elimina ambigüedad de fuentes
- ✅ Fuerza carga correcta

**Contras:**
- ❌ Rompe dashboard si `bajasData` falla
- ❌ No funciona durante transición o migraciones

---

## ✅ Recomendación Final

### Implementar Opción 1 + Opción 2 (Híbrido)

**Corto plazo (Opción 1):**
1. Agregar loading state para `bajasData`
2. Mostrar skeleton hasta que datos estén listos
3. Prevenir render con datos parciales

**Mediano plazo (Opción 2):**
1. Migrar a Server Components (Next.js App Router)
2. Pre-cargar `motivos_baja` en servidor
3. Eliminar race condition completamente

---

## 📝 Plan de Implementación

### Fase 1: Fix Inmediato (1 hora)

```typescript
// apps/web/src/hooks/use-retention-kpis.ts
export function useRetentionKPIs(
  // ... parámetros existentes
  bajasDataLoading: boolean // ← AGREGAR
) {
  // Si bajasData aún no carga, retornar valores en 0
  if (bajasDataLoading) {
    return INITIAL_KPIS;
  }

  // ... resto de lógica
}

// apps/web/src/components/rotacion/rotacion-tab.tsx
{bajasDataLoading ? (
  <KPICardSkeleton refreshEnabled />
) : (
  <KPICard
    kpi={{
      name: "Bajas Voluntarias",
      value: filteredRetentionKPIs.bajasVoluntarias,
      // ...
    }}
    secondaryValue={filteredRetentionKPIs.bajasInvoluntarias}
  />
)}
```

### Fase 2: Mejora Arquitectónica (4 horas)

```typescript
// apps/web/src/app/dashboard/page.tsx (Server Component)
export default async function DashboardPage() {
  // Pre-cargar datos críticos en servidor
  const bajasData = await supabase
    .from('motivos_baja')
    .select('*')
    .order('fecha_baja', { ascending: false });

  return (
    <DashboardClient
      initialBajasData={bajasData}
    />
  );
}
```

---

## 🧪 Testing

**Casos de prueba:**

1. **Refresh rápido:** F5 → verificar que NO parpadea
2. **Navegación entre tabs:** Cambiar tab → verificar consistencia
3. **Filtros aplicados:** Cambiar mes/año → verificar recálculo correcto
4. **Datos vacíos:** Sin bajas en período → verificar manejo de 0
5. **Error de carga:** Supabase timeout → verificar fallback graceful

**Comandos:**
```bash
# Unit tests
npm test -- kpi-helpers

# E2E tests
npm run test:e2e -- rotacion-tab
```

---

## 📚 Referencias

- **Código afectado:**
  - `apps/web/src/lib/utils/kpi-helpers.ts:446-545`
  - `apps/web/src/hooks/use-retention-kpis.ts:196-201`
  - `apps/web/src/components/rotacion/rotacion-tab.tsx:164`

- **Documentación relacionada:**
  - `docs/KPI_FORMULAS.md` - Fórmulas de rotación
  - `CLAUDE.md` - Sistema de filtros y fuentes de datos
  - `tabs/tab-4-rotacion.md` - Especificación del tab

- **Issues relacionados:**
  - Fix de incidencias faltantes (paginación + rehires) - Enero 2026
  - Integración de ubicacion2 en empleados_sftp - Enero 2026

---

## 🎯 Conclusión

**Problema:** Race condition entre carga de `empleados_sftp` y `motivos_baja`

**Causa raíz:** Fallback a fuente incorrecta mientras datos canónicos cargan

**Impacto:** Parpadeo visual (9 → 10) que confunde al usuario

**Solución recomendada:** Loading state + pre-carga en servidor

**Prioridad:** 🟡 Media (no afecta funcionalidad, solo UX)

**Estado:** ⏳ Pendiente de implementación

---

**Fecha:** 5 Febrero 2026
**Reportado por:** Usuario (jaco)
**Analizado por:** Claude Code (Sonnet 4.5)
**Próximo paso:** Implementar Fase 1 (Loading State)
