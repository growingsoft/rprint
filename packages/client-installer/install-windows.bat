@echo off
echo ========================================
echo RPrint Client Installer for Windows
echo ========================================
echo.

:: Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo This installer does not require administrator rights.
)

echo Installing RPrint Client...
echo.

:: Get the server URL (default to growingsoft.net)
set SERVER_URL=https://growingsoft.net

:: Create Start Menu shortcut
set SHORTCUT_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\RPrint.url
echo [InternetShortcut] > "%SHORTCUT_PATH%"
echo URL=%SERVER_URL% >> "%SHORTCUT_PATH%"
echo IconIndex=0 >> "%SHORTCUT_PATH%"

:: Create Desktop shortcut
set DESKTOP_SHORTCUT=%USERPROFILE%\Desktop\RPrint.url
echo [InternetShortcut] > "%DESKTOP_SHORTCUT%"
echo URL=%SERVER_URL% >> "%DESKTOP_SHORTCUT%"
echo IconIndex=0 >> "%DESKTOP_SHORTCUT%"

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo RPrint has been installed successfully!
echo.
echo You can now:
echo  - Click the RPrint icon on your Desktop
echo  - Find RPrint in your Start Menu
echo.
echo Both will open RPrint in your default web browser.
echo.
echo Press any key to finish...
pause >nul
