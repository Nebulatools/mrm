const Client = require('ssh2-sftp-client');
const Papa = require('papaparse');

async function checkCSVHeaders() {
  const sftp = new Client();
  
  const config = {
    host: process.env.SFTP_HOST || '148.244.90.21',
    port: parseInt(process.env.SFTP_PORT || '5062'),
    username: process.env.SFTP_USER,
    password: process.env.SFTP_PASSWORD,
  };

  try {
    await sftp.connect(config);
    console.log('✅ Conectado a SFTP\n');

    // Analizar MotivosBaja.csv
    console.log('📄 Analizando MotivosBaja.csv');
    console.log('='.repeat(50));
    const motivosBuffer = await sftp.get('/ReportesRH/MotivosBaja.csv');
    const motivosText = motivosBuffer.toString('utf-8');
    const motivosData = Papa.parse(motivosText, { header: true, skipEmptyLines: true });
    
    console.log('Columnas:', motivosData.meta.fields);
    console.log('Total registros:', motivosData.data.length);
    if (motivosData.data.length > 0) {
      console.log('Primer registro:', motivosData.data[0]);
    }

    // Analizar Incidencias.csv
    console.log('\n📄 Analizando Incidencias.csv');
    console.log('='.repeat(50));
    const incidenciasBuffer = await sftp.get('/ReportesRH/Incidencias.csv');
    const incidenciasText = incidenciasBuffer.toString('utf-8');
    const incidenciasData = Papa.parse(incidenciasText, { header: true, skipEmptyLines: true });
    
    console.log('Columnas:', incidenciasData.meta.fields);
    console.log('Total registros:', incidenciasData.data.length);
    if (incidenciasData.data.length > 0) {
      console.log('Primer registro:', incidenciasData.data[0]);
    }

    await sftp.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkCSVHeaders();
