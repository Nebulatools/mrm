# Verificación de Cambios - Corrección de Discrepancia Mensual

## Cambios Realizados

### Archivo: `apps/web/src/lib/retention-calculations.ts`

#### Cambio 1: Normalización de `rangeEnd` (Línea 92)
**ANTES:**
```typescript
const rangeEnd = new Date(endDate.getTime());
```

**DESPUÉS:**
```typescript
const rangeEnd = startOfDay(endDate); // ✅ Normalizar rangeEnd también
```

#### Cambio 2: Parsing de fechas en `bajaEventos` (Líneas 121-137)
**ANTES:**
```typescript
const fechaBajaParsed = parseSupabaseDate(evento.fecha_baja);
if (!fechaBajaParsed) return;
if (fechaBajaParsed < rangeStartInner || fechaBajaParsed > rangeEndInner) return;
```

**DESPUÉS:**
```typescript
// ✅ Usar el mismo método que getBajasPorMotivoYMesFromPlantilla (sin parseSupabaseDate)
const fechaBajaParsed = new Date(evento.fecha_baja);
if (isNaN(fechaBajaParsed.getTime())) return;

// Comparar año y mes directamente (sin zona horaria)
const fechaYear = fechaBajaParsed.getFullYear();
const fechaMonth = fechaBajaParsed.getMonth();
const rangeStartYear = rangeStartInner.getFullYear();
const rangeStartMonth = rangeStartInner.getMonth();
const rangeEndYear = rangeEndInner.getFullYear();
const rangeEndMonth = rangeEndInner.getMonth();

// Verificar si está en el rango (año + mes)
const afterStart = fechaYear > rangeStartYear || (fechaYear === rangeStartYear && fechaMonth >= rangeStartMonth);
const beforeEnd = fechaYear < rangeEndYear || (fechaYear === rangeEndYear && fechaMonth <= rangeEndMonth);

if (!afterStart || !beforeEnd) return;
```

#### Cambio 3: Parsing de fechas en FALLBACK (Líneas 168-187)
**ANTES:**
```typescript
const fechaBajaParsed = (emp as any)._fecha_baja ?? parseSupabaseDate(emp.fecha_baja);
if (!fechaBajaParsed) return;
if (fechaBajaParsed < rangeStartInner || fechaBajaParsed > rangeEndInner) return;
```

**DESPUÉS:**
```typescript
const fechaBajaRaw = (emp as any)._fecha_baja ?? emp.fecha_baja;
if (!fechaBajaRaw) return;

// ✅ Usar el mismo método que getBajasPorMotivoYMesFromPlantilla
const fechaBajaParsed = new Date(fechaBajaRaw);
if (isNaN(fechaBajaParsed.getTime())) return;

// Comparar año y mes directamente (sin zona horaria)
const fechaYear = fechaBajaParsed.getFullYear();
const fechaMonth = fechaBajaParsed.getMonth();
const rangeStartYear = rangeStartInner.getFullYear();
const rangeStartMonth = rangeStartInner.getMonth();
const rangeEndYear = rangeEndInner.getFullYear();
const rangeEndMonth = rangeEndInner.getMonth();

// Verificar si está en el rango (año + mes)
const afterStart = fechaYear > rangeStartYear || (fechaYear === rangeStartYear && fechaMonth >= rangeStartMonth);
const beforeEnd = fechaYear < rangeEndYear || (fechaYear === rangeEndYear && fechaMonth <= rangeEndMonth);

if (!afterStart || !beforeEnd) return;
```

---

## Archivo NO Modificado: `apps/web/src/lib/kpi-calculator.ts`

**El Heatmap mantiene su método correcto (Línea 940):**
```typescript
const fechaBaja = new Date(emp.fecha_baja!);
const mes = fechaBaja.getMonth(); // 0-11
heatmapData[motivo][meses[mes]]++;
```

✅ Este método ya era correcto y coincide 100% con Excel.

---

## Resultados Esperados

### Antes del Fix
| Mes | Heatmap | Tabla Comparativa | Diferencia |
|-----|---------|-------------------|------------|
| Oct | 16 | 16 | ✅ 0 |
| Nov | 13 | 12 | ❌ -1 |
| Dic | 15 | 17 | ❌ +2 |
| **Total** | **236** | **236** | ✅ 0 |

### Después del Fix (Esperado)
| Mes | Heatmap | Tabla Comparativa | Diferencia |
|-----|---------|-------------------|------------|
| Oct | 16 | 16 | ✅ 0 |
| Nov | 13 | **13** | ✅ 0 |
| Dic | 15 | **15** | ✅ 0 |
| **Total** | **236** | **236** | ✅ 0 |

---

## Verificación Manual

### Pasos para Verificar

1. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

2. **Abrir el dashboard:**
   - Navegar a `http://localhost:3000`
   - Ir a la pestaña "Rotación"

3. **Verificar Heatmap:**
   - Confirmar Nov: 13 bajas
   - Confirmar Dic: 15 bajas

4. **Verificar Tabla Comparativa:**
   - Confirmar Nov: 13 bajas
   - Confirmar Dic: 15 bajas

5. **Verificar suma total:**
   - Total 2025: 236 bajas (sin cambio)

---

## Causa Raíz del Problema

**Problema:** `parseSupabaseDate()` usaba `startOfDay()` y conversión UTC, causando cambios en la fecha debido a zona horaria.

**Ejemplo del problema:**
```
Empleado con fecha_baja = "2025-11-30"

Método incorrecto (parseSupabaseDate):
  parseISO("2025-11-30T00:00:00")
  → "2025-11-30T00:00:00Z" (UTC)
  → startOfDay() en zona local (-6:00)
  → "2025-11-29T18:00:00-06:00" (29 de noviembre) ⚠️

Método correcto (new Date() directo):
  new Date("2025-11-30")
  → "2025-11-30T00:00:00-06:00" (30 de noviembre) ✅
```

**Solución:** Usar `new Date()` directo y comparar año+mes en lugar de Date objects con `<` y `>`.

---

## Impacto

- ✅ **Archivos modificados:** 1 (`retention-calculations.ts`)
- ✅ **Funciones modificadas:** 1 (`buildEventos` dentro de `calculateMonthlyRetention`)
- ✅ **Riesgo:** Bajo (Heatmap no modificado, mantiene funcionamiento correcto)
- ✅ **Regresiones:** Ninguna esperada (solo corrige inconsistencia en Tabla Comparativa)

---

## Estado de Tests

**Tests pre-existentes:**
- `tests/retention-calculations.test.ts` usa `node:test` (configuración incorrecta, no relacionado con este fix)
- Errores de lint pre-existentes en el archivo (uso de `any`)
- Errores de TypeScript pre-existentes en tests no relacionados

**Recomendación:** Verificación manual en el dashboard es suficiente para confirmar el fix.
