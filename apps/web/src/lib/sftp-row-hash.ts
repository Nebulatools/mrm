/**
 * SFTP Row Hash Calculator
 *
 * Calcula hashes SHA256 de registros para detectar cambios granulares.
 * Permite identificar exactamente qué campos cambiaron entre importaciones.
 */

import crypto from 'crypto';
import { supabaseAdmin } from './supabase-admin';

/**
 * Calcula el SHA256 de un registro
 * Ordena las claves alfabéticamente para consistencia
 */
export function calculateRowHash(record: Record<string, unknown>): string {
  // Ordenar claves alfabéticamente para hash consistente
  const sortedKeys = Object.keys(record).sort();
  const normalizedData: Record<string, string> = {};

  for (const key of sortedKeys) {
    const value = record[key];
    // Normalizar valores para hash consistente
    if (value === null || value === undefined) {
      normalizedData[key] = 'NULL';
    } else if (value instanceof Date) {
      normalizedData[key] = value.toISOString();
    } else if (typeof value === 'object') {
      normalizedData[key] = JSON.stringify(value);
    } else {
      normalizedData[key] = String(value).trim();
    }
  }

  const dataString = JSON.stringify(normalizedData);
  return crypto.createHash('sha256').update(dataString).digest('hex');
}

/**
 * Calcula el SHA256 del contenido de un archivo
 */
export function calculateFileChecksum(content: string | Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Genera nombre de archivo versionado con timestamp
 * Ejemplo: "empleados_2026_01_09_14_30_45.xlsx"
 */
export function generateVersionedFilename(originalFilename: string): string {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[-:]/g, '_')
    .replace('T', '_')
    .replace(/\.\d{3}Z$/, '');

  const lastDotIndex = originalFilename.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return `${originalFilename}_${timestamp}`;
  }

  const name = originalFilename.substring(0, lastDotIndex);
  const ext = originalFilename.substring(lastDotIndex);
  return `${name}_${timestamp}${ext}`;
}

export interface FieldDiff {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface RecordDiff {
  recordKey: string;
  changeType: 'insert' | 'update' | 'delete' | 'no_change';
  hashPrevious: string | null;
  hashCurrent: string;
  fieldsChanged: FieldDiff[];
}

/**
 * Compara dos registros y retorna las diferencias
 */
export function compareRecords(
  previousRecord: Record<string, unknown> | null,
  currentRecord: Record<string, unknown>,
  keyField: string
): RecordDiff {
  const recordKey = String(currentRecord[keyField] || 'unknown');
  const hashCurrent = calculateRowHash(currentRecord);

  // Nuevo registro
  if (!previousRecord) {
    return {
      recordKey,
      changeType: 'insert',
      hashPrevious: null,
      hashCurrent,
      fieldsChanged: [],
    };
  }

  const hashPrevious = calculateRowHash(previousRecord);

  // Sin cambios
  if (hashPrevious === hashCurrent) {
    return {
      recordKey,
      changeType: 'no_change',
      hashPrevious,
      hashCurrent,
      fieldsChanged: [],
    };
  }

  // Detectar qué campos cambiaron
  const fieldsChanged: FieldDiff[] = [];
  const allKeys = new Set([...Object.keys(previousRecord), ...Object.keys(currentRecord)]);

  for (const key of allKeys) {
    const oldVal = previousRecord[key];
    const newVal = currentRecord[key];

    // Normalizar para comparación
    const oldNorm = normalizeValue(oldVal);
    const newNorm = normalizeValue(newVal);

    if (oldNorm !== newNorm) {
      fieldsChanged.push({
        field: key,
        oldValue: oldVal,
        newValue: newVal,
      });
    }
  }

  return {
    recordKey,
    changeType: 'update',
    hashPrevious,
    hashCurrent,
    fieldsChanged,
  };
}

function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value).trim();
}

/**
 * Compara un lote de registros nuevos contra los existentes en la BD
 */
export async function compareRecordBatch(
  tableName: string,
  keyField: string,
  newRecords: Record<string, unknown>[],
  existingRecordsMap?: Map<string, Record<string, unknown>>
): Promise<{
  diffs: RecordDiff[];
  summary: {
    inserts: number;
    updates: number;
    unchanged: number;
  };
}> {
  // Si no se proporciona el mapa, obtener registros existentes de la BD
  let existingMap = existingRecordsMap;

  if (!existingMap) {
    const keys = newRecords.map(r => r[keyField]).filter(Boolean);
    if (keys.length > 0) {
      const { data: existingRecords } = await supabaseAdmin
        .from(tableName)
        .select('*')
        .in(keyField, keys);

      existingMap = new Map(
        (existingRecords || []).map(r => [String(r[keyField]), r as Record<string, unknown>])
      );
    } else {
      existingMap = new Map();
    }
  }

  const diffs: RecordDiff[] = [];
  let inserts = 0;
  let updates = 0;
  let unchanged = 0;

  for (const newRecord of newRecords) {
    const key = String(newRecord[keyField]);
    const existing = existingMap.get(key) || null;
    const diff = compareRecords(existing, newRecord, keyField);

    diffs.push(diff);

    switch (diff.changeType) {
      case 'insert':
        inserts++;
        break;
      case 'update':
        updates++;
        break;
      case 'no_change':
        unchanged++;
        break;
    }
  }

  return {
    diffs,
    summary: { inserts, updates, unchanged },
  };
}

/**
 * Guarda los diffs de registros en la tabla sftp_record_diffs
 */
export async function saveRecordDiffs(
  importLogId: number,
  fileVersionId: number | null,
  tableName: string,
  diffs: RecordDiff[]
): Promise<void> {
  // Solo guardar inserts y updates (no_change no agrega valor)
  const significantDiffs = diffs.filter(d => d.changeType !== 'no_change');

  if (significantDiffs.length === 0) {
    console.log(`📊 Sin cambios significativos para guardar en ${tableName}`);
    return;
  }

  const records = significantDiffs.map(diff => ({
    import_log_id: importLogId,
    file_version_id: fileVersionId,
    table_name: tableName,
    record_key: diff.recordKey,
    row_hash_previous: diff.hashPrevious,
    row_hash_current: diff.hashCurrent,
    change_type: diff.changeType,
    fields_changed: diff.fieldsChanged.map(f => f.field),
    old_values: diff.changeType === 'update'
      ? Object.fromEntries(diff.fieldsChanged.map(f => [f.field, f.oldValue]))
      : null,
    new_values: diff.changeType === 'update'
      ? Object.fromEntries(diff.fieldsChanged.map(f => [f.field, f.newValue]))
      : null,
  }));

  // Insertar en lotes de 100
  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabaseAdmin
      .from('sftp_record_diffs')
      .insert(batch);

    if (error) {
      console.error(`Error guardando diffs lote ${Math.floor(i / batchSize) + 1}:`, error);
    }
  }

  console.log(`💾 Guardados ${records.length} diffs de ${tableName} (${significantDiffs.filter(d => d.changeType === 'insert').length} inserts, ${significantDiffs.filter(d => d.changeType === 'update').length} updates)`);
}

/**
 * Obtiene resumen de diffs para una importación
 */
export async function getImportDiffSummary(importLogId: number): Promise<{
  table: string;
  inserts: number;
  updates: number;
  deletes: number;
  unchanged: number;
}[]> {
  const { data, error } = await supabaseAdmin
    .from('sftp_record_diffs')
    .select('table_name, change_type')
    .eq('import_log_id', importLogId);

  if (error || !data) {
    console.error('Error obteniendo resumen de diffs:', error);
    return [];
  }

  // Agrupar por tabla
  const byTable = new Map<string, { inserts: number; updates: number; deletes: number }>();

  for (const row of data) {
    const table = row.table_name;
    if (!byTable.has(table)) {
      byTable.set(table, { inserts: 0, updates: 0, deletes: 0 });
    }
    const counts = byTable.get(table)!;

    switch (row.change_type) {
      case 'insert':
        counts.inserts++;
        break;
      case 'update':
        counts.updates++;
        break;
      case 'delete':
        counts.deletes++;
        break;
    }
  }

  return Array.from(byTable.entries()).map(([table, counts]) => ({
    table,
    ...counts,
    unchanged: 0, // No guardamos unchanged en BD
  }));
}
