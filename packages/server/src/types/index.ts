export interface PrintJob {
  id: string;
  clientId: string;
  printerId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  status: PrintJobStatus;
  copies: number;
  colorMode: 'color' | 'grayscale';
  duplex: 'none' | 'short' | 'long';
  orientation: 'portrait' | 'landscape';
  paperSize: string;
  scale?: 'fit' | 'noscale' | 'shrink';
  webhookUrl?: string;
  createdAt: Date;
  assignedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
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
  virtual_printer_enabled?: boolean;
  tags?: string;
  default_paper_size?: string;
  default_orientation?: string;
  default_color_mode?: string;
  default_duplex?: string;
  default_scale?: string;
  lastSeen: Date;
  createdAt: Date;
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

export interface Worker {
  id: string;
  name: string;
  apiKey: string;
  status: WorkerStatus;
  lastHeartbeat: Date;
  createdAt: Date;
}

export enum WorkerStatus {
  ONLINE = 'online',
  OFFLINE = 'offline'
}

export interface Client {
  id: string;
  username: string;
  passwordHash: string;
  displayName: string;
  email?: string;
  role: 'admin' | 'user';
  createdAt: Date;
}

export interface CreatePrintJobRequest {
  printerId: string;
  copies?: number;
  colorMode?: 'color' | 'grayscale';
  duplex?: 'none' | 'short' | 'long';
  orientation?: 'portrait' | 'landscape';
  paperSize?: string;
  scale?: 'fit' | 'noscale' | 'shrink';
  webhookUrl?: string;
}

export interface CreatePrintJobFromUrlRequest extends CreatePrintJobRequest {
  url: string;
  headers?: Record<string, string>;
}

export interface UpdatePrintJobRequest {
  status: PrintJobStatus;
  errorMessage?: string;
}

export interface Webhook {
  id: string;
  clientId: string;
  url: string;
  events: WebhookEvent[];
  secret?: string;
  active: boolean;
  createdAt: Date;
  lastTriggeredAt?: Date;
}

export enum WebhookEvent {
  JOB_ASSIGNED = 'job.assigned',
  JOB_PRINTING = 'job.printing',
  JOB_COMPLETED = 'job.completed',
  JOB_FAILED = 'job.failed',
  JOB_CANCELLED = 'job.cancelled'
}

export interface ApiKey {
  id: string;
  clientId: string;
  key: string;
  name: string;
  createdAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
}
