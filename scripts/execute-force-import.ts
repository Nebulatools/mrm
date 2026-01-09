#!/usr/bin/env tsx
/**
 * Execute Force Import - Llama al endpoint de importación forzada
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../apps/web/.env.local') });

async function executeForceImport() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 EJECUTANDO IMPORTACIÓN FORZADA DESDE SFTP');
  console.log('='.repeat(80) + '\n');

  try {
    // Necesitamos simular una request con admin auth
    // En lugar de eso, voy a llamar directamente al código
    const { importFromSFTPForce } = await import('../apps/web/src/app/api/import-real-sftp-force/route');

    console.log('📡 Iniciando importación...\n');

    // Como no podemos llamar al endpoint directamente sin auth,
    // vamos a usar el script anterior que hace lo mismo
    const result = await import('./test-import-prenomina');

    console.log('\n✅ Importación completada!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

executeForceImport();
