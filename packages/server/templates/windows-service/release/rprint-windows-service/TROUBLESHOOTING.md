# Windows Service Troubleshooting

## Problem: Service not printing

### Step 1: Check if service is running

```powershell
# If using PM2
pm2 list

# If using Windows Service
sc query rprint-service
```

### Step 2: Check the logs

Logs are located in the `logs/` folder where the service is installed:

```powershell
# View combined log
type logs\combined.log

# View error log
type logs\error.log

# View last 50 lines
Get-Content logs\combined.log -Tail 50
```

### Step 3: Check configuration

Verify your `.env` file has the correct settings:

```
SERVER_URL=https://growingsoft.net
API_KEY=your-api-key-here
WORKER_NAME=APrinter
POLL_INTERVAL=5000
LOG_LEVEL=debug
```

**IMPORTANT**: Set `LOG_LEVEL=debug` for more verbose logging!

### Step 4: Restart the service

```powershell
# If using PM2
pm2 restart all
pm2 logs

# If using Windows Service
net stop rprint-service
net start rprint-service
```

### Step 5: Manual test

Run the service manually to see console output:

```powershell
cd C:\path\to\windows-service
node dist\index.js
```

You should see output like:
```
Starting rprint Windows service...
Server URL: https://growingsoft.net
Worker Name: APrinter
Poll Interval: 5000ms
Starting print service...
Found 19 printers
Synced 19 printers with server
Mapped 19 printers with server IDs
Setting up polling for printer: Brother HL-L8260CDW series Printer (ID: xxx)
Setting up polling for printer: Xerox (ID: xxx)
...
Started polling for 19 printers
Print service started successfully
```

### Step 6: Check what the logs should contain

After startup, you should see these messages:
1. "Starting rprint Windows service..."
2. "Found X printers"
3. "Synced X printers with server"
4. "Setting up polling for printer: ..." (for each printer)
5. "Started polling for X printers"

If polling finds jobs:
- "Found X job(s) for printer..."
- "Processing job..."
- "Successfully completed job..."

### Common Issues

**Issue: Logs are empty**
- Service might not be running at all
- Check PM2 status: `pm2 list`
- Try running manually: `node dist\index.js`

**Issue: "No printers found"**
- PowerShell execution policy might be blocking printer detection
- Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

**Issue: "Error syncing printers" or "Error polling"**
- Check SERVER_URL is correct (https://growingsoft.net)
- Check API_KEY matches the one in the database
- Test connection: `curl https://growingsoft.net/api/health`

**Issue: Service starts but doesn't poll**
- Check "Mapped X printers with server IDs" - if X is 0, polling won't start
- Make sure printers were synced successfully
- Check error.log for sync errors

## Enable Debug Logging

Edit `.env` and add:
```
LOG_LEVEL=debug
```

Then restart the service. You'll see much more detailed output including:
- "Polling for jobs on printer: ..." (every 5 seconds)
- Detailed error messages
- API request/response details
