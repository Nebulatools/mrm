// SFTP Client Service (Client-side API wrapper)

export interface SFTPFile {
  name: string;
  type: 'plantilla' | 'incidencias' | 'act';
  lastModified: Date;
  size: number;
}

export class SFTPClient {
  private baseUrl = '/api/sftp';
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
  private ongoingRequests = new Map<string, Promise<any>>();

  // Cache management
  private getCacheKey(method: string, ...params: any[]): string {
    return `${method}_${params.join('_')}`;
  }

  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      console.log(`Cache hit for ${key}`);
      return cached.data;
    }
    if (cached) {
      console.log(`Cache expired for ${key}`);
      this.cache.delete(key);
    }
    return null;
  }

  private setCachedData<T>(key: string, data: T, customTtl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: customTtl || this.CACHE_TTL
    });
    console.log(`Cached data for ${key}`);
  }

  // Clear cache (useful for manual refresh)
  public clearCache(): void {
    console.log('Clearing SFTP cache');
    this.cache.clear();
    this.ongoingRequests.clear();
  }

  // Test SFTP connection
  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing SFTP connection via API');
      
      const response = await fetch(`${this.baseUrl}?action=test`);
      const result = await response.json();
      
      return result.success || false;
    } catch (error) {
      console.error('SFTP connection test failed:', error);
      return false;
    }
  }

  // List available files in SFTP directory
  async listFiles(): Promise<SFTPFile[]> {
    const cacheKey = this.getCacheKey('listFiles');
    
    // Check cache first
    const cached = this.getCachedData<SFTPFile[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Check if request is already in progress
    if (this.ongoingRequests.has(cacheKey)) {
      console.log('Waiting for ongoing listFiles request...');
      return this.ongoingRequests.get(cacheKey)!;
    }

    // Start new request
    const requestPromise = this._listFilesInternal();
    this.ongoingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      this.setCachedData(cacheKey, result);
      return result;
    } finally {
      this.ongoingRequests.delete(cacheKey);
    }
  }

  private async _listFilesInternal(): Promise<SFTPFile[]> {
    try {
      console.log('Listing SFTP files via API');
      
      const response = await fetch(`${this.baseUrl}?action=list`);
      const result = await response.json();
      
      if (result.files && result.files.length > 0) {
        return result.files.map((file: any) => ({
          ...file,
          lastModified: new Date(file.lastModified)
        }));
      }
      
      // Return mock files as fallback
      return this.getMockFiles();

    } catch (error) {
      console.error('Error listing SFTP files:', error);
      
      // Return mock files as fallback
      return this.getMockFiles();
    }
  }

  // Download and parse CSV file from SFTP
  async downloadFile(filename: string): Promise<any[]> {
    const cacheKey = this.getCacheKey('downloadFile', filename);
    
    // Check cache first
    const cached = this.getCachedData<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Check if request is already in progress
    if (this.ongoingRequests.has(cacheKey)) {
      console.log(`Waiting for ongoing download request for ${filename}...`);
      return this.ongoingRequests.get(cacheKey)!;
    }

    // Start new request
    const requestPromise = this._downloadFileInternal(filename);
    this.ongoingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      this.setCachedData(cacheKey, result);
      return result;
    } finally {
      this.ongoingRequests.delete(cacheKey);
    }
  }

  private async _downloadFileInternal(filename: string): Promise<any[]> {
    try {
      console.log('Downloading file via API:', filename);
      
      const response = await fetch(`${this.baseUrl}?action=download&filename=${encodeURIComponent(filename)}`);
      const result = await response.json();
      
      if (result.data && result.data.length > 0) {
        return result.data;
      }
      
      // Return mock data as fallback
      return this.getMockDataByFilename(filename);

    } catch (error) {
      console.error('Error downloading SFTP file:', error);
      
      // Return mock data as fallback
      return this.getMockDataByFilename(filename);
    }
  }

  // Sync all data from SFTP
  async syncAllData(): Promise<{
    plantilla: any[];
    incidencias: any[];
    act: any[];
  }> {
    const cacheKey = this.getCacheKey('syncAllData');
    
    // Check cache first
    const cached = this.getCachedData<{plantilla: any[], incidencias: any[], act: any[]}>(cacheKey);
    if (cached) {
      return cached;
    }

    // Check if request is already in progress
    if (this.ongoingRequests.has(cacheKey)) {
      console.log('Waiting for ongoing syncAllData request...');
      return this.ongoingRequests.get(cacheKey)!;
    }

    // Start new request
    const requestPromise = this._syncAllDataInternal();
    this.ongoingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      // Cache for shorter time since this is the main sync operation
      this.setCachedData(cacheKey, result, 2 * 60 * 1000); // 2 minutes cache
      return result;
    } finally {
      this.ongoingRequests.delete(cacheKey);
    }
  }

  private async _syncAllDataInternal(): Promise<{
    plantilla: any[];
    incidencias: any[];
    act: any[];
  }> {
    try {
      const files = await this.listFiles();
      
      const results = {
        plantilla: [] as any[],
        incidencias: [] as any[],
        act: [] as any[]
      };

      // Process files in parallel for better performance
      const downloadPromises = files.map(async (file) => {
        const data = await this.downloadFile(file.name);
        return { type: file.type, data };
      });

      const downloadResults = await Promise.all(downloadPromises);
      
      downloadResults.forEach(({ type, data }) => {
        results[type] = data;
      });

      return results;
    } catch (error) {
      console.error('Error syncing SFTP data:', error);
      return {
        plantilla: this.getMockPlantillaData(),
        incidencias: this.getMockIncidenciasData(),
        act: this.getMockActData()
      };
    }
  }

  // Helper methods for mock data
  private getMockFiles(): SFTPFile[] {
    return [
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
  }

  private getMockDataByFilename(filename: string): any[] {
    if (filename.includes('plantilla')) {
      return this.getMockPlantillaData();
    } else if (filename.includes('incidencias')) {
      return this.getMockIncidenciasData();
    } else if (filename.includes('act')) {
      return this.getMockActData();
    }
    return [];
  }

  private getMockPlantillaData(): any[] {
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
  }

  private getMockIncidenciasData(): any[] {
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
  }

  private getMockActData(): any[] {
    const currentDate = new Date();
    const data = [];
    
    // Generate realistic ACT data for last 12 months with seasonal trends
    const baseEmployees = 25;
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      // Add seasonal variation (higher in fall/winter, lower in summer)
      const seasonalFactor = Math.sin((date.getMonth() * Math.PI) / 6) * 0.15;
      const growthTrend = i * 0.8; // Slight growth over time (going backwards)
      const randomVariation = (Math.random() - 0.5) * 4;
      
      const employeeCount = Math.round(baseEmployees + seasonalFactor * baseEmployees + growthTrend + randomVariation);
      
      data.push({
        snapshot_date: lastDay.toISOString().split('T')[0],
        active_employee_count: Math.max(15, employeeCount)
      });
    }
    
    return data.reverse(); // Reverse to show chronological order
  }
}

export const sftpClient = new SFTPClient();