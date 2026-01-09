import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server-auth';
export const runtime = 'nodejs';
import SftpClient from 'ssh2-sftp-client';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface SFTPConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  directory: string;
}

interface SFTPFile {
  name: string;
  type: 'plantilla' | 'incidencias' | 'act';
  lastModified: Date;
  size: number;
}

class SFTPService {
  private config: SFTPConfig;

  constructor() {
    const host = process.env.SFTP_HOST;
    const port = process.env.SFTP_PORT;
    const username = process.env.SFTP_USER;
    const password = process.env.SFTP_PASSWORD;
    const directory = process.env.SFTP_DIRECTORY || 'ReportesRH';

    if (!host || !port || !username || !password) {
      throw new Error('Missing SFTP configuration. Please set SFTP_HOST, SFTP_PORT, SFTP_USER, SFTP_PASSWORD.');
    }

    this.config = {
      host,
      port: parseInt(String(port)),
      username,
      password,
      directory
    };
  }

  // Test SFTP connection
  async testConnection(): Promise<boolean> {
    const sftp = new SftpClient();
    try {
      console.log('Testing SFTP connection to:', `${this.config.username}@${this.config.host}:${this.config.port}`);

      await sftp.connect({
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        password: this.config.password,
        readyTimeout: 10000, // 10 seconds timeout
        retries: 1
      });

      // Test directory access
      const dirExists = await sftp.exists(this.config.directory);
      console.log(`Directory '${this.config.directory}' exists:`, dirExists);

      await sftp.end();
      console.log('SFTP connection test: SUCCESS');
      return true;
    } catch (error) {
      console.error('SFTP connection test failed:', error);
      await sftp.end();
      return false;
    }
  }

  // List available files in SFTP directory
  async listFiles(): Promise<SFTPFile[]> {
    const sftp = new SftpClient();
    try {
      console.log('Listing SFTP files from:', `${this.config.host}:${this.config.port}/${this.config.directory}`);

      await sftp.connect({
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        password: this.config.password,
        readyTimeout: 10000
      });

      // List files in directory
      const fileList = await sftp.list(this.config.directory);

      // Filter and map files - SOLO Excel y CSV (NO PDFs ni Word)
      const hrFiles: SFTPFile[] = fileList
        .filter(file => {
          const isFile = file.type === '-';
          const hasValidExtension = file.name.endsWith('.csv') ||
                                   file.name.endsWith('.xlsx') ||
                                   file.name.endsWith('.xls');
          return isFile && hasValidExtension;
        })
        .map(file => {
          let type: 'plantilla' | 'incidencias' | 'act' = 'plantilla';

          // Mapeo basado en los nombres de archivos de la imagen
          const fileName = file.name.toLowerCase();

          if (fileName.includes('motivos') && fileName.includes('bajas')) {
            type = 'plantilla'; // Motivos Bajas va a empleados_sftp/plantilla
          } else if (fileName.includes('incidencias') || fileName.includes('me 5')) {
            type = 'incidencias';
          } else if (fileName.includes('prenomina') || fileName.includes('horizo')) {
            type = 'plantilla'; // Prenómina es datos de empleados
          } else if (fileName.includes('validacion') || fileName.includes('alta')) {
            type = 'act'; // Validación es asistencia/actividad
          } else if (fileName.includes('plantilla')) {
            type = 'plantilla';
          } else if (fileName.includes('act')) {
            type = 'act';
          }

          // Solo procesamos Excel y CSV (sin lógica de PDFs)

          return {
            name: file.name,
            type: type,
            lastModified: new Date(file.modifyTime),
            size: file.size
          };
        });

      await sftp.end();
      console.log(`Found ${hrFiles.length} HR files`);
      return hrFiles;

    } catch (error) {
      console.error('Error listing SFTP files:', error);
      await sftp.end();

      // FAIL FAST: No mock data - surface connection issues immediately
      throw new Error(`SFTP connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Download and parse CSV file from SFTP
  async downloadFile(filename: string, limit?: number): Promise<Record<string, unknown>[]> {
    const sftp = new SftpClient();
    try {
      console.log('Downloading file:', filename);

      await sftp.connect({
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        password: this.config.password,
        readyTimeout: 10000
      });

      // Download file content
      const filePath = `${this.config.directory}/${filename}`;
      const fileContent = await sftp.get(filePath);

      await sftp.end();

      // Detectar tipo de archivo y procesarlo apropiadamente
      let data: Record<string, unknown>[] = [];

      if (filename.toLowerCase().endsWith('.csv')) {
        // Procesar CSV usando Papaparse para respetar comillas y comas embebidas
        const csvText = fileContent.toString('utf8');
        try {
          const parsed = Papa.parse<Record<string, unknown>>(csvText, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false,
          });

          if (parsed.errors?.length) {
            console.warn('⚠️ CSV parse warnings:', parsed.errors.map((err) => err.message).slice(0, 3));
          }

          const rows = Array.isArray(parsed.data) ? parsed.data : [];
          const normalizedRows = rows.slice(0, limit ? Math.min(limit, rows.length) : rows.length).map((row) => {
            const normalized: Record<string, unknown> = {};
            Object.entries(row).forEach(([key, value]) => {
              const cleanKey = key?.trim() || key;
              if (!cleanKey) return;
              if (typeof value === 'string') {
                normalized[cleanKey] = value.trim();
              } else {
                normalized[cleanKey] = value;
              }
            });
            return normalized;
          });

          return normalizedRows;
        } catch (csvError) {
          console.error('Error procesando CSV con Papaparse:', csvError);
          data = [];
        }
      } else if (filename.toLowerCase().endsWith('.xlsx') || filename.toLowerCase().endsWith('.xls')) {
        // Procesar Excel
        console.log('Procesando archivo Excel:', filename);
        try {
          const workbook = XLSX.read(fileContent, { type: 'buffer' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Convertir a matriz de filas (primera fila = headers)
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' }) as unknown[];
          const headerRow = (rows[0] as unknown[]) || [];
          const headers: string[] = headerRow.map((h: unknown) => String(h || ''));
          const bodyRows = rows.slice(1) as unknown[];

          const maxRows = limit ? Math.min(limit, bodyRows.length) : bodyRows.length;
          const rowsToProcess = bodyRows.slice(0, maxRows);

          data = rowsToProcess.map((rowUnknown: unknown) => {
            const row = rowUnknown as unknown[];
            const obj: Record<string, unknown> = {};
            headers.forEach((header, i) => {
              const cell = row && row[i] !== undefined ? row[i] : null;
              obj[header || `col_${i}`] = cell as unknown;
            });
            return obj;
          });

          console.log(`Excel procesado: ${data.length} filas extraídas`);
        } catch (excelError) {
          console.error('Error procesando Excel:', excelError);
          data = [];
        }
      }
      // Solo procesamos Excel y CSV - PDFs y Word eliminados

      console.log(`Parsed ${data.length} rows from ${filename}`);
      return data;

    } catch (error) {
      console.error('Error downloading SFTP file:', error);
      await sftp.end();

      // No mock data on failure: fail fast to surface config issues
      return [];
    }
  }

}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const filename = searchParams.get('filename');

  const auth = await requireAdmin(request);
  if ('error' in auth) {
    return auth.error;
  }

  try {
    // Initialize SFTP service inside the handler to catch initialization errors
    const sftpService = new SFTPService();

    switch (action) {
      case 'test':
        const connectionOk = await sftpService.testConnection();
        return NextResponse.json({ success: connectionOk });

      case 'list':
        const files = await sftpService.listFiles();
        return NextResponse.json({ files });

      case 'download':
        if (!filename) {
          return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
        }
        const data = await sftpService.downloadFile(filename);
        return NextResponse.json({ data });

      case 'preview':
        if (!filename) {
          return NextResponse.json({ error: 'Filename is required for preview' }, { status: 400 });
        }
        console.log(`Preview requested for: ${filename}`);
        const previewData = await sftpService.downloadFile(filename, 10); // Limit to 10 rows
        return NextResponse.json({
          data: previewData,
          isPreview: true,
          previewRows: previewData.length,
          filename: filename
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('SFTP API error:', error);
    return NextResponse.json({
      error: 'SFTP operation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
