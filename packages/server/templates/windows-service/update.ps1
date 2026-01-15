# RPrint Windows Service Update Script
# Downloads latest version from growingsoft.net and updates
# Run as Administrator: Right-click > Run as Administrator

$ErrorActionPreference = "Stop"
$serviceName = "RPrintWorker"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RPrint Windows Service Updater" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to script directory
Set-Location $scriptDir
Write-Host "Working directory: $scriptDir" -ForegroundColor Gray

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Must run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click UPDATE.bat and select 'Run as administrator'" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Read configuration from .env file
$envFile = Join-Path $scriptDir ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "Make sure you have a .env file with PACKAGE_ID and SERVER_URL" -ForegroundColor Yellow
    exit 1
}

$config = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
        $config[$matches[1].Trim()] = $matches[2].Trim()
    }
}

$serverUrl = $config["SERVER_URL"]
$packageId = $config["PACKAGE_ID"]

if (-not $serverUrl) {
    Write-Host "ERROR: SERVER_URL not found in .env" -ForegroundColor Red
    exit 1
}

if (-not $packageId) {
    Write-Host "ERROR: PACKAGE_ID not found in .env" -ForegroundColor Red
    Write-Host "Your package was created before auto-update was added." -ForegroundColor Yellow
    Write-Host "Please download a fresh package from the admin panel." -ForegroundColor Yellow
    exit 1
}

$downloadUrl = "$serverUrl/api/packages/server/$packageId/download"
Write-Host "Server: $serverUrl" -ForegroundColor Gray
Write-Host "Package ID: $packageId" -ForegroundColor Gray
Write-Host ""

# Temporary paths
$tempZip = "$env:TEMP\rprint-update.zip"
$tempExtract = "$env:TEMP\rprint-update"

# Step 1: Stop the service
Write-Host "[1/6] Stopping service..." -ForegroundColor Yellow
try {
    $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if ($service -and $service.Status -eq "Running") {
        Stop-Service -Name $serviceName -Force
        Start-Sleep -Seconds 2
        Write-Host "  Service stopped." -ForegroundColor Green
    } else {
        Write-Host "  Service not running." -ForegroundColor Gray
    }
} catch {
    Write-Host "  Could not stop service (may not be installed)." -ForegroundColor Gray
}

# Step 2: Download update
Write-Host "[2/6] Downloading from $serverUrl..." -ForegroundColor Yellow
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $downloadUrl -OutFile $tempZip -UseBasicParsing
    Write-Host "  Downloaded successfully." -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Download failed!" -ForegroundColor Red
    Write-Host "  $_" -ForegroundColor Red
    exit 1
}

# Step 3: Extract files
Write-Host "[3/6] Extracting update..." -ForegroundColor Yellow
if (Test-Path $tempExtract) {
    Remove-Item -Path $tempExtract -Recurse -Force
}
Expand-Archive -Path $tempZip -DestinationPath $tempExtract -Force
Write-Host "  Extracted." -ForegroundColor Green

# Step 4: Backup current .env
Write-Host "[4/6] Backing up configuration..." -ForegroundColor Yellow
$envBackup = "$scriptDir\.env.backup"
if (Test-Path $envFile) {
    Copy-Item -Path $envFile -Destination $envBackup -Force
    Write-Host "  Config backed up to .env.backup" -ForegroundColor Green
}

# Step 5: Copy new files (preserve .env)
Write-Host "[5/6] Installing new files..." -ForegroundColor Yellow
$sourceDir = $tempExtract
# Check if files are in a subdirectory
$subDirs = Get-ChildItem -Path $tempExtract -Directory
if ($subDirs.Count -eq 1) {
    $sourceDir = $subDirs[0].FullName
}

Get-ChildItem -Path $sourceDir -Recurse | ForEach-Object {
    $relativePath = $_.FullName.Substring($sourceDir.Length)
    $destPath = Join-Path $scriptDir $relativePath

    if ($_.PSIsContainer) {
        if (-not (Test-Path $destPath)) {
            New-Item -ItemType Directory -Path $destPath -Force | Out-Null
        }
    } elseif ($_.Name -ne ".env") {
        # Don't overwrite .env - keep user's config
        $destDir = Split-Path -Parent $destPath
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        Copy-Item -Path $_.FullName -Destination $destPath -Force
    }
}
Write-Host "  Files updated." -ForegroundColor Green

# Step 6: Restart service
Write-Host "[6/6] Starting service..." -ForegroundColor Yellow
try {
    # Check if install script exists and run it
    $installScript = Join-Path $scriptDir "INSTALL.ps1"
    if (Test-Path $installScript) {
        & $installScript
    } else {
        # Fallback: try npm
        npm run install-service 2>$null
    }

    Start-Sleep -Seconds 2
    $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if ($service -and $service.Status -eq "Running") {
        Write-Host "  Service started." -ForegroundColor Green
    } else {
        Write-Host "  Service installed. Starting..." -ForegroundColor Yellow
        Start-Service -Name $serviceName -ErrorAction SilentlyContinue
    }
} catch {
    Write-Host "  Warning: Could not auto-start service." -ForegroundColor Yellow
    Write-Host "  Run INSTALL.bat manually to install the service." -ForegroundColor Yellow
}

# Cleanup
Write-Host ""
Write-Host "Cleaning up..." -ForegroundColor Gray
Remove-Item -Path $tempZip -Force -ErrorAction SilentlyContinue
Remove-Item -Path $tempExtract -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Update Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
