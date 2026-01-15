# Ghostscript Installer for RPrint
# This script checks for and installs Ghostscript

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Ghostscript Installer for RPrint" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click and select 'Run as Administrator'" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if Ghostscript is already installed
Write-Host "Checking for Ghostscript..." -ForegroundColor Yellow
$gsInstalled = $false
$gsVersion = ""

try {
    $gsVersion = gswin64c -version 2>$null
    if ($LASTEXITCODE -eq 0) {
        $gsInstalled = $true
    }
} catch {
    # Try alternate name
    try {
        $gsVersion = gswin32c -version 2>$null
        if ($LASTEXITCODE -eq 0) {
            $gsInstalled = $true
        }
    } catch {}
}

if ($gsInstalled) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Ghostscript is already installed!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Version: $gsVersion" -ForegroundColor White
    Write-Host ""
    Write-Host "No action needed. Your RPrint service should work correctly." -ForegroundColor Green
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 0
}

# Ghostscript not found - proceed with installation
Write-Host ""
Write-Host "Ghostscript is not installed on this system." -ForegroundColor Red
Write-Host ""
Write-Host "What is Ghostscript?" -ForegroundColor Cyan
Write-Host "  Ghostscript is a PostScript and PDF interpreter required by RPrint" -ForegroundColor White
Write-Host "  for proper printing of PDF files and images to label printers." -ForegroundColor White
Write-Host ""
Write-Host "Without Ghostscript:" -ForegroundColor Yellow
Write-Host "  - Print jobs will complete but nothing will print" -ForegroundColor White
Write-Host "  - PDF and image files cannot be processed" -ForegroundColor White
Write-Host "  - The Rollo and other label printers will not work" -ForegroundColor White
Write-Host ""

$install = Read-Host "Do you want to install Ghostscript now? (y/n)"

if ($install -ne "y") {
    Write-Host ""
    Write-Host "Installation cancelled." -ForegroundColor Yellow
    Write-Host "You can install Ghostscript later from:" -ForegroundColor White
    Write-Host "  https://ghostscript.com/releases/gsdnld.html" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 0
}

# Proceed with installation
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Downloading Ghostscript" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$gsUrl = "https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/gs10041/gs10.04.0-win64.exe"
$gsInstaller = "$env:TEMP\ghostscript-installer.exe"

Write-Host "Download URL: $gsUrl" -ForegroundColor Gray
Write-Host "Downloading to: $gsInstaller" -ForegroundColor Gray
Write-Host ""
Write-Host "Please wait, this may take a minute..." -ForegroundColor Yellow

try {
    # Download with progress
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $gsUrl -OutFile $gsInstaller -UseBasicParsing
    $ProgressPreference = 'Continue'

    Write-Host ""
    Write-Host "[OK] Download completed!" -ForegroundColor Green

    # Verify file exists and has size
    $fileInfo = Get-Item $gsInstaller
    if ($fileInfo.Length -lt 1MB) {
        throw "Downloaded file is too small (possibly corrupted)"
    }

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Installing Ghostscript" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "The Ghostscript installer will now open." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "IMPORTANT:" -ForegroundColor Red
    Write-Host "  1. Click through the installer prompts" -ForegroundColor White
    Write-Host "  2. Use the DEFAULT installation path" -ForegroundColor White
    Write-Host "  3. Accept all default settings" -ForegroundColor White
    Write-Host ""
    Write-Host "Launching installer..." -ForegroundColor Cyan
    Write-Host ""

    # Launch installer and wait for completion
    Start-Process -FilePath $gsInstaller -Wait

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Installation Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""

    # Clean up
    Write-Host "Cleaning up temporary files..." -ForegroundColor Gray
    Remove-Item $gsInstaller -ErrorAction SilentlyContinue

    # Verify installation
    Write-Host ""
    Write-Host "Verifying installation..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2

    try {
        $gsVersionNew = gswin64c -version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Ghostscript installed successfully!" -ForegroundColor Green
            Write-Host "Version: $gsVersionNew" -ForegroundColor White
        } else {
            throw "Verification failed"
        }
    } catch {
        Write-Host "[WARNING] Could not verify Ghostscript installation" -ForegroundColor Yellow
        Write-Host "You may need to restart your computer for changes to take effect" -ForegroundColor White
    }

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Next Steps" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Restart your RPrint Windows Service:" -ForegroundColor White
    Write-Host "   - Open Services (services.msc)" -ForegroundColor Gray
    Write-Host "   - Find 'RPrint Windows Service'" -ForegroundColor Gray
    Write-Host "   - Right-click > Restart" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   OR run in PowerShell as Admin:" -ForegroundColor White
    Write-Host "   sc stop RPrintService" -ForegroundColor Gray
    Write-Host "   sc start RPrintService" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Test printing to your Rollo printer" -ForegroundColor White
    Write-Host ""
    Write-Host "Your print jobs should now work correctly!" -ForegroundColor Green

} catch {
    Write-Host ""
    Write-Host "[ERROR] Failed to download or install Ghostscript" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "  Manual Installation Required" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please install Ghostscript manually:" -ForegroundColor White
    Write-Host ""
    Write-Host "1. Go to: https://ghostscript.com/releases/gsdnld.html" -ForegroundColor Cyan
    Write-Host "2. Download: Ghostscript 10.x for Windows (64-bit)" -ForegroundColor White
    Write-Host "3. Run the installer" -ForegroundColor White
    Write-Host "4. Use default settings" -ForegroundColor White
    Write-Host ""

    # Clean up
    if (Test-Path $gsInstaller) {
        Remove-Item $gsInstaller -ErrorAction SilentlyContinue
    }
}

Write-Host ""
Read-Host "Press Enter to exit"
