# Simple SumatraPDF Setup for RPrint
# Run this in PowerShell AS ADMINISTRATOR from the rprint directory

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RPrint SumatraPDF Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"
$currentDir = Get-Location

# Step 1: Download SumatraPDF
Write-Host "[1/3] Downloading SumatraPDF..." -ForegroundColor Yellow
$sumatraUrl = "https://www.sumatrapdfreader.org/dl/rel/3.5.2/SumatraPDF-3.5.2-64.zip"
$sumatraZip = Join-Path $env:TEMP "SumatraPDF.zip"
$sumatraExtract = Join-Path $env:TEMP "SumatraPDF-extract"

try {
    Invoke-WebRequest -Uri $sumatraUrl -OutFile $sumatraZip -UseBasicParsing
    Write-Host "  Download complete" -ForegroundColor Green
} catch {
    Write-Host "  Download failed: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Extract
Write-Host "[2/3] Extracting..." -ForegroundColor Yellow
if (Test-Path $sumatraExtract) {
    Remove-Item $sumatraExtract -Recurse -Force
}
Expand-Archive -Path $sumatraZip -DestinationPath $sumatraExtract -Force

# Find the exe
$sumatraExe = Get-ChildItem -Path $sumatraExtract -Filter "SumatraPDF.exe" -Recurse | Select-Object -First 1

if (-not $sumatraExe) {
    Write-Host "  Could not find SumatraPDF.exe in archive" -ForegroundColor Red
    exit 1
}

# Step 3: Copy to required locations
Write-Host "[3/3] Installing SumatraPDF..." -ForegroundColor Yellow

# Location 1: Root directory
Copy-Item $sumatraExe.FullName -Destination (Join-Path $currentDir "SumatraPDF.exe") -Force
Write-Host "  Copied to: $currentDir\SumatraPDF.exe" -ForegroundColor Green

# Location 2: pdf-to-printer dist folder
$pdfToPrinterDist = Join-Path $currentDir "node_modules\pdf-to-printer\dist"
if (Test-Path $pdfToPrinterDist) {
    Copy-Item $sumatraExe.FullName -Destination (Join-Path $pdfToPrinterDist "SumatraPDF.exe") -Force
    Write-Host "  Copied to: $pdfToPrinterDist\SumatraPDF.exe" -ForegroundColor Green
} else {
    Write-Host "  Warning: pdf-to-printer dist folder not found" -ForegroundColor Yellow
    Write-Host "  Run 'npm install' first, then run this script again" -ForegroundColor Yellow
}

# Cleanup
Remove-Item $sumatraZip -Force -ErrorAction SilentlyContinue
Remove-Item $sumatraExtract -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "1. Restart RPrint service" -ForegroundColor White
Write-Host "2. Try printing from the web" -ForegroundColor White
Write-Host ""
