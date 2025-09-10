import { NextRequest, NextResponse } from 'next/server';
import SftpClient from 'ssh2-sftp-client';
import { sftpImporter } from '@/lib/sftp-importer';

interface SFTPConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  directory: string;
}

class SFTPImportService {
  private config: SFTPConfig;

  constructor() {
    this.config = {
      host: process.env.SFTP_HOST || '148.244.90.21',
      port: parseInt(process.env.SFTP_PORT || '5062'),
      username: process.env.SFTP_USER || 'rhmrm',
      password: process.env.SFTP_PASSWORD || 'rh12345',
      directory: process.env.SFTP_DIRECTORY || 'ReportesRH'
    };
  }

  // Importar todos los archivos desde SFTP
  async importarTodosLosDatos(): Promise<{
    success: boolean;
    mensaje: string;
    estadisticas?: any;
    errores?: string[];
  }> {
    const sftp = new SftpClient();
    const errores: string[] = [];
    
    try {
      console.log('🚀 Iniciando importación completa desde SFTP...');
      
      // Conectar al servidor SFTP
      await sftp.connect({
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        password: this.config.password,
        readyTimeout: 20000
      });

      // Listar archivos disponibles
      const fileList = await sftp.list(this.config.directory);
      const csvFiles = fileList.filter(file => 
        file.type === '-' && file.name.endsWith('.csv')
      );

      console.log(`📁 Archivos encontrados: ${csvFiles.length}`);
      csvFiles.forEach(file => {
        console.log(`  📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
      });

      if (csvFiles.length === 0) {
        await sftp.end();
        return {
          success: false,
          mensaje: 'No se encontraron archivos CSV en el servidor SFTP'
        };
      }

      // Procesar cada archivo
      let totalExitosos = 0;
      let totalErrores = 0;

      for (const file of csvFiles) {
        try {
          console.log(`\n📊 Procesando: ${file.name}`);
          
          const importacionId = await sftpImporter.iniciarImportacion(file.name);
          
          // Descargar archivo
          const filePath = `${this.config.directory}/${file.name}`;
          const fileContent = await sftp.get(filePath);
          const csvText = fileContent.toString('utf8');
          const lines = csvText.split('\n').filter(line => line.trim());

          if (lines.length === 0) {
            console.warn(`⚠️  Archivo ${file.name} está vacío`);
            errores.push(`Archivo ${file.name} está vacío`);
            continue;
          }

          let resultado;

          // Procesar según tipo de archivo
          if (file.name.toLowerCase().includes('prenomina') || 
              file.name.toLowerCase().includes('horizontal')) {
            resultado = await sftpImporter.procesarPrenomina(lines);
          } else if (file.name.toLowerCase().includes('motivos') || 
                     file.name.toLowerCase().includes('baja')) {
            resultado = await sftpImporter.procesarMotivosBaja(lines);
          } else {
            console.warn(`⚠️  Tipo de archivo no reconocido: ${file.name}`);
            errores.push(`Tipo de archivo no reconocido: ${file.name}`);
            continue;
          }

          // Completar importación
          await sftpImporter.completarImportacion(resultado.exitosos, resultado.errores);
          
          totalExitosos += resultado.exitosos;
          totalErrores += resultado.errores;

          console.log(`✅ ${file.name}: ${resultado.exitosos} exitosos, ${resultado.errores} errores`);

        } catch (error) {
          console.error(`❌ Error procesando ${file.name}:`, error);
          errores.push(`Error procesando ${file.name}: ${(error as Error).message}`);
        }
      }

      await sftp.end();

      // Obtener estadísticas finales
      const estadisticas = await sftpImporter.obtenerEstadisticas();

      console.log('\n🎉 Importación completada:');
      console.log(`📊 Empleados: ${estadisticas.empleados}`);
      console.log(`📅 Registros de asistencia: ${estadisticas.asistencias}`);
      console.log(`📋 Motivos de baja: ${estadisticas.bajas}`);
      console.log(`✅ Exitosos: ${totalExitosos}, ❌ Errores: ${totalErrores}`);

      return {
        success: true,
        mensaje: `Importación completada exitosamente. ${totalExitosos} registros procesados.`,
        estadisticas,
        errores: errores.length > 0 ? errores : undefined
      };

    } catch (error) {
      console.error('❌ Error en importación SFTP:', error);
      await sftp.end();
      
      return {
        success: false,
        mensaje: `Error en importación: ${(error as Error).message}`,
        errores: [
          (error as Error).message,
          ...errores
        ]
      };
    }
  }

  // Obtener estadísticas de datos actuales
  async obtenerEstadisticas(): Promise<any> {
    try {
      const stats = await sftpImporter.obtenerEstadisticas();
      return {
        success: true,
        estadisticas: stats
      };
    } catch (error) {
      return {
        success: false,
        mensaje: `Error obteniendo estadísticas: ${(error as Error).message}`
      };
    }
  }
}

const sftpImportService = new SFTPImportService();

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  console.log(`🔄 API SFTP Import - Acción: ${action}`);

  try {
    switch (action) {
      case 'import-all':
        console.log('🚀 Iniciando importación completa...');
        const resultado = await sftpImportService.importarTodosLosDatos();
        
        return NextResponse.json(resultado, {
          status: resultado.success ? 200 : 500
        });

      case 'stats':
        console.log('📊 Obteniendo estadísticas...');
        const stats = await sftpImportService.obtenerEstadisticas();
        
        return NextResponse.json(stats, {
          status: stats.success ? 200 : 500
        });

      default:
        return NextResponse.json({ 
          success: false,
          mensaje: 'Acción no válida. Usar: import-all, stats' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ Error en API SFTP Import:', error);
    return NextResponse.json({ 
      success: false,
      mensaje: 'Error interno del servidor',
      error: (error as Error).message
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'stats') {
    try {
      const stats = await sftpImportService.obtenerEstadisticas();
      return NextResponse.json(stats);
    } catch (error) {
      return NextResponse.json({ 
        success: false,
        mensaje: `Error obteniendo estadísticas: ${(error as Error).message}`
      }, { status: 500 });
    }
  }

  return NextResponse.json({ 
    success: false,
    mensaje: 'Método no permitido. Usar POST para importar datos.' 
  }, { status: 405 });
}