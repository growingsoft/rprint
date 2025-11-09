# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RPrint is a complete remote printing system that allows users to print documents from any PC/Mac to printers connected to a Windows 11 machine. The system consists of three components:

1. **Ubuntu Server** (`packages/server`) - REST API that manages print jobs, printers, and worker services
2. **Windows 11 Service** (`packages/windows-service`) - Background service that polls the server and prints locally
3. **Electron Client** (`packages/client`) - Cross-platform desktop app for submitting print jobs

## Architecture

### Data Flow
1. Client uploads document to Ubuntu server via REST API
2. Print job is stored in SQLite database with status "pending"
3. Windows service polls server for pending jobs assigned to its printers
4. Service downloads document, prints it, and updates job status
5. Client receives real-time status updates by polling the API

### Authentication
- **Clients**: JWT token-based authentication (Bearer token in Authorization header)
- **Workers**: API key authentication (X-API-Key header)

### Database Schema
SQLite database with tables:
- `clients` - User accounts
- `workers` - Windows service instances
- `printers` - Registered printers with capabilities
- `print_jobs` - Print job queue with status tracking

## Monorepo Structure

This is an npm workspaces monorepo with three packages. Root-level `npm install` installs dependencies for all packages. Each package can be developed independently.

## Development Commands

### Root Level
```bash
npm install             # Install dependencies for all packages (uses workspaces)
npm run install-all     # Alternative: install each package separately
npm run server:dev      # Run Ubuntu server in development mode
npm run windows-service # Run Windows service (requires Windows)
npm run client:dev      # Run Electron client in development mode
npm run test            # Run tests across all packages
npm run lint            # Lint all TypeScript code
```

### Ubuntu Server (packages/server)
```bash
npm run dev                # Run with ts-node and hot reload
npm run build              # Compile TypeScript to dist/
npm start                  # Run compiled server
npm test                   # Run Jest tests
npm run migration:create   # Create new database migration
npm run migration:run      # Run pending migrations

# Environment variables (see .env.example)
PORT=3000
JWT_SECRET=your-secret-key
DB_PATH=./data/rprint.db
UPLOAD_DIR=./uploads
```

**Note**: Database schema is automatically created on first run. SQLite database file and uploads directory are created if they don't exist.

### Windows Service (packages/windows-service)
```bash
npm run dev                  # Run in development mode
npm run build                # Compile TypeScript
npm start                    # Run compiled service
npm run install-service      # Install as Windows service (requires admin)
npm run uninstall-service    # Uninstall Windows service

# Environment variables (see .env.example)
SERVER_URL=http://localhost:3000
API_KEY=your-worker-api-key
POLL_INTERVAL=5000  # milliseconds
```

### Electron Client (packages/client)
```bash
npm run dev           # Run in development mode with hot reload (Vite + Electron)
npm run dev:vite      # Run only Vite dev server
npm run dev:electron  # Run only Electron (waits for Vite)
npm run build         # Build for production
npm run build:win     # Build Windows installer (NSIS)
npm run build:mac     # Build macOS DMG
npm run build:linux   # Build Linux AppImage
npm test              # Run Jest tests
```

**Structure**: Client uses Vite for the React frontend (port 5173) and Electron for desktop features. The `electron/` directory contains main process code (main.ts, preload.ts) while `src/` contains the React renderer process.

## Key Implementation Details

### Server API Endpoints

**Authentication:**
- `POST /api/auth/register` - Register new client
- `POST /api/auth/login` - Login client
- `POST /api/auth/register-worker` - Register new worker (returns API key)

**Printers:**
- `GET /api/printers` - List all printers (client auth)
- `POST /api/printers/sync` - Sync printers from worker (worker auth)

**Print Jobs:**
- `POST /api/jobs` - Create print job with file upload (client auth)
- `GET /api/jobs` - List client's jobs (client auth)
- `GET /api/jobs/:id` - Get job details (client auth)
- `DELETE /api/jobs/:id` - Cancel job (client auth)
- `GET /api/jobs/poll/pending` - Poll for pending jobs (worker auth)
- `PUT /api/jobs/:id/status` - Update job status (worker auth)
- `GET /api/jobs/:id/download` - Download job file (worker auth)

**Workers:**
- `POST /api/workers/heartbeat` - Send heartbeat (worker auth)

### Windows Service - Printer Detection

The service uses PowerShell to enumerate printers:
```powershell
Get-Printer | Select-Object Name, DriverName, PortName, Default, PrinterStatus | ConvertTo-Json
```

For PDF printing, it uses the `pdf-to-printer` npm package. For other file types, it uses Windows shell printing via `Start-Process -Verb Print`.

### Client - File Selection

The Electron client uses IPC to access the file system securely:
- `window.electronAPI.selectFile()` - Opens native file dialog
- `window.electronAPI.readFile(path)` - Reads file as ArrayBuffer

Files are converted to Blob/File objects and uploaded via FormData.

**Client Architecture**:
- **Main Process** (`electron/main.ts`) - Electron window management, IPC handlers
- **Preload Script** (`electron/preload.ts`) - Exposes safe IPC methods to renderer
- **Renderer Process** (`src/`) - React app with Zustand for state management
- **Pages**: Login.tsx, Dashboard.tsx
- **Services**: API client for server communication

## Common Development Tasks

### Adding a New API Endpoint
1. Define types in `packages/server/src/types/index.ts`
2. Add database queries in appropriate Model file (e.g., `PrintJobModel.ts`)
3. Create controller method in `packages/server/src/controllers/`
4. Add route in `packages/server/src/routes/`
5. Update client API service in `packages/client/src/services/api.ts`

### Adding Print Options
1. Update `PrintJob` and `CreatePrintJobRequest` types in both server and client
2. Modify database schema in `packages/server/src/database/schema.ts`
3. Update `PrintJobModel.create()` to accept new options
4. Modify Windows service `PrinterUtils.printFile()` to handle new options
5. Add UI controls in `packages/client/src/pages/Dashboard.tsx`

### Testing the Full System
1. Start Ubuntu server: `cd packages/server && npm run dev`
2. Register a worker: `curl -X POST http://localhost:3000/api/auth/register-worker -H "Content-Type: application/json" -d '{"name":"TestWorker"}'`
3. Copy API key from response and add to `packages/windows-service/.env`
4. Start Windows service: `cd packages/windows-service && npm run dev`
5. Start client: `cd packages/client && npm run dev`
6. Register/login in client and try printing

## File Upload Security

Allowed MIME types (defined in `packages/server/src/middleware/upload.ts`):
- PDF: `application/pdf`
- Word: `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Excel: `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Images: `image/jpeg`, `image/png`, `image/gif`, `image/bmp`, `image/tiff`
- Text: `text/plain`

Max file size: 10MB (configurable via `MAX_FILE_SIZE` env var)

## Important Notes

- Server uses SQLite for simplicity; for production, consider PostgreSQL
- Windows service requires Windows OS and elevated privileges to access printers
- Worker heartbeat timeout is 5 minutes (configurable in `WorkerModel.markOfflineWorkers()`)
- Print job files are automatically deleted after completion/failure
- Client stores auth token and server URL in localStorage
- Rate limiting is enabled on server (100 requests per 15 minutes per IP)
- Server automatically creates database and required directories on startup
- PowerShell execution policy must allow scripts on Windows for printer detection

## Code Organization

**Server** (`packages/server/src/`):
- `controllers/` - Request handlers (AuthController, PrintJobController, PrinterController, WorkerController)
- `routes/` - Express route definitions (auth.ts, jobs.ts, printers.ts, workers.ts)
- `models/` - Database access layer (ClientModel, PrintJobModel, PrinterModel, WorkerModel)
- `middleware/` - Auth middleware (JWT/API key) and file upload handling (multer)
- `database/` - Schema definition and database initialization
- `types/` - Shared TypeScript interfaces
- `utils/` - Helper functions

**Windows Service** (`packages/windows-service/src/`):
- `services/` - Core business logic (ApiClient, PrintService)
- `utils/` - Printer detection and utilities (printer-utils.ts, logger.ts)
- `types/` - TypeScript interfaces
- `index.ts` - Main service loop
- `install-service.ts` / `uninstall-service.ts` - Windows service installation scripts

**Client** (`packages/client/`):
- `electron/` - Electron main process and preload scripts
- `src/pages/` - React page components
- `src/services/` - API client for server communication
- `src/store/` - Zustand state management
- `src/types/` - TypeScript interfaces
- `src/styles/` - CSS styles
