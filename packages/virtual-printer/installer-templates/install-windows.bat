@echo off
REM RPrint Virtual Printer Installer for Windows
REM This script must be run as Administrator

echo ============================================
echo RPrint Virtual Printer Installer
echo ============================================
echo.

REM Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator!
    echo Right-click and select "Run as Administrator"
    pause
    exit /b 1
)

echo Installing RPrint Virtual Printer...
echo.

REM Get installation directory
set INSTALL_DIR=%ProgramFiles%\RPrint\VirtualPrinter
set WATCH_FOLDER=%USERPROFILE%\RPrint\PrintQueue

echo Installation directory: %INSTALL_DIR%
echo Watch folder: %WATCH_FOLDER%
echo.

REM Create directories
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
if not exist "%WATCH_FOLDER%" mkdir "%WATCH_FOLDER%"

REM Copy files
echo Copying files...
xcopy /Y /Q rprint-monitor.exe "%INSTALL_DIR%\"
xcopy /Y /Q install-printer.exe "%INSTALL_DIR%\"
xcopy /Y /Q uninstall-printer.exe "%INSTALL_DIR%\"
xcopy /Y /Q .env.example "%INSTALL_DIR%\"

REM Install the printer
echo.
echo Installing virtual printer...
cd /d "%INSTALL_DIR%"
install-printer.exe

if %errorLevel% neq 0 (
    echo.
    echo ERROR: Failed to install printer
    pause
    exit /b 1
)

REM Create .env if it doesn't exist
if not exist "%INSTALL_DIR%\.env" (
    echo.
    echo Creating configuration file...
    copy .env.example .env
)

echo.
echo ============================================
echo IMPORTANT: Configure Your Credentials
echo ============================================
echo.
echo Please edit the configuration file:
echo %INSTALL_DIR%\.env
echo.
echo Set your RPrint server URL, username, and password
echo.
pause

REM Open .env in notepad
notepad "%INSTALL_DIR%\.env"

echo.
echo ============================================
echo Installing Background Service
echo ============================================
echo.

REM Create service installation script
echo Set objShell = CreateObject("WScript.Shell") > "%TEMP%\install-service.vbs"
echo objShell.CurrentDirectory = "%INSTALL_DIR%" >> "%TEMP%\install-service.vbs"
echo objShell.Run "sc create ""RPrint Virtual Printer"" binPath= ""%INSTALL_DIR%\rprint-monitor.exe"" start= auto", 0, True >> "%TEMP%\install-service.vbs"
echo objShell.Run "sc description ""RPrint Virtual Printer"" ""Monitors print queue and uploads to RPrint server""", 0, True >> "%TEMP%\install-service.vbs"
echo objShell.Run "sc start ""RPrint Virtual Printer""", 0, True >> "%TEMP%\install-service.vbs"

cscript //nologo "%TEMP%\install-service.vbs"
del "%TEMP%\install-service.vbs"

REM Alternative: use sc directly
sc create "RPrint Virtual Printer" binPath= "%INSTALL_DIR%\rprint-monitor.exe" start= auto
sc description "RPrint Virtual Printer" "Monitors print queue and uploads to RPrint server"
sc start "RPrint Virtual Printer"

echo.
echo ============================================
echo Installation Complete!
echo ============================================
echo.
echo The RPrint Virtual Printer has been installed and started.
echo.
echo To print:
echo 1. Open any application
echo 2. Go to Print (Ctrl+P)
echo 3. Select "RPrint Virtual Printer"
echo 4. Save the PDF to: %WATCH_FOLDER%
echo.
echo The background service will automatically upload your print jobs!
echo.
echo To manage the service:
echo - Open Services (services.msc)
echo - Look for "RPrint Virtual Printer"
echo.
pause
