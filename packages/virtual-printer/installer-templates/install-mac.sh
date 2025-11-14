#!/bin/bash
# RPrint Virtual Printer Installer for macOS
# This script must be run with sudo

set -e

echo "============================================"
echo "RPrint Virtual Printer Installer for macOS"
echo "============================================"
echo ""

# Check for sudo
if [ "$EUID" -ne 0 ]; then
    echo "ERROR: This script must be run with sudo"
    echo "Usage: sudo ./install-mac.sh"
    exit 1
fi

# Get the real user (not root)
REAL_USER="${SUDO_USER:-$USER}"
REAL_HOME=$(eval echo ~$REAL_USER)

# Set installation paths
INSTALL_DIR="/Applications/RPrint Virtual Printer"
WATCH_FOLDER="$REAL_HOME/RPrint/PrintQueue"
LAUNCHAGENT_PLIST="$REAL_HOME/Library/LaunchAgents/com.rprint.virtualprinter.plist"

echo "Installation directory: $INSTALL_DIR"
echo "Watch folder: $WATCH_FOLDER"
echo "LaunchAgent: $LAUNCHAGENT_PLIST"
echo ""

# Create directories
echo "Creating directories..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$WATCH_FOLDER"
mkdir -p "$REAL_HOME/Library/LaunchAgents"

# Set proper ownership
chown -R "$REAL_USER:staff" "$WATCH_FOLDER"
chown -R "$REAL_USER:staff" "$REAL_HOME/Library/LaunchAgents"

# Copy files
echo "Copying files..."
cp rprint-monitor "$INSTALL_DIR/"
cp install-printer "$INSTALL_DIR/"
cp uninstall-printer "$INSTALL_DIR/"
cp .env.example "$INSTALL_DIR/"

chmod +x "$INSTALL_DIR/rprint-monitor"
chmod +x "$INSTALL_DIR/install-printer"
chmod +x "$INSTALL_DIR/uninstall-printer"

# Install the printer
echo ""
echo "Installing virtual printer..."
"$INSTALL_DIR/install-printer"

if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Failed to install printer"
    exit 1
fi

# Create .env if it doesn't exist
if [ ! -f "$INSTALL_DIR/.env" ]; then
    echo ""
    echo "Creating configuration file..."
    cp "$INSTALL_DIR/.env.example" "$INSTALL_DIR/.env"
fi

echo ""
echo "============================================"
echo "IMPORTANT: Configure Your Credentials"
echo "============================================"
echo ""
echo "Please edit the configuration file:"
echo "$INSTALL_DIR/.env"
echo ""
echo "Set your RPrint server URL, username, and password"
echo ""
read -p "Press Enter to edit configuration..."

# Open in default editor
sudo -u "$REAL_USER" ${EDITOR:-nano} "$INSTALL_DIR/.env"

# Create LaunchAgent plist
echo ""
echo "============================================"
echo "Installing Background Service"
echo "============================================"
echo ""

cat > "$LAUNCHAGENT_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.rprint.virtualprinter</string>
    <key>ProgramArguments</key>
    <array>
        <string>$INSTALL_DIR/rprint-monitor</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>$INSTALL_DIR</string>
    <key>StandardOutPath</key>
    <string>$REAL_HOME/Library/Logs/rprint-virtual-printer.log</string>
    <key>StandardErrorPath</key>
    <string>$REAL_HOME/Library/Logs/rprint-virtual-printer-error.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
</dict>
</plist>
EOF

# Set proper ownership for plist
chown "$REAL_USER:staff" "$LAUNCHAGENT_PLIST"
chmod 644 "$LAUNCHAGENT_PLIST"

# Load the LaunchAgent as the real user
echo "Loading LaunchAgent..."
sudo -u "$REAL_USER" launchctl load "$LAUNCHAGENT_PLIST"

echo ""
echo "============================================"
echo "Installation Complete!"
echo "============================================"
echo ""
echo "The RPrint Virtual Printer has been installed and started."
echo ""
echo "To print:"
echo "1. Open any application"
echo "2. Go to Print (Cmd+P)"
echo "3. Select 'RPrint Virtual Printer'"
echo "4. The PDF will be automatically saved to: $WATCH_FOLDER"
echo ""
echo "The background service will automatically upload your print jobs!"
echo ""
echo "To view logs:"
echo "  tail -f $REAL_HOME/Library/Logs/rprint-virtual-printer.log"
echo ""
echo "To manage the service:"
echo "  launchctl list | grep rprint"
echo "  launchctl unload $LAUNCHAGENT_PLIST"
echo "  launchctl load $LAUNCHAGENT_PLIST"
echo ""
