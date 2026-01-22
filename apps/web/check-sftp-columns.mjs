// Script temporal para ver columnas del archivo SFTP
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import fetch from 'node-fetch';

const SFTP_HOST = process.env.SFTP_HOST;
const SFTP_PORT = process.env.SFTP_PORT || '22';
const SFTP_USER = process.env.SFTP_USER;
const SFTP_PASSWORD = process.env.SFTP_PASSWORD;
const SFTP_DIRECTORY = process.env.SFTP_DIRECTORY || 'ReportesRH';

console.log('🔍 Conectando al SFTP...');
console.log(`Host: ${SFTP_HOST}:${SFTP_PORT}`);
console.log(`Directory: ${SFTP_DIRECTORY}`);

try {
  const response = await fetch('http://localhost:3000/api/sftp?action=preview&filename=Validacion%20Alta%20de%20empleados.xls');
  const result = await response.json();

  if (result.columns) {
    console.log('\n📋 COLUMNAS DEL ARCHIVO SFTP:');
    console.log('=' .repeat(60));
    result.columns.forEach((col, index) => {
      console.log(`${(index + 1).toString().padStart(3)}. ${col}`);
    });
    console.log('=' .repeat(60));
    console.log(`\n✅ Total de columnas: ${result.columns.length}`);
    console.log(`📊 Registros en preview: ${result.previewRows || 0}`);
    console.log(`📈 Total de registros: ${result.totalRows || 0}`);
  } else {
    console.error('❌ Error:', result);
  }
} catch (error) {
  console.error('❌ Error conectando al SFTP:', error.message);
}
