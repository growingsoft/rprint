export const SCHEMA_SQL = `
-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user')),
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
  default_paper_size TEXT,
  default_orientation TEXT,
  default_color_mode TEXT,
  default_duplex TEXT,
  default_scale TEXT DEFAULT 'noscale',
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
  scale TEXT DEFAULT 'noscale',
  webhook_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  assigned_at DATETIME,
  completed_at DATETIME,
  error_message TEXT,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE CASCADE
);

-- API Keys table (for permanent server-to-server authentication)
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  last_used_at DATETIME,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT NOT NULL,
  secret TEXT,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_triggered_at DATETIME,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Client Packages table (for virtual printer packages)
CREATE TABLE IF NOT EXISTS client_packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  operating_system TEXT NOT NULL CHECK(operating_system IN ('windows', 'mac', 'linux')),
  auth_token TEXT UNIQUE NOT NULL,
  client_id TEXT NOT NULL,
  default_printer_id TEXT,
  version TEXT DEFAULT '1.0.0',
  auto_update_enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_download_at DATETIME,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (default_printer_id) REFERENCES printers(id) ON DELETE SET NULL
);

-- Server Packages table (for Windows worker packages)
CREATE TABLE IF NOT EXISTS server_packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  worker_id TEXT UNIQUE NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  selected_printers TEXT,
  version TEXT DEFAULT '1.0.0',
  auto_update_enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_download_at DATETIME,
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status);
CREATE INDEX IF NOT EXISTS idx_print_jobs_printer ON print_jobs(printer_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_client ON print_jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_created ON print_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_printers_worker ON printers(worker_id);
CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);
CREATE INDEX IF NOT EXISTS idx_api_keys_client ON api_keys(client_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_client ON webhooks(client_id);
CREATE INDEX IF NOT EXISTS idx_client_packages_client ON client_packages(client_id);
CREATE INDEX IF NOT EXISTS idx_server_packages_worker ON server_packages(worker_id);
`;
