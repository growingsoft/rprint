# RPrint Complete Printing Fix
# This script fixes all common printing issues once and for all

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RPrint Complete Printing Fix" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"
$currentDir = Get-Location

# Step 1: Fix PowerShell Execution Policy
Write-Host "[1/5] Checking PowerShell execution policy..." -ForegroundColor Yellow
$policy = Get-ExecutionPolicy -Scope CurrentUser
if ($policy -eq "Restricted") {
    Write-Host "  Current policy: $policy (too restrictive)" -ForegroundColor Red
    Write-Host "  Setting execution policy for current user..." -ForegroundColor Yellow
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
    Write-Host "  ✓ Execution policy updated" -ForegroundColor Green
} else {
    Write-Host "  ✓ Execution policy is fine: $policy" -ForegroundColor Green
}
Write-Host ""

# Step 2: Download and install SumatraPDF in the right location
Write-Host "[2/5] Installing SumatraPDF..." -ForegroundColor Yellow

$sumatraUrl = "https://www.sumatrapdfreader.org/dl/rel/3.5.2/SumatraPDF-3.5.2-64.zip"
$sumatraZip = Join-Path $env:TEMP "SumatraPDF.zip"
$sumatraExtract = Join-Path $env:TEMP "SumatraPDF-extract"

# Download
Write-Host "  Downloading SumatraPDF..." -ForegroundColor Gray
Invoke-WebRequest -Uri $sumatraUrl -OutFile $sumatraZip -UseBasicParsing

# Extract
Write-Host "  Extracting..." -ForegroundColor Gray
Expand-Archive -Path $sumatraZip -DestinationPath $sumatraExtract -Force

# Find the exe
$sumatraExe = Get-ChildItem -Path $sumatraExtract -Filter "SumatraPDF.exe" -Recurse | Select-Object -First 1

if ($sumatraExe) {
    # Copy to multiple locations to ensure it's found

    # Location 1: Root of rprint directory
    Copy-Item $sumatraExe.FullName -Destination (Join-Path $currentDir "SumatraPDF.exe") -Force
    Write-Host "  ✓ Copied to: $currentDir\SumatraPDF.exe" -ForegroundColor Green

    # Location 2: pdf-to-printer dist folder (where it expects it)
    $pdfToPrinterDist = Join-Path $currentDir "node_modules\pdf-to-printer\dist"
    if (Test-Path $pdfToPrinterDist) {
        Copy-Item $sumatraExe.FullName -Destination (Join-Path $pdfToPrinterDist "SumatraPDF.exe") -Force
        Write-Host "  ✓ Copied to: $pdfToPrinterDist\SumatraPDF.exe" -ForegroundColor Green
    } else {
        Write-Host "  ! pdf-to-printer dist folder not found, skipping" -ForegroundColor Yellow
    }

    # Location 3: Add to system PATH (temporary for this session)
    $env:Path = "$currentDir;$env:Path"
    Write-Host "  ✓ Added to PATH for this session" -ForegroundColor Green
} else {
    Write-Host "  ✗ Could not find SumatraPDF.exe in downloaded archive" -ForegroundColor Red
    exit 1
}

# Cleanup
Remove-Item $sumatraZip -Force -ErrorAction SilentlyContinue
Remove-Item $sumatraExtract -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""

# Step 3: Ensure dependencies are installed
Write-Host "[3/5] Checking dependencies..." -ForegroundColor Yellow
if (Test-Path "node_modules\pdf-to-printer") {
    Write-Host "  ✓ pdf-to-printer is installed" -ForegroundColor Green
} else {
    Write-Host "  Installing pdf-to-printer..." -ForegroundColor Gray
    & npm install pdf-to-printer@5.6.1
    Write-Host "  ✓ pdf-to-printer installed" -ForegroundColor Green
}
Write-Host ""

# Step 4: Verify Ghostscript
Write-Host "[4/5] Checking Ghostscript..." -ForegroundColor Yellow
try {
    $gsVersion = & gswin64c -version 2>&1 | Select-Object -First 1
    Write-Host "  ✓ Ghostscript: $gsVersion" -ForegroundColor Green
} catch {
    try {
        $gsVersion = & gswin32c -version 2>&1 | Select-Object -First 1
        Write-Host "  ✓ Ghostscript: $gsVersion" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Ghostscript not found" -ForegroundColor Red
        Write-Host "  Run: install-ghostscript.bat" -ForegroundColor Yellow
    }
}
Write-Host ""

# Step 5: Test printing
Write-Host "[5/5] Testing printing..." -ForegroundColor Yellow
Write-Host "  Running diagnostic..." -ForegroundColor Gray
Write-Host ""

try {
    & node diagnose.js
} catch {
    Write-Host "  Error running diagnostic: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "1. Restart the RPrint Windows Service" -ForegroundColor White
Write-Host "2. Try printing from the web" -ForegroundColor White
Write-Host ""
Write-Host "If printing still fails, create custom paper size:" -ForegroundColor Yellow
Write-Host "  Control Panel > Printers > Rollo Printer Properties" -ForegroundColor Gray
Write-Host "  Create paper size: 'Label_1.5x3' = 1.5 x 3 inches" -ForegroundColor Gray
Write-Host ""

Read-Host "Press Enter to exit"
