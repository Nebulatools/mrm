# Análisis de Gráficas de Rotación - MRM Simple

## Resumen del Problema

El usuario detectó dos problemas:
1. **Posible duplicación de código** entre Tab Rotación y Tab Resumen
2. **Inconsistencia visual**: Las gráficas de "12 Meses Móviles" y "Lo que va del Año" se ven casi idénticas en el Tab Resumen

---

## 📊 Datos Verificados en Supabase

### Bajas por Año (Histórico Completo)
| Año | Total Bajas |
|-----|-------------|
| 2022 | 40 |
| 2023 | 175 |
| 2024 | 229 |
| 2025 | 232 |
| 2026 | 10 (ene) |

**✅ SÍ hay datos históricos de 2024**

### Distribución por Ubicación (Diciembre 2025)
| Ubicación | Total Registros | Activos | Bajas 2025 |
|-----------|-----------------|---------|------------|
| **CAD** | 693 | 176 | 173 |
| **CORPORATIVO** | 230 | 149 | 28 |
| **FILIALES** | 118 | 41 | 30 |

### Validación Manual de Cálculos

**Para enero 2025:**
| Métrica | CAD | CORPORATIVO | FILIALES |
|---------|-----|-------------|----------|
| **Rolling 12M** (feb24-ene25) | ~177 bajas | ~24 bajas | ~23 bajas |
| **YTD** (solo enero 2025) | 13 bajas | 1 baja | 3 bajas |

**¡Los valores DEBERÍAN ser muy diferentes!** Si se ven iguales en las gráficas, hay un bug.

---

## 🔍 Hallazgos del Análisis

### 1. Arquitectura de Componentes

| Componente | Archivo | Función |
|------------|---------|---------|
| **Tab Rotación** | `retention-charts.tsx` | Muestra totales generales |
| **Tab Resumen** | `summary-comparison.tsx` | Muestra por ubicación (CAD, CORP, FILIALES) |

### 2. Duplicación de Lógica Confirmada ⚠️

**Hay DOS implementaciones diferentes del mismo cálculo:**

**A) retention-charts.tsx (líneas 384-507):**
```typescript
calculateRolling12MonthRotation() // Función local
calculateYTDRotation()             // Función local
```

**B) kpi-helpers.ts (líneas 542-595):**
```typescript
calcularRotacionAcumulada12mConDesglose() // Función compartida
calcularRotacionYTDConDesglose()           // Función compartida
```

**Problema**: El Tab Resumen usa las funciones de kpi-helpers.ts, pero el Tab Rotación usa funciones locales propias.

---

### 3. Comportamiento Esperado en Diciembre

**En diciembre 2025, es CORRECTO que las gráficas sean similares:**

- **12M Móviles**: enero 2025 → diciembre 2025 (12 meses)
- **YTD**: enero 2025 → diciembre 2025 (12 meses)

**Las ventanas son idénticas en diciembre.** Pero durante el año deberían ser diferentes.

---

### 4. Inconsistencia Detectada

**Tab Rotación (correcto):**
- 12M móviles: Barras estables ~46-52%
- YTD: Línea creciente 4%→46%

**Tab Resumen (posible bug):**
- 12M móviles: Líneas crecientes 10%→75% ← **¿Por qué crece?**
- YTD: Líneas crecientes 5%→75%

**El 12M móviles en Tab Resumen debería ser más estable, no una línea creciente.**

---

### 5. Causa Raíz Probable

El problema está en `summary-comparison.tsx` líneas 333-349:

```typescript
for (let offset = 11; offset >= 0; offset--) {
  const current = new Date(baseDate.getFullYear(), baseDate.getMonth() - offset, 1);
  // ...
  const rolling = calcularRotacionAcumulada12mConDesglose(plantillaNegocio, endDate);
}
```

**Hipótesis**: El cálculo de `rolling` para cada ubicación puede estar considerando solo empleados actuales de esa ubicación, sin incluir empleados que fueron dados de baja en 2024 pero que contribuyeron a la rotación histórica.

---

## 📝 Plan de Corrección (Fix + Consolidar Código)

### Paso 1: Verificar prop `plantillaYearScope` en summary-comparison.tsx

**Archivo**: `apps/web/src/components/summary-comparison.tsx`

**Causa raíz identificada** (líneas 225-248):
```typescript
// Línea 225: Si plantillaYearScope existe, usa eso en vez de plantilla
const plantillaRotacion = plantillaYearScope?.length > 0 ? plantillaYearScope : plantilla;

// Línea 248: empleadosRotacion se llena con plantillaRotacion
(plantillaRotacion || []).forEach(emp => register(emp, true));
```

**Problema**: Si `plantillaYearScope` está filtrado solo para el año 2025, entonces `empleadosRotacion` NO incluiría empleados con bajas en 2024, lo que explicaría por qué el rolling 12M se ve igual al YTD.

**Acción**:
1. Verificar cómo se pasa `plantillaYearScope` desde el componente padre
2. Asegurar que `plantillaRotacion` incluya empleados con bajas en los últimos 12 meses (no solo el año actual)

---

### Paso 2: Consolidar funciones de cálculo en retention-charts.tsx

**Archivo**: `apps/web/src/components/retention-charts.tsx`

**Problema**: Líneas 384-507 contienen funciones duplicadas:
- `calculateRolling12MonthRotation()` (local)
- `calculateYTDRotation()` (local)

**Acción**:
1. Importar funciones de kpi-helpers.ts:
```typescript
import {
  calcularRotacionAcumulada12mConDesglose,
  calcularRotacionYTDConDesglose
} from '@/lib/utils/kpi-helpers';
```

2. Reemplazar llamadas a funciones locales con las compartidas
3. Eliminar las funciones duplicadas (líneas 384-507)

---

### Paso 3: Validar consistencia de fórmulas en kpi-helpers.ts

**Archivo**: `apps/web/src/lib/utils/kpi-helpers.ts`

**Verificar** que las funciones:
- `calcularRotacionAcumulada12mConDesglose()` (línea 542)
- `calcularRotacionYTDConDesglose()` (línea 573)

Usan la misma lógica que retention-charts.tsx antes de eliminar el código duplicado.

---

### Paso 4: Ajustar tests existentes

**Archivo**: `apps/web/src/lib/__tests__/kpi-helpers.test.ts`

Agregar test específico que valide que para enero 2025:
- Rolling 12M ≠ YTD (deben ser diferentes)
- Rolling 12M incluye bajas de 2024

---

## Archivos a Modificar

| Archivo | Líneas | Cambio |
|---------|--------|--------|
| `summary-comparison.tsx` | 227-282 | Remover filtro de `activo` en empleadosRotacion |
| `retention-charts.tsx` | 384-507 | Eliminar funciones duplicadas, usar kpi-helpers |
| `retention-charts.tsx` | ~15 | Agregar imports de kpi-helpers |
| `kpi-helpers.test.ts` | nuevo | Test de diferencia rolling vs ytd |

---

## Verificación

### Test Manual:
1. `npm run dev` → Abrir dashboard
2. Ir a Tab Resumen → Verificar gráfica "12 Meses Móviles"
3. El valor de **febrero 2025** debe ser ~40-50% (no ~10%)
4. Comparar con Tab Rotación - los totales deben coincidir

### Test Automatizado:
```bash
npm test -- kpi-helpers
```

### Validación SQL:
```sql
-- Verificar que rolling enero 2025 incluya bajas 2024
SELECT COUNT(*) FROM empleados_sftp
WHERE fecha_baja BETWEEN '2024-02-01' AND '2025-01-31';
-- Debe ser ~200+ (no solo 13)
```

---

## Resultado Esperado

| Gráfica | Antes (Bug) | Después (Correcto) |
|---------|-------------|-------------------|
| 12M Móviles Tab Resumen | Línea creciente 10%→75% | Línea estable ~45-55% |
| YTD Tab Resumen | Línea creciente 5%→75% | Sin cambio (correcto) |
| 12M Móviles Tab Rotación | Barras estables | Sin cambio |
| YTD Tab Rotación | Línea creciente | Sin cambio |
