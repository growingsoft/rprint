export interface PrintJob {
  id: string;
  clientId: string;
  printerId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  status: string;
  copies: number;
  colorMode: 'color' | 'grayscale';
  duplex: 'none' | 'short' | 'long';
  orientation: 'portrait' | 'landscape';
  paperSize: string;
  scale: 'fit' | 'noscale' | 'shrink';
  createdAt: string;
}

export interface Printer {
  name: string;
  displayName: string;
  isDefault: boolean;
  status: string;
  description?: string;
  location?: string;
  capabilities: PrinterCapabilities;
}

export interface PrinterCapabilities {
  color: boolean;
  duplex: boolean;
  paperSizes: string[];
  maxCopies: number;
}

export interface PrinterInfo {
  name: string;
  displayName: string;
  isDefault: boolean;
  description: string;
  location: string;
  portName: string;
  driverName: string;
  attributes: number;
}

export interface Config {
  serverUrl: string;
  apiKey: string;
  workerName: string;
  pollInterval: number;
  logLevel: string;
}
