@echo off
:: RPrint Windows Service Quick Installer
:: This script will launch PowerShell with administrator privileges

echo ================================
echo RPrint Windows Service Installer
echo ================================
echo.

:: Check for admin privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running with administrator privileges...
    echo.
    powershell -ExecutionPolicy Bypass -File "%~dp0INSTALL.ps1"
) else (
    echo This installer needs administrator privileges.
    echo Requesting elevation...
    echo.
    powershell -Command "Start-Process PowerShell -ArgumentList '-ExecutionPolicy Bypass -File \"%~dp0INSTALL.ps1\"' -Verb RunAs"
)

pause
