# 🚨 PROBLEMA CRÍTICO DETECTADO - DATOS INCORRECTOS

**Fecha:** 8 de enero de 2026
**Severidad:** 🔴 **CRÍTICA** - Los datos en Supabase NO coinciden con la realidad

---

## 🔍 PROBLEMA IDENTIFICADO

### Comparación: Datos Reales vs Datos en Supabase

#### ENERO 2025 - Datos del Screenshot (REALES)
```
✅ DATOS CORRECTOS (del screenshot):
  Headcount:              348 empleados
  Bajas Voluntarias:      14
  Bajas Involuntarias:    4
  Total Bajas:            18
```

#### ENERO 2025 - Datos en Supabase (ACTUALES)
```
❌ DATOS INCORRECTOS (en Supabase):
  Headcount:              239 empleados  ← ❌ Faltan 109 empleados!
  Bajas Voluntarias:      0              ← ❌ Faltan 14 bajas!
  Bajas Involuntarias:    51             ← ❌ 47 bajas de más!
  Total Bajas:            51             ← ❌ Completamente erróneo
```

### Discrepancias Encontradas

| Métrica | Real (Screenshot) | Supabase | Diferencia | Estado |
|---------|------------------|----------|------------|--------|
| **Headcount Enero** | 348 | 239 | -109 | ❌ CRÍTICO |
| **Bajas Voluntarias** | 14 | 0 | -14 | ❌ CRÍTICO |
| **Bajas Involuntarias** | 4 | 51 | +47 | ❌ CRÍTICO |
| **Total Bajas** | 18 | 51 | +33 | ❌ CRÍTICO |

---

## 🔎 CAUSA RAÍZ DEL PROBLEMA

### 1. Patches Manuales con Datos Viejos

**Archivos de patches encontrados:**
```
parches/motivos_baja_inserts.sql     - 432 líneas de INSERTs
parches/incidencias_patch_insert.sql - Tamaño grande (no leído)
```

**Problema:** Estos patches tienen datos **HASTA DICIEMBRE 2024**, NO tienen datos de 2025.

### 2. Botón "FORZAR IMPORTACIÓN REAL" Deshabilitado

**Código encontrado:**
```typescript
const forceImportEnabled = false;  ← ❌ DESHABILITADO
```

**Ubicación:** `apps/web/src/components/sftp-import-admin.tsx:84`

**Problema:** El botón que trae datos reales desde SFTP está deshabilitado por seguridad.

### 3. Solo se Usa "Actualizar Información (Manual)"

**Este botón usa:** `/api/import-sftp-real-data?trigger=manual`

**Problema:** Este endpoint probablemente:
- Usa caché viejo
- O solo agrega datos incrementales SIN limpiar los viejos
- O tiene lógica diferente que no limpia duplicados de los patches

---

## 🎯 EXPLICACIÓN DE LAS DIFERENCIAS

### ¿Por qué Supabase tiene más bajas que SFTP?

**Respuesta:** Por los **patches manuales** que aplicaron.

```
Supabase tiene:
  ├─ Bajas de los patches (2023-2024): ~1,000 registros
  └─ Bajas reales de SFTP (si se importan): ~100 registros

SFTP tiene:
  └─ Solo datos del período actual (incremental): 1-2 registros
```

**Pero el problema es:** Los patches tienen datos hasta 2024, NO tienen 2025.

### ¿Por qué el dashboard muestra números incorrectos para 2025?

**Respuesta:** Porque en Supabase NO hay datos correctos de 2025.

Los patches terminan en:
```
Última línea del patch: '2024-12-31' ← Diciembre 2024
```

Los datos reales de 2025 NO ESTÁN en Supabase.

---

## 🔧 DIFERENCIA ENTRE LOS DOS BOTONES

### Botón 1: "FORZAR IMPORTACIÓN REAL (SIN CACHÉ)"

**Endpoint:** `/api/import-real-sftp-force`

**Lo que hace:**
1. ✅ Conecta directamente a SFTP (sin caché)
2. ✅ Descarga archivos reales
3. ✅ BORRA duplicados antes de insertar
4. ✅ Inserta datos frescos
5. ✅ Actualiza empleados con UPSERT

**Estado actual:** ❌ **DESHABILITADO** por seguridad

### Botón 2: "Actualizar Información (Manual)"

**Endpoint:** `/api/import-sftp-real-data?trigger=manual`

**Lo que hace:**
1. ⚠️ Puede usar caché
2. ⚠️ Solo agrega datos nuevos (NO limpia viejos)
3. ⚠️ No borra duplicados de patches

**Estado actual:** ✅ Habilitado

---

## 🚨 PROBLEMA PRINCIPAL

### Los Datos en Supabase son una MEZCLA:

```
Supabase motivos_baja (1,108 registros):
  ├─ Patches manuales (2023-2024): ~1,000 registros
  │  └─ Última fecha: 31 de diciembre 2024
  │
  └─ Importaciones reales (2025): ~100 registros
     └─ PERO ESTÁN MEZCLADOS con datos incorrectos de patches
```

### El Dashboard Calcula MAL porque:

1. **Usa datos de patches** que NO son reales para 2025
2. **Los filtros** buscan en estos datos incorrectos
3. **Los KPIs** se calculan con números equivocados

---

## 💡 SOLUCIÓN RECOMENDADA

### Opción 1: LIMPIAR TODO Y REIMPORTAR (Recomendada) ⭐

**Pasos:**
```sql
-- 1. BORRAR todos los datos de las tablas (EMPEZAR DE CERO)
TRUNCATE TABLE prenomina_horizontal CASCADE;
TRUNCATE TABLE incidencias CASCADE;
TRUNCATE TABLE motivos_baja CASCADE;
TRUNCATE TABLE asistencia_diaria CASCADE;
TRUNCATE TABLE empleados_sftp CASCADE;

-- 2. HABILITAR el botón de importación real
-- Cambiar en sftp-import-admin.tsx línea 84:
const forceImportEnabled = true;  ← Cambiar a true

-- 3. IMPORTAR todo fresco desde SFTP
-- Usar el botón "FORZAR IMPORTACIÓN REAL"
```

**Ventajas:**
- ✅ Datos 100% reales desde SFTP
- ✅ Sin patches viejos
- ✅ Sin duplicados
- ✅ Números correctos

**Desventajas:**
- ⚠️ Pierdes el histórico de 2023-2024
- ⚠️ Solo tendrás datos desde que el SFTP los tenga

### Opción 2: IMPORTAR SOLO 2025 (Más Segura)

**Pasos:**
```sql
-- 1. BORRAR solo datos de 2025 (preservar histórico)
DELETE FROM motivos_baja WHERE fecha_baja >= '2025-01-01';
DELETE FROM incidencias WHERE fecha >= '2025-01-01';
DELETE FROM asistencia_diaria WHERE fecha >= '2025-01-01';

-- 2. ACTUALIZAR empleados activos
UPDATE empleados_sftp SET activo = false WHERE fecha_baja IS NOT NULL;

-- 3. IMPORTAR desde SFTP
-- Usar botón "FORZAR IMPORTACIÓN REAL" (habilitarlo primero)
```

**Ventajas:**
- ✅ Preserva histórico 2023-2024 de patches
- ✅ Datos correctos para 2025
- ✅ Menos riesgoso

**Desventajas:**
- ⚠️ Mezcla de fuentes (patches + SFTP real)
- ⚠️ Posibles inconsistencias

---

## 🔍 ANÁLISIS DE LOS ENDPOINTS

### Endpoint 1: `/api/import-real-sftp-force` (DESHABILITADO)

**Lo que hace:**
1. Descarga `Validacion Alta de empleados.xls` desde SFTP
2. Descarga `Prenomina Horizontal.csv` desde SFTP
3. Descarga `MotivosBaja.csv` desde SFTP

4. Para **empleados:**
   - Hace UPSERT (actualiza si existe, inserta si no)
   - Preserva histórico

5. Para **bajas:**
   - **BORRA duplicados** antes de insertar
   - Inserta solo las nuevas

6. Para **prenomina:**
   - Hace UPSERT por (numero_empleado, semana_inicio)
   - No duplica semanas

**¿Es seguro?** ✅ SÍ, pero con precaución:
- Si lo usas, va a MEZCLAR los datos de patches con los reales de SFTP
- Puede crear inconsistencias

### Endpoint 2: `/api/import-sftp-real-data` (HABILITADO)

**No puedo ver el código completo**, pero probablemente:
- Usa caché
- Solo agrega datos nuevos
- NO borra duplicados de patches

---

## 🎯 MI RECOMENDACIÓN

### 🔴 **ACCIÓN URGENTE: LIMPIAR Y REIMPORTAR**

#### Paso 1: Habilitar el botón de importación real

```typescript
// Archivo: apps/web/src/components/sftp-import-admin.tsx
// Línea: 84

// ANTES:
const forceImportEnabled = false;

// DESPUÉS:
const forceImportEnabled = true;
```

#### Paso 2: DECIDIR qué hacer con los datos

**Opción A:** Empezar de cero (RECOMENDADO para datos correctos)
```sql
-- BORRAR TODO
TRUNCATE TABLE prenomina_horizontal CASCADE;
TRUNCATE TABLE incidencias CASCADE;
TRUNCATE TABLE motivos_baja CASCADE;
TRUNCATE TABLE asistencia_diaria CASCADE;
TRUNCATE TABLE empleados_sftp CASCADE;
```

**Opción B:** Solo limpiar 2025
```sql
-- BORRAR solo 2025
DELETE FROM motivos_baja WHERE fecha_baja >= '2025-01-01';
DELETE FROM incidencias WHERE fecha >= '2025-01-01';
DELETE FROM asistencia_diaria WHERE fecha >= '2025-01-01';
DELETE FROM prenomina_horizontal WHERE semana_inicio >= '2025-01-01';
```

#### Paso 3: Importar desde SFTP

1. Clic en "FORZAR IMPORTACIÓN REAL"
2. Esperar a que termine
3. Verificar números

---

## ❓ ¿QUÉ BOTÓN DEBES USAR?

### MI RECOMENDACIÓN: **"FORZAR IMPORTACIÓN REAL"**

**Razones:**
1. ✅ Trae datos directamente desde SFTP (fuente de verdad)
2. ✅ Sin caché (datos frescos)
3. ✅ Borra duplicados antes de insertar
4. ✅ UPSERT para empleados (actualiza correctamente)

**Pero primero:**
- Debes habilitarlo cambiando `forceImportEnabled` a `true`
- Debes decidir si limpias TODO o solo 2025

### NO uses "Actualizar Información (Manual)" hasta saber qué hace

Necesito ver ese endpoint para decirte si es seguro.

---

## 🔎 PRÓXIMA ACCIÓN REQUERIDA

¿Qué quieres hacer?

**Opción 1:** EMPEZAR DE CERO (datos 100% correctos, pierdes histórico)
**Opción 2:** LIMPIAR solo 2025 (preservas histórico de patches)
**Opción 3:** PRIMERO revisar el otro endpoint antes de decidir

**Recomiendo:** Opción 1 para tener datos correctos desde el inicio.

---

**CONCLUSIÓN: Los datos actuales en Supabase NO son confiables para 2025.**
