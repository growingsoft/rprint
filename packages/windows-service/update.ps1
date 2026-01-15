# RPrint Windows Service Update Script
# Run as Administrator: Right-click > Run as Administrator
# Or from PowerShell: powershell -ExecutionPolicy Bypass -File update.ps1

$ErrorActionPreference = "Stop"
$serviceName = "RPrintService"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RPrint Windows Service Updater" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to script directory
Set-Location $scriptDir
Write-Host "[1/6] Working directory: $scriptDir" -ForegroundColor Yellow

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "WARNING: Not running as Administrator. Service restart may fail." -ForegroundColor Red
    Write-Host "Re-run this script as Administrator for full functionality." -ForegroundColor Red
    Write-Host ""
}

# Stop the service if it's running
Write-Host "[2/6] Stopping service..." -ForegroundColor Yellow
try {
    $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if ($service -and $service.Status -eq "Running") {
        Stop-Service -Name $serviceName -Force
        Write-Host "  Service stopped." -ForegroundColor Green
    } else {
        Write-Host "  Service not running or not installed." -ForegroundColor Gray
    }
} catch {
    Write-Host "  Could not stop service (may not be installed yet)." -ForegroundColor Gray
}

# Pull latest code
Write-Host "[3/6] Pulling latest code from git..." -ForegroundColor Yellow
Set-Location (Split-Path -Parent (Split-Path -Parent $scriptDir))  # Go to repo root
git pull origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Git pull failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  Code updated." -ForegroundColor Green

# Install dependencies
Write-Host "[4/6] Installing dependencies..." -ForegroundColor Yellow
Set-Location $scriptDir
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  npm install failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  Dependencies installed." -ForegroundColor Green

# Build
Write-Host "[5/6] Building..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  Build complete." -ForegroundColor Green

# Start the service
Write-Host "[6/6] Starting service..." -ForegroundColor Yellow
try {
    $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if ($service) {
        Start-Service -Name $serviceName
        Write-Host "  Service started." -ForegroundColor Green
    } else {
        Write-Host "  Service not installed. Run 'npm run install-service' as Administrator to install." -ForegroundColor Yellow
    }
} catch {
    Write-Host "  Could not start service. You may need to run as Administrator." -ForegroundColor Red
    Write-Host "  Or start manually: net start $serviceName" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Update complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
