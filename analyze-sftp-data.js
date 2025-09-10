const SftpClient = require('ssh2-sftp-client');
const fs = require('fs');
require('dotenv').config({ path: './apps/web/.env.local' });

async function downloadAndAnalyzeSFTPData() {
  const sftp = new SftpClient();
  
  const config = {
    host: process.env.SFTP_HOST || '148.244.90.21',
    port: parseInt(process.env.SFTP_PORT || '5062'),
    username: process.env.SFTP_USER || 'rhmrm',
    password: process.env.SFTP_PASSWORD || 'rh12345',
    directory: process.env.SFTP_DIRECTORY || 'ReportesRH'
  };
  
  console.log('📁 Descargando y analizando archivos SFTP...\n');
  
  try {
    await sftp.connect(config);
    
    // List all files
    const fileList = await sftp.list(config.directory);
    const csvFiles = fileList.filter(file => 
      file.type === '-' && file.name.endsWith('.csv')
    );
    
    console.log(`🔢 Archivos CSV encontrados: ${csvFiles.length}`);
    csvFiles.forEach(file => {
      const size = (file.size / 1024).toFixed(1);
      const modified = new Date(file.modifyTime).toLocaleDateString('es-MX');
      console.log(`  📄 ${file.name} (${size} KB, ${modified})`);
    });
    
    console.log('\n' + '='.repeat(80) + '\n');
    
    // Analyze each file
    for (const file of csvFiles) {
      console.log(`📊 ANALIZANDO: ${file.name}`);
      console.log('─'.repeat(50));
      
      try {
        const filePath = `${config.directory}/${file.name}`;
        const fileContent = await sftp.get(filePath);
        const csvText = fileContent.toString('utf8');
        const lines = csvText.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          console.log('❌ Archivo vacío\n');
          continue;
        }
        
        // Parse headers
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        console.log(`📋 Headers (${headers.length} columnas):`);
        headers.forEach((header, index) => {
          console.log(`  ${String(index + 1).padStart(2)}. ${header}`);
        });
        
        console.log(`\n📈 Total de líneas: ${lines.length} (${lines.length - 1} registros de datos)`);
        
        // Show sample data (first 3 rows)
        console.log('\n💾 Muestra de datos (primeras 3 filas):');
        for (let i = 1; i <= Math.min(3, lines.length - 1); i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          console.log(`\n  Fila ${i}:`);
          headers.forEach((header, index) => {
            const value = values[index] || '';
            if (value) {
              console.log(`    ${header}: "${value}"`);
            }
          });
        }
        
        // Save sample to file
        const sampleFileName = `./sample-${file.name}`;
        const sampleData = lines.slice(0, 11).join('\n'); // First 10 data rows + header
        fs.writeFileSync(sampleFileName, sampleData);
        console.log(`\n💾 Muestra guardada en: ${sampleFileName}`);
        
      } catch (error) {
        console.error(`❌ Error procesando ${file.name}:`, error.message);
      }
      
      console.log('\n' + '='.repeat(80) + '\n');
    }
    
    await sftp.end();
    console.log('✅ Análisis completado exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en análisis SFTP:', error.message);
    await sftp.end();
  }
}

downloadAndAnalyzeSFTPData();