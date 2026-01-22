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

        // Parámetros de filtro opcionales
        const filterMonth = searchParams.get('month'); // 1-12
        const filterYear = searchParams.get('year');   // ej: 2025
        const showAll = searchParams.get('showAll') === 'true';

        // Descargar todos los datos para poder filtrar y contar
        const allData = await sftpService.downloadFile(filename);

        // Detectar columnas de fecha dinámicamente (buscar cualquier columna que contenga "fecha")
        const allColumns = allData.length > 0 ? Object.keys(allData[0]) : [];
        const dateColumns = allColumns.filter(col =>
          col.toLowerCase().includes('fecha') ||
          col.toLowerCase().includes('date') ||
          col.toLowerCase() === 'semana_inicio' ||
          col.toLowerCase() === 'semana_fin'
        );

        console.log(`Columnas detectadas para filtro de fecha: ${dateColumns.join(', ')}`);

        let filteredData = allData;

        if (filterMonth || filterYear) {
          filteredData = allData.filter(row => {
            // Buscar en cualquier columna de fecha detectada
            for (const col of dateColumns) {
              const dateValue = row[col];
              if (dateValue && typeof dateValue === 'string') {
                // Limpiar el valor
                const cleanDate = dateValue.trim();

                // Intentar varios formatos de fecha
                const dateParts = cleanDate.split(/[-/]/);
                if (dateParts.length >= 3) {
                  let year: string, month: string;

                  // Formato: YYYY-MM-DD o YYYY/MM/DD
                  if (dateParts[0].length === 4) {
                    year = dateParts[0];
                    month = dateParts[1];
                  }
                  // Formato: DD/MM/YYYY o DD-MM-YYYY
                  else if (dateParts[2].length === 4) {
                    year = dateParts[2];
                    month = dateParts[1];
                  }
                  // Formato: MM/DD/YYYY (menos común)
                  else {
                    year = dateParts[2].length === 2 ? '20' + dateParts[2] : dateParts[2];
                    month = dateParts[0];
                  }

                  const matchYear = !filterYear || year === filterYear;
                  const matchMonth = !filterMonth || parseInt(month) === parseInt(filterMonth);

                  if (matchYear && matchMonth) return true;
                }
              }
            }
            return false;
          });

          console.log(`Filtro aplicado: año=${filterYear}, mes=${filterMonth}. Resultados: ${filteredData.length}/${allData.length}`);
        }

        // Obtener columnas (usar las originales si el filtro no devuelve resultados)
        const columns = allColumns;
        const columnStats: Record<string, { nonEmpty: number; sample: string }> = {};

        columns.forEach(col => {
          const nonEmptyCount = filteredData.filter(row => {
            const val = row[col];
            return val !== null && val !== undefined && val !== '';
          }).length;

          const sampleVal = filteredData.find(row => row[col] !== null && row[col] !== undefined && row[col] !== '');
          columnStats[col] = {
            nonEmpty: nonEmptyCount,
            sample: sampleVal ? String(sampleVal[col]).slice(0, 50) : ''
          };
        });

        // Limitar filas para la respuesta (pero ya tenemos las estadísticas completas)
        const previewLimit = showAll ? filteredData.length : Math.min(100, filteredData.length);
        const previewData = filteredData.slice(0, previewLimit);

        return NextResponse.json({
          data: previewData,
          isPreview: true,
          previewRows: previewData.length,
          totalRows: filteredData.length,
          totalUnfiltered: allData.length,
          columns,
          columnStats,
          filename: filename,
          appliedFilters: {
            month: filterMonth,
            year: filterYear
          }
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
