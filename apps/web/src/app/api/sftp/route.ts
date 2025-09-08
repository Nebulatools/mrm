import { NextRequest, NextResponse } from 'next/server';
// Note: ssh2-sftp-client uses native binary modules that can't run in Next.js Edge runtime
// For production, this would need to run on a full Node.js runtime or separate service

interface SFTPConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  directory: string;
}

interface SFTPFile {
  name: string;
  type: 'plantilla' | 'incidencias' | 'act';
  lastModified: Date;
  size: number;
}

class SFTPService {
  private config: SFTPConfig;

  constructor() {
    this.config = {
      host: process.env.SFTP_HOST || '148.244.90.21',
      port: parseInt(process.env.SFTP_PORT || '5062'),
      username: process.env.SFTP_USER || 'rhmrm',
      password: process.env.SFTP_PASSWORD || '',
      directory: process.env.SFTP_DIRECTORY || 'ReportesRH'
    };
  }

  // Test SFTP connection (mocked for now due to binary module constraints)
  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing SFTP connection to:', this.config.host);
      
      // For demo purposes, simulate connection test
      // In production, this would be implemented using a full Node.js server
      // or separate microservice that can handle native binary modules
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simulate success if all config is present
      const hasValidConfig = this.config.host && 
                           this.config.port && 
                           this.config.username && 
                           this.config.password;
      
      console.log('SFTP connection test result:', hasValidConfig ? 'success' : 'failed');
      return hasValidConfig;
    } catch (error) {
      console.error('SFTP connection test failed:', error);
      return false;
    }
  }

  // List available files in SFTP directory (mocked for now)
  async listFiles(): Promise<SFTPFile[]> {
    try {
      console.log('Listing SFTP files from:', `${this.config.host}:${this.config.port}/${this.config.directory}`);
      
      // For demo purposes, simulate file listing
      // In production, this would use a real SFTP connection
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Return mock file list for demonstration
      const mockFiles: SFTPFile[] = [
        {
          name: 'plantilla_2024_12.csv',
          type: 'plantilla',
          lastModified: new Date('2024-12-01'),
          size: 15600
        },
        {
          name: 'incidencias_2024_12.csv',
          type: 'incidencias',
          lastModified: new Date('2024-12-01'),
          size: 8900
        },
        {
          name: 'act_2024_12.csv',
          type: 'act',
          lastModified: new Date('2024-12-01'),
          size: 1200
        }
      ];
      
      console.log(`Found ${mockFiles.length} files`);
      return mockFiles;

    } catch (error) {
      console.error('Error listing SFTP files:', error);
      return [];
    }
  }

  // Download and parse CSV file from SFTP (mocked for now)
  async downloadFile(filename: string): Promise<any[]> {
    try {
      console.log('Downloading file:', filename);
      
      // For demo purposes, simulate file download
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Return mock data based on filename
      if (filename.includes('plantilla')) {
        return [
          {
            empleado_id: 'EMP001',
            first_name: 'Juan',
            last_name: 'Pérez',
            active_status: 'Activo'
          },
          {
            empleado_id: 'EMP002',
            first_name: 'María',
            last_name: 'García',
            active_status: 'Activo'
          },
          {
            empleado_id: 'EMP003',
            first_name: 'Carlos',
            last_name: 'López',
            active_status: 'Baja'
          }
        ];
      } else if (filename.includes('incidencias')) {
        return [
          {
            incident_id: 'INC001',
            employee_id: 'EMP001',
            incident_type: 'Ausencia',
            incident_date: '2024-12-15'
          },
          {
            incident_id: 'INC002',
            employee_id: 'EMP002',
            incident_type: 'Retraso',
            incident_date: '2024-12-20'
          }
        ];
      } else if (filename.includes('act')) {
        const currentDate = new Date();
        const data = [];
        
        for (let i = 0; i < 12; i++) {
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
          const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
          
          data.push({
            snapshot_date: lastDay.toISOString().split('T')[0],
            active_employee_count: Math.floor(20 + Math.random() * 10) + i
          });
        }
        
        return data;
      }

      return [];

    } catch (error) {
      console.error('Error downloading SFTP file:', error);
      return [];
    }
  }
}

const sftpService = new SFTPService();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const filename = searchParams.get('filename');

  try {
    switch (action) {
      case 'test':
        const connectionOk = await sftpService.testConnection();
        return NextResponse.json({ success: connectionOk });

      case 'list':
        const files = await sftpService.listFiles();
        return NextResponse.json({ files });

      case 'download':
        if (!filename) {
          return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
        }
        const data = await sftpService.downloadFile(filename);
        return NextResponse.json({ data });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('SFTP API error:', error);
    return NextResponse.json({ 
      error: 'SFTP operation failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}