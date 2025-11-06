# RPrint - Remote Printing System

A complete remote printing solution that enables printing from any PC/Mac to printers connected to a Windows 11 machine via an Ubuntu intermediary server.

## Features

- **Cross-Platform Client**: Electron-based desktop app for Windows, macOS, and Linux
- **Centralized Management**: Ubuntu server manages print jobs and worker services
- **Automatic Printer Discovery**: Windows service automatically detects and syncs local printers
- **Rich Print Options**: Support for copies, color/grayscale, duplex, orientation, and paper size
- **Real-Time Status**: Track print job status from submission to completion
- **Secure**: JWT authentication for clients, API key authentication for workers
- **Multiple File Types**: Support for PDF, Word, Excel, images, and text files

## System Requirements

- **Ubuntu Server**: Node.js 18+, Ubuntu 20.04+ (or any Linux with Node.js)
- **Windows Service**: Node.js 18+, Windows 11 (or Windows 10)
- **Client**: Works on Windows, macOS, and Linux

## Quick Start

### 1. Setup Ubuntu Server

```bash
# Clone repository
git clone <repo-url>
cd rprint

# Install dependencies
npm install
cd packages/server
npm install

# Configure environment
cp .env.example .env
# Edit .env and set JWT_SECRET to a random secure string

# Start server
npm run dev
# Server will run on http://localhost:3000
```

### 2. Setup Windows Service

On your Windows 11 machine:

```bash
cd packages/windows-service
npm install

# Register a worker on the server first
curl -X POST http://your-ubuntu-server:3000/api/auth/register-worker \
  -H "Content-Type: application/json" \
  -d '{"name":"My-Windows-PC"}'

# Copy the API key from the response

# Configure environment
cp .env.example .env
# Edit .env:
#   SERVER_URL=http://your-ubuntu-server:3000
#   API_KEY=<paste-api-key-here>
#   WORKER_NAME=My-Windows-PC

# Run service
npm run dev

# To install as Windows service (optional, requires admin):
npm run build
npm run install-service
```

### 3. Setup Client Application

```bash
cd packages/client
npm install

# Run in development mode
npm run dev

# Or build for your platform
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## Usage

1. **Launch the Client App**
   - Enter your Ubuntu server URL (e.g., `http://192.168.1.100:3000`)
   - Register a new account or login

2. **Select a Printer**
   - Available printers from connected Windows services will be displayed
   - Click on a printer to select it

3. **Print a Document**
   - Click "Browse Files" to select a document
   - Configure print options (copies, color mode, duplex, etc.)
   - Click "Print" to submit the job

4. **Monitor Print Jobs**
   - View real-time status of your print jobs
   - Cancel pending jobs if needed

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌────────────────┐
│   Client    │────────▶│Ubuntu Server │◀────────│Windows Service │
│  (Electron) │         │  (REST API)  │         │  (Worker)      │
└─────────────┘         └──────────────┘         └────────────────┘
                              │                           │
                              ▼                           ▼
                        ┌──────────┐              ┌──────────┐
                        │ SQLite   │              │ Printers │
                        │ Database │              └──────────┘
                        └──────────┘
```

## API Documentation

### Authentication

**Register Client:**
```bash
POST /api/auth/register
Content-Type: application/json

{
  "username": "john",
  "password": "secure123",
  "displayName": "John Doe",
  "email": "john@example.com"
}
```

**Login:**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "john",
  "password": "secure123"
}
```

**Register Worker:**
```bash
POST /api/auth/register-worker
Content-Type: application/json

{
  "name": "Office-PC"
}
```

### Print Jobs

**Create Print Job:**
```bash
POST /api/jobs
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <file>
printerId: <printer-id>
copies: 1
colorMode: color
duplex: none
orientation: portrait
paperSize: A4
```

**List Print Jobs:**
```bash
GET /api/jobs?status=pending&limit=20
Authorization: Bearer <token>
```

**Cancel Print Job:**
```bash
DELETE /api/jobs/:id
Authorization: Bearer <token>
```

### Printers

**List Printers:**
```bash
GET /api/printers
Authorization: Bearer <token>
```

**Sync Printers (Worker):**
```bash
POST /api/printers/sync
X-API-Key: <worker-api-key>
Content-Type: application/json

{
  "printers": [
    {
      "name": "HP LaserJet",
      "displayName": "HP LaserJet Pro",
      "isDefault": true,
      "capabilities": {
        "color": true,
        "duplex": true,
        "paperSizes": ["A4", "Letter"],
        "maxCopies": 99
      }
    }
  ]
}
```

## Configuration

### Server Environment Variables

```bash
PORT=3000                                    # Server port
NODE_ENV=production                          # Environment
JWT_SECRET=your-random-secret-key           # JWT signing key
DB_PATH=./data/rprint.db                    # SQLite database path
UPLOAD_DIR=./uploads                         # Upload directory
MAX_FILE_SIZE=10485760                       # Max file size (10MB)
ALLOWED_ORIGINS=http://localhost:5173       # CORS origins
```

### Windows Service Environment Variables

```bash
SERVER_URL=http://localhost:3000            # Ubuntu server URL
API_KEY=your-worker-api-key                 # Worker API key
WORKER_NAME=Windows-PC-1                    # Worker name
POLL_INTERVAL=5000                          # Poll interval (ms)
LOG_LEVEL=info                              # Log level
```

## Development

### Project Structure

```
rprint/
├── packages/
│   ├── server/           # Ubuntu REST API server
│   │   ├── src/
│   │   │   ├── controllers/  # Request handlers
│   │   │   ├── routes/       # API routes
│   │   │   ├── models/       # Database models
│   │   │   ├── middleware/   # Express middleware
│   │   │   ├── database/     # Database setup
│   │   │   └── types/        # TypeScript types
│   │   └── package.json
│   ├── windows-service/  # Windows printing service
│   │   ├── src/
│   │   │   ├── services/     # Core services
│   │   │   ├── utils/        # Utilities
│   │   │   └── types/        # TypeScript types
│   │   └── package.json
│   └── client/           # Electron client app
│       ├── src/
│       │   ├── pages/        # React pages
│       │   ├── components/   # React components
│       │   ├── services/     # API services
│       │   ├── store/        # State management
│       │   └── types/        # TypeScript types
│       ├── electron/         # Electron main process
│       └── package.json
└── package.json          # Root package.json
```

### Testing

```bash
# Run all tests
npm test

# Run tests for specific package
cd packages/server && npm test
cd packages/windows-service && npm test
cd packages/client && npm test
```

### Linting

```bash
npm run lint
```

## Troubleshooting

### Windows Service Not Detecting Printers
- Ensure PowerShell execution policy allows scripts: `Set-ExecutionPolicy RemoteSigned`
- Run the service with administrator privileges
- Check printer drivers are installed correctly

### Client Can't Connect to Server
- Verify server is running: `curl http://your-server:3000/health`
- Check firewall rules on Ubuntu server
- Ensure correct server URL in client settings

### Print Jobs Stuck in Pending
- Verify Windows service is running and connected (check logs)
- Ensure printer is online and not in error state
- Check worker heartbeat status: `GET /api/workers`

### File Upload Fails
- Check file size is under 10MB (or configured limit)
- Verify file type is supported
- Ensure upload directory has write permissions

## Security Considerations

- Always use HTTPS in production (configure reverse proxy like nginx)
- Generate strong JWT secret and API keys
- Keep API keys secure and never commit to version control
- Consider implementing rate limiting for production
- Regularly update dependencies for security patches

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
