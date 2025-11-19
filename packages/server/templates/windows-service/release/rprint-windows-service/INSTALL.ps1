# RPrint Windows Service Installation Script
# Run this in PowerShell as Administrator

Write-Host "================================" -ForegroundColor Cyan
Write-Host "RPrint Windows Service Installer" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host ""
    Write-Host "Creating .env configuration file..." -ForegroundColor Yellow

    # Prompt for configuration
    $serverUrl = Read-Host "Enter your server URL (e.g. https://growingsoft.net)"
    $apiKey = Read-Host "Enter your API key (from server registration)"
    $workerName = Read-Host "Enter a name for this worker (e.g. Office-Printer)"

    # Create .env file content
    $envContent = @"
SERVER_URL=$serverUrl
API_KEY=$apiKey
WORKER_NAME=$workerName
POLL_INTERVAL=5000
LOG_LEVEL=info
"@

    # Write to file
    $envContent | Out-File -FilePath ".env" -Encoding ASCII

    Write-Host "[OK] Configuration file created" -ForegroundColor Green
} else {
    Write-Host "[OK] Configuration file (.env) already exists" -ForegroundColor Green
}

# Install dependencies
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Failed to install dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] Dependencies installed" -ForegroundColor Green

# Build the project
Write-Host ""
Write-Host "Building the service..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Build failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] Build completed" -ForegroundColor Green

# Ask if user wants to test first
Write-Host ""
$test = Read-Host "Do you want to test the service before installing? (y/n)"
if ($test -eq "y") {
    Write-Host ""
    Write-Host "Starting test mode... Press Ctrl+C to stop" -ForegroundColor Cyan
    Write-Host ""
    npm run dev
}

# Install as Windows service
Write-Host ""
$install = Read-Host "Do you want to install as a Windows service? (y/n)"
if ($install -eq "y") {
    Write-Host ""
    Write-Host "Installing Windows service..." -ForegroundColor Yellow
    npm run install-service
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[FAIL] Service installation failed" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "[OK] Service installed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "The service 'RPrint Windows Service' is now running." -ForegroundColor Green
    Write-Host "It will start automatically when Windows boots." -ForegroundColor Green
    Write-Host ""
    Write-Host "To view service status:" -ForegroundColor Cyan
    Write-Host "  - Open Services (services.msc)" -ForegroundColor White
    Write-Host "  - Look for 'RPrint Windows Service'" -ForegroundColor White
    Write-Host ""
    Write-Host "To view logs:" -ForegroundColor Cyan
    Write-Host "  - Check the logs\ folder in this directory" -ForegroundColor White
}

Write-Host ""
Write-Host "Installation complete!" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to exit"
