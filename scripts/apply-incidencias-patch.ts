#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../apps/web/.env.local') });

async function applyPatch() {
  console.log('\n📄 Aplicando patch de incidencias históricas (jul-dic 2025)...\n');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const patchPath = path.join(__dirname, '../parches/incidencias_patch_insert.sql');
  const sqlContent = fs.readFileSync(patchPath, 'utf8');

  // Parsear el SQL
  const lines = sqlContent.split('\n');
  const valueLines = lines.filter(l => l.trim().startsWith('('));

  const incidencias = valueLines.map(line => {
    // Regex para parsear: (emp, nombre, fecha, turno, horario, incidencia, entra, sale, ordinarias, numero, inci, status)
    const match = line.match(/\((\d+), '([^']*)', '([^']+)', (\d+|NULL), '([^']*)', '([^']*)', (NULL|'[^']*'), (NULL|'[^']*'), ([\d.]+), (\d+), '([^']*)', (\d+)\)/);

    if (!match) {
      console.warn('⚠️ No se pudo parsear:', line.substring(0, 100));
      return null;
    }

    return {
      emp: parseInt(match[1]),
      nombre: match[2],
      fecha: match[3],
      turno: match[4] === 'NULL' ? null : parseInt(match[4]),
      horario: match[5] || null,
      incidencia: match[6] || null,
      entra: match[7] === 'NULL' ? null : match[7].replace(/'/g, ''),
      sale: match[8] === 'NULL' ? null : match[8].replace(/'/g, ''),
      ordinarias: parseFloat(match[9]),
      numero: parseInt(match[10]),
      inci: match[11] || null,
      status: parseInt(match[12])
    };
  }).filter(i => i !== null);

  console.log(`📊 Parseadas ${incidencias.length} incidencias del patch`);

  // Insertar en lotes
  const BATCH_SIZE = 200;
  let insertadas = 0;

  for (let i = 0; i < incidencias.length; i += BATCH_SIZE) {
    const batch = incidencias.slice(i, i + BATCH_SIZE);

    const { data, error } = await supabase
      .from('incidencias')
      .insert(batch)
      .select();

    if (error) {
      console.error(`❌ Error lote ${Math.floor(i/BATCH_SIZE) + 1}:`, error.message);
    } else {
      insertadas += data?.length || 0;
      console.log(`✅ Lote ${Math.floor(i/BATCH_SIZE) + 1}: ${data?.length} incidencias`);
    }
  }

  console.log(`\n✅ Patch aplicado: ${insertadas} incidencias históricas agregadas\n`);

  // Verificar
  const { count } = await supabase
    .from('incidencias')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total incidencias en BD: ${count}\n`);
}

applyPatch().catch(console.error);
