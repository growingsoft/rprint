#!/bin/bash

# RPrint Windows Service Distribution Packager
# Creates a distributable ZIP file with all necessary files

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_NAME="rprint-windows-service"
DIST_DIR="$SCRIPT_DIR/release"
PACKAGE_DIR="$DIST_DIR/$DIST_NAME"

echo "Building RPrint Windows Service distribution package..."

# Clean previous builds
rm -rf "$DIST_DIR"
mkdir -p "$PACKAGE_DIR"

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Copy necessary files
echo "Copying files..."
cp -r dist "$PACKAGE_DIR/"
cp -r src "$PACKAGE_DIR/"
cp package.json "$PACKAGE_DIR/"
cp tsconfig.json "$PACKAGE_DIR/"
cp .env.example "$PACKAGE_DIR/"
cp README.md "$PACKAGE_DIR/"
cp INSTALL.bat "$PACKAGE_DIR/"
cp INSTALL.ps1 "$PACKAGE_DIR/"
cp TROUBLESHOOTING.md "$PACKAGE_DIR/"
cp setup-sumatra.ps1 "$PACKAGE_DIR/" 2>/dev/null || true
cp FIX-PRINTING-NOW.md "$PACKAGE_DIR/" 2>/dev/null || true
cp diagnose.js "$PACKAGE_DIR/" 2>/dev/null || true
cp test-print-simple.js "$PACKAGE_DIR/" 2>/dev/null || true

# Copy only production dependencies info
cd "$PACKAGE_DIR"
npm install --production --omit=dev

# Create installation instructions
cat > "$PACKAGE_DIR/SETUP.txt" << 'EOF'
RPrint Windows Service - Installation Instructions
===================================================

1. Extract this ZIP file to a permanent location (e.g., C:\RPrint)

2. Download your .env configuration file from the RPrint admin panel:
   - Go to https://growingsoft.net/admin/workers
   - Click "Download .env" for your print server
   - Save the .env file to this directory

3. Run the installer as Administrator:
   - Right-click INSTALL.bat
   - Select "Run as administrator"

   OR

   - Open PowerShell as Administrator
   - Run: .\INSTALL.ps1

4. The service will start automatically and sync your printers

5. Check the logs directory for any issues

For troubleshooting, see TROUBLESHOOTING.md

EOF

cd "$SCRIPT_DIR"

# Create ZIP file
echo "Creating ZIP package..."
cd "$DIST_DIR"
zip -r "${DIST_NAME}.zip" "$DIST_NAME"

# Move to web-accessible location
WEB_DIR="/var/www/rprint/packages/server/public/downloads"
mkdir -p "$WEB_DIR"
cp "${DIST_NAME}.zip" "$WEB_DIR/"
chmod 644 "$WEB_DIR/${DIST_NAME}.zip"

echo ""
echo "✅ Distribution package created successfully!"
echo "Location: $DIST_DIR/${DIST_NAME}.zip"
echo "Web URL: https://growingsoft.net/downloads/${DIST_NAME}.zip"
echo ""
echo "Package size: $(du -h "$DIST_DIR/${DIST_NAME}.zip" | cut -f1)"
