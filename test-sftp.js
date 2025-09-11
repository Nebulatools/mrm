const SftpClient = require('ssh2-sftp-client');
require('dotenv').config({ path: './apps/web/.env.local' });

async function testSFTP() {
  const sftp = new SftpClient();
  
  const config = {
    host: process.env.SFTP_HOST,
    port: parseInt(process.env.SFTP_PORT || '22'),
    username: process.env.SFTP_USER,
    password: process.env.SFTP_PASSWORD,
    directory: process.env.SFTP_DIRECTORY || 'ReportesRH'
  };

  if (!config.host || !config.username || !config.password) {
    throw new Error('Missing SFTP configuration. Set SFTP_HOST, SFTP_USER, SFTP_PASSWORD in apps/web/.env.local');
  }
  
  console.log('🔗 Intentando conectar con SFTP...');
  console.log(`📍 Servidor: ${config.username}@${config.host}:${config.port}`);
  console.log(`📁 Directorio: ${config.directory}`);
  
  try {
    // Test connection
    await sftp.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      readyTimeout: 20000,  // 20 seconds timeout
      retries: 3,
      // Additional options for problematic connections
      algorithms: {
        kex: ['diffie-hellman-group14-sha256', 'diffie-hellman-group14-sha1', 'ecdh-sha2-nistp256', 'ecdh-sha2-nistp384', 'ecdh-sha2-nistp521', 'diffie-hellman-group-exchange-sha256', 'diffie-hellman-group-exchange-sha1', 'diffie-hellman-group1-sha1'],
        cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-gcm', 'aes128-gcm@openssh.com', 'aes256-gcm', 'aes256-gcm@openssh.com'],
        serverHostKey: ['ssh-rsa', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521'],
        hmac: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1']
      },
      debug: (msg) => console.log('🔧 Debug:', msg)
    });
    
    console.log('✅ ¡Conexión SFTP exitosa!');
    
    // Test directory access
    console.log('\n🔍 Verificando acceso al directorio...');
    const dirExists = await sftp.exists(config.directory);
    console.log(`📂 Directorio '${config.directory}' existe:`, dirExists ? '✅ SÍ' : '❌ NO');
    
    if (dirExists) {
      console.log('\n📋 Listando archivos CSV...');
      const fileList = await sftp.list(config.directory);
      
      const csvFiles = fileList.filter(file => 
        file.type === '-' && file.name.endsWith('.csv')
      );
      
      console.log(`🔢 Encontrados ${csvFiles.length} archivos CSV:`);
      csvFiles.forEach(file => {
        const size = (file.size / 1024).toFixed(1);
        const modified = new Date(file.modifyTime).toLocaleDateString('es-MX');
        console.log(`  📄 ${file.name} (${size} KB, ${modified})`);
      });
      
      if (csvFiles.length > 0) {
        console.log('\n🔄 Probando descarga del primer archivo...');
        const firstFile = csvFiles[0];
        const filePath = `${config.directory}/${firstFile.name}`;
        
        const fileContent = await sftp.get(filePath);
        const csvText = fileContent.toString('utf8');
        const lines = csvText.split('\n').filter(line => line.trim());
        
        console.log(`📊 Archivo ${firstFile.name}: ${lines.length} líneas`);
        if (lines.length > 0) {
          console.log(`📝 Primera línea (headers): ${lines[0].substring(0, 100)}...`);
        }
        if (lines.length > 1) {
          console.log(`📝 Segunda línea (sample): ${lines[1].substring(0, 100)}...`);
        }
      }
    }
    
    await sftp.end();
    console.log('\n🎉 ¡Todas las pruebas completadas exitosamente!');
    
  } catch (error) {
    console.error('\n❌ Error en conexión SFTP:');
    console.error('🔹 Tipo:', error.code || 'UNKNOWN');
    console.error('🔹 Mensaje:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Sugerencia: Verifica que el servidor SFTP esté ejecutándose y el puerto sea correcto');
    } else if (error.code === 'ENOTFOUND') {
      console.error('💡 Sugerencia: Verifica que la dirección del servidor sea correcta');
    } else if (error.message.includes('authentication')) {
      console.error('💡 Sugerencia: Verifica las credenciales (usuario/contraseña)');
    }
    
    await sftp.end();
  }
}

testSFTP();
