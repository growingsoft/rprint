import axios, { AxiosInstance } from 'axios';
import { AuthResponse, Printer, PrintJob, PrintOptions } from '../types';

class ApiService {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    // Auto-detect server URL based on environment
    const getDefaultServerUrl = () => {
      const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      const stored = localStorage.getItem('serverUrl');

      // In production, ignore localhost URLs from localStorage
      if (isProduction) {
        if (stored && (stored.includes('localhost') || stored.includes('127.0.0.1'))) {
          localStorage.removeItem('serverUrl');
          return '/api';
        }
        return stored ? `${stored}/api` : '/api';
      }

      // Development mode
      if (stored && !stored.includes('localhost') && !stored.includes('127.0.0.1')) {
        // Don't use production URLs in development
        localStorage.removeItem('serverUrl');
        return 'http://localhost:3002/api';
      }

      return stored ? (stored.endsWith('/api') ? stored : `${stored}/api`) : 'http://localhost:3002/api';
    };

    this.client = axios.create({
      baseURL: getDefaultServerUrl(),
      timeout: 30000
    });

    // Load token from localStorage
    this.token = localStorage.getItem('authToken');
    if (this.token) {
      this.setAuthToken(this.token);
    }

    // Response interceptor for token refresh
    this.client.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401) {
          this.clearAuth();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  setServerUrl(url: string) {
    this.client.defaults.baseURL = `${url}/api`;
    localStorage.setItem('serverUrl', url);
  }

  setAuthToken(token: string) {
    this.token = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('authToken', token);
  }

  clearAuth() {
    this.token = null;
    delete this.client.defaults.headers.common['Authorization'];
    localStorage.removeItem('authToken');
    localStorage.removeItem('client');
  }

  // Auth endpoints
  async register(username: string, password: string, displayName: string, email?: string): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/register', {
      username,
      password,
      displayName,
      email
    });
    this.setAuthToken(response.data.token);
    localStorage.setItem('client', JSON.stringify(response.data.client));
    return response.data;
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/login', {
      username,
      password
    });
    this.setAuthToken(response.data.token);
    localStorage.setItem('client', JSON.stringify(response.data.client));
    return response.data;
  }

  logout() {
    this.clearAuth();
  }

  // Printer endpoints
  async getPrinters(): Promise<Printer[]> {
    // Use virtual-printer endpoint to get only enabled printers
    const response = await this.client.get<{ printers: Printer[] }>('/printers/virtual-printer/list');
    return response.data.printers;
  }

  async getPrinter(id: string): Promise<Printer> {
    const response = await this.client.get<{ printer: Printer }>(`/printers/${id}`);
    return response.data.printer;
  }

  // Print job endpoints
  async createPrintJob(file: File, options: PrintOptions): Promise<PrintJob> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('printerId', options.printerId);
    formData.append('copies', options.copies.toString());
    formData.append('colorMode', options.colorMode);
    formData.append('duplex', options.duplex);
    formData.append('orientation', options.orientation);
    formData.append('paperSize', options.paperSize);
    formData.append('scale', options.scale);

    const response = await this.client.post<{ job: PrintJob }>('/jobs', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data.job;
  }

  async getPrintJobs(status?: string, limit?: number): Promise<PrintJob[]> {
    const params: any = {};
    if (status) params.status = status;
    if (limit) params.limit = limit;

    const response = await this.client.get<{ jobs: PrintJob[] }>('/jobs', { params });
    return response.data.jobs;
  }

  async getPrintJob(id: string): Promise<PrintJob> {
    const response = await this.client.get<{ job: PrintJob }>(`/jobs/${id}`);
    return response.data.job;
  }

  async cancelPrintJob(id: string): Promise<void> {
    await this.client.delete(`/jobs/${id}`);
  }

  async getJobThumbnail(id: string): Promise<string | null> {
    try {
      const response = await this.client.get(`/jobs/${id}/thumbnail`, {
        responseType: 'blob'
      });
      return URL.createObjectURL(response.data);
    } catch {
      return null;
    }
  }

  async getJobFilePreview(id: string): Promise<Blob | null> {
    try {
      const response = await this.client.get(`/jobs/${id}/preview`, {
        responseType: 'blob'
      });
      return response.data;
    } catch {
      return null;
    }
  }

  // API Key endpoints
  async getApiKeys(): Promise<any[]> {
    const response = await this.client.get('/api-keys');
    return response.data;
  }

  async createApiKey(name: string, expiresInDays?: number): Promise<any> {
    const response = await this.client.post('/api-keys', {
      name,
      expiresInDays: expiresInDays || 0
    });
    return response.data;
  }

  async deleteApiKey(id: string): Promise<void> {
    await this.client.delete(`/api-keys/${id}`);
  }

  // Worker/Print Server endpoints
  async getWorkers(): Promise<any[]> {
    const response = await this.client.get('/workers');
    return response.data;
  }

  async registerWorker(name: string): Promise<any> {
    const response = await this.client.post('/auth/register-worker', { name });
    return response.data;
  }

  async deleteWorker(id: string): Promise<void> {
    await this.client.delete(`/workers/${id}`);
  }

  async downloadWorkerEnv(id: string, name: string): Promise<void> {
    const response = await this.client.get(`/workers/${id}/env`, {
      responseType: 'blob'
    });

    // Create a blob URL and trigger download
    const blob = new Blob([response.data], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name}.env`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // Printer management endpoints
  async getAllPrinters(workerId?: string): Promise<Printer[]> {
    const params: any = {};
    if (workerId) params.workerId = workerId;
    const response = await this.client.get('/printers', { params });
    return response.data;
  }

  async updatePrinterSettings(printerId: string, settings: any): Promise<void> {
    await this.client.put(`/printers/${printerId}`, settings);
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }

  getClient() {
    const clientStr = localStorage.getItem('client');
    return clientStr ? JSON.parse(clientStr) : null;
  }

  // Download endpoints
  async getDownloadInfo(): Promise<any> {
    const response = await this.client.get('/downloads/info');
    return response.data;
  }

  async registerWorkerAndDownload(name: string): Promise<any> {
    const response = await this.client.post('/downloads/register-and-download', { name });
    return response.data;
  }

  // Generic HTTP methods for direct API access
  async get(url: string, config?: any) {
    return this.client.get(url, config);
  }

  async post(url: string, data?: any, config?: any) {
    return this.client.post(url, data, config);
  }

  async put(url: string, data?: any, config?: any) {
    return this.client.put(url, data, config);
  }

  async delete(url: string, config?: any) {
    return this.client.delete(url, config);
  }
}

export const api = new ApiService();
