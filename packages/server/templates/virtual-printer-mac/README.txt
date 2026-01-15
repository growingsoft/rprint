╔═══════════════════════════════════════════════════════════════╗
║          RPrint Virtual Printer for macOS                     ║
║                                                               ║
║  PRE-CONFIGURED - NO SETUP REQUIRED!                          ║
╚═══════════════════════════════════════════════════════════════╝

WHAT IS THIS?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The RPrint Virtual Printer adds "RPrint" as a printer on your Mac.
Once installed, you can print from Safari, Word, Excel, Preview, Chrome,
or ANY Mac application, and the document will be sent to your RPrint
remote printer.

NEW: This installer is PRE-CONFIGURED with your server credentials.
Just install and start printing - no configuration needed!


INSTALLATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FIRST TIME SETUP:

1. Extract this folder to your Downloads directory

2. Open Terminal (Applications → Utilities → Terminal)

3. Run these commands:

   cd ~/Downloads/mac
   sudo ./install.sh

4. Enter your Mac password when prompted
   (It won't be visible as you type - this is normal!)

5. Press 'y' if you want to set RPrint as default, or 'n' to skip

6. Done! The printer is ready to use immediately.


AUTO-UPDATE (Run until it works!):

If installation fails or you need to update to the latest version:

   cd ~/Downloads/mac
   sudo ./auto-update.sh

This will automatically:
  • Download the latest version
  • Install the backend
  • Enable the printer
  • Run a test print
  • Show you the logs

Just keep running it until it works!


PRINTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To print from any application:

1. Open any Mac application
2. Click File → Print (or press ⌘P)
3. Select "RPrint" from printer list
4. Click Print

Your document uploads to RPrint and prints on your remote printer!


TESTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Test with included PDF file (recommended):

   cd ~/Downloads/mac
   lp -d RPrint mac.pdf

This prints the test PDF that came with the installer.

Comprehensive diagnostic test:

   rprint-test

This runs 7 diagnostic tests and tells you exactly what's working.

Quick text test from Terminal:

   echo 'Hello RPrint' | lp -d RPrint

This sends a simple text job to RPrint.


TROUBLESHOOTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ Print job fails or printer disabled
   ✓ Run comprehensive fix: sudo rprint-fix
   ✓ Then run test: rprint-test

❌ Authentication errors
   ✓ Your token may have expired
   ✓ Download a new installer from the server
   ✓ The new installer will have a fresh token

❌ Printer not in print dialog
   ✓ Check status: lpstat -p RPrint
   ✓ Enable printer: sudo cupsenable RPrint
   ✓ Or run fix script: sudo rprint-fix

❌ Need to see what's happening
   ✓ View logs: sudo tail -20 /var/log/cups/error_log | grep RPrint
   ✓ Run test: rprint-test

❌ "Permission denied" during install
   ✓ Use sudo: sudo ./install.sh

❌ Want to test the backend directly
   ✓ Create test file: echo "test" > /tmp/test.txt
   ✓ Run backend: sudo /usr/libexec/cups/backend/rprint 999 testuser "Test" 1 "" /tmp/test.txt


AVAILABLE COMMANDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

rprint-test .............. Run comprehensive diagnostic tests
sudo rprint-fix .......... Fix all permissions and configuration issues
lpstat -p RPrint ......... Check printer status
lpstat -o RPrint ......... Check pending print jobs
sudo cupsenable RPrint ... Enable the printer
sudo cupsaccept RPrint ... Make printer accept jobs


UNINSTALLATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To remove RPrint virtual printer:

   cd ~/Downloads/mac
   sudo ./uninstall.sh

This removes:
- Virtual printer
- CUPS backend
- Test and fix scripts


TECHNICAL DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Installation creates:
├─ /usr/libexec/cups/backend/rprint .... CUPS backend script
├─ /usr/local/bin/rprint-test .......... Diagnostic test script
└─ /usr/local/bin/rprint-fix ........... Comprehensive fix script

Pre-configured credentials:
├─ Server: https://growingsoft.net
├─ Auth Token: Embedded in backend (specific to this installer)
└─ Printer ID: Embedded in backend (specific to this installer)

Technology:
├─ Generic PostScript PPD (macOS compatible)
├─ CUPS backend API
├─ REST API for print job upload
└─ Stdin/file input handling

Requirements:
├─ macOS 10.13 (High Sierra) or later
└─ Administrator privileges

How it works:
1. CUPS intercepts print jobs to "RPrint" printer
2. Calls /usr/libexec/cups/backend/rprint script
3. Script reads print data from stdin or file
4. Uploads PDF/document to RPrint server via API
5. RPrint server routes to your remote printer


FILES INCLUDED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

install.sh .......... Main installer (run with sudo)
auto-update.sh ...... Auto-update script (downloads & installs latest)
rprint-backend ...... CUPS backend script (pre-configured)
rprint-test ......... Comprehensive diagnostic tests
rprint-fix .......... Fix permissions and configuration
uninstall.sh ........ Uninstaller
mac.pdf ............. Test PDF file for testing prints
VERSION ............. Version information and MD5 hash
README.txt .......... This file


WHAT'S NEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Pre-configured with embedded credentials
✓ Zero configuration installation
✓ Comprehensive diagnostic test script (rprint-test)
✓ Comprehensive fix script (rprint-fix)
✓ Handles stdin input for piped commands
✓ Generic PostScript PPD for maximum compatibility
✓ Install and immediately start printing


SECURITY NOTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This installer contains embedded authentication credentials specific
to your RPrint account. Keep this installer secure and do not share
it publicly.

If your token expires, download a new installer from:
   https://growingsoft.net/api-token

The new installer will have a fresh token.


SUPPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Logs: /var/log/cups/error_log
Backend: /usr/libexec/cups/backend/rprint
Test script: rprint-test
Fix script: sudo rprint-fix

For issues, run the diagnostic test first:
   rprint-test

If tests fail, run the fix script:
   sudo rprint-fix
