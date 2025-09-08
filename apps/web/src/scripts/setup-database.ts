#!/usr/bin/env tsx

import * as dotenv from 'dotenv';
import { setupDatabase, populateDatabase } from '../lib/supabase-admin';

// SECURITY FIX: Load from environment variables instead of hardcoded secrets
dotenv.config({ path: '.env.local' });

// Validate required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');  
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('Please add them to your .env.local file');
  process.exit(1);
}

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