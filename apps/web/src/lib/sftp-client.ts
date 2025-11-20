// SFTP Client Service (Client-side API wrapper)

export interface SFTPFile {
  name: string;
  type: 'plantilla' | 'incidencias' | 'act';
  lastModified: Date;
  size: number;
}

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}

const IS_SERVER = typeof window === 'undefined';
const DEFAULT_BASE_URL = resolveInitialBaseUrl();

function normalizeBaseUrl(url?: string | null): string | null {
  if (!url) return null;
  let normalized = url.trim();
  if (!normalized) return null;

  const hasProtocol = /^https?:\/\//i.test(normalized);
  const isRelative = normalized.startsWith('/');

  if (!hasProtocol && !isRelative) {
    normalized = `https://${normalized}`;
  }

  if (hasProtocol) {
    normalized = normalized.replace(/\/$/, '');
    if (normalized.endsWith('/api/sftp')) {
      return normalized;
    }
    return `${normalized}/api/sftp`;
  }

  if (normalized.endsWith('/api/sftp')) {
    return normalized;
  }

  return `${normalized.replace(/\/$/, '')}`;
}

function resolveInitialBaseUrl(): string {
  if (!IS_SERVER) {
    return '/api/sftp';
  }

  const envBase =
    process.env.INTERNAL_SFTP_API_URL ||
    process.env.INTERNAL_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');

  const fallbackBase = envBase && envBase.length > 0 ? envBase : `http://localhost:${process.env.PORT ?? '3000'}`;
  return normalizeBaseUrl(fallbackBase) || 'http://localhost:3000/api/sftp';
}

export class SFTPClient {
  private baseUrl: string;
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
  private ongoingRequests = new Map<string, Promise<unknown>>();
  private defaultFetchOptions?: RequestInit;

  constructor(initialBaseUrl?: string) {
    const normalized = normalizeBaseUrl(initialBaseUrl);
    this.baseUrl = normalized || DEFAULT_BASE_URL;
  }

  public setBaseUrl(url?: string | null): void {
    const normalized = normalizeBaseUrl(url);
    if (normalized) {
      this.baseUrl = normalized;
    }
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setDefaultFetchOptions(options?: RequestInit | null): void {
    this.defaultFetchOptions = options || undefined;
  }

  // Cache management
  private getCacheKey(method: string, ...params: unknown[]): string {
    return `${method}_${params.join('_')}`;
  }

  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      console.log(`Cache hit for ${key}`);
      return cached.data as T;
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
      
      const response = await fetch(`${this.baseUrl}?action=test`, this.buildRequestInit());
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
      return this.ongoingRequests.get(cacheKey)! as Promise<SFTPFile[]>;
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
      
      const response = await fetch(`${this.baseUrl}?action=list`, this.buildRequestInit());
      const result = await response.json();
      
      if (result.files && result.files.length > 0) {
        return result.files.map((file: Record<string, unknown>) => ({
          name: String(file.name),
          type: file.type as 'plantilla' | 'incidencias' | 'act',
          lastModified: new Date(file.lastModified as string),
          size: Number(file.size)
        }));
      }
      
      throw new Error('SFTP list returned no files');

    } catch (error) {
      console.error('Error listing SFTP files:', error);

      throw error;
    }
  }

  // Download and parse CSV file from SFTP
  async downloadFile(filename: string): Promise<Record<string, unknown>[]> {
    const cacheKey = this.getCacheKey('downloadFile', filename);
    
    // Check cache first
    const cached = this.getCachedData<Record<string, unknown>[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Check if request is already in progress
    if (this.ongoingRequests.has(cacheKey)) {
      console.log(`Waiting for ongoing download request for ${filename}...`);
      return this.ongoingRequests.get(cacheKey)! as Promise<Record<string, unknown>[]>;
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

  private async _downloadFileInternal(filename: string): Promise<Record<string, unknown>[]> {
    try {
      console.log('Downloading file via API:', filename);
      
      const response = await fetch(`${this.baseUrl}?action=download&filename=${encodeURIComponent(filename)}`, this.buildRequestInit());
      const result = await response.json();
      
      if (result.data && result.data.length > 0) {
        return result.data;
      }
      
      throw new Error(`SFTP download returned no data for ${filename}`);

    } catch (error) {
      console.error('Error downloading SFTP file:', error);

      throw error;
    }
  }

  // Sync all data from SFTP
  async syncAllData(): Promise<{
    plantilla: Record<string, unknown>[];
    incidencias: Record<string, unknown>[];
    act: Record<string, unknown>[];
  }> {
    const cacheKey = this.getCacheKey('syncAllData');
    
    // Check cache first
    const cached = this.getCachedData<{
      plantilla: Record<string, unknown>[], 
      incidencias: Record<string, unknown>[], 
      act: Record<string, unknown>[]
    }>(cacheKey);
    if (cached) {
      return cached;
    }

    // Check if request is already in progress
    if (this.ongoingRequests.has(cacheKey)) {
      console.log('Waiting for ongoing syncAllData request...');
      return this.ongoingRequests.get(cacheKey)! as Promise<{
        plantilla: Record<string, unknown>[];
        incidencias: Record<string, unknown>[];
        act: Record<string, unknown>[];
      }>;
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
    plantilla: Record<string, unknown>[];
    incidencias: Record<string, unknown>[];
    act: Record<string, unknown>[];
  }> {
    const files = await this.listFiles();
    
    const results = {
      plantilla: [] as Record<string, unknown>[],
      incidencias: [] as Record<string, unknown>[],
      act: [] as Record<string, unknown>[]
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
  }

  private buildRequestInit(overrides?: RequestInit): RequestInit | undefined {
    if (!this.defaultFetchOptions && !overrides) {
      return undefined;
    }

    if (!this.defaultFetchOptions) {
      return overrides;
    }

    if (!overrides) {
      return this.defaultFetchOptions;
    }

    const merged: RequestInit = { ...this.defaultFetchOptions, ...overrides };
    const defaultHeaders = headersToObject(this.defaultFetchOptions.headers);
    const overrideHeaders = headersToObject(overrides.headers);
    const headers = { ...defaultHeaders, ...overrideHeaders };
    if (Object.keys(headers).length > 0) {
      merged.headers = headers;
    }
    return merged;
  }
}

function headersToObject(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) {
    const entries = Array.from(headers.entries());
    return entries.reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
  }
  if (Array.isArray(headers)) {
    return headers.reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
  }
  return { ...headers };
}

export const sftpClient = new SFTPClient();
