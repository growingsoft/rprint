export interface PrintJob {
  id: string;
  clientId: string;
  printerId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: PrintJobStatus;
  copies: number;
  colorMode: 'color' | 'grayscale';
  duplex: 'none' | 'short' | 'long';
  orientation: 'portrait' | 'landscape';
  paperSize: string;
  createdAt: string;
  assignedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  printerName?: string;
  printerStatus?: string;
}

export enum PrintJobStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  PRINTING = 'printing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface Printer {
  id: string;
  workerId: string;
  name: string;
  displayName: string;
  isDefault: boolean;
  status: PrinterStatus;
  description?: string;
  location?: string;
  capabilities: PrinterCapabilities;
  lastSeen: string;
}

export enum PrinterStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  BUSY = 'busy',
  ERROR = 'error'
}

export interface PrinterCapabilities {
  color: boolean;
  duplex: boolean;
  paperSizes: string[];
  maxCopies: number;
}

export interface Client {
  id: string;
  username: string;
  displayName: string;
  email?: string;
}

export interface AuthResponse {
  client: Client;
  token: string;
}

export interface PrintOptions {
  printerId: string;
  copies: number;
  colorMode: 'color' | 'grayscale';
  duplex: 'none' | 'short' | 'long';
  orientation: 'portrait' | 'landscape';
  paperSize: string;
}

export interface ElectronAPI {
  selectFile: () => Promise<{ path: string; name: string } | null>;
  readFile: (filePath: string) => Promise<ArrayBuffer>;
  getAppVersion: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
