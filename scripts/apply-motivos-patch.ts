#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../apps/web/.env.local') });

async function applyPatch() {
  console.log('\n📄 Aplicando patch de motivos_baja históricos...\n');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Leer el archivo SQL
  const patchPath = path.join(__dirname, '../parches/motivos_baja_inserts.sql');
  const sqlContent = fs.readFileSync(patchPath, 'utf8');

  // Método directo: parsear y ejecutar en lotes
  const lines = sqlContent.split('\n');
  const valueLines = lines.filter(l => l.trim().startsWith('('));

  const bajas = valueLines.map(line => {
    // Parsear (numero, fecha, tipo, motivo, desc, obs)
    const match = line.match(/\((\d+), '([^']+)', '([^']+)', '([^']+)', '([^']*)', (NULL|'[^']*')\)/);
    if (!match) return null;

    return {
      numero_empleado: parseInt(match[1]),
      fecha_baja: match[2],
      tipo: match[3],
      motivo: match[4],
      descripcion: match[5],
      observaciones: match[6] === 'NULL' ? null : match[6].replace(/'/g, '')
    };
  }).filter(b => b !== null);

  console.log(`📊 Parseadas ${bajas.length} bajas del patch`);

  // Insertar en lotes
  const BATCH_SIZE = 100;
  let insertadas = 0;

  for (let i = 0; i < bajas.length; i += BATCH_SIZE) {
    const batch = bajas.slice(i, i + BATCH_SIZE);

    const { data, error: insertError } = await supabase
      .from('motivos_baja')
      .insert(batch)
      .select();

    if (insertError) {
      console.error(`❌ Error lote ${Math.floor(i/BATCH_SIZE) + 1}:`, insertError.message);
    } else {
      insertadas += data?.length || 0;
      console.log(`✅ Lote ${Math.floor(i/BATCH_SIZE) + 1}: ${data?.length} bajas`);
    }
  }

  console.log(`\n✅ Patch aplicado: ${insertadas} bajas históricas agregadas\n`);

  // Verificar
  const { count } = await supabase
    .from('motivos_baja')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total bajas en BD: ${count}\n`);
}

applyPatch().catch(console.error);
