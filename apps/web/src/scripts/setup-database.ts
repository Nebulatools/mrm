#!/usr/bin/env tsx

// Manually set environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://vnyzjdtqruvofefexaue.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZueXpqZHRxcnV2b2ZlZmV4YXVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzIyODIyOSwiZXhwIjoyMDcyODA0MjI5fQ.JDedpFBfL5oDITavffmdYxbEaVk6dL-LPvH_9EidhF8';

import { setupDatabase, populateDatabase } from '../lib/supabase-admin';

async function main() {
  console.log('🚀 Inicializando base de datos de RRHH...\n');
  
  try {
    // Setup database tables
    const setupResult = await setupDatabase();
    
    if (!setupResult) {
      console.error('❌ Falló la configuración de la base de datos');
      process.exit(1);
    }
    
    // Populate with mock data
    const populateResult = await populateDatabase();
    
    if (!populateResult) {
      console.error('❌ Falló la población de la base de datos');
      process.exit(1);
    }
    
    console.log('\n🎉 ¡Base de datos configurada exitosamente!');
    console.log('📊 Ahora puedes ver las tablas en tu dashboard de Supabase');
    console.log('🔗 https://supabase.com/dashboard/project/vnyzjdtqruvofefexaue');
    
  } catch (error) {
    console.error('💥 Error durante la configuración:', error);
    process.exit(1);
  }
}

main();