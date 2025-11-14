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

REM Get current directory (where the ZIP was extracted)
set CURRENT_DIR=%~dp0
set INSTALL_DIR=%ProgramFiles%\RPrint\VirtualPrinter
set WATCH_FOLDER=%USERPROFILE%\RPrint\PrintQueue

echo Source directory: %CURRENT_DIR%
echo Installation directory: %INSTALL_DIR%
echo Watch folder: %WATCH_FOLDER%
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo.
    echo Please install Node.js from https://nodejs.org/
    echo Download the LTS version and run the installer.
    echo After installing Node.js, run this script again.
    pause
    exit /b 1
)

echo Node.js found:
node --version
echo.

REM Create directories
echo Creating directories...
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
if not exist "%WATCH_FOLDER%" mkdir "%WATCH_FOLDER%"

REM Copy all files
echo Copying files...
xcopy /E /Y /Q "%CURRENT_DIR%*" "%INSTALL_DIR%\"

REM Navigate to install directory
cd /d "%INSTALL_DIR%"

REM Install npm dependencies if not already present
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %errorLevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Install the printer using PowerShell
echo.
echo Installing virtual printer...
powershell -ExecutionPolicy Bypass -Command "node dist/install-printer.js"

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
echo Press any key to edit configuration...
pause >nul

REM Open .env in notepad
notepad "%INSTALL_DIR%\.env"

echo.
echo Waiting for you to save the .env file...
echo Press any key after saving...
pause >nul

echo.
echo ============================================
echo Installing Background Service
echo ============================================
echo.

REM Install as Windows service using node-windows
echo Installing monitor service...
powershell -ExecutionPolicy Bypass -Command "node dist/install-service.js"

if %errorLevel% neq 0 (
    echo.
    echo WARNING: Service installation may have failed
    echo You can run the monitor manually with: node dist/index.js
    echo.
)

echo.
echo ============================================
echo Installation Complete!
echo ============================================
echo.
echo The RPrint Virtual Printer has been installed.
echo.
echo To print:
echo 1. Open any application (Word, Excel, Chrome, etc.)
echo 2. Go to Print (Ctrl+P)
echo 3. Select "RPrint Virtual Printer"
echo 4. Save the PDF to: %WATCH_FOLDER%
echo.
echo The background service will automatically upload your print jobs!
echo.
echo To manage the service:
echo - Open Services (services.msc)
echo - Look for "RPrint Virtual Printer Monitor"
echo.
echo Installation directory: %INSTALL_DIR%
echo.
pause
