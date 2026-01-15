@echo off
:: RPrint Windows Service Updater
:: Double-click to run, will request Administrator privileges

:: Check for admin rights and request if needed
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting Administrator privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: Run the PowerShell update script
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0update.ps1"
