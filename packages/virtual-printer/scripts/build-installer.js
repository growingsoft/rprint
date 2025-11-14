const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const INSTALLER_DIR = path.join(ROOT_DIR, 'installer');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const TEMPLATES_DIR = path.join(ROOT_DIR, 'installer-templates');

// Clean installer directory
if (fs.existsSync(INSTALLER_DIR)) {
  fs.rmSync(INSTALLER_DIR, { recursive: true, force: true });
}
fs.mkdirSync(INSTALLER_DIR, { recursive: true });

console.log('Building RPrint Virtual Printer Installers...\n');

// Function to create zip archive
function createZip(outputPath, files) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`Created ${path.basename(outputPath)} (${archive.pointer()} bytes)`);
      resolve();
    });

    archive.on('error', reject);
    archive.pipe(output);

    // Add files
    files.forEach(({ src, dest }) => {
      if (fs.statSync(src).isDirectory()) {
        archive.directory(src, dest);
      } else {
        archive.file(src, { name: dest });
      }
    });

    archive.finalize();
  });
}

// Build TypeScript
console.log('1. Compiling TypeScript...');
execSync('npm run build', { cwd: ROOT_DIR, stdio: 'inherit' });

// Build executables using pkg (for standalone Node.js apps)
console.log('\n2. Building standalone executables...');

// Note: pkg might not work perfectly in all cases, so we'll use a simpler approach
// Instead, we'll bundle Node.js scripts with instructions

// For Windows installer
console.log('\n3. Creating Windows installer package...');

const windowsFiles = [
  // Compiled JS files
  { src: DIST_DIR, dest: 'dist' },
  // Node modules (needed for runtime)
  { src: path.join(ROOT_DIR, 'node_modules'), dest: 'node_modules' },
  // Templates
  { src: path.join(TEMPLATES_DIR, 'install-windows.bat'), dest: 'install.bat' },
  { src: path.join(TEMPLATES_DIR, 'README.txt'), dest: 'README.txt' },
  { src: path.join(ROOT_DIR, '.env.example'), dest: '.env.example' },
  // Package files
  { src: path.join(ROOT_DIR, 'package.json'), dest: 'package.json' },
];

// Create Windows ZIP
createZip(
  path.join(INSTALLER_DIR, 'rprint-virtual-printer-windows.zip'),
  windowsFiles
).then(() => {
  console.log('Windows installer package created!');
});

// For Mac installer
console.log('\n4. Creating macOS installer package...');

const macFiles = [
  // Compiled JS files
  { src: DIST_DIR, dest: 'dist' },
  // Node modules (needed for runtime)
  { src: path.join(ROOT_DIR, 'node_modules'), dest: 'node_modules' },
  // Templates
  { src: path.join(TEMPLATES_DIR, 'install-mac.sh'), dest: 'install.sh' },
  { src: path.join(TEMPLATES_DIR, 'README.txt'), dest: 'README.txt' },
  { src: path.join(ROOT_DIR, '.env.example'), dest: '.env.example' },
  // Package files
  { src: path.join(ROOT_DIR, 'package.json'), dest: 'package.json' },
];

// Make install.sh executable in the zip (we'll note this in README)
createZip(
  path.join(INSTALLER_DIR, 'rprint-virtual-printer-mac.zip'),
  macFiles
).then(() => {
  console.log('macOS installer package created!');

  console.log('\n===========================================');
  console.log('Build Complete!');
  console.log('===========================================');
  console.log('\nInstaller packages created in:', INSTALLER_DIR);
  console.log('- rprint-virtual-printer-windows.zip');
  console.log('- rprint-virtual-printer-mac.zip');
  console.log('\nThese can be uploaded to your RPrint server for download.');
});
