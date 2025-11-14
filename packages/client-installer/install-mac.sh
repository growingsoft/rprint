#!/bin/bash

echo "========================================"
echo "RPrint Client Installer for macOS"
echo "========================================"
echo ""

SERVER_URL="https://growingsoft.net"

echo "Installing RPrint Client..."
echo ""

# Create Applications folder link
APPS_DIR="$HOME/Applications"
mkdir -p "$APPS_DIR"

APP_NAME="RPrint.app"
APP_PATH="$APPS_DIR/$APP_NAME"

# Create the app bundle structure
mkdir -p "$APP_PATH/Contents/MacOS"
mkdir -p "$APP_PATH/Contents/Resources"

# Create the executable script
cat > "$APP_PATH/Contents/MacOS/RPrint" << 'EOF'
#!/bin/bash
open "https://growingsoft.net"
EOF

chmod +x "$APP_PATH/Contents/MacOS/RPrint"

# Create Info.plist
cat > "$APP_PATH/Contents/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>RPrint</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleIdentifier</key>
    <string>com.rprint.client</string>
    <key>CFBundleName</key>
    <string>RPrint</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.10</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF

echo ""
echo "========================================"
echo "Installation Complete!"
echo "========================================"
echo ""
echo "RPrint has been installed to:"
echo "  $APP_PATH"
echo ""
echo "You can now find RPrint in your Applications folder."
echo "Click it to open RPrint in your default web browser."
echo ""
