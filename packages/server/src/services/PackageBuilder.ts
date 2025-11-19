import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { ClientPackage } from '../models/ClientPackageModel';
import { ServerPackage } from '../models/ServerPackageModel';

export class PackageBuilder {
  private static TEMPLATE_DIR = path.join(__dirname, '../../templates');
  private static BUILD_DIR = path.join(__dirname, '../../builds');

  /**
   * Build a complete client package for virtual printer
   */
  static async buildClientPackage(
    pkg: ClientPackage,
    serverUrl: string
  ): Promise<string> {
    const buildId = `client-${pkg.id}-${Date.now()}`;
    const buildPath = path.join(this.BUILD_DIR, buildId);
    const zipPath = path.join(this.BUILD_DIR, `${buildId}.zip`);

    // Ensure build directory exists
    fs.mkdirSync(buildPath, { recursive: true });

    // Copy OS-specific template
    const templatePath = path.join(this.TEMPLATE_DIR, `virtual-printer-${pkg.operating_system}`);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found for ${pkg.operating_system}`);
    }

    // Copy all template files
    this.copyRecursive(templatePath, buildPath);

    // Generate configuration file
    const config = {
      RPRINT_SERVER_URL: serverUrl,
      RPRINT_AUTH_TOKEN: pkg.auth_token,
      RPRINT_DEFAULT_PRINTER_ID: pkg.default_printer_id || '',
      RPRINT_CLIENT_NAME: pkg.name,
      RPRINT_PACKAGE_ID: pkg.id,
      RPRINT_VERSION: pkg.version,
      RPRINT_AUTO_UPDATE_ENABLED: pkg.auto_update_enabled ? '1' : '0'
    };

    // Inject configuration based on OS
    if (pkg.operating_system === 'mac') {
      this.injectMacConfig(buildPath, config);
    } else if (pkg.operating_system === 'windows') {
      this.injectWindowsConfig(buildPath, config);
    } else if (pkg.operating_system === 'linux') {
      this.injectLinuxConfig(buildPath, config);
    }

    // Create ZIP archive
    await this.createZip(buildPath, zipPath);

    // Clean up build directory
    fs.rmSync(buildPath, { recursive: true, force: true });

    return zipPath;
  }

  /**
   * Build a complete server package for Windows worker
   */
  static async buildServerPackage(
    pkg: ServerPackage,
    serverUrl: string
  ): Promise<string> {
    const buildId = `server-${pkg.id}-${Date.now()}`;
    const buildPath = path.join(this.BUILD_DIR, buildId);
    const zipPath = path.join(this.BUILD_DIR, `${buildId}.zip`);

    // Ensure build directory exists
    fs.mkdirSync(buildPath, { recursive: true });

    // Copy Windows service template
    const templatePath = path.join(this.TEMPLATE_DIR, 'windows-service');

    if (!fs.existsSync(templatePath)) {
      throw new Error('Windows service template not found');
    }

    // Copy all template files
    this.copyRecursive(templatePath, buildPath);

    // Generate .env file with configuration
    const envContent = `# RPrint Windows Service Configuration
# Auto-generated for: ${pkg.name}

SERVER_URL=${serverUrl}
API_KEY=${pkg.api_key}
WORKER_ID=${pkg.worker_id}
WORKER_NAME=${pkg.name}
POLL_INTERVAL=5000

# Package configuration
PACKAGE_ID=${pkg.id}
VERSION=${pkg.version}
AUTO_UPDATE_ENABLED=${pkg.auto_update_enabled ? '1' : '0'}

# Selected printers (comma-separated)
${pkg.selected_printers ? `SELECTED_PRINTERS=${pkg.selected_printers}` : '# SELECTED_PRINTERS='}
`;

    fs.writeFileSync(path.join(buildPath, '.env'), envContent);

    // Create auto-update script
    const autoUpdateScript = this.generateWindowsAutoUpdateScript(serverUrl, pkg.id);
    fs.writeFileSync(path.join(buildPath, 'auto-update.ps1'), autoUpdateScript);

    // Make auto-update.bat
    const autoUpdateBat = `@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0auto-update.ps1"
pause
`;
    fs.writeFileSync(path.join(buildPath, 'auto-update.bat'), autoUpdateBat);

    // Create README
    const readme = this.generateServerReadme(pkg.name);
    fs.writeFileSync(path.join(buildPath, 'README.txt'), readme);

    // Create ZIP archive
    await this.createZip(buildPath, zipPath);

    // Clean up build directory
    fs.rmSync(buildPath, { recursive: true, force: true });

    return zipPath;
  }

  /**
   * Inject configuration into Mac backend script
   */
  private static injectMacConfig(buildPath: string, config: Record<string, string>): void {
    const backendPath = path.join(buildPath, 'rprint-backend');

    if (!fs.existsSync(backendPath)) {
      throw new Error('Mac backend script not found');
    }

    let content = fs.readFileSync(backendPath, 'utf-8');

    // Replace placeholders
    content = content.replace(/RPRINT_SERVER_URL="[^"]*"/, `RPRINT_SERVER_URL="${config.RPRINT_SERVER_URL}"`);
    content = content.replace(/RPRINT_AUTH_TOKEN="[^"]*"/, `RPRINT_AUTH_TOKEN="${config.RPRINT_AUTH_TOKEN}"`);
    content = content.replace(/RPRINT_DEFAULT_PRINTER_ID="[^"]*"/, `RPRINT_DEFAULT_PRINTER_ID="${config.RPRINT_DEFAULT_PRINTER_ID}"`);

    fs.writeFileSync(backendPath, content);

    // Update auto-update script
    const autoUpdatePath = path.join(buildPath, 'auto-update.sh');
    if (fs.existsSync(autoUpdatePath)) {
      let autoUpdate = fs.readFileSync(autoUpdatePath, 'utf-8');
      autoUpdate = autoUpdate.replace(
        /DOWNLOAD_URL="[^"]*"/,
        `DOWNLOAD_URL="${config.RPRINT_SERVER_URL}/api/packages/client/${config.RPRINT_PACKAGE_ID}/download"`
      );
      fs.writeFileSync(autoUpdatePath, autoUpdate);
    }

    // Update VERSION file
    const versionPath = path.join(buildPath, 'VERSION');
    if (fs.existsSync(versionPath)) {
      const versionContent = `╔═══════════════════════════════════════════════════════════════╗
║          RPrint Virtual Printer for macOS                     ║
║                    Version Information                        ║
╚═══════════════════════════════════════════════════════════════╝

Version: ${config.RPRINT_VERSION}
Build Date: ${new Date().toISOString().split('T')[0]}
Client Name: ${config.RPRINT_CLIENT_NAME}
Package ID: ${config.RPRINT_PACKAGE_ID}

COMPLETE ZERO-CONFIGURATION PACKAGE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Pre-configured with all credentials
✓ No manual setup required
✓ Auto-update enabled
✓ Just run: sudo ./install.sh

USAGE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Install:
  sudo ./install.sh

Update:
  sudo ./auto-update.sh

Test:
  sudo rprint-test

Fix issues:
  sudo rprint-fix
`;
      fs.writeFileSync(versionPath, versionContent);
    }
  }

  /**
   * Inject configuration into Windows package
   */
  private static injectWindowsConfig(buildPath: string, config: Record<string, string>): void {
    // Windows virtual printer configuration would go here
    // For now, this is a placeholder for future Windows client support
  }

  /**
   * Inject configuration into Linux package
   */
  private static injectLinuxConfig(buildPath: string, config: Record<string, string>): void {
    // Linux virtual printer configuration would go here
    // For now, this is a placeholder for future Linux client support
  }

  /**
   * Generate Windows auto-update PowerShell script
   */
  private static generateWindowsAutoUpdateScript(serverUrl: string, packageId: string): string {
    // Using single quotes in PowerShell to avoid escaping issues
    const script = [
      '# RPrint Windows Service Auto-Update Script',
      '# Version: 1.0.1',
      '',
      '$ErrorActionPreference = "Stop"',
      '',
      'Write-Host "=========================================" -ForegroundColor Cyan',
      'Write-Host "  RPrint Windows Service Auto-Update    " -ForegroundColor Cyan',
      'Write-Host "=========================================" -ForegroundColor Cyan',
      'Write-Host ""',
      '',
      '# Check if running as administrator',
      '$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)',
      'if (-not $isAdmin) {',
      '    Write-Host "ERROR: Must run as Administrator" -ForegroundColor Red',
      '    exit 1',
      '}',
      '',
      '# Configuration',
      `$DownloadUrl = "${serverUrl}/api/packages/server/${packageId}/download"`,
      '$TempZip = "$env:TEMP\\rprint-update.zip"',
      '$TempExtract = "$env:TEMP\\rprint-update"',
      '$InstallDir = $PSScriptRoot',
      '',
      'Write-Host "[1/7] Stopping service..." -ForegroundColor Yellow',
      '$service = Get-Service -Name "RPrintWorker" -ErrorAction SilentlyContinue',
      'if ($service) {',
      '    if ($service.Status -eq "Running") {',
      '        Stop-Service -Name "RPrintWorker" -Force',
      '        Start-Sleep -Seconds 2',
      '    }',
      '    sc.exe delete "RPrintWorker" | Out-Null',
      '    Write-Host "  OK - Service stopped" -ForegroundColor Green',
      '} else {',
      '    Write-Host "  OK - No service found" -ForegroundColor Yellow',
      '}',
      '',
      'Write-Host ""',
      'Write-Host "[2/7] Downloading update..." -ForegroundColor Yellow',
      'try {',
      '    Invoke-WebRequest -Uri $DownloadUrl -OutFile $TempZip -UseBasicParsing',
      '    Write-Host "  OK - Downloaded" -ForegroundColor Green',
      '} catch {',
      '    Write-Host "  ERROR: Download failed - $_" -ForegroundColor Red',
      '    exit 1',
      '}',
      '',
      'Write-Host ""',
      'Write-Host "[3/7] Extracting files..." -ForegroundColor Yellow',
      'if (Test-Path $TempExtract) {',
      '    Remove-Item -Path $TempExtract -Recurse -Force',
      '}',
      'Expand-Archive -Path $TempZip -DestinationPath $TempExtract -Force',
      'Write-Host "  OK - Extracted" -ForegroundColor Green',
      '',
      'Write-Host ""',
      'Write-Host "[4/7] Backing up config..." -ForegroundColor Yellow',
      'if (Test-Path "$InstallDir\\.env") {',
      '    Copy-Item -Path "$InstallDir\\.env" -Destination "$InstallDir\\.env.backup" -Force',
      '    Write-Host "  OK - Config backed up" -ForegroundColor Green',
      '}',
      '',
      'Write-Host ""',
      'Write-Host "[5/7] Installing files..." -ForegroundColor Yellow',
      '$sourcePath = $TempExtract',
      'Get-ChildItem -Path $sourcePath -Recurse | ForEach-Object {',
      '    $dest = $_.FullName.Replace($sourcePath, $InstallDir)',
      '    if ($_.PSIsContainer) {',
      '        if (-not (Test-Path $dest)) {',
      '            New-Item -ItemType Directory -Path $dest -Force | Out-Null',
      '        }',
      '    } elseif ($_.Name -ne ".env") {',
      '        Copy-Item -Path $_.FullName -Destination $dest -Force',
      '    }',
      '}',
      'Write-Host "  OK - Files installed" -ForegroundColor Green',
      '',
      'Write-Host ""',
      'Write-Host "[6/7] Installing service..." -ForegroundColor Yellow',
      'Set-Location $InstallDir',
      'if (Test-Path "$InstallDir\\INSTALL.ps1") {',
      '    & "$InstallDir\\INSTALL.ps1"',
      '} else {',
      '    npm run install-service',
      '}',
      'Write-Host "  OK - Service installed" -ForegroundColor Green',
      '',
      'Write-Host ""',
      'Write-Host "[7/7] Cleaning up..." -ForegroundColor Yellow',
      'Remove-Item -Path $TempZip -Force -ErrorAction SilentlyContinue',
      'Remove-Item -Path $TempExtract -Recurse -Force -ErrorAction SilentlyContinue',
      'Write-Host "  OK - Cleanup done" -ForegroundColor Green',
      '',
      'Write-Host ""',
      'Write-Host "=========================================" -ForegroundColor Green',
      'Write-Host "  Update Complete!                      " -ForegroundColor Green',
      'Write-Host "=========================================" -ForegroundColor Green',
      'Write-Host ""',
      'Write-Host "Service has been updated and restarted" -ForegroundColor Cyan',
      'Write-Host ""'
    ].join('\n');

    return script;
  }

  /**
   * Generate server package README
   */
  private static generateServerReadme(name: string): string {
    return `RPrint Windows Service - ${name}
${'='.repeat(50)}

ZERO-CONFIGURATION PACKAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This package is pre-configured and ready to use.
No manual configuration required!

INSTALLATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Extract this ZIP to a permanent location
   Example: C:\\RPrint

2. Run the installer as Administrator:
   - Right-click INSTALL.bat
   - Select "Run as administrator"

3. Done! The service will start automatically.

AUTO-UPDATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To update to the latest version:

1. Right-click auto-update.bat
2. Select "Run as administrator"

The update will:
- Stop the service
- Download latest version
- Replace all files
- Reinstall the service
- Start the service

Your configuration is preserved during updates.

TROUBLESHOOTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Check service status:
  Get-Service -Name "RPrintWorker"

View logs:
  Check the 'logs' directory

Manually reinstall:
  1. Right-click INSTALL.bat
  2. Run as Administrator

For more help, see TROUBLESHOOTING.md
`;
  }

  /**
   * Copy directory recursively
   */
  private static copyRecursive(src: string, dest: string): void {
    if (!fs.existsSync(src)) {
      throw new Error(`Source directory does not exist: ${src}`);
    }

    fs.mkdirSync(dest, { recursive: true });

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Create ZIP archive
   */
  private static async createZip(sourceDir: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      output.on('close', () => resolve());
      archive.on('error', (err) => reject(err));

      archive.pipe(output);
      // Put files in 'mac' subdirectory for auto-update compatibility
      archive.directory(sourceDir, 'mac');
      archive.finalize();
    });
  }

  /**
   * Clean up old build files
   */
  static cleanupOldBuilds(maxAgeHours: number = 24): void {
    if (!fs.existsSync(this.BUILD_DIR)) return;

    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000;

    const files = fs.readdirSync(this.BUILD_DIR);
    for (const file of files) {
      const filePath = path.join(this.BUILD_DIR, file);
      const stats = fs.statSync(filePath);

      if (now - stats.mtimeMs > maxAge) {
        fs.rmSync(filePath, { recursive: true, force: true });
      }
    }
  }
}
