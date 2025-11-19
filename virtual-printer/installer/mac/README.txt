╔═══════════════════════════════════════════════════════════════╗
║          RPrint Virtual Printer for macOS                     ║
║                                                               ║
║  SIMPLIFIED INSTALLATION - NO CONFIGURATION REQUIRED!         ║
╚═══════════════════════════════════════════════════════════════╝

WHAT IS THIS?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The RPrint Virtual Printer adds "RPrint" as a printer on your Mac.
Once installed, you can print from Safari, Word, Excel, Preview, Chrome,
or ANY Mac application, and the document will be sent to your RPrint
remote printer.

NEW: Zero-configuration installation! Just run the installer and
configure when you first print using a simple GUI dialog.


INSTALLATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Extract this folder to your Downloads directory

2. Open Terminal (Applications → Utilities → Terminal)

3. Run these commands:

   cd ~/Downloads/mac
   sudo ./install.sh

4. Enter your Mac password when prompted
   (It won't be visible as you type - this is normal!)

5. Press 'y' if you want to set RPrint as default, or 'n' to skip

6. Done! No configuration needed yet.


FIRST TIME USE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When you print for the FIRST time to RPrint:

1. A dialog will appear asking for your credentials
2. Fill in:
   • Server URL (e.g., https://growingsoft.net)
   • Authentication Token (get from server/api-token)
   • Printer ID (optional)

3. Click OK - your credentials are saved
4. Print job proceeds automatically
5. Never need to enter credentials again!


WHERE TO GET YOUR CREDENTIALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Server URL
   ├─ This is your RPrint server address
   └─ Example: https://growingsoft.net

2. Authentication Token
   ├─ Login to your RPrint server
   ├─ Go to: https://growingsoft.net/api-token
   ├─ Click "Copy" button
   └─ Paste into dialog

3. Printer ID (Optional)
   ├─ Login to your RPrint server
   ├─ Go to: Admin → Printers
   ├─ Find the printer you want
   ├─ Copy its ID
   └─ Note: Can leave empty and select printer later


PRINTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To print from any application:

1. Open any Mac application
2. Click File → Print (or press ⌘P)
3. Select "RPrint" from printer list
4. (First time only) Fill in configuration dialog
5. Click Print

Your document uploads to RPrint and prints on your remote printer!


RECONFIGURATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To change server, token, or printer ID:

   rprint-config

This opens the same GUI dialog to update your settings.

Or manually edit: /etc/rprint/config


TESTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Quick test from Terminal:

   echo 'Hello RPrint' | lp -d RPrint

This sends a test print job to RPrint.


TROUBLESHOOTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ Configuration dialog doesn't appear
   ✓ Run manually: rprint-config

❌ Print job fails
   ✓ Check logs: tail -f /var/log/cups/error_log
   ✓ Verify credentials: cat /etc/rprint/config
   ✓ Test connection:
     curl -H "Authorization: Bearer YOUR_TOKEN" \
          https://growingsoft.net/api/printers

❌ Printer not in print dialog
   ✓ Check status: lpstat -p RPrint
   ✓ Restart CUPS:
     sudo launchctl stop org.cups.cupsd
     sudo launchctl start org.cups.cupsd

❌ Need to reconfigure
   ✓ Run: rprint-config

❌ "Permission denied" during install
   ✓ Use sudo: sudo ./install.sh


UNINSTALLATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To remove RPrint virtual printer:

   cd ~/Downloads/mac
   sudo ./uninstall.sh

This removes:
- Virtual printer
- CUPS backend
- Configuration files
- Configuration helper


TECHNICAL DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Installation creates:
├─ /usr/libexec/cups/backend/rprint .... CUPS backend script
├─ /usr/local/bin/rprint-config ........ Configuration helper
└─ /etc/rprint/config .................. Credentials (created on first use)

Technology:
├─ IPP Everywhere (modern CUPS 2.x standard)
├─ AppleScript GUI dialogs
├─ CUPS backend API
└─ REST API for print job upload

Requirements:
├─ macOS 10.13 (High Sierra) or later
└─ Administrator privileges

How it works:
1. CUPS intercepts print jobs to "RPrint" printer
2. Calls /usr/libexec/cups/backend/rprint script
3. Script checks for config, prompts if missing
4. Uploads PDF/document to RPrint server via API
5. RPrint server routes to your remote printer


FILES INCLUDED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

install.sh ......... Main installer (run with sudo)
rprint-backend ..... CUPS backend script
rprint-config ...... GUI configuration helper
uninstall.sh ....... Uninstaller
README.txt ......... This file


WHAT'S NEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Zero-configuration installation
✓ GUI dialogs for setup (no Terminal input during first print)
✓ Configure on first use, not during install
✓ Easy reconfiguration with: rprint-config
✓ IPP Everywhere (no deprecated PPD files)
✓ Modern CUPS 2.x compatible


SUPPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Logs: /var/log/cups/error_log
Config: /etc/rprint/config
Backend: /usr/libexec/cups/backend/rprint

For issues, check the CUPS error log first:
   tail -f /var/log/cups/error_log
