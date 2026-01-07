const Client = require('ssh2-sftp-client');

const sftp = new Client();

const config = {
  host: '148.244.90.21',
  port: 5062,
  username: 'rhmrm',
  password: '!M3Gu5t4S0nar98!@'
};

async function listSFTPFiles() {
  try {
    await sftp.connect(config);
    console.log('✅ Conexión SFTP exitosa\n');

    const directory = 'ReportesRH';
    console.log(`📁 Listando archivos en: ${directory}\n`);

    const fileList = await sftp.list(directory);

    console.log('Archivos encontrados:');
    console.log('='.repeat(80));

    fileList.forEach(file => {
      const size = (file.size / 1024).toFixed(2);
      const date = new Date(file.modifyTime).toISOString();
      console.log(`${file.name.padEnd(50)} ${size.padStart(10)} KB  ${date}`);
    });

    console.log('='.repeat(80));
    console.log(`\nTotal: ${fileList.length} archivos`);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sftp.end();
  }
}

listSFTPFiles();
