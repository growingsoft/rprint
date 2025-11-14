# RPrint Virtual Printer Setup Guide

This guide explains how to install and use the RPrint Virtual Printer, which allows you to print from **any application** (Word, Excel, Chrome, etc.) on Windows or Mac directly to your RPrint remote printers.

## What You Get

After installation, you'll have:
- **A new printer** in your system called "RPrint Virtual Printer"
- **Print from anywhere**: Any app that can print can now use RPrint
- **Automatic processing**: Documents are automatically sent to your RPrint server
- **Background service**: Runs silently in the background, no manual intervention needed

## Quick Start

### For Windows Users

1. **Install the virtual printer package:**
   ```cmd
   cd packages\virtual-printer
   npm install
   npm run build
   ```

2. **Install the printer (run PowerShell as Administrator):**
   ```powershell
   npm run install-printer
   ```

3. **Configure your credentials:**
   ```cmd
   copy .env.example .env
   notepad .env
   ```

   Edit `.env` and set:
   ```
   SERVER_URL=https://growingsoft.net
   RPRINT_USERNAME=your-username
   RPRINT_PASSWORD=your-password
   ```

4. **Install as a Windows service (run as Administrator):**
   ```powershell
   npm run install-service
   ```

5. **Done!** The service is now running and will start automatically on boot.

### For Mac Users

1. **Install the virtual printer package:**
   ```bash
   cd packages/virtual-printer
   npm install
   npm run build
   ```

2. **Install the printer (requires sudo):**
   ```bash
   sudo npm run install-printer
   ```

3. **Configure your credentials:**
   ```bash
   cp .env.example .env
   nano .env
   ```

   Edit `.env` and set:
   ```
   SERVER_URL=https://growingsoft.net
   RPRINT_USERNAME=your-username
   RPRINT_PASSWORD=your-password
   ```

4. **Start the monitor service:**
   ```bash
   npm start
   ```

   To run as a background service, see [Mac LaunchAgent Setup](#mac-launchagent-setup) below.

## How to Use

### Printing from Any Application

1. **Open your document** in any application (Word, Excel, Chrome, PDF reader, etc.)

2. **Go to Print** (usually Ctrl+P on Windows, Cmd+P on Mac)

3. **Select "RPrint Virtual Printer"** from the printer dropdown

4. **Click Print**

#### Windows Behavior:
- You'll be prompted to save a PDF file
- Save it to: `C:\Users\YourName\RPrint\PrintQueue\`
- The background service will detect it and upload automatically

#### Mac Behavior:
- The file is automatically saved to: `~/RPrint/PrintQueue/`
- No manual save needed!

5. **Check your print job** via the RPrint web interface or client app

## Architecture Overview

```
Your Application (Word, Excel, etc.)
           ↓
      [Print Dialog]
           ↓
   "RPrint Virtual Printer"
           ↓
   Save PDF to Watch Folder
   ~/RPrint/PrintQueue/
           ↓
   Background Monitor Service
   (Detects new files)
           ↓
   Upload to RPrint Server
   (via API with your credentials)
           ↓
   RPrint Routes to Physical Printer
   (via Windows Worker Service)
           ↓
   Document Prints!
```

## Advanced Configuration

### Custom Watch Folder

Edit `.env`:
```
WATCH_FOLDER=C:\MyCustomFolder\PrintQueue
```

### Target a Specific Printer

By default, jobs go to the first available printer. To always use a specific printer:

Edit `.env`:
```
PRINTER_NAME=Office Color Laser
```

### Change Server URL

For production or remote servers:

Edit `.env`:
```
SERVER_URL=https://your-rprint-server.com
```

## Running as a Background Service

### Windows Service

**Install:**
```powershell
npm run install-service
```

**Uninstall:**
```powershell
npm run uninstall-service
```

**Check Status:**
- Open Services (services.msc)
- Look for "RPrint Virtual Printer Monitor"

### Mac LaunchAgent Setup

Create a file at: `~/Library/LaunchAgents/com.rprint.virtualprinter.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.rprint.virtualprinter</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Users/YourName/path/to/rprint/packages/virtual-printer/dist/index.js</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>/Users/YourName/path/to/rprint/packages/virtual-printer</string>
    <key>StandardOutPath</key>
    <string>/Users/YourName/Library/Logs/rprint-virtual-printer.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/YourName/Library/Logs/rprint-virtual-printer-error.log</string>
</dict>
</plist>
```

**Load the service:**
```bash
launchctl load ~/Library/LaunchAgents/com.rprint.virtualprinter.plist
```

**Unload the service:**
```bash
launchctl unload ~/Library/LaunchAgents/com.rprint.virtualprinter.plist
```

## Troubleshooting

### Windows

**Printer doesn't appear in list:**
- Make sure you ran PowerShell as Administrator
- Verify "Microsoft Print to PDF" is installed (Windows 10+ has it built-in)
- Run: `Get-Printer` in PowerShell to see all printers

**Service won't start:**
- Check `.env` file has correct credentials
- Verify server URL is accessible
- Check service logs in Event Viewer

**Files not uploading:**
- Make sure watch folder exists: `%USERPROFILE%\RPrint\PrintQueue`
- Check service is running: `services.msc`
- View logs by running `npm start` manually to see output

### Mac

**Permission denied:**
- Use `sudo` for installation: `sudo npm run install-printer`
- Check folder permissions: `ls -la ~/RPrint/`

**Printer not appearing:**
- Check CUPS: `lpstat -p`
- View CUPS logs: `tail -f /var/log/cups/error_log`
- Restart CUPS: `sudo launchctl stop org.cups.cupsd && sudo launchctl start org.cups.cupsd`

**Authentication failing:**
- Verify credentials in `.env`
- Test login via web interface
- Check server URL is correct

### Both Platforms

**Jobs not appearing on server:**
- Verify authentication works (check logs)
- Ensure server is accessible from your network
- Check firewall settings
- Test API access: `curl https://your-server.com/api/printers`

**Want to see detailed logs:**

Run manually instead of as service:
```bash
npm start
```

This will show all activity in real-time.

## Uninstallation

### Remove Printer

**Windows:**
```powershell
npm run uninstall-printer
```

**Mac:**
```bash
sudo npm run uninstall-printer
```

### Remove Service

**Windows:**
```powershell
npm run uninstall-service
```

**Mac:**
```bash
launchctl unload ~/Library/LaunchAgents/com.rprint.virtualprinter.plist
rm ~/Library/LaunchAgents/com.rprint.virtualprinter.plist
```

## Security Notes

- Your RPrint credentials are stored locally in `.env`
- Files are uploaded over HTTPS to your RPrint server
- Print files are deleted after successful upload
- The service runs with your user permissions (no elevated privileges needed after installation)

## Support

For issues or questions:
1. Check the logs (run `npm start` manually)
2. Verify your credentials and server connectivity
3. Review the README.md in `packages/virtual-printer/`
4. Check the main RPrint documentation

## What's Next?

- Print from any application on your computer
- Jobs automatically route to your remote printers
- No manual file uploads needed
- Works seamlessly in the background

Happy printing! 🖨️
