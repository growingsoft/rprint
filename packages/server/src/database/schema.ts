export const SCHEMA_SQL = `
-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Workers (Windows services) table
CREATE TABLE IF NOT EXISTS workers (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'offline',
  last_heartbeat DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Printers table
CREATE TABLE IF NOT EXISTS printers (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_default INTEGER DEFAULT 0,
  status TEXT DEFAULT 'online',
  description TEXT,
  location TEXT,
  capabilities TEXT NOT NULL,
  virtual_printer_enabled INTEGER DEFAULT 1,
  tags TEXT,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
  UNIQUE(worker_id, name)
);

-- Print jobs table
CREATE TABLE IF NOT EXISTS print_jobs (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  printer_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  copies INTEGER DEFAULT 1,
  color_mode TEXT DEFAULT 'color',
  duplex TEXT DEFAULT 'none',
  orientation TEXT DEFAULT 'portrait',
  paper_size TEXT DEFAULT 'A4',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  assigned_at DATETIME,
  completed_at DATETIME,
  error_message TEXT,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status);
CREATE INDEX IF NOT EXISTS idx_print_jobs_printer ON print_jobs(printer_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_client ON print_jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_created ON print_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_printers_worker ON printers(worker_id);
CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);
`;
