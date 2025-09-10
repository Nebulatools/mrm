'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, 
  Database, 
  FileText, 
  Users, 
  UserMinus, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface ImportResults {
  empleados: number;
  bajas: number;
  asistencia: number;
  errors: string[];
}

interface SFTPFile {
  name: string;
  type: 'plantilla' | 'incidencias' | 'act';
  lastModified: Date;
  size: number;
}

export function SFTPImportAdmin() {
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [sftpFiles, setSftpFiles] = useState<SFTPFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  const loadSFTPFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const response = await fetch('/api/sftp?action=list');
      const data = await response.json();
      
      if (data.files) {
        setSftpFiles(data.files.map((file: any) => ({
          ...file,
          lastModified: new Date(file.lastModified)
        })));
      }
    } catch (error) {
      console.error('Error loading SFTP files:', error);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const executeForceImport = async () => {
    setIsImporting(true);
    setImportResults(null);
    
    try {
      console.log('🔥 FORZANDO IMPORTACIÓN REAL SIN CACHÉ...');
      
      const response = await fetch('/api/import-real-sftp-force', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        setImportResults({
          empleados: result.data.empleados.total_en_bd || 0,
          bajas: result.data.bajas.total_en_bd || 0,
          asistencia: result.data.asistencia.total_en_bd || 0,
          errors: []
        });
        console.log('✅ Importación real completada:', result.data);
      } else {
        console.error('❌ Error en importación real:', result.error);
        setImportResults({
          empleados: 0,
          bajas: 0,
          asistencia: 0,
          errors: [result.error || 'Error desconocido']
        });
      }
      
    } catch (error) {
      console.error('❌ Error ejecutando importación real:', error);
      setImportResults({
        empleados: 0,
        bajas: 0,
        errors: [error instanceof Error ? error.message : 'Error de conexión']
      });
    } finally {
      setIsImporting(false);
    }
  };

  const executeImport = async () => {
    setIsImporting(true);
    setImportResults(null);
    
    try {
      console.log('🚀 Iniciando importación desde admin panel...');
      
      const response = await fetch('/api/import-sftp-real-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        setImportResults(result.results);
        console.log('✅ Importación completada:', result.results);
      } else {
        console.error('❌ Error en importación:', result.error);
        setImportResults({
          empleados: 0,
          bajas: 0,
          asistencia: 0,
          errors: [result.error || 'Error desconocido']
        });
      }
      
    } catch (error) {
      console.error('❌ Error ejecutando importación:', error);
      setImportResults({
        empleados: 0,
        bajas: 0,
        errors: [error instanceof Error ? error.message : 'Error de conexión']
      });
    } finally {
      setIsImporting(false);
    }
  };

  const testConnection = async () => {
    try {
      const response = await fetch('/api/sftp?action=test');
      const result = await response.json();
      console.log('Test connection result:', result);
    } catch (error) {
      console.error('Error testing connection:', error);
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
              variant="outline"
              size="sm"
            >
              <Database className="h-4 w-4 mr-2" />
              Probar Conexión
            </Button>
          </div>
          
          {sftpFiles.length > 0 ? (
            <div className="space-y-2">
              {sftpFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
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
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No se han cargado archivos aún</p>
              <p className="text-sm">Haz clic en "Actualizar Lista" para ver los archivos disponibles</p>
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
                <li>• Se conectará al servidor SFTP (148.244.90.21:5062)</li>
                <li>• Descargará y procesará archivos de empleados y bajas</li>
                <li>• Limpiará tablas existentes e insertará datos reales</li>
                <li>• Validará y transformará datos según estructura de BD</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={executeForceImport}
                disabled={isImporting}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Forzando importación real...
                  </>
                ) : (
                  <>
                    <Database className="h-5 w-5 mr-2" />
                    🔥 FORZAR IMPORTACIÓN REAL (SIN CACHÉ)
                  </>
                )}
              </Button>
              
              <Button 
                onClick={executeImport}
                disabled={isImporting}
                variant="outline"
                className="w-full"
                size="lg"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Importando datos...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 mr-2" />
                    Importación Estándar
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Empleados Importados</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {importResults.empleados.toLocaleString()}
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <UserMinus className="h-5 w-5 text-red-600" />
                  <span className="font-medium">Bajas Importadas</span>
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {importResults.bajas.toLocaleString()}
                </div>
              </div>
              
              <div className="bg-green-50 p-6 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Asistencia Importada</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {importResults.asistencia.toLocaleString()}
                </div>
              </div>
            </div>

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