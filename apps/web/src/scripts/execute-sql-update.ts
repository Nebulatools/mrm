import { supabase } from '../lib/supabase';
import { readFileSync } from 'fs';
import { join } from 'path';

async function executeSchemaUpdate() {
  console.log('🔧 Actualizando esquema de PLANTILLA con nuevos campos...');

  try {
    // Test connection first
    const { data, error } = await supabase
      .from('PLANTILLA')
      .select('COUNT(*)')
      .limit(1);

    if (error) {
      console.error('❌ Error conectando:', error);
      return false;
    }

    console.log('✅ Conexión exitosa, procediendo con la actualización...');

    // Read the SQL file
    const sqlPath = join(__dirname, 'add-dismissal-fields.sql');
    const sqlContent = readFileSync(sqlPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && !stmt.startsWith('COMMENT'));

    console.log(`📋 Ejecutando ${statements.length} declaraciones SQL...`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;

      console.log(`🔄 Ejecutando declaración ${i + 1}/${statements.length}...`);
      
      const { error: execError } = await supabase.rpc('exec_sql', {
        sql_query: statement
      });

      if (execError) {
        console.warn(`⚠️ Advertencia en declaración ${i + 1}:`, execError);
        // Continue with other statements
      }
    }

    // Verify the new columns exist
    const { data: existingData } = await supabase
      .from('PLANTILLA')
      .select('*')
      .limit(1);

    const columns = Object.keys(existingData?.[0] || {});
    console.log('📊 Estructura actualizada:', columns);

    if (columns.includes('puesto') && columns.includes('motivo_baja') && columns.includes('area')) {
      console.log('✅ Nuevos campos agregados exitosamente!');
      return true;
    } else {
      console.log('⚠️ Algunos campos pueden no haber sido agregados. Ejecuta manualmente en Supabase:');
      console.log(`
ALTER TABLE "PLANTILLA" 
ADD COLUMN IF NOT EXISTS puesto VARCHAR(150) DEFAULT 'N/A',
ADD COLUMN IF NOT EXISTS motivo_baja VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS area VARCHAR(100) DEFAULT NULL;
      `);
      return false;
    }

  } catch (error) {
    console.error('❌ Error:', error);
    console.log('⚠️ Si el error persiste, ejecuta manualmente en el editor SQL de Supabase:');
    console.log(`
ALTER TABLE "PLANTILLA" 
ADD COLUMN IF NOT EXISTS puesto VARCHAR(150) DEFAULT 'N/A',
ADD COLUMN IF NOT EXISTS motivo_baja VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS area VARCHAR(100) DEFAULT NULL;
    `);
    return false;
  }
}

executeSchemaUpdate();