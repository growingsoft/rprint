RPrint Virtual Printer Installer
=================================

Thank you for downloading RPrint Virtual Printer!

This installer allows you to print from ANY application on your computer
(Word, Excel, Chrome, etc.) directly to your RPrint remote printers.

PREREQUISITES:
--------------

IMPORTANT: You must have Node.js installed first!

Download Node.js from: https://nodejs.org/
- Choose the LTS (Long Term Support) version
- Run the installer and follow the prompts
- After installation, restart your computer

INSTALLATION INSTRUCTIONS:
--------------------------

Windows:
1. Make sure Node.js is installed (see PREREQUISITES above)
2. Extract the ZIP file to a folder
3. Right-click "install.bat" (or "install-windows.bat")
4. Select "Run as Administrator"
5. The installer will:
   - Check for Node.js
   - Install npm dependencies
   - Create the virtual printer
   - Set up the background service
6. Follow the on-screen prompts
7. Configure your RPrint server URL and credentials when prompted

Mac:
1. Make sure Node.js is installed (see PREREQUISITES above)
2. Extract the ZIP file to a folder
3. Open Terminal
4. Navigate to this folder: cd /path/to/extracted/folder
5. Run: sudo ./install.sh (or sudo ./install-mac.sh)
6. Follow the on-screen prompts
7. Configure your RPrint server URL and credentials when prompted

AFTER INSTALLATION:
-------------------

1. Open any application (Word, Excel, Chrome, etc.)
2. Go to Print (Ctrl+P / Cmd+P)
3. Select "RPrint Virtual Printer" from the printer list
4. Print!

Windows: Save the PDF to C:\Users\YourName\RPrint\PrintQueue\
Mac: Files are automatically saved

The background service will detect and upload your print jobs automatically!

CONFIGURATION:
--------------

Edit the configuration file:
Windows: C:\Program Files\RPrint\VirtualPrinter\.env
Mac: /Applications/RPrint Virtual Printer/.env

Required settings:
- SERVER_URL: Your RPrint server URL (e.g., https://growingsoft.net)
- RPRINT_USERNAME: Your RPrint username
- RPRINT_PASSWORD: Your RPrint password

Optional settings:
- WATCH_FOLDER: Custom folder for print queue
- PRINTER_NAME: Default target printer name

TROUBLESHOOTING:
----------------

Windows:
- Make sure you ran the installer as Administrator
- Check that the service is running in Services (services.msc)
- Verify your credentials in the .env file

Mac:
- Make sure you ran the installer with sudo
- Check service status: launchctl list | grep rprint
- View logs: tail -f ~/Library/Logs/rprint-virtual-printer.log

Both:
- Ensure your RPrint server is accessible
- Verify your username/password are correct
- Check that printers are available on the server

UNINSTALLATION:
---------------

Windows:
1. Run: sc stop "RPrint Virtual Printer"
2. Run: sc delete "RPrint Virtual Printer"
3. Remove printer from Printers & Scanners
4. Delete: C:\Program Files\RPrint\

Mac:
1. Run: launchctl unload ~/Library/LaunchAgents/com.rprint.virtualprinter.plist
2. Run: sudo lpadmin -x "RPrint Virtual Printer"
3. Delete: /Applications/RPrint Virtual Printer/
4. Delete: ~/Library/LaunchAgents/com.rprint.virtualprinter.plist

SUPPORT:
--------

For help and documentation, visit:
https://github.com/growingsoft/rprint

Happy printing!
