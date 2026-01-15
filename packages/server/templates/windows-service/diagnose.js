// RPrint Diagnostic Tool
// Checks if everything is set up correctly

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('========================================');
console.log('  RPrint Diagnostic Tool');
console.log('========================================');
console.log('');

let issuesFound = 0;

// Check 1: Node.js version
console.log('[1/6] Checking Node.js version...');
console.log('  ✓ Node.js:', process.version);
console.log('');

// Check 2: Check if we're in the right directory
console.log('[2/6] Checking current directory...');
console.log('  Current directory:', __dirname);
if (fs.existsSync(path.join(__dirname, 'package.json'))) {
  console.log('  ✓ package.json found');
} else {
  console.log('  ✗ package.json NOT found - are you in the right directory?');
  issuesFound++;
}
console.log('');

// Check 3: Check if node_modules exists
console.log('[3/6] Checking dependencies...');
if (fs.existsSync(path.join(__dirname, 'node_modules'))) {
  console.log('  ✓ node_modules folder exists');

  // Check for pdf-to-printer
  if (fs.existsSync(path.join(__dirname, 'node_modules', 'pdf-to-printer'))) {
    console.log('  ✓ pdf-to-printer is installed');

    // Check version
    try {
      const pkgJson = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'node_modules', 'pdf-to-printer', 'package.json'), 'utf8')
      );
      console.log('  ✓ pdf-to-printer version:', pkgJson.version);
    } catch (e) {
      console.log('  ⚠ Could not read pdf-to-printer version');
    }
  } else {
    console.log('  ✗ pdf-to-printer is NOT installed');
    console.log('  Run: npm install');
    issuesFound++;
  }
} else {
  console.log('  ✗ node_modules folder NOT found');
  console.log('  Run: npm install');
  issuesFound++;
}
console.log('');

// Check 4: Check for SumatraPDF
console.log('[4/6] Checking for SumatraPDF...');
let sumatraFound = false;

// Check in common locations
const sumatraLocations = [
  path.join(__dirname, 'SumatraPDF.exe'),
  path.join(__dirname, 'bin', 'SumatraPDF.exe'),
  'C:\\Program Files\\SumatraPDF\\SumatraPDF.exe',
  'C:\\Program Files (x86)\\SumatraPDF\\SumatraPDF.exe',
];

for (const location of sumatraLocations) {
  if (fs.existsSync(location)) {
    console.log('  ✓ Found SumatraPDF at:', location);
    sumatraFound = true;
    break;
  }
}

if (!sumatraFound) {
  // Try to find in PATH
  try {
    execSync('where SumatraPDF.exe', { stdio: 'pipe' });
    console.log('  ✓ SumatraPDF found in system PATH');
    sumatraFound = true;
  } catch (e) {
    console.log('  ✗ SumatraPDF NOT found');
    console.log('');
    console.log('  SumatraPDF is required for printing.');
    console.log('  Download from: https://www.sumatrapdfreader.org/download-free-pdf-viewer');
    console.log('  Or it should be included in node_modules/pdf-to-printer/dist/');
    issuesFound++;
  }
}
console.log('');

// Check 5: Check Ghostscript
console.log('[5/6] Checking for Ghostscript...');
try {
  const gsOutput = execSync('gswin64c -version', { encoding: 'utf8' });
  console.log('  ✓ Ghostscript is installed:', gsOutput.trim());
} catch (e) {
  try {
    const gsOutput = execSync('gswin32c -version', { encoding: 'utf8' });
    console.log('  ✓ Ghostscript is installed:', gsOutput.trim());
  } catch (e2) {
    console.log('  ✗ Ghostscript NOT found');
    console.log('  Run: install-ghostscript.bat');
    issuesFound++;
  }
}
console.log('');

// Check 6: List Windows printers using PowerShell
console.log('[6/6] Checking Windows printers...');
try {
  const printers = execSync('powershell -Command "Get-Printer | Select-Object Name, PrinterStatus | ConvertTo-Json"', {
    encoding: 'utf8'
  });

  const printerList = JSON.parse(printers);
  const printerArray = Array.isArray(printerList) ? printerList : [printerList];

  console.log(`  ✓ Found ${printerArray.length} printer(s):`);
  printerArray.forEach((printer, index) => {
    console.log(`    ${index + 1}. ${printer.Name} (Status: ${printer.PrinterStatus || 'Unknown'})`);
    if (printer.Name.toLowerCase().includes('rollo')) {
      console.log('       ✓ This is the Rollo printer!');
    }
  });
} catch (e) {
  console.log('  ✗ Could not list printers');
  console.log('  Error:', e.message);
  issuesFound++;
}
console.log('');

// Summary
console.log('========================================');
if (issuesFound === 0) {
  console.log('  ✓ All checks passed!');
  console.log('========================================');
  console.log('');
  console.log('Setup looks good. The issue might be:');
  console.log('');
  console.log('1. pdf-to-printer version compatibility');
  console.log('   Try: npm install pdf-to-printer@latest');
  console.log('');
  console.log('2. Missing SumatraPDF in pdf-to-printer package');
  console.log('   The package should include SumatraPDF');
  console.log('   Check: node_modules\\pdf-to-printer\\dist\\');
  console.log('');
  console.log('3. Run this to reinstall:');
  console.log('   npm uninstall pdf-to-printer');
  console.log('   npm install pdf-to-printer@5.6.1');
  console.log('');
} else {
  console.log(`  ✗ Found ${issuesFound} issue(s)`);
  console.log('========================================');
  console.log('');
  console.log('Fix the issues above, then try again.');
  console.log('');
}
