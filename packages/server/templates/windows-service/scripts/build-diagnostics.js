const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

async function buildDiagnostics() {
  console.log('Building RPrint Diagnostics Package...\n');

  const outputDir = path.join(__dirname, '../installer');

  // Create installer directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Build TypeScript first
  console.log('1. Compiling TypeScript...');
  const { execSync } = require('child_process');
  execSync('npm run build', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });

  // Create diagnostics package
  console.log('\n2. Creating diagnostics package...');

  const outputZip = path.join(outputDir, 'rprint-diagnostics-windows.zip');
  const output = fs.createWriteStream(outputZip);
  const archive = archiver('zip', { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log(`Created ${outputZip} (${archive.pointer()} bytes)`);
      console.log('Diagnostics package created!\n');
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Add diagnostics files
    archive.file(path.join(__dirname, '../dist/diagnostics.js'), { name: 'diagnostics.js' });
    archive.file(path.join(__dirname, '../DIAGNOSTICS.md'), { name: 'README.md' });
    archive.file(path.join(__dirname, '../package.json'), { name: 'package.json' });

    // Add required utility files (diagnostics needs these)
    archive.directory(path.join(__dirname, '../dist/utils'), 'utils');
    archive.directory(path.join(__dirname, '../dist/services'), 'services');
    archive.directory(path.join(__dirname, '../dist/types'), 'types');

    // Add a .env.example
    const envExample = `# RPrint Windows Worker Configuration
SERVER_URL=https://growingsoft.net
API_KEY=your-api-key-here
POLL_INTERVAL=5000
`;
    archive.append(envExample, { name: '.env.example' });

    // Add a run script
    const runScript = `@echo off
echo RPrint Worker Diagnostics
echo ========================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist .env (
    echo ERROR: .env file not found!
    echo Please copy .env.example to .env and configure it with your settings.
    echo.
    pause
    exit /b 1
)

echo Installing dependencies...
call npm install --production --silent

echo.
echo Running diagnostics...
echo.

node diagnostics.js

echo.
pause
`;
    archive.append(runScript, { name: 'run-diagnostics.bat' });

    archive.finalize();
  });
}

buildDiagnostics().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
