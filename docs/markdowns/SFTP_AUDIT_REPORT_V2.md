# SFTP AUDIT REPORT V2 - Auditoría del Proceso SFTP

**Fecha de generación:** 9 de enero de 2026
**Última actualización:** 12 de enero de 2026
**Analista:** Claude Code (Auditoría Automatizada)
**Versión:** 2.2

---

## ACTUALIZACIÓN IMPORTANTE (12 Enero 2026)

> **Análisis exhaustivo del código fuente revela GAP crítico en row-level tracking.**
>
> Una verificación completa del 12 de enero de 2026 mediante Supabase MCP y análisis de código:
>
> ### Estado de Tablas de Bitácora
>
> | Tabla | Estado | Registros | Uso Real |
> |-------|--------|-----------|----------|
> | `sftp_file_structure` | ✅ ACTIVA | 15 rows | Funciones se llaman correctamente |
> | `sftp_file_versions` | ✅ ACTIVA | 12 rows | Funciones se llaman correctamente |
> | `sftp_import_log` | ⚠️ PARCIAL | 0 rows | Solo se crea cuando hay cambios estructurales |
> | `sftp_record_diffs` | ❌ NO CONECTADA | 0 rows | **Funciones implementadas pero NUNCA llamadas** |
>
> ### Hallazgo Crítico: Código Muerto
>
> Las funciones de tracking de cambios a nivel de registro están **implementadas pero no conectadas**:
>
> ```typescript
> // En import-sftp-real-data/route.ts (líneas 13-17)
> import {
>   compareRecordBatch,  // ❌ IMPORTADA PERO NUNCA USADA
>   saveRecordDiffs,     // ❌ IMPORTADA PERO NUNCA USADA
>   getImportDiffSummary // ❌ IMPORTADA PERO NUNCA USADA
> } from '@/lib/sftp-row-hash';
> ```
>
> **Estado actualizado del sistema:**
> - ✅ Conexión SFTP funcional
> - ✅ Lectura de archivos funcional
> - ✅ Parseo de datos funcional
> - ✅ Bitácora de estructura de archivos (`sftp_file_structure`) - **FUNCIONAL**
> - ✅ Versionado de archivos con SHA256 (`sftp_file_versions`) - **FUNCIONAL**
> - ✅ Sistema de aprobación de cambios estructurales - **FUNCIONAL**
> - ⚠️ `sftp_import_log` - Solo se crea en cambios estructurales
> - ❌ `sftp_record_diffs` - **CÓDIGO EXISTE PERO NO SE EJECUTA**

---

---

## 1. Resumen Ejecutivo

Este reporte documenta la auditoría completa del proceso SFTP del sistema MRM (HR KPI Dashboard), comparando la implementación actual con los 10 pasos requeridos para un proceso robusto de ingesta de datos.

### Estado General del Proceso

| Aspecto | Estado | Cobertura |
|---------|--------|-----------|
| Conexión SFTP | Implementado | 100% |
| Lectura de archivos | Implementado | 100% |
| Renombrado con fecha | **NO IMPLEMENTADO** | 0% |
| Comparación de archivos | **NO IMPLEMENTADO** | 0% |
| Bitácora/Logging | Parcial | 30% |
| Parseo de datos | Implementado | 80% |
| INSERT nuevos registros | Implementado | 100% |
| UPDATE registros existentes | Parcial (UPSERT) | 60% |
| Notificación de discrepancias | **NO IMPLEMENTADO** | 0% |
| Histórico/Retención | **NO IMPLEMENTADO** | 0% |

### Hallazgo Principal

**El proceso actual carece de mecanismos de trazabilidad y comparación histórica.** Los archivos se procesan directamente sin guardar copias con fecha, sin comparar estructura ni contenido con cargas anteriores, y sin notificar discrepancias al usuario antes de sobrescribir datos.

---

## 2. Análisis Detallado por Paso

### PASO 1: Inicio del Proceso (Manual o Automático)

| Criterio | Estado | Detalle |
|----------|--------|---------|
| Ejecución Manual | ✅ Implementado | Botón en `/admin` UI |
| Ejecución Automática | ✅ Implementado | Cron job en `/api/cron/sync-sftp/route.ts` |
| Configuración de horario | ✅ Implementado | Tabla `sync_settings` con frequency, day_of_week, run_time |
| Lock de concurrencia | ❌ NO | No hay protección contra ejecuciones simultáneas |

**Archivos relevantes:**
- `apps/web/src/app/api/cron/sync-sftp/route.ts` - Cron job
- `apps/web/src/components/sftp-import-admin.tsx` - UI Admin
- Tabla `sync_settings` - Configuración de schedule

**Código de verificación (cron):**
```typescript
// cron/sync-sftp/route.ts líneas 10-17
const authHeader = request.headers.get('authorization');
const cronSecret = process.env.CRON_SECRET || process.env.CRON_SYNC_SECRET;
if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

---

### PASO 2: Lectura de Archivos del SFTP

| Criterio | Estado | Detalle |
|----------|--------|---------|
| Conexión segura | ✅ Implementado | Credenciales desde env vars |
| Listado de archivos | ✅ Implementado | Filtrado por extensión (.csv, .xlsx, .xls) |
| Clasificación de archivos | ✅ Implementado | Por nombre → tipo (plantilla, incidencias, act) |
| Manejo de errores | ⚠️ Parcial | Fallback a mock data en producción (RIESGO) |

**Archivos relevantes:**
- `apps/web/src/app/api/sftp/route.ts` - Servicio SFTP principal

**Código de clasificación (líneas 101-129):**
```typescript
if (fileName.includes('motivos') && fileName.includes('bajas')) {
  type = 'plantilla';
} else if (fileName.includes('incidencias') || fileName.includes('me 5')) {
  type = 'incidencias';
} else if (fileName.includes('prenomina') || fileName.includes('horizo')) {
  type = 'plantilla';
} else if (fileName.includes('validacion') || fileName.includes('alta')) {
  type = 'act';
}
```

**RIESGO IDENTIFICADO:**
```typescript
// sftp/route.ts líneas 139-168 - Fallback a mock data
catch (error) {
  console.error('Error listing SFTP files:', error);
  await sftp.end();
  // Return mock files as fallback - PROBLEMA DE PRODUCCIÓN
  const mockFiles: SFTPFile[] = [...]
}
```

---

### PASO 3: Renombrar Archivos con Fecha (YYYY_MM_DD)

| Criterio | Estado | Detalle |
|----------|--------|---------|
| Renombrado en SFTP | ❌ NO | No se renombran archivos remotos |
| Copia local con fecha | ❌ NO | No se guardan copias locales |
| Backup histórico | ❌ NO | Sin retención de archivos procesados |
| Prevención de reproceso | ❌ NO | No hay registro de archivos ya procesados |

**BRECHA CRÍTICA:** No existe ningún mecanismo para:
1. Renombrar archivos en el SFTP después de procesarlos
2. Guardar una copia local con timestamp
3. Evitar reprocesar el mismo archivo múltiples veces
4. Mantener histórico de archivos procesados

**Implementación requerida según PROCESO_SFTP_NUEVO.md:**
```
{dataset_id}/{YYYY}/{MM}/{DD}/{originalNameWithoutExt}_{timestampUTC}_{sha256short}.{ext}
Ejemplo: empleados/2026/01/07/Empleados_20260107_031500Z_ab12cd34.xlsx
```

---

### PASO 4: Ubicar Archivo de Carga Anterior

| Criterio | Estado | Detalle |
|----------|--------|---------|
| Detección de archivo anterior | ❌ NO | No hay lógica de comparación temporal |
| Registro de archivos procesados | ❌ NO | No existe tabla `ingestion_file_registry` |
| SHA256 de archivos | ❌ NO | Sin hash para identificación única |
| Baseline de última carga exitosa | ❌ NO | No hay concepto de "last_successful_run" |

**BRECHA CRÍTICA:** El proceso no puede determinar:
- Si un archivo ya fue procesado antes
- Cuál fue la última versión del archivo
- Si el contenido cambió desde la última carga

---

### PASO 5: Comparar Estructura de Archivos

| Criterio | Estado | Detalle |
|----------|--------|---------|
| Detectar columnas nuevas | ❌ NO | No hay comparación de esquema |
| Detectar columnas eliminadas | ❌ NO | Sin validación de estructura |
| Detectar columnas renombradas | ❌ NO | Sin detección de cambios |
| Registro en bitácora | ❌ NO | Sin tabla `ingestion_schema_snapshots` |
| Alertas por cambios | ❌ NO | Sin notificación de cambios estructurales |

**BRECHA CRÍTICA:** Si el cliente cambia la estructura del Excel:
- El proceso no lo detecta
- Puede insertar datos incorrectos
- No hay registro del cambio

**Implementación requerida según PROCESO_SFTP_NUEVO.md:**
```typescript
// Comparación de esquema
added = cols_today - cols_prev
removed = cols_prev - cols_today
// Persistir en: ingestion_schema_snapshots(run_id, columns_json, column_count, added, removed)
```

---

### PASO 6: Comparar Registros Entre Archivos

| Criterio | Estado | Detalle |
|----------|--------|---------|
| Detectar registros nuevos | ⚠️ Implícito | UPSERT detecta nuevos por PK |
| Detectar registros modificados | ⚠️ Parcial | Sin hash de fila, sin registro de cambios |
| Detectar registros eliminados | ❌ NO | No hay detección de deletes |
| Registro detallado de cambios | ❌ NO | Sin tabla `ingestion_row_diffs` |

**Implementación actual:**
```typescript
// import-sftp-real-data/route.ts líneas 246-253
const { error } = await supabaseAdmin
  .from('empleados_sftp')
  .upsert(batch, { onConflict: 'numero_empleado' });
```

**PROBLEMA:** El UPSERT no:
- Registra qué campos cambiaron
- Guarda valores anteriores para auditoría
- Detecta si un registro fue eliminado en origen

**Implementación requerida:**
```typescript
// Comparación por row_hash
row_hash = sha256(concat_normalized_values(comparable_cols))
// Resultados: new_keys, missing_keys, UPDATED (si hash difiere), UNCHANGED
// Persistir en: ingestion_row_diffs(run_id, key, diff_type, changed_fields_json, old_values_json, new_values_json)
```

---

### PASO 7: Parseo y Limpieza de Datos (OPCIONAL)

| Criterio | Estado | Detalle |
|----------|--------|---------|
| Reemplazo de caracteres especiales | ✅ Implementado | Normalización de acentos |
| Parseo de fechas | ✅ Implementado | Múltiples formatos soportados |
| Normalización de headers | ✅ Implementado | Función `normalizeKey()` |
| Mapeo de alias de columnas | ✅ Implementado | Función `pickField()` |
| Validación de tipos | ⚠️ Parcial | Solo en algunos campos |

**Implementación actual (import-sftp-real-data/route.ts líneas 7-36):**
```typescript
const normalizeKey = (key: unknown): string =>
  typeof key === 'string'
    ? key
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
    : '';

function pickField(record, explicitKeys, token) {
  for (const key of explicitKeys) {
    const value = record[key];
    if (str && str.toLowerCase() !== 'null') return str;
  }
  // Fallback: buscar por token normalizado
}
```

**Parseo de fechas (líneas 485-521):**
```typescript
function parseDate(dateValue: unknown): string | null {
  // Maneja: Date objects, números Excel seriales, DD/MM/YY, DD/MM/YYYY, YYYY-MM-DD, ISO 8601
}
```

---

### PASO 8: INSERT de Información Nueva

| Criterio | Estado | Detalle |
|----------|--------|---------|
| Inserción en lotes | ✅ Implementado | Batch size de 50-200 registros |
| Validación pre-insert | ⚠️ Parcial | Solo validación básica |
| Manejo de errores por lote | ✅ Implementado | Continúa con siguiente lote |
| Registro de resultados | ⚠️ Parcial | Solo en logs, no en BD |

**Implementación actual (import-sftp-real-data/route.ts líneas 246-261):**
```typescript
const batchSize = 50;
for (let i = 0; i < empleadosTransformados.length; i += batchSize) {
  const batch = empleadosTransformados.slice(i, i + batchSize);
  const { error } = await supabaseAdmin
    .from('empleados_sftp')
    .upsert(batch, { onConflict: 'numero_empleado' });
  if (error) {
    console.error(`Error insertando lote ${Math.floor(i / batchSize) + 1}:`, error);
    results.errors.push(`Error lote empleados: ${error.message}`);
  }
}
```

---

### PASO 9: Notificación de Discrepancias

| Criterio | Estado | Detalle |
|----------|--------|---------|
| Notificación al cliente | ❌ NO | Sin sistema de alertas |
| Solicitud de aprobación | ❌ NO | No hay workflow de aprobación |
| Cuarentena de cambios | ❌ NO | Sin tabla de cambios pendientes |
| Modo de previsualización | ⚠️ Parcial | Solo preview de archivos, no de cambios |

**BRECHA CRÍTICA:** Si hay discrepancias en registros existentes:
- El sistema sobrescribe automáticamente
- No hay notificación al usuario
- No hay opción de revisar/aprobar cambios
- No hay rollback posible

---

### PASO 10: UPDATE de Registros Existentes

| Criterio | Estado | Detalle |
|----------|--------|---------|
| Actualización condicional | ⚠️ Parcial | UPSERT sin verificar cambios |
| Registro de cambios | ❌ NO | Sin auditoría de campos modificados |
| Timestamp de actualización | ⚠️ Parcial | Solo `fecha_actualizacion` en empleados |
| Historial de versiones | ❌ NO | Sin SCD Type 2 |

**Implementación actual:**
- Usa `UPSERT` que sobrescribe sin verificar si hubo cambios reales
- No hay `row_hash` para comparar si el registro cambió
- No se guarda el valor anterior antes del UPDATE

---

## 3. Análisis de Tablas de Bitácora

### Tablas Existentes (Verificación 11 Enero 2026)

| Tabla | Estado | Registros | Uso Actual |
|-------|--------|-----------|------------|
| `sync_settings` | ✅ Existe | - | Configuración de sincronización |
| `sftp_file_structure` | ✅ Existe | 15 | Estructura de archivos SFTP |
| `sftp_import_log` | ✅ Existe | 0 | Log de importaciones |
| `sftp_file_versions` | ✅ Existe | 12 | Historial de versiones de archivos |
| `sftp_record_diffs` | ✅ Existe | 0 | Tracking de cambios en registros |

### Tablas Legacy (No Usadas)

| Tabla | Estado | Uso Actual |
|-------|--------|------------|
| `importaciones_sftp` | ⚠️ Referenciada en código legacy | Reemplazada por `sftp_import_log` |
| `errores_importacion` | ⚠️ Referenciada en código legacy | Integrada en `sftp_import_log.results` |

### Tabla `sync_settings` (Existente)

```sql
-- Esquema actual
create table public.sync_settings (
  singleton boolean primary key default true,
  frequency text not null default 'weekly',
  day_of_week text default 'monday',
  run_time time without time zone default '02:00',
  last_run timestamptz,
  next_run timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Tablas Referenciadas pero NO Creadas

**En `apps/web/src/lib/sftp-importer.ts`:**
```typescript
// Línea 37 - Tabla NO existe en BD
await supabase.from('importaciones_sftp').insert({...})

// Línea 276 - Tabla NO existe en BD
await supabase.from('errores_importacion').insert({...})
```

**PROBLEMA:** La clase `SFTPImporter` intenta usar tablas de bitácora que nunca fueron creadas, causando errores silenciosos.

---

## 4. Riesgos Identificados

### RIESGO ALTO: Sin Trazabilidad de Cambios

**Impacto:** No hay forma de:
- Saber qué datos cambiaron entre cargas
- Recuperar valores anteriores
- Auditar quién/cuándo modificó un registro

**Mitigación requerida:**
1. Crear tabla `ingestion_row_diffs` con auditoría por registro
2. Implementar `row_hash` para detectar cambios reales
3. Guardar valores anteriores antes de UPDATE

### RIESGO ALTO: Sin Backup de Archivos Procesados

**Impacto:** Si un archivo se corrompe o tiene errores:
- No hay copia de respaldo con fecha
- No se puede reprocesar versión anterior
- No hay evidencia para el cliente

**Mitigación requerida:**
1. Crear storage interno `/raw/{dataset}/{YYYY}/{MM}/{DD}/`
2. Guardar SHA256 de cada archivo procesado
3. Implementar retención de 7 días mínimo

### RIESGO MEDIO: Generación de Datos Ficticios

**Ubicación:** `import-real-sftp-force/route.ts` líneas 477-498

```typescript
// Si no encontramos fechas específicas, crear registros de ejemplo
if (asistenciaReales.filter(a => a.numero_empleado === numeroEmpleado).length === 0) {
  // Crea registros FICTICIOS para todo el mes actual
  for (let day = 1; day <= Math.min(daysInMonth, today.getDate()); day++) {
    asistenciaReales.push({
      numero_empleado: numeroEmpleado,
      fecha: fecha.toISOString().split('T')[0],
      horas_trabajadas: 8.0, // VALOR INVENTADO
      presente: true,
      fecha_creacion: new Date().toISOString()
    });
  }
}
```

**Impacto:** Si el archivo de prenómina no tiene formato reconocible, el sistema genera asistencia falsa.

### RIESGO MEDIO: Códigos de Incidencia Hardcodeados

**Ubicación:** `import-sftp-real-data/route.ts` líneas 96-97

```typescript
const INCIDENT_CODES = new Set(['FI', 'SUSP', 'PSIN', 'ENFE']);
const PERMISO_CODES = new Set(['PCON', 'VAC', 'MAT3', 'MAT1', 'JUST']);
```

**Impacto:** Nuevos códigos de incidencia no se contabilizan.

---

## 5. Matriz de Cumplimiento

### Estado Original (9 Enero 2026)

| # | Paso del Proceso | Estado | Cobertura | Prioridad |
|---|------------------|--------|-----------|-----------|
| 1 | Inicio manual/automático | ✅ OK | 80% | - |
| 2 | Lectura de archivos SFTP | ✅ OK | 90% | - |
| 3 | Renombrar con fecha | ❌ FALTA | 0% | **ALTA** |
| 4 | Ubicar archivo anterior | ❌ FALTA | 0% | **ALTA** |
| 5 | Comparar estructura | ❌ FALTA | 0% | **ALTA** |
| 6 | Comparar registros | ⚠️ PARCIAL | 20% | **ALTA** |
| 7 | Parseo y limpieza | ✅ OK | 80% | - |
| 8 | INSERT nuevos | ✅ OK | 90% | - |
| 9 | Notificación discrepancias | ❌ FALTA | 0% | MEDIA |
| 10 | UPDATE existentes | ⚠️ PARCIAL | 50% | **ALTA** |

### Estado Actualizado (12 Enero 2026) - Análisis de Código Exhaustivo

| # | Paso del Proceso | Estado | Cobertura | Notas |
|---|------------------|--------|-----------|-------|
| 1 | Inicio manual/automático | ✅ OK | 80% | Funcional |
| 2 | Lectura de archivos SFTP | ✅ OK | 90% | Funcional |
| 3 | Renombrar con fecha | ✅ IMPLEMENTADO | 85% | `sftp_file_versions` + SHA256 checksums (12 versiones) |
| 4 | Ubicar archivo anterior | ✅ IMPLEMENTADO | 90% | `getLatestFileVersion()` + `isFileAlreadyProcessed()` funcionales |
| 5 | Comparar estructura | ✅ IMPLEMENTADO | 90% | `compareFileStructure()` detecta columnas añadidas/eliminadas |
| 6 | Comparar registros | ❌ NO CONECTADO | 10% | **Funciones existen pero NO se llaman en import route** |
| 7 | Parseo y limpieza | ✅ OK | 80% | Funcional |
| 8 | INSERT nuevos | ✅ OK | 90% | Funcional |
| 9 | Notificación discrepancias | ⚠️ PARCIAL | 60% | UI de aprobación para cambios estructurales |
| 10 | UPDATE existentes | ⚠️ PARCIAL | 40% | UPSERT funcional, **sin tracking de qué cambió** |

### Detalle del GAP en Paso 6 (Comparar Registros)

**Código implementado en `sftp-row-hash.ts`:**
- `calculateRowHash()` - Calcula SHA256 de registros ✅
- `compareRecords()` - Compara registro anterior vs actual ✅
- `compareRecordBatch()` - Compara lote contra BD ✅
- `saveRecordDiffs()` - Guarda diffs en `sftp_record_diffs` ✅

**Problema en `import-sftp-real-data/route.ts`:**
```typescript
// Líneas 13-17: Se importan las funciones
import { compareRecordBatch, saveRecordDiffs, getImportDiffSummary } from '@/lib/sftp-row-hash';

// PERO en todo el archivo (1071 líneas), estas funciones NUNCA se llaman
// El código hace UPSERT directo sin pasar por compareRecordBatch()
```

**Para completar el Paso 6, se necesita:**
1. Antes del UPSERT, llamar `compareRecordBatch('empleados_sftp', 'numero_empleado', batch)`
2. Guardar los diffs con `saveRecordDiffs(importLogId, fileVersionId, 'empleados_sftp', diffs)`
3. Repetir para `motivos_baja` e `incidencias`

---

## 6. Recomendaciones de Implementación

### Prioridad ALTA (Crítico para auditoría)

1. **Crear tablas de bitácora faltantes:**
   ```sql
   -- ingestion_runs: Registro de cada ejecución
   CREATE TABLE ingestion_runs (
     run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     dataset_id TEXT NOT NULL,
     trigger_type TEXT NOT NULL, -- 'scheduled' | 'manual'
     requested_by TEXT,
     status TEXT NOT NULL, -- 'RUNNING' | 'SUCCESS' | 'FAILED'
     start_ts TIMESTAMPTZ DEFAULT NOW(),
     end_ts TIMESTAMPTZ,
     source_files_found INTEGER,
     source_files_processed INTEGER,
     new_count INTEGER,
     updated_count INTEGER,
     unchanged_count INTEGER,
     error_count INTEGER,
     error_detail JSONB
   );

   -- ingestion_file_registry: Archivos procesados
   CREATE TABLE ingestion_file_registry (
     id SERIAL PRIMARY KEY,
     remote_file_path TEXT NOT NULL,
     remote_mtime TIMESTAMPTZ,
     file_size BIGINT,
     sha256 TEXT NOT NULL,
     raw_storage_path TEXT,
     processed_at TIMESTAMPTZ DEFAULT NOW(),
     run_id UUID REFERENCES ingestion_runs(run_id)
   );
   ```

2. **Implementar comparación de registros con hash:**
   ```typescript
   function computeRowHash(record: Record<string, unknown>, excludeKeys: string[]): string {
     const sortedKeys = Object.keys(record).filter(k => !excludeKeys.includes(k)).sort();
     const values = sortedKeys.map(k => String(record[k] ?? ''));
     return crypto.createHash('sha256').update(values.join('|')).digest('hex');
   }
   ```

3. **Implementar backup de archivos:**
   - Guardar copia en storage interno antes de procesar
   - Agregar SHA256 para identificación única
   - Retención mínima de 7 días

### Prioridad MEDIA

1. **Sistema de notificaciones:**
   - Alertas por cambios de esquema
   - Alertas por variación significativa de registros (>30%)
   - Resumen de importación por email/Slack

2. **Workflow de aprobación:**
   - Modo "dry-run" que simula la carga
   - Cuarentena de cambios para aprobación
   - Rollback de última carga

---

## 7. Conclusión

### Estado Original (9 Enero 2026)

El proceso SFTP tenía una **implementación funcional básica** pero carecía de los mecanismos de **trazabilidad, comparación histórica y auditoría** que son críticos para un sistema de producción.

### Estado Actualizado (12 Enero 2026) - Análisis de Código Exhaustivo

El proceso SFTP tiene una **implementación parcialmente completa**. El código de auditoría existe pero hay una **desconexión crítica** entre las funciones implementadas y su uso en el flujo de importación.

### Componentes 100% Funcionales ✅

| Componente | Archivo | Estado |
|------------|---------|--------|
| Conexión SFTP | `sftp-client.ts` | ✅ Funcional |
| Comparación de estructura | `sftp-structure-comparator.ts` | ✅ Funcional con 15 registros |
| Versionado de archivos SHA256 | `sftp-structure-comparator.ts` | ✅ Funcional con 12 versiones |
| Flujo de aprobación | `api/sftp/approve/route.ts` | ✅ Funcional |
| Parseo de datos | `import-sftp-real-data/route.ts` | ✅ Funcional |
| UPSERT por lotes | `import-sftp-real-data/route.ts` | ✅ Funcional |

### Componente Implementado pero NO Conectado ❌

| Componente | Archivo | Problema |
|------------|---------|----------|
| Tracking de cambios por registro | `sftp-row-hash.ts` | **Funciones implementadas pero NUNCA llamadas** |

**Funciones afectadas:**
- `compareRecordBatch()` → Importada pero no usada
- `saveRecordDiffs()` → Importada pero no usada
- `getImportDiffSummary()` → Importada pero no usada

### Acción Requerida para Completar Implementación

**Archivo a modificar:** `apps/web/src/app/api/import-sftp-real-data/route.ts`

**Cambio necesario:** Antes de cada UPSERT, llamar:
```typescript
// Para empleados_sftp (alrededor de línea 246)
const { diffs, summary } = await compareRecordBatch('empleados_sftp', 'numero_empleado', batch);
await saveRecordDiffs(importLogId, fileVersionId, 'empleados_sftp', diffs);
console.log(`📊 Empleados: ${summary.inserts} nuevos, ${summary.updates} modificados, ${summary.unchanged} sin cambios`);
```

### Resumen de Cobertura

| Área | Cobertura | Estado |
|------|-----------|--------|
| Infraestructura (tablas BD) | 100% | ✅ 4 tablas creadas |
| Código de auditoría | 100% | ✅ Todas las funciones implementadas |
| Integración en flujo | 70% | ⚠️ Row-level tracking desconectado |
| **Funcionalidad efectiva** | **85%** | ⚠️ Un paso crítico falta conectar |

### Próximos Pasos (Prioridad Ordenada)

1. **🔴 CRÍTICO:** Conectar `compareRecordBatch()` y `saveRecordDiffs()` en el import route
2. ~~Crear migraciones SQL para tablas de bitácora~~ → ✅ COMPLETADO
3. Ejecutar importación después de conectar funciones para validar
4. Verificar que `sftp_record_diffs` se llene correctamente
5. Agregar notificaciones por email/Slack (opcional)

---

## Anexo A: Archivos Analizados

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `apps/web/src/lib/sftp-client.ts` | Cliente | Wrapper API para SFTP desde frontend |
| `apps/web/src/lib/sftp-importer.ts` | Importador | Clase con bitácora (tablas no creadas) |
| `apps/web/src/app/api/sftp/route.ts` | API | Servicio SFTP principal |
| `apps/web/src/app/api/import-sftp-real-data/route.ts` | API | Importación estándar |
| `apps/web/src/app/api/import-real-sftp-force/route.ts` | API | Importación forzada |
| `apps/web/src/app/api/cron/sync-sftp/route.ts` | Cron | Sincronización automática |
| `apps/web/src/components/sftp-import-admin.tsx` | UI | Panel de administración |
| `supabase/migrations/20251031_create_sync_settings.sql` | SQL | Tabla sync_settings |
| `schema/empleados_sftp.sql` | SQL | Tabla empleados |
| `schema/motivos_baja.sql` | SQL | Tabla bajas |
| `schema/incidencias.sql` | SQL | Tabla incidencias |

## Anexo B: Comparación con Diseño Ideal

Según el documento `PROCESO_SFTP_NUEVO.md`, el proceso debería implementar 15 pasos. La implementación actual cubre aproximadamente 5 de estos pasos de forma completa.

---

*Reporte generado automáticamente por Claude Code*
*Sistema: MRM HR KPI Dashboard*
*Versión del reporte: 2.2*
*Última actualización: 12 Enero 2026 - Análisis exhaustivo de código fuente*

---

## Anexo C: Resumen Ejecutivo para Implementación

### ¿Qué funciona? (85%)
- Conexión SFTP ✅
- Parseo de archivos ✅
- Detección de cambios estructurales ✅
- Versionado de archivos con SHA256 ✅
- Flujo de aprobación ✅
- UPSERT de datos ✅

### ¿Qué falta conectar? (15%)
- **`compareRecordBatch()`** - Compara registros antes del UPSERT
- **`saveRecordDiffs()`** - Guarda qué campos cambiaron

### Tiempo estimado para completar
~2-4 horas de desarrollo para conectar las funciones existentes en el import route.

### Impacto de completar
- `sftp_record_diffs` se llenará con historial de cambios
- Auditoría completa de qué datos cambiaron en cada importación
- Capacidad de rollback a nivel de registro
