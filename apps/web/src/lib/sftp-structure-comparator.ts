/**
 * SFTP Structure Comparator
 *
 * Compara la estructura de columnas de un archivo SFTP con la última versión guardada.
 * Detecta columnas agregadas, eliminadas o renombradas.
 */

import { supabaseAdmin } from './supabase-admin';

export interface StructureComparison {
  hasChanges: boolean;
  added: string[];
  removed: string[];
  previousColumns: string[] | null;
  isFirstImport: boolean;
}

/**
 * Compara las columnas del archivo actual con la última estructura guardada
 */
export async function compareFileStructure(
  filename: string,
  currentColumns: string[]
): Promise<StructureComparison> {
  // Normalizar columnas (trim, lowercase para comparación)
  const normalizedCurrent = currentColumns.map(col => col.trim());

  // Buscar la última estructura guardada para este archivo
  const { data: previousStructure, error } = await supabaseAdmin
    .from('sftp_file_structure')
    .select('columns_json')
    .eq('filename', filename)
    .order('imported_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching previous structure:', error);
  }

  // Si no hay estructura previa, es la primera importación
  if (!previousStructure || !previousStructure.columns_json) {
    return {
      hasChanges: false,
      added: [],
      removed: [],
      previousColumns: null,
      isFirstImport: true
    };
  }

  const previousColumns = previousStructure.columns_json as string[];

  // Comparar columnas
  const added = normalizedCurrent.filter(col => !previousColumns.includes(col));
  const removed = previousColumns.filter(col => !normalizedCurrent.includes(col));

  return {
    hasChanges: added.length > 0 || removed.length > 0,
    added,
    removed,
    previousColumns,
    isFirstImport: false
  };
}

/**
 * Guarda la estructura actual del archivo en la bitácora
 */
export async function saveFileStructure(
  filename: string,
  fileType: string,
  columns: string[],
  rowCount: number
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('sftp_file_structure')
    .insert({
      filename,
      file_type: fileType,
      columns_json: columns,
      row_count: rowCount
    });

  if (error) {
    console.error('Error saving file structure:', error);
    throw error;
  }
}

/**
 * Crea un registro de importación en el log
 */
export async function createImportLog(
  triggerType: 'manual' | 'cron',
  hasStructureChanges: boolean,
  structureChanges: { added: string[]; removed: string[] }
): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('sftp_import_log')
    .insert({
      trigger_type: triggerType,
      status: hasStructureChanges ? 'awaiting_approval' : 'pending',
      has_structure_changes: hasStructureChanges,
      structure_changes: structureChanges,
      requires_approval: hasStructureChanges
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating import log:', error);
    throw error;
  }

  return data.id;
}

/**
 * Actualiza el estado de una importación
 */
export async function updateImportLogStatus(
  logId: number,
  status: 'pending' | 'analyzing' | 'awaiting_approval' | 'approved' | 'completed' | 'failed',
  results?: Record<string, unknown>
): Promise<void> {
  const updateData: Record<string, unknown> = { status };

  if (status === 'completed' || status === 'failed') {
    updateData.completed_at = new Date().toISOString();
  }

  if (results) {
    updateData.results = results;
  }

  const { error } = await supabaseAdmin
    .from('sftp_import_log')
    .update(updateData)
    .eq('id', logId);

  if (error) {
    console.error('Error updating import log:', error);
    throw error;
  }
}

/**
 * Aprueba una importación pendiente
 */
export async function approveImport(logId: number, approvedBy: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('sftp_import_log')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString()
    })
    .eq('id', logId);

  if (error) {
    console.error('Error approving import:', error);
    throw error;
  }
}

/**
 * Obtiene importaciones pendientes de aprobación
 */
export async function getPendingImports(): Promise<{
  id: number;
  trigger_type: string;
  structure_changes: { added: string[]; removed: string[] };
  created_at: string;
}[]> {
  const { data, error } = await supabaseAdmin
    .from('sftp_import_log')
    .select('id, trigger_type, structure_changes, created_at')
    .eq('status', 'awaiting_approval')
    .eq('requires_approval', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending imports:', error);
    return [];
  }

  return data || [];
}
