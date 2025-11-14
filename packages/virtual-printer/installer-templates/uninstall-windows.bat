@echo off
REM RPrint Virtual Printer Uninstaller for Windows
REM This script must be run as Administrator

echo ============================================
echo RPrint Virtual Printer Uninstaller
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

set INSTALL_DIR=%ProgramFiles%\RPrint\VirtualPrinter
set WATCH_FOLDER=%USERPROFILE%\RPrint\PrintQueue

echo This will remove:
echo - RPrint Virtual Printer
echo - Background monitor service
echo - Installation files from: %INSTALL_DIR%
echo.
echo Watch folder (%WATCH_FOLDER%) will be kept in case you have files there.
echo.
set /p CONFIRM="Are you sure you want to uninstall? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo Uninstallation cancelled.
    pause
    exit /b 0
)

echo.
echo Uninstalling RPrint Virtual Printer...
echo.

REM Stop the monitor process
echo Stopping monitor process...
taskkill /IM node.exe /F >nul 2>&1

REM Remove scheduled task
echo Removing scheduled task...
schtasks /Delete /TN "RPrint Virtual Printer Monitor" /F >nul 2>&1

REM Remove the printer
echo Removing virtual printer...
powershell -ExecutionPolicy Bypass -Command "Remove-Printer -Name 'RPrint Virtual Printer' -ErrorAction SilentlyContinue"

REM Remove installation directory
echo Removing installation files...
if exist "%INSTALL_DIR%" (
    rd /s /q "%INSTALL_DIR%"
)

echo.
echo ============================================
echo Uninstallation Complete!
echo ============================================
echo.
echo RPrint Virtual Printer has been removed from your system.
echo.
echo Watch folder was kept: %WATCH_FOLDER%
echo You can manually delete it if you don't need it.
echo.
pause
