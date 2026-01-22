'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Upload,
  Database,
  FileText,
  Users,
  UserMinus,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronRight,
  FolderOpen
} from 'lucide-react';

interface ArchivoProcesado {
  nombre: string;
  tipo: string;
  registros: number;
  detalles?: string;
}

interface ImportResults {
  empleados: number;
  bajas: number;
  asistencia: number;
  incidencias?: number;
  permisos?: number;
  prenomina?: number;
  errors: string[];
  archivos?: ArchivoProcesado[];
}

interface StructureChange {
  filename: string;
  added: string[];
  removed: string[];
}

interface PendingApproval {
  logId: number;
  structureChanges: StructureChange[];
  message: string;
}

interface SFTPFile {
  name: string;
  type: 'plantilla' | 'incidencias' | 'act';
  lastModified: Date;
  size: number;
}

interface ColumnStats {
  nonEmpty: number;
  sample: string;
}

interface PreviewData {
  data: Record<string, unknown>[];
  filename: string;
  previewRows: number;
  totalRows: number;
  totalUnfiltered: number;
  columns: string[];
  columnStats: Record<string, ColumnStats>;
  appliedFilters?: {
    month: string | null;
    year: string | null;
  };
}

interface PreviewFilters {
  month: string;
  year: string;
}

type SyncFrequency = 'manual' | 'daily' | 'weekly' | 'monthly';

interface SyncSchedule {
  frequency: SyncFrequency;
  day_of_week: string;
  run_time: string;
  last_run: string | null;
  next_run: string | null;
}

const DEFAULT_SCHEDULE: SyncSchedule = {
  frequency: 'manual',
  day_of_week: 'monday',
  run_time: '02:00',
  last_run: null,
  next_run: null,
};

const FREQUENCY_OPTIONS: { value: SyncFrequency; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
];

const DAY_OPTIONS = [
  { value: 'monday', label: 'Lunes' },
  { value: 'tuesday', label: 'Martes' },
  { value: 'wednesday', label: 'Miércoles' },
  { value: 'thursday', label: 'Jueves' },
  { value: 'friday', label: 'Viernes' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' },
];

export function SFTPImportAdmin() {
  const forceImportEnabled = false; // 🔒 Deshabilitado por seguridad después de importación inicial exitosa
  const [isManualUpdating, setIsManualUpdating] = useState(false);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [sftpFiles, setSftpFiles] = useState<SFTPFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, PreviewData>>({});
  const [loadingPreviews, setLoadingPreviews] = useState<Record<string, boolean>>({});
  const [expandedPreviews, setExpandedPreviews] = useState<Record<string, boolean>>({});
  const [previewFilters, setPreviewFilters] = useState<Record<string, PreviewFilters>>({});
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string } | null>(null);
  const [schedule, setSchedule] = useState<SyncSchedule>(DEFAULT_SCHEDULE);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  const mapScheduleFromApi = (payload: any): SyncSchedule => {
    const rawFrequency = String(payload?.frequency ?? 'manual').toLowerCase();
    const allowed: SyncFrequency[] = ['manual', 'daily', 'weekly', 'monthly'];
    const frequency = (allowed.includes(rawFrequency as SyncFrequency)
      ? rawFrequency
      : 'manual') as SyncFrequency;

    return {
      frequency,
      day_of_week: String(payload?.day_of_week ?? 'monday').toLowerCase(),
      run_time: (payload?.run_time ?? '02:00').slice(0, 5),
      last_run: payload?.last_run ?? null,
      next_run: payload?.next_run ?? null,
    };
  };

  const loadSFTPFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const response = await fetch('/api/sftp?action=list');
      const data = await response.json();
      
      if (data.files) {
        type ApiSFTPFile = { name: string; type: 'plantilla' | 'incidencias' | 'act'; lastModified: string | number | Date; size: number };
        setSftpFiles((data.files as ApiSFTPFile[]).map((file) => ({
          name: String(file.name),
          type: file.type,
          lastModified: new Date(file.lastModified),
          size: Number(file.size)
        })));
      }
    } catch (error) {
      console.error('Error loading SFTP files:', error);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const fetchSchedule = async () => {
    setScheduleLoading(true);
    setScheduleError(null);
    try {
      const response = await fetch('/api/sftp/settings', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Respuesta no válida del servidor');
      }
      const data = await response.json();
      if (data?.settings) {
        setSchedule(mapScheduleFromApi(data.settings));
      } else {
        setSchedule(DEFAULT_SCHEDULE);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
      setScheduleError('No se pudo cargar la programación automática.');
      setSchedule(DEFAULT_SCHEDULE);
    } finally {
      setScheduleLoading(false);
    }
  };

  const formatDateTime = (value: string | null) => {
    if (!value) return 'Sin ejecutar';
    try {
      return format(new Date(value), "dd 'de' MMMM yyyy · HH:mm", { locale: es });
    } catch (error) {
      return 'Sin ejecutar';
    }
  };

  const handleSaveSchedule = async () => {
    setScheduleSaving(true);
    setScheduleError(null);
    try {
      const response = await fetch('/api/sftp/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frequency: schedule.frequency,
          day_of_week: schedule.day_of_week,
          run_time: schedule.run_time,
        }),
      });

      if (!response.ok) {
        throw new Error('Respuesta no válida del servidor');
      }

      const data = await response.json();
      if (data?.settings) {
        setSchedule(mapScheduleFromApi(data.settings));
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      setScheduleError('No se pudo guardar la programación. Intenta nuevamente.');
    } finally {
      setScheduleSaving(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const executeForceImport = async () => {
    if (!forceImportEnabled) {
      console.warn('Importación forzada deshabilitada. Actívala manualmente si es necesario.');
      return;
    }

    // Cuando quieras reactivar la importación forzada, elimina la bandera y
    // reutiliza la lógica previa que llamaba /api/import-real-sftp-force.
  };

  const executeManualUpdate = async () => {
    if (isManualUpdating) return;
    setIsManualUpdating(true);
    setImportResults(null);
    setPendingApproval(null);

    try {
      console.log('🔄 Ejecutando actualización manual de datos SFTP...');

      const response = await fetch('/api/import-sftp-real-data?trigger=manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      // 🔒 Verificar si hay una importación en curso (error 409)
      if (response.status === 409) {
        console.warn('⚠️ Importación bloqueada: ya hay una en curso');
        setImportResults({
          empleados: 0,
          bajas: 0,
          asistencia: 0,
          errors: [`Ya hay una importación en curso (ID: ${result.details?.importId}). Estado: ${result.details?.status}. Espera a que termine o cancélala.`]
        });
        return;
      }

      // Verificar si se requiere aprobación por cambios estructurales
      if (result.requiresApproval) {
        setPendingApproval({
          logId: result.logId,
          structureChanges: result.structureChanges,
          message: result.message
        });
        console.log('⚠️ Se requiere aprobación:', result.structureChanges);
        return;
      }

      if (result.success) {
        setImportResults(result.results);
        if (result.schedule) {
          setSchedule(mapScheduleFromApi(result.schedule));
        }
        console.log('✅ Actualización manual completada:', result.results);
      } else {
        console.error('❌ Error en actualización manual:', result.error);
        setImportResults({
          empleados: 0,
          bajas: 0,
          asistencia: 0,
          errors: [result.error || 'Error desconocido']
        });
      }

    } catch (error) {
      console.error('❌ Error ejecutando actualización manual:', error);
      setImportResults({
        empleados: 0,
        bajas: 0,
        asistencia: 0,
        errors: [error instanceof Error ? error.message : 'Error de conexión']
      });
    } finally {
      setIsManualUpdating(false);
    }
  };

  const approveImport = async () => {
    if (!pendingApproval || isApproving) return;
    setIsApproving(true);

    try {
      console.log('✅ Aprobando importación con cambios estructurales...');

      // Aprobar y continuar con la importación
      const response = await fetch(`/api/sftp/approve?logId=${pendingApproval.logId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (result.success) {
        setImportResults(result.results);
        setPendingApproval(null);
        if (result.schedule) {
          setSchedule(mapScheduleFromApi(result.schedule));
        }
        console.log('✅ Importación aprobada y completada:', result.results);
      } else {
        console.error('❌ Error aprobando importación:', result.error);
        setImportResults({
          empleados: 0,
          bajas: 0,
          asistencia: 0,
          errors: [result.error || 'Error al aprobar importación']
        });
      }

    } catch (error) {
      console.error('❌ Error aprobando importación:', error);
      setImportResults({
        empleados: 0,
        bajas: 0,
        asistencia: 0,
        errors: [error instanceof Error ? error.message : 'Error de conexión']
      });
    } finally {
      setIsApproving(false);
    }
  };

  const rejectImport = () => {
    setPendingApproval(null);
    console.log('❌ Importación rechazada por el usuario');
  };

  const loadFilePreview = async (filename: string, filters?: PreviewFilters) => {
    setLoadingPreviews(prev => ({ ...prev, [filename]: true }));
    try {
      const currentFilters = filters || previewFilters[filename] || { month: '', year: '' };
      let url = `/api/sftp?action=preview&filename=${encodeURIComponent(filename)}`;

      if (currentFilters.month) {
        url += `&month=${currentFilters.month}`;
      }
      if (currentFilters.year) {
        url += `&year=${currentFilters.year}`;
      }

      const response = await fetch(url);
      const result = await response.json();

      if (result.data) {
        setPreviewData(prev => ({
          ...prev,
          [filename]: {
            data: result.data,
            filename: result.filename,
            previewRows: result.previewRows,
            totalRows: result.totalRows || result.previewRows,
            totalUnfiltered: result.totalUnfiltered || result.previewRows,
            columns: result.columns || (result.data.length > 0 ? Object.keys(result.data[0]) : []),
            columnStats: result.columnStats || {},
            appliedFilters: result.appliedFilters
          }
        }));
        setExpandedPreviews(prev => ({ ...prev, [filename]: true }));
      }
    } catch (error) {
      console.error('Error loading preview:', error);
    } finally {
      setLoadingPreviews(prev => ({ ...prev, [filename]: false }));
    }
  };

  const updatePreviewFilter = (filename: string, field: 'month' | 'year', value: string) => {
    setPreviewFilters(prev => ({
      ...prev,
      [filename]: {
        ...prev[filename] || { month: '', year: '' },
        [field]: value
      }
    }));
  };

  const applyPreviewFilters = (filename: string) => {
    const filters = previewFilters[filename];
    loadFilePreview(filename, filters);
  };

  const clearPreviewFilters = (filename: string) => {
    setPreviewFilters(prev => ({
      ...prev,
      [filename]: { month: '', year: '' }
    }));
    loadFilePreview(filename, { month: '', year: '' });
  };

  const togglePreview = (filename: string) => {
    if (expandedPreviews[filename]) {
      setExpandedPreviews(prev => ({ ...prev, [filename]: false }));
    } else if (previewData[filename]) {
      setExpandedPreviews(prev => ({ ...prev, [filename]: true }));
    } else {
      loadFilePreview(filename);
    }
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    setConnectionResult(null);

    try {
      const response = await fetch('/api/sftp?action=test');
      const result = await response.json();

      if (result.success) {
        setConnectionResult({
          success: true,
          message: `✅ Conexión exitosa: ${result.message || 'Conectado al servidor SFTP'}`
        });
      } else {
        setConnectionResult({
          success: false,
          message: `❌ Error: ${result.error || 'No se pudo conectar'}`
        });
      }
    } catch (error) {
      setConnectionResult({
        success: false,
        message: `❌ Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">📡 Administración SFTP</h1>
        <p className="text-muted-foreground">
          Importa datos reales desde el servidor SFTP hacia la base de datos
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">Programación automática de sincronización</CardTitle>
            <p className="text-sm text-muted-foreground">
              Define cada cuánto deseas actualizar los datos desde el SFTP.
            </p>
          </div>
          {!scheduleLoading && (
            <Badge variant="outline" className="uppercase tracking-wide text-xs">
              {FREQUENCY_OPTIONS.find((option) => option.value === schedule.frequency)?.label ?? 'Manual'}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {scheduleLoading ? (
            <div className="space-y-3">
              <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
              <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
              <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
            </div>
          ) : (
            <>
              {scheduleError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {scheduleError}
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Frecuencia
                  </label>
                  <Select
                    value={schedule.frequency}
                    onValueChange={(value) =>
                      setSchedule((prev) => ({
                        ...prev,
                        frequency: value as SyncFrequency,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona frecuencia" />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {schedule.frequency === 'weekly' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Día de la semana
                    </label>
                    <Select
                      value={schedule.day_of_week}
                      onValueChange={(value) =>
                        setSchedule((prev) => ({
                          ...prev,
                          day_of_week: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona día" />
                      </SelectTrigger>
                      <SelectContent>
                        {DAY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Horario (24h)
                  </label>
                  <Input
                    type="time"
                    value={schedule.run_time}
                    onChange={(event) =>
                      setSchedule((prev) => ({
                        ...prev,
                        run_time: event.target.value,
                      }))
                    }
                    disabled={schedule.frequency === 'manual'}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span>
                  Última ejecución:{' '}
                  <span className="font-medium text-foreground">
                    {formatDateTime(schedule.last_run)}
                  </span>
                </span>
                <span>
                  Próxima ejecución:{' '}
                  <span className="font-medium text-foreground">
                    {schedule.frequency === 'manual'
                      ? 'Cuando el administrador lo decida'
                      : formatDateTime(schedule.next_run)}
                  </span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handleSaveSchedule} disabled={scheduleSaving}>
                  {scheduleSaving ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
                    </span>
                  ) : (
                    'Guardar programación'
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Configura un cron externo (por ejemplo, Vercel Cron) para invocar el endpoint automático según esta programación.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Archivos SFTP */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Archivos en Servidor SFTP
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button 
              onClick={loadSFTPFiles}
              disabled={isLoadingFiles}
              variant="outline"
              size="sm"
            >
              {isLoadingFiles ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Actualizar Lista
            </Button>
            <Button
              onClick={testConnection}
              disabled={isTestingConnection}
              variant="outline"
              size="sm"
            >
              {isTestingConnection ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              Probar Conexión
            </Button>
          </div>

          {/* Resultado de la prueba de conexión */}
          {connectionResult && (
            <div className={`p-3 rounded-lg border mb-4 ${
              connectionResult.success
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {connectionResult.message}
            </div>
          )}
          
          {sftpFiles.length > 0 ? (
            <div className="space-y-3">
              {sftpFiles.map((file, index) => (
                <div key={index} className="border rounded-lg">
                  <div className="flex items-center justify-between p-3">
                    <div className="flex-1">
                      <div className="font-medium">{file.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Modificado: {file.lastModified.toLocaleDateString()} • {(file.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        file.type === 'plantilla' ? 'default' :
                        file.type === 'incidencias' ? 'secondary' : 'outline'
                      }>
                        {file.type}
                      </Badge>
                      {file.name.includes('Validacion Alta') && (
                        <Badge variant="default">👥 Empleados</Badge>
                      )}
                      {file.name.includes('MotivosBaja') && (
                        <Badge variant="destructive">📉 Bajas</Badge>
                      )}
                      {file.name.toLowerCase().endsWith('.pdf') ? (
                        <Badge variant="outline" className="text-[11px]">Sin vista previa (PDF)</Badge>
                      ) : (
                        <Button
                          onClick={() => togglePreview(file.name)}
                          variant="outline"
                          size="sm"
                          disabled={loadingPreviews[file.name]}
                        >
                          {loadingPreviews[file.name] ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-1" />
                              {expandedPreviews[file.name] ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Vista Previa Mejorada */}
                  {expandedPreviews[file.name] && previewData[file.name] && (
                    <div className="border-t bg-gray-50 p-4">
                      {/* Encabezado con totales */}
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h4 className="text-sm font-medium text-gray-700">
                          📊 Vista Previa - {previewData[file.name].columns?.length || 0} columnas
                        </h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            {previewData[file.name].previewRows.toLocaleString()} mostrando
                          </Badge>
                          <Badge variant="secondary" className="font-bold">
                            {previewData[file.name].totalRows?.toLocaleString() || '?'} filtrados
                          </Badge>
                          <Badge variant="default" className="bg-green-600">
                            {previewData[file.name].totalUnfiltered?.toLocaleString() || '?'} total
                          </Badge>
                        </div>
                      </div>

                      {/* Filtros de Mes y Año */}
                      <div className="mb-4 p-3 bg-white border rounded-lg">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs font-medium text-gray-600">Filtrar por:</span>
                          <Select
                            value={previewFilters[file.name]?.year || 'all'}
                            onValueChange={(value) => updatePreviewFilter(file.name, 'year', value === 'all' ? '' : value)}
                          >
                            <SelectTrigger className="w-[100px] h-8 text-xs">
                              <SelectValue placeholder="Año" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              {[2026, 2025, 2024, 2023].map((y) => (
                                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={previewFilters[file.name]?.month || 'all'}
                            onValueChange={(value) => updatePreviewFilter(file.name, 'month', value === 'all' ? '' : value)}
                          >
                            <SelectTrigger className="w-[120px] h-8 text-xs">
                              <SelectValue placeholder="Mes" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                                <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={() => applyPreviewFilters(file.name)}
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            disabled={loadingPreviews[file.name]}
                          >
                            {loadingPreviews[file.name] ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'Aplicar'
                            )}
                          </Button>
                          {(previewFilters[file.name]?.month || previewFilters[file.name]?.year) && (
                            <Button
                              onClick={() => clearPreviewFilters(file.name)}
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs text-gray-500"
                            >
                              Limpiar
                            </Button>
                          )}
                        </div>
                        {previewData[file.name].appliedFilters?.month || previewData[file.name].appliedFilters?.year ? (
                          <div className="mt-2 text-xs text-gray-500">
                            Filtro activo: {previewData[file.name].appliedFilters?.year || 'Todos los años'} / {previewData[file.name].appliedFilters?.month ? `Mes ${previewData[file.name].appliedFilters?.month}` : 'Todos los meses'}
                          </div>
                        ) : null}
                      </div>

                      {previewData[file.name].data.length > 0 ? (
                        <>
                          {/* Tabla con TODAS las columnas */}
                          <div className="overflow-x-auto max-h-[500px] border rounded">
                            <table className="min-w-full text-xs border-collapse">
                              <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                  <th className="px-2 py-2 text-left border-b font-medium text-gray-500 bg-gray-200">#</th>
                                  {previewData[file.name].columns.map((header) => (
                                    <th key={header} className="px-2 py-2 text-left border-b font-medium text-gray-600 whitespace-nowrap">
                                      {header}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {previewData[file.name].data.map((row, i) => (
                                  <tr key={i} className="hover:bg-blue-50 even:bg-gray-50">
                                    <td className="px-2 py-1 border-b text-gray-400 font-mono">{i + 1}</td>
                                    {previewData[file.name].columns.map((header) => (
                                      <td key={header} className="px-2 py-1 border-b text-gray-700 whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis">
                                        {String(row[header] ?? '')}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                              {/* Fila de totales */}
                              <tfoot className="bg-gray-200 sticky bottom-0">
                                <tr>
                                  <td className="px-2 py-2 font-bold text-gray-700 border-t">Total</td>
                                  {previewData[file.name].columns.map((header) => (
                                    <td key={header} className="px-2 py-2 border-t font-medium text-gray-600">
                                      <span className="text-[10px] text-gray-500">
                                        {previewData[file.name].columnStats[header]?.nonEmpty?.toLocaleString() || 0} valores
                                      </span>
                                    </td>
                                  ))}
                                </tr>
                              </tfoot>
                            </table>
                          </div>

                          {/* Resumen de columnas */}
                          <div className="mt-4 p-3 bg-white border rounded-lg">
                            <h5 className="text-xs font-medium text-gray-700 mb-2">📋 Resumen de Columnas ({previewData[file.name].columns.length})</h5>
                            <div className="flex flex-wrap gap-2">
                              {previewData[file.name].columns.map((col) => (
                                <Badge key={col} variant="outline" className="text-[10px] py-0.5">
                                  {col}: {previewData[file.name].columnStats[col]?.nonEmpty?.toLocaleString() || 0}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          No hay datos disponibles para este filtro
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No se han cargado archivos aún</p>
              <p className="text-sm">Haz clic en &quot;Actualizar Lista&quot; para ver los archivos disponibles</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Importación */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Datos Reales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">📋 Proceso de Importación</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Se conectará al servidor SFTP (configurado por variables de entorno)</li>
                <li>• Descargará y procesará archivos de empleados y bajas</li>
                <li>• Limpiará tablas existentes e insertará datos reales</li>
                <li>• Validará y transformará datos según estructura de BD</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <Button
                onClick={executeForceImport}
                disabled={!forceImportEnabled}
                variant="outline"
                className="w-full border-dashed text-muted-foreground"
                size="lg"
                title="Deshabilitado por seguridad. Reactívalo cuando lo necesites."
              >
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  <span>FORZAR IMPORTACIÓN REAL (SIN CACHÉ)</span>
                  <Badge variant="secondary">Deshabilitado</Badge>
                </div>
              </Button>

              <Button 
                onClick={executeManualUpdate}
                disabled={isManualUpdating}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {isManualUpdating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Actualizando información...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2" />
                    Actualizar Información (Manual)
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aprobación Pendiente */}
      {pendingApproval && (
        <Card className="mb-6 border-yellow-400">
          <CardHeader className="bg-yellow-50">
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="h-5 w-5" />
              ⚠️ Cambios Estructurales Detectados
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground mb-4">
              {pendingApproval.message}
            </p>

            <div className="space-y-4 mb-6">
              {pendingApproval.structureChanges.map((change, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {change.filename}
                  </h4>

                  {change.added.length > 0 && (
                    <div className="mb-3">
                      <span className="text-sm font-medium text-green-700">Columnas agregadas:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {change.added.map((col, i) => (
                          <Badge key={i} variant="outline" className="bg-green-50 text-green-700 border-green-300">
                            + {col}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {change.removed.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-red-700">Columnas eliminadas:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {change.removed.map((col, i) => (
                          <Badge key={i} variant="outline" className="bg-red-50 text-red-700 border-red-300">
                            - {col}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="flex gap-3">
              <Button
                onClick={approveImport}
                disabled={isApproving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Aprobando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aprobar y Continuar Importación
                  </>
                )}
              </Button>
              <Button
                onClick={rejectImport}
                disabled={isApproving}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                Rechazar
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              Al aprobar, la estructura se guardará como referencia para futuras importaciones.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Resultados */}
      {importResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResults.errors.length === 0 ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              Resultados de Importación
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Archivos SFTP Procesados */}
            {importResults.archivos && importResults.archivos.length > 0 ? (
              <div className="space-y-2 mb-4">
                {importResults.archivos.map((archivo, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-slate-600" />
                      <span className="font-mono text-sm font-medium">{archivo.nombre}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-sm font-bold">
                        {archivo.registros.toLocaleString()} registros
                      </Badge>
                      {archivo.detalles && (
                        <span className="text-sm text-muted-foreground">
                          ({archivo.detalles})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4 mb-4">
                No hay archivos procesados
              </div>
            )}

            {importResults.errors.length > 0 && (
              <>
                <Separator className="my-4" />
                <div>
                  <h4 className="font-medium text-red-600 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Errores Encontrados
                  </h4>
                  <div className="space-y-2">
                    {importResults.errors.map((error, index) => (
                      <div key={index} className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {importResults.errors.length === 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">¡Importación completada exitosamente!</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Todos los datos se han importado correctamente desde el servidor SFTP
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
