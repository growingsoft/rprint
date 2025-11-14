# RPrint Virtual Printer

Print from any Windows or macOS application directly to RPrint remote printers.

## How It Works

1. Installs a virtual printer named "RPrint Virtual Printer" on your system
2. When you print to this printer, the document is saved as a PDF to a monitored folder
3. A background service automatically detects new files and uploads them to the RPrint server
4. The RPrint server routes the job to the selected physical printer

## Installation

### Windows

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Install the virtual printer (run as Administrator):**
   ```bash
   npm run install-printer
   ```

4. **Configure credentials:**
   ```bash
   copy .env.example .env
   # Edit .env with your RPrint username and password
   ```

5. **Start the monitor service:**
   ```bash
   npm start
   ```

   Or install as a Windows service:
   ```bash
   npm run install-service
   ```

### macOS

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Install the virtual printer (requires sudo):**
   ```bash
   sudo npm run install-printer
   ```

4. **Configure credentials:**
   ```bash
   cp .env.example .env
   # Edit .env with your RPrint username and password
   ```

5. **Start the monitor service:**
   ```bash
   npm start
   ```

## Usage

1. Open any application (Word, Excel, Chrome, etc.)
2. Go to Print (Ctrl+P / Cmd+P)
3. Select "RPrint Virtual Printer" from the printer list
4. Click Print

**Windows:** Save the file to the watch folder when prompted (default: `%USERPROFILE%\RPrint\PrintQueue`)

**Mac:** The file is automatically saved to the watch folder (default: `~/RPrint/PrintQueue`)

The background service will automatically detect the file and send it to your RPrint server!

## Configuration

Edit the `.env` file to configure:

- `SERVER_URL`: Your RPrint server URL (default: http://localhost:3001)
- `RPRINT_USERNAME`: Your RPrint username
- `RPRINT_PASSWORD`: Your RPrint password
- `WATCH_FOLDER`: Custom watch folder path (optional)
- `PRINTER_NAME`: Default target printer name (optional)

## Running as a Service

### Windows Service

Install:
```bash
npm run install-service
```

Uninstall:
```bash
npm run uninstall-service
```

The service will automatically start on system boot.

### macOS LaunchAgent

Create a launch agent plist file at:
`~/Library/LaunchAgents/com.rprint.virtualprinter.plist`

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
        <string>/path/to/rprint/packages/virtual-printer/dist/index.js</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>/path/to/rprint/packages/virtual-printer</string>
</dict>
</plist>
```

Load the service:
```bash
launchctl load ~/Library/LaunchAgents/com.rprint.virtualprinter.plist
```

## Uninstallation

```bash
npm run uninstall-printer
```

## Troubleshooting

### Windows

- Make sure to run PowerShell as Administrator
- Ensure "Microsoft Print to PDF" driver is installed (built into Windows 10+)
- Check that the watch folder exists and is accessible
- Verify the service is running: `npm start`

### macOS

- Run installation with `sudo`
- Check printer status: `lpstat -p`
- View CUPS logs: `tail -f /var/log/cups/error_log`
- Verify permissions on watch folder

### Both Platforms

- Ensure your RPrint credentials are correct in `.env`
- Check that the RPrint server is accessible
- View monitor logs for any errors
- Test authentication: Try logging in through the web interface

## Advanced Usage

### Multiple Watch Folders

You can run multiple instances with different watch folders by:
1. Creating separate `.env` files
2. Running separate instances with different configurations

### Custom Printer Selection

Set `PRINTER_NAME` in `.env` to automatically route to a specific printer:
```
PRINTER_NAME=Office Color Printer
```

## Architecture

```
┌─────────────────┐
│  Any Windows/   │
│   Mac App       │
│  (Word, Excel,  │
│   Chrome, etc)  │
└────────┬────────┘
         │ Print
         ▼
┌─────────────────┐
│ RPrint Virtual  │
│    Printer      │
└────────┬────────┘
         │ Save PDF
         ▼
┌─────────────────┐
│  Watch Folder   │
│ ~/RPrint/Print  │
│     Queue       │
└────────┬────────┘
         │ Monitor
         ▼
┌─────────────────┐
│ Node.js Service │
│ (printer-       │
│  monitor.ts)    │
└────────┬────────┘
         │ Upload via API
         ▼
┌─────────────────┐
│  RPrint Server  │
│  (Ubuntu)       │
└────────┬────────┘
         │ Route Job
         ▼
┌─────────────────┐
│ Physical Printer│
│  (via Windows   │
│    Worker)      │
└─────────────────┘
```

## License

ISC
