# Windows Print Server Setup Guide

This guide will help you install and configure the Windows service on your Windows 11 machine.

## Prerequisites

- Windows 11 machine with printers installed
- Node.js 18+ installed on Windows
- Git (optional, for cloning the repository)
- Administrator privileges

## Step 1: Get the Code on Windows

### Option A: Clone the repository (if you have git)
```powershell
git clone <your-repo-url>
cd rprint/packages/windows-service
```

### Option B: Copy the files
1. Copy the entire `packages/windows-service` folder to your Windows machine
2. Open PowerShell or Command Prompt as Administrator
3. Navigate to the folder: `cd path\to\windows-service`

## Step 2: Install Dependencies

```powershell
npm install
```

## Step 3: Build the Service

```powershell
npm run build
```

## Step 4: Configure the Service

Create a `.env` file in the `windows-service` folder with this content:

```env
SERVER_URL=https://growingsoft.net
API_KEY=fd783ffb1a280cbc3d7e1f2ea9478938cd12983230f9ce9e23a6707761bdcd8f
WORKER_NAME=Windows-Print-Server
POLL_INTERVAL=5000
LOG_LEVEL=info
```

**Important:** Replace the values above with:
- `SERVER_URL`: Your Ubuntu server URL (https://growingsoft.net)
- `API_KEY`: The API key generated (already filled in above)
- `WORKER_NAME`: A name for this Windows machine
- `POLL_INTERVAL`: How often to check for new jobs (in milliseconds, 5000 = 5 seconds)

## Step 5: Test the Service (Optional but Recommended)

Before installing as a Windows service, test it manually:

```powershell
npm run dev
```

You should see:
```
Starting rprint Windows service...
Server URL: https://growingsoft.net
Worker Name: Windows-Print-Server
Poll Interval: 5000ms
Detecting local printers...
Found X printers
Syncing printers with server...
Service started successfully
```

Press `Ctrl+C` to stop the test.

## Step 6: Install as Windows Service

**Run PowerShell as Administrator**, then:

```powershell
npm run install-service
```

This will:
- Install the service to run automatically on Windows startup
- Start the service immediately
- Configure it to restart on failure

## Step 7: Verify Service is Running

### Check Windows Services
1. Press `Win+R`, type `services.msc`, press Enter
2. Look for "RPrint Windows Service"
3. Status should be "Running"

### Check the logs
Logs are stored in: `logs/windows-service.log`

```powershell
Get-Content logs/windows-service.log -Tail 20
```

## Step 8: Test Printing

1. Go to https://growingsoft.net
2. Login with your account
3. Click "Print Document"
4. Select a file
5. Choose one of the printers from your Windows machine
6. Click "Print"

The Windows service will:
1. Poll the server and find the new job
2. Download the file
3. Send it to the selected printer
4. Update the job status

## Troubleshooting

### Service won't start
- Check that you ran PowerShell as Administrator
- Verify the API_KEY is correct in `.env`
- Check logs in `logs/windows-service.log`

### Printers not showing up
- Make sure printers are installed in Windows
- The service auto-detects printers using PowerShell
- Check logs for printer detection errors

### Jobs not printing
- Verify the service is running in `services.msc`
- Check `logs/windows-service.log` for errors
- Ensure the Windows firewall allows outbound HTTPS connections
- Test the server URL: `curl https://growingsoft.net/api/health`

### Uninstall the service
```powershell
npm run uninstall-service
```

## Your Worker API Key

**Keep this safe!** Anyone with this key can submit print jobs to your Windows machine.

```
API Key: fd783ffb1a280cbc3d7e1f2ea9478938cd12983230f9ce9e23a6707761bdcd8f
Worker ID: 98e05e11-c415-4fff-8418-3505fcfbb09f
Worker Name: Windows-Print-Server
```

## Service Commands

### Start the service
```powershell
net start "RPrint Windows Service"
```

### Stop the service
```powershell
net stop "RPrint Windows Service"
```

### Restart the service
```powershell
net stop "RPrint Windows Service"
net start "RPrint Windows Service"
```

### View service status
```powershell
sc query "RPrint Windows Service"
```

## Next Steps

- Add more Windows machines by repeating this process (register a new worker for each)
- Monitor the service through Windows Event Viewer
- Set up email notifications for failed print jobs (future feature)

## Support

For issues or questions, check:
- Service logs: `logs/windows-service.log`
- Server logs on Ubuntu: `pm2 logs rprint-server`
- GitHub Issues: <your-repo-url/issues>
