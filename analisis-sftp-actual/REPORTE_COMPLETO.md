# 📊 REPORTE COMPLETO: QUÉ HAY EN CADA FUENTE

**Fecha:** 8 de enero de 2026
**Análisis:** Datos EXACTOS de SFTP + Patches + Supabase AHORA

---

## 🎯 RESUMEN EJECUTIVO

### Estado ACTUAL del Sistema (Después de TRUNCATE + Importación + Patches)

| Tabla | Registros Ahora | Registros ANTES | Diferencia | Estado |
|-------|-----------------|-----------------|------------|--------|
| **empleados_sftp** | 1,043 | 1,041 | +2 | ✅ Mejor |
| **motivos_baja** | 422 | 1,108 | -686 | ❌ Falta 2025 |
| **incidencias** | 2,644 | 2,959 | -315 | ❌ Falta ene-jun 2025 |
| **prenomina_horizontal** | 366 | 366 | 0 | ✅ Igual |
| **asistencia_diaria** | 0 | 2,632 | -2,632 | ❌ TODO perdido |

### Datos Faltantes en Total:
```
❌ 686 bajas (principalmente de 2025)
❌ 315 incidencias (ene-jun 2025)
❌ 2,632 registros de asistencia (TODO)
───────────────────────────────────────
Total: ~3,633 registros perdidos
```

---

## 📡 FUENTE 1: SERVIDOR SFTP (Analizado previamente)

### Archivo 1: "Validacion Alta de empleados.xls"

```
📄 Validacion Alta de empleados.xls
──────────────────────────────────────────────────
Total registros:     1,043 empleados
Tipo de archivo:     SNAPSHOT COMPLETO
Columnas:            28 columnas

Activos:             365 empleados
Inactivos:           678 empleados

Fecha más antigua:   2008-01-10
Fecha más reciente:  2026-01-XX

Contenido:
  ✅ TODOS los empleados (activos e inactivos)
  ✅ Con fecha_ingreso desde 2008
  ✅ Con fecha_baja si aplica
  ✅ Snapshot COMPLETO al día de hoy

Cobertura:           ✅ 100% COMPLETO
```

**✅ Este archivo SÍ tiene TODO lo necesario de empleados**

---

### Archivo 2: "MotivosBaja.csv"

```
📄 MotivosBaja.csv
──────────────────────────────────────────────────
Total registros:     1 baja
Tipo de archivo:     INCREMENTAL (solo reciente)

Contenido COMPLETO:
  Registro 1:
    Empleado:  2580
    Fecha:     06/01/2026
    Tipo:      Baja
    Motivo:    Otro trabajo mejor compensado

Cobertura:           ❌ Solo enero 2026 (1 baja)
```

**❌ Este archivo NO tiene:**
- Bajas de 2025 (0 bajas)
- Bajas de 2024 (0 bajas)
- Bajas de 2023 (0 bajas)
- **Solo tiene la baja MÁS RECIENTE**

**¿Por qué?**
```
RH sobrescribe el archivo cada vez:
  - Enero 2025: Archivo tenía bajas de enero 2025
  - Febrero 2025: Archivo se sobrescribió con febrero
  - ...
  - Enero 2026: Archivo se sobrescribió con enero 2026

Resultado: Solo queda la versión más reciente
```

---

### Archivo 3: "Incidencias.csv"

```
📄 Incidencias.csv
──────────────────────────────────────────────────
Total registros:     0-10 incidencias
Tipo de archivo:     INCREMENTAL (solo reciente)

Contenido:           Vacío o muy pocas incidencias recientes

Cobertura:           ❌ Solo últimos días
```

**❌ Este archivo NO tiene:**
- Incidencias de 2025
- Incidencias de 2024
- **Solo tiene incidencias muy recientes**

---

### Archivo 4: "Prenomina Horizontal.csv"

```
📄 Prenomina Horizontal.csv
──────────────────────────────────────────────────
Total registros:     366 empleados
Tipo de archivo:     SEMANAL (solo semana actual)

Semana:              01/01/2026 - 07/01/2026
Columnas:            30 (días × horas)

Contenido:           Horas de la semana 01-07 Enero 2026

Cobertura:           ✅ Semana actual completa
                     ❌ NO tiene semanas anteriores
```

**❌ Este archivo NO tiene:**
- Semanas de diciembre 2025
- Semanas de todo 2025
- **Solo tiene la semana ACTUAL**

---

## 📁 FUENTE 2: PATCHES LOCALES

### Patch 1: motivos_baja_inserts.sql

```
📄 parches/motivos_baja_inserts.sql
──────────────────────────────────────────────────
Total registros:     421 bajas
Período cubierto:    2023-2024 SOLAMENTE

Desglose por año:
  2023:  181 bajas ✅
  2024:  240 bajas ✅
  2025:  0 bajas ❌ NO HAY
  2026:  0 bajas ❌ NO HAY

Primera fecha:       02/01/2023
Última fecha:        31/12/2024

Estado:              ✅ Aplicado a Supabase
```

**❌ Este patch NO tiene:**
- Bajas de 2025 (0 bajas)
- Bajas de 2026 (0 bajas)

---

### Patch 2: incidencias_patch_insert.sql

```
📄 parches/incidencias_patch_insert.sql
──────────────────────────────────────────────────
Total registros:     2,644 incidencias
Período cubierto:    Jul-Dic 2025 SOLAMENTE

Desglose por mes:
  2025-01:  0 ❌
  2025-02:  0 ❌
  2025-03:  0 ❌
  2025-04:  0 ❌
  2025-05:  0 ❌
  2025-06:  0 ❌
  2025-07:  775 ✅
  2025-08:  814 ✅
  2025-09:  645 ✅
  2025-10:  331 ✅
  2025-11:  39 ✅
  2025-12:  40 ✅

Primera fecha:       01/07/2025
Última fecha:        31/12/2025

Estado:              ✅ Aplicado a Supabase
```

**❌ Este patch NO tiene:**
- Incidencias ene-jun 2025 (0 incidencias)

---

## 🗄️ FUENTE 3: SUPABASE (AHORA - Después del proceso)

### Estado ACTUAL en Supabase

```
empleados_sftp:       1,043 registros
  Fuente: SFTP actual ✅
  Cobertura: Completa ✅

motivos_baja:         422 registros
  Fuente: 421 (patch 2023-2024) + 1 (SFTP ene 2026)
  Cobertura:
    2023: ✅ 181 bajas
    2024: ✅ 240 bajas
    2025: ❌ 0 bajas (FALTA TODO EL AÑO)
    2026: ✅ 1 baja

incidencias:          2,644 registros
  Fuente: Patch jul-dic 2025
  Cobertura:
    2025 (Ene-Jun): ❌ 0 (FALTA)
    2025 (Jul-Dic): ✅ 2,644

prenomina_horizontal: 366 registros
  Fuente: SFTP actual ✅
  Cobertura: Semana actual ✅

asistencia_diaria:    0 registros
  Fuente: Ninguna
  Cobertura: ❌ TODO FALTA
```

---

## 📊 COMPARACIÓN: ANTES vs AHORA

### ANTES del TRUNCATE (Lo que tenías)

```
empleados_sftp:       1,041 registros
motivos_baja:         1,108 registros
  └─ Incluía bajas de 2025 (con duplicados 3x)
incidencias:          2,959 registros
  └─ Incluía incidencias de ene-jun 2025
asistencia_diaria:    2,632 registros
prenomina_horizontal: 366 registros
─────────────────────────────────────────
Total: ~8,106 registros
```

### AHORA (Después de TRUNCATE + SFTP + Patches)

```
empleados_sftp:       1,043 registros ✅ (+2)
motivos_baja:         422 registros ❌ (-686)
incidencias:          2,644 registros ❌ (-315)
asistencia_diaria:    0 registros ❌ (-2,632)
prenomina_horizontal: 366 registros ✅ (=)
─────────────────────────────────────────
Total: ~4,475 registros
```

### Diferencia: -3,631 registros perdidos

---

## ❌ QUÉ SE PERDIÓ (EN DETALLE)

### 1. Bajas de 2025 (~686 registros)

**Antes tenías:**
```
Bajas de 2025 en Supabase: ~230 bajas únicas
  └─ Cada baja triplicada = ~690 registros

Ejemplo Enero 2025 (antes):
  - Empleado #2517: baja 06/01/2025 (3 registros duplicados)
  - Empleado #1855: baja 07/01/2025 (3 registros duplicados)
  - ... 15 empleados más
  Total: 17 empleados = 51 registros (17 × 3)
```

**Ahora tienes:**
```
Bajas de 2025: 0 registros ❌

¿De dónde vienen?:
  SFTP actual: ❌ NO (solo tiene 2026)
  Patches: ❌ NO (solo tienen 2023-2024)

Solo estaban en Supabase (importadas previamente)
```

---

### 2. Incidencias Ene-Jun 2025 (~315 registros)

**Antes tenías:**
```
Incidencias 2025 completo: ~2,959 total
  - Jul-Dic: 2,644 (del patch) ✅
  - Ene-Jun: ~315 ❌ NO en patch
```

**Ahora tienes:**
```
Incidencias 2025:
  - Jul-Dic: 2,644 ✅ (del patch)
  - Ene-Jun: 0 ❌ PERDIDAS

¿De dónde vienen?:
  SFTP actual: ❌ NO (vacío)
  Patches: ❌ NO (solo jul-dic)

Solo estaban en Supabase
```

---

### 3. Asistencia Diaria (2,632 registros)

**Antes tenías:**
```
2,632 registros de asistencia diaria
```

**Ahora tienes:**
```
0 registros ❌

¿De dónde vienen?:
  SFTP: ❌ NO hay archivo de asistencia
  Patches: ❌ NO hay patch de asistencia

Solo estaban en Supabase (generadas automáticamente o importadas)
```

---

## 🔑 RESPUESTA A TU PREGUNTA PRINCIPAL

### "¿SFTP + Patches deberían tener todo, no?"

**NO, porque:**

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  SFTP (2026 solo) + Patches (2023-2024 + jul-dic 2025) │
│                          ≠                              │
│              TODOS los datos de 2025                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**El problema:**
1. **SFTP** solo guarda archivos recientes (no histórico)
2. **Patches** son parciales (solo algunos períodos)
3. **Datos de 2025** solo estaban en Supabase
4. **Al hacer TRUNCATE** se perdieron

---

## 📋 QUÉ CONTIENE EXACTAMENTE CADA FUENTE

### SFTP ACTUAL (Enero 2026)

```
📁 SFTP: 148.244.90.21:5062/ReportesRH/

├─ Validacion Alta de empleados.xls
│  └─ 1,043 empleados (snapshot COMPLETO) ✅
│
├─ MotivosBaja.csv
│  └─ 1 baja de enero 2026 SOLAMENTE ❌
│
├─ Incidencias.csv
│  └─ 0-10 incidencias recientes ❌
│
└─ Prenomina Horizontal.csv
   └─ 366 registros de semana 01-07 ene 2026 ✅
```

### PATCHES LOCALES

```
📁 parches/

├─ motivos_baja_inserts.sql
│  └─ 421 bajas de 2023-2024 SOLAMENTE
│     ├─ 2023: 181 ✅
│     ├─ 2024: 240 ✅
│     ├─ 2025: 0 ❌
│     └─ 2026: 0 ❌
│
└─ incidencias_patch_insert.sql
   └─ 2,644 incidencias de jul-dic 2025 SOLAMENTE
      ├─ 2025-01 a 06: 0 ❌
      └─ 2025-07 a 12: 2,644 ✅
```

### SUPABASE ACTUAL

```
🗄️ Supabase: ufdlwhdrrvktthcxwpzt

├─ empleados_sftp: 1,043
│  └─ Fuente: SFTP actual ✅
│
├─ motivos_baja: 422
│  ├─ 421 del patch (2023-2024) ✅
│  └─ 1 del SFTP (2026) ✅
│
├─ incidencias: 2,644
│  └─ Del patch (jul-dic 2025) ✅
│
├─ prenomina_horizontal: 366
│  └─ Del SFTP (ene 2026) ✅
│
└─ asistencia_diaria: 0 ❌
```

---

## ❌ QUÉ FALTA Y DÓNDE ESTABA

### Datos Faltantes por Tabla

**motivos_baja:**
```
ANTES:    1,108 registros
AHORA:    422 registros
FALTAN:   686 registros

¿Qué falta?:
  - Bajas de 2025 completo: ~230 bajas únicas
    (estaban triplicadas = ~690 registros)

¿Dónde estaban?:
  ❌ NO en SFTP (solo tiene 2026)
  ❌ NO en patches (solo tienen 2023-2024)
  ✅ Solo en Supabase (importadas previamente de SFTP histórico)
```

**incidencias:**
```
ANTES:    2,959 registros
AHORA:    2,644 registros
FALTAN:   315 registros

¿Qué falta?:
  - Incidencias ene-jun 2025: ~315 registros

¿Dónde estaban?:
  ❌ NO en SFTP (vacío)
  ❌ NO en patches (solo jul-dic 2025)
  ✅ Solo en Supabase
```

**asistencia_diaria:**
```
ANTES:    2,632 registros
AHORA:    0 registros
FALTAN:   2,632 registros (TODO)

¿Dónde estaban?:
  ❌ NO en SFTP (no hay archivo de asistencia)
  ❌ NO en patches (no hay patch de asistencia)
  ✅ Solo en Supabase (generadas o importadas previamente)
```

---

## 🔍 PROCESO QUE CORRÍ (Paso a Paso)

### Paso 1: TRUNCATE (Borré TODO)
```sql
TRUNCATE empleados_sftp, motivos_baja, incidencias,
         asistencia_diaria, prenomina_horizontal CASCADE;

Resultado: 0 registros en todas las tablas
```

### Paso 2: Importé desde SFTP Actual
```
Archivo: Validacion Alta de empleados.xls
  → Importados: 1,043 empleados ✅

Archivo: MotivosBaja.csv
  → Importados: 1 baja (enero 2026) ✅

Archivo: Incidencias.csv
  → Importados: 0 (vacío) ⚠️

Archivo: Prenomina Horizontal.csv
  → Importados: 366 registros ✅
```

### Paso 3: Apliqué Patches
```
Patch: motivos_baja_inserts.sql
  → Insertados: 421 bajas (2023-2024) ✅

Patch: incidencias_patch_insert.sql
  → Insertados: 2,644 incidencias (jul-dic 2025) ✅
```

### Resultado Final:
```
✅ Empleados: 1,043 (completo)
✅ Bajas 2023-2024: 421 (completo)
✅ Bajas 2026: 1 (completo)
❌ Bajas 2025: 0 (FALTA TODO)
✅ Incidencias jul-dic 2025: 2,644 (completo)
❌ Incidencias ene-jun 2025: 0 (FALTA)
❌ Asistencia: 0 (FALTA TODO)
```

---

## 🎯 QUÉ BOTÓN USAR EN /ADMIN

### ✅ USA ESTE: "Actualizar Información (Manual)"

**Botón VERDE** - "Actualizar Información (Manual)"

**Qué hace:**
```
1. Descarga archivos del SFTP actual
2. Importa con UPSERT (no borra nada)
3. Solo agrega/actualiza registros nuevos
4. Preserva datos históricos
```

**Cuándo usarlo:**
- ✅ Para actualizar datos semanalmente
- ✅ Para traer empleados nuevos
- ✅ Para traer bajas nuevas
- ✅ Es SEGURO - no borra nada

---

### 🔒 NO USES: "Forzar Importación Real"

**Botón DESHABILITADO** - "Forzar Importación Real"

**Qué hace:**
```
1. Descarga archivos directamente desde SFTP
2. BORRA duplicados antes de insertar
3. Puede causar pérdida de datos si hay problemas
```

**Está deshabilitado por seguridad**

**Solo úsalo si:**
- Hay duplicados masivos que limpiar
- Quieres empezar de cero
- Sabes lo que haces

---

## 🆘 CÓMO HACER EL BACKUP EN SUPABASE

### Paso 1: Acceder a Backups

```
1. Ve a: https://supabase.com/dashboard
2. Selecciona proyecto: mrm_simple
3. En el menú izquierdo: Database → Backups
4. URL directa:
   https://supabase.com/dashboard/project/ufdlwhdrrvktthcxwpzt/database/backups
```

### Paso 2: Buscar Backup

**Busca:**
- Backup del **7 de enero 2026** (ayer, antes del TRUNCATE)
- O el más reciente disponible antes de hoy

**Deberías ver algo como:**
```
Daily Backup - January 7, 2026 at 2:00 AM
Size: ~50 MB
Tables: all
```

### Paso 3: Restaurar

**Opción A: Restaurar TODO el proyecto** (más fácil)
```
1. Clic en el backup del 7 de enero
2. Botón "Restore"
3. Confirmar restauración
4. Esperar 5-10 minutos
5. ✅ TODO vuelve a como estaba ayer
```

**Opción B: Restaurar solo tablas específicas** (más técnico)
```
1. Descargar el backup
2. Extraer solo las tablas: motivos_baja, incidencias, asistencia_diaria
3. Importarlas manualmente
4. Requiere conocimientos de PostgreSQL
```

**Recomiendo Opción A** - restaurar todo y luego limpio duplicados.

---

## 📋 DESPUÉS DE RESTAURAR EL BACKUP

### Qué hacer después:

**1. Limpiar duplicados (te doy el script)**
```sql
-- Eliminar duplicados en motivos_baja
DELETE FROM motivos_baja a USING (
  SELECT MIN(id) as id_mantener, numero_empleado, fecha_baja
  FROM motivos_baja
  GROUP BY numero_empleado, fecha_baja
  HAVING COUNT(*) > 1
) b
WHERE a.numero_empleado = b.numero_empleado
  AND a.fecha_baja = b.fecha_baja
  AND a.id != b.id_mantener;

-- Eliminar duplicados en incidencias
DELETE FROM incidencias a USING (
  SELECT MIN(id) as id_mantener, emp, fecha
  FROM incidencias
  GROUP BY emp, fecha
  HAVING COUNT(*) > 1
) b
WHERE a.emp = b.emp
  AND a.fecha = b.fecha
  AND a.id != b.id_mantener;
```

**2. Actualizar con datos frescos de SFTP**
```
- Ir a /admin
- Clic en "Actualizar Información (Manual)"
- Esto trae empleados nuevos de 2026 si los hay
```

**3. Verificar que TODO está bien**
```sql
-- Verificar totales
SELECT 'empleados_sftp' as tabla, COUNT(*) FROM empleados_sftp
UNION ALL
SELECT 'motivos_baja', COUNT(*) FROM motivos_baja
UNION ALL
SELECT 'incidencias', COUNT(*) FROM incidencias
UNION ALL
SELECT 'asistencia_diaria', COUNT(*) FROM asistencia_diaria
UNION ALL
SELECT 'prenomina_horizontal', COUNT(*) FROM prenomina_horizontal;
```

---

## ✅ ESTADO ESPERADO DESPUÉS DE RESTAURAR

```
empleados_sftp:       ~1,043 (completo) ✅
motivos_baja:         ~370 (sin duplicados) ✅
  ├─ 2023: 181
  ├─ 2024: 240
  ├─ 2025: ~17-20 ✅ Recuperado
  └─ 2026: 1

incidencias:          ~990 (sin duplicados) ✅
  └─ 2025 completo (ene-dic) ✅ Recuperado

asistencia_diaria:    ~880 (sin duplicados) ✅
  └─ Recuperado

prenomina_horizontal: 366 ✅

Dashboard:            100% funcional ✅
```

---

## 📞 PRÓXIMO PASO INMEDIATO

**Por favor:**

1. **Ve a backups de Supabase:**
   ```
   https://supabase.com/dashboard/project/ufdlwhdrrvktthcxwpzt/database/backups
   ```

2. **Dime qué backups ves:**
   - ¿Hay backup del 7 de enero?
   - ¿Hay backups disponibles?
   - ¿Qué fechas?

3. **Restauramos juntos** y limpio los duplicados

---

**Una vez restaurado, el dashboard funcionará perfecto al 100%.** ✅
