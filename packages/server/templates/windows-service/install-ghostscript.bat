@echo off
:: Ghostscript Installer for RPrint
:: This script will install Ghostscript which is required for proper printing

echo ========================================
echo   Ghostscript Installer for RPrint
echo ========================================
echo.

:: Check for admin privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running with administrator privileges...
    echo.
    powershell -ExecutionPolicy Bypass -File "%~dp0install-ghostscript.ps1"
) else (
    echo This installer needs administrator privileges.
    echo Requesting elevation...
    echo.
    powershell -Command "Start-Process PowerShell -ArgumentList '-ExecutionPolicy Bypass -File \"%~dp0install-ghostscript.ps1\"' -Verb RunAs"
)

pause
