import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import * as fs from 'fs';
import * as path from 'path';

export const runtime = 'nodejs';

// Convertir fechas "8-Jan-25" a "2025-01-08"
function convertDate(dateStr: string): string {
  const months: Record<string, string> = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
    'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };

  const match = dateStr.match(/(\d{1,2})-(\w{3})-(\d{2})/);
  if (match) {
    const [, day, monthName, year] = match;
    const month = months[monthName];
    return `20${year}-${month}-${day.padStart(2, '0')}`;
  }
  return dateStr;
}

// Procesar una línea del CSV
function parseCSVLine(line: string): any {
  // Dividir por comas, pero respetando las comillas
  const columns: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      columns.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  columns.push(current.trim());

  // Procesar solo si tiene la estructura esperada
  if (columns.length >= 12 && columns[0] !== 'EMP') {
    return {
      emp: parseInt(columns[0]) || 0,
      nombre: columns[1] === '0' ? null : columns[1],
      fecha: convertDate(columns[2]),
      turno: parseInt(columns[3]) || null,
      horario: columns[4] || null,
      incidencia: columns[5].replace(/^"|"$/g, '') || null, // Remove quotes
      entra: columns[6] || null,
      sale: columns[7] || null,
      ordinarias: parseFloat(columns[8]) || 0,
      numero: parseInt(columns[9]) || null,
      inci: columns[10] || null,
      status: parseInt(columns[11]) || null
    };
  }
  return null;
}

export async function POST() {
  try {
    console.log('🚀 Iniciando importación de incidencias...');

    // Buscar el archivo CSV en la raíz del proyecto
    const csvPath = path.join(process.cwd(), '../../incidencias1.csv');

    if (!fs.existsSync(csvPath)) {
      return NextResponse.json(
        { error: 'Archivo incidencias1.csv no encontrado en la raíz del proyecto' },
        { status: 404 }
      );
    }

    // Leer archivo línea por línea
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.split('\n');

    console.log(`📊 Total de líneas en archivo: ${lines.length}`);

    const records: any[] = [];
    let processed = 0;
    let skipped = 0;

    // Procesar cada línea
    for (const line of lines) {
      if (line.trim() && !line.includes('Table 1') && !line.startsWith('EMP,')) {
        const record = parseCSVLine(line);
        if (record) {
          records.push(record);
          processed++;
        } else {
          skipped++;
        }
      }
    }

    console.log(`✅ Procesados: ${processed}, Omitidos: ${skipped}`);

    // Insertar en lotes de 100
    const batchSize = 100;
    let totalInserted = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      try {
        const { data, error } = await supabaseAdmin
          .from('incidencias')
          .insert(batch);

        if (error) {
          console.error(`❌ Error en lote ${Math.floor(i/batchSize) + 1}:`, error);
          errors.push(`Lote ${Math.floor(i/batchSize) + 1}: ${error.message}`);
        } else {
          totalInserted += batch.length;
          console.log(`✅ Lote ${Math.floor(i/batchSize) + 1}: ${batch.length} registros insertados`);
        }
      } catch (batchError) {
        console.error(`❌ Excepción en lote ${Math.floor(i/batchSize) + 1}:`, batchError);
        errors.push(`Lote ${Math.floor(i/batchSize) + 1}: ${batchError}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Importación completada: ${totalInserted}/${processed} registros insertados`,
      data: {
        totalProcessed: processed,
        totalInserted,
        totalErrors: errors.length,
        errorDetails: errors.slice(0, 5) // Solo los primeros 5 errores
      }
    });

  } catch (error) {
    console.error('❌ Error general:', error);
    return NextResponse.json(
      { error: 'Error al importar CSV', details: error },
      { status: 500 }
    );
  }
}