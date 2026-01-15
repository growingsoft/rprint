@echo off
:: RPrint Complete Printing Fix
:: Run this to fix all printing issues

echo ========================================
echo   RPrint Complete Printing Fix
echo ========================================
echo.
echo This will:
echo  1. Fix PowerShell execution policy
echo  2. Install SumatraPDF in the correct location
echo  3. Verify all dependencies
echo  4. Test the setup
echo.

:: Check for admin privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running with administrator privileges...
    echo.
    powershell -ExecutionPolicy Bypass -File "%~dp0fix-printing.ps1"
) else (
    echo Requesting administrator privileges...
    echo.
    powershell -Command "Start-Process PowerShell -ArgumentList '-ExecutionPolicy Bypass -File \"%~dp0fix-printing.ps1\"' -Verb RunAs"
)
