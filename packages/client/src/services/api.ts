import axios, { AxiosInstance } from 'axios';
import { AuthResponse, Printer, PrintJob, PrintOptions } from '../types';

class ApiService {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: localStorage.getItem('serverUrl') || 'http://localhost:3000/api',
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
    const response = await this.client.get<{ printers: Printer[] }>('/printers');
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

  isAuthenticated(): boolean {
    return this.token !== null;
  }

  getClient() {
    const clientStr = localStorage.getItem('client');
    return clientStr ? JSON.parse(clientStr) : null;
  }
}

export const api = new ApiService();
