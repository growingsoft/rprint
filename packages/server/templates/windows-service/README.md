# RPrint Windows Service

Windows service that polls the RPrint server for print jobs and executes them on local printers.

## Quick Start

### Prerequisites
- Windows 11
- Node.js 18+ ([Download here](https://nodejs.org/))
- Printers installed on your Windows machine
- Administrator privileges

### Installation Methods

#### Method 1: Automatic Installation (Recommended)

1. **Copy this folder** to your Windows 11 machine
2. **Double-click** `INSTALL.bat`
3. **Enter your configuration** when prompted:
   - Server URL: `https://growingsoft.net`
   - API Key: `fd783ffb1a280cbc3d7e1f2ea9478938cd12983230f9ce9e23a6707761bdcd8f`
   - Worker Name: Choose a name (e.g., `Office-Printer`)
4. The installer will:
   - Install dependencies
   - Build the service
   - Optionally test it
   - Install it as a Windows service

#### Method 2: Manual Installation

1. Open PowerShell as Administrator
2. Navigate to this folder
3. Run these commands:

```powershell
# Install dependencies
npm install

# Build the service
npm run build

# Create .env file (use notepad or your favorite editor)
notepad .env
```

4. Add this to `.env`:
```env
SERVER_URL=https://growingsoft.net
API_KEY=fd783ffb1a280cbc3d7e1f2ea9478938cd12983230f9ce9e23a6707761bdcd8f
WORKER_NAME=Windows-Print-Server
POLL_INTERVAL=5000
LOG_LEVEL=info
```

5. Test the service:
```powershell
npm run dev
```

6. Install as Windows service:
```powershell
npm run install-service
```

## Your Worker Credentials

**Keep these safe!**

```
Worker ID: 98e05e11-c415-4fff-8418-3505fcfbb09f
Worker Name: Windows-Print-Server
API Key: fd783ffb1a280cbc3d7e1f2ea9478938cd12983230f9ce9e23a6707761bdcd8f
Server: https://growingsoft.net
```

## How It Works

1. **Printer Detection**: On startup, the service detects all printers installed on the Windows machine using PowerShell
2. **Sync with Server**: Sends the printer list to the Ubuntu server
3. **Poll for Jobs**: Every 5 seconds, checks the server for new print jobs assigned to this worker's printers
4. **Download & Print**: When a job is found:
   - Downloads the file from the server
   - Sends it to the specified printer
   - Updates the job status (success/failure)
5. **Heartbeat**: Regularly sends heartbeat to server to show the worker is online

## Supported File Types

- **PDF** (`.pdf`) - Uses `pdf-to-printer` library
- **Word** (`.doc`, `.docx`)
- **Excel** (`.xls`, `.xlsx`)
- **Images** (`.jpg`, `.png`, `.gif`, `.bmp`, `.tiff`)
- **Text** (`.txt`)

## Service Management

### View Service Status
```powershell
sc query "RPrint Windows Service"
```

### Start Service
```powershell
net start "RPrint Windows Service"
```

### Stop Service
```powershell
net stop "RPrint Windows Service"
```

### Restart Service
```powershell
net stop "RPrint Windows Service"
net start "RPrint Windows Service"
```

### Uninstall Service
```powershell
npm run uninstall-service
```

## Logs

Logs are stored in the `logs/` folder:
- `windows-service.log` - All service activity
- `windows-service-error.log` - Errors only

View recent logs:
```powershell
Get-Content logs/windows-service.log -Tail 50
```

## Configuration Options

Edit `.env` file to change settings:

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVER_URL` | URL of the Ubuntu server | `http://localhost:3000` |
| `API_KEY` | Worker authentication key | (required) |
| `WORKER_NAME` | Display name for this worker | `Windows-Worker` |
| `POLL_INTERVAL` | How often to check for jobs (ms) | `5000` |
| `LOG_LEVEL` | Logging verbosity (error/warn/info/debug) | `info` |

After changing configuration, restart the service:
```powershell
net stop "RPrint Windows Service"
net start "RPrint Windows Service"
```

## Troubleshooting

### Service won't start
- Verify you ran PowerShell as Administrator
- Check that the API_KEY in `.env` is correct
- Review logs in `logs/windows-service.log`
- Ensure Node.js is in the system PATH

### Printers not detected
- Open PowerShell and run: `Get-Printer | Select-Object Name, PrinterStatus`
- Ensure printers are installed and online
- Check service logs for detection errors

### Print jobs not executing
- Verify service is running in Services (`services.msc`)
- Check `logs/windows-service.log` for errors
- Ensure Windows Firewall allows outbound HTTPS (port 443)
- Test server connectivity: `curl https://growingsoft.net/api/health`
- Verify the printer is online and accepting jobs

### Files not printing correctly
- Check printer driver is up to date
- For PDFs, ensure `pdf-to-printer` is working: test with a simple PDF
- For Office documents, ensure the application (Word/Excel) is installed
- Check printer settings (paper size, orientation, etc.)

### Service crashes/restarts
- Check Event Viewer (Windows Logs → Application)
- Review `logs/windows-service-error.log`
- Ensure sufficient disk space for downloading files
- Check system resources (CPU, memory)

## Development

### Run in development mode
```powershell
npm run dev
```

### Build
```powershell
npm run build
```

### Run tests
```powershell
npm test
```

## Architecture

```
src/
├── index.ts              # Main entry point
├── services/
│   ├── ApiClient.ts      # HTTP client for server communication
│   └── PrintService.ts   # Main service logic (polling, printing)
├── utils/
│   ├── logger.ts         # Winston logger configuration
│   └── printer-utils.ts  # Printer detection and printing
├── types/
│   └── index.ts          # TypeScript interfaces
├── install-service.ts    # Service installation script
└── uninstall-service.ts  # Service uninstallation script
```

## Security Notes

- The API key is sensitive - keep your `.env` file secure
- The service requires local admin privileges to install
- Print jobs are temporarily stored in a download directory
- Files are deleted after printing (success or failure)
- All communication with the server uses HTTPS

## Multiple Windows Machines

To add more Windows machines:

1. Register a new worker on the server:
   ```bash
   curl -X POST https://growingsoft.net/api/auth/register-worker \
     -H "Content-Type: application/json" \
     -d '{"name":"Office-Printer-2"}'
   ```

2. Copy this service to the new machine

3. Use the new API key in the `.env` file

4. Install the service

Each Windows machine gets its own worker ID and API key.

## License

See main project LICENSE file.

## Support

For issues or questions:
- Check the logs first
- Review this README
- Check the main project documentation at `/var/www/rprint/CLAUDE.md`
- Open an issue on GitHub
