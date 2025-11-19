#!/bin/bash
#
# RPrint Virtual Printer Installer for macOS
# Simple one-step installation - no configuration required!
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: This script must be run as root${NC}"
    echo "Please run: sudo ./install.sh"
    exit 1
fi

echo -e "${BLUE}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     RPrint Virtual Printer Installer for macOS       ║${NC}"
echo -e "${BLUE}║          Simple Installation - No Config Needed       ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════╝${NC}"
echo

# Install backend
echo -e "${GREEN}Step 1: Installing CUPS backend${NC}"

BACKEND_DIR="/usr/libexec/cups/backend"
BACKEND_FILE="$BACKEND_DIR/rprint"

# Copy backend script
cp rprint-backend "$BACKEND_FILE"
chmod 755 "$BACKEND_FILE"
chown root:wheel "$BACKEND_FILE"

echo -e "${GREEN}✓ CUPS backend installed${NC}"
echo

# Install configuration helper (GUI dialog for first-time setup)
echo -e "${GREEN}Step 2: Installing configuration helper${NC}"

CONFIG_HELPER_DIR="/usr/local/bin"
CONFIG_HELPER_FILE="$CONFIG_HELPER_DIR/rprint-config"

cp rprint-config "$CONFIG_HELPER_FILE"
chmod 755 "$CONFIG_HELPER_FILE"

echo -e "${GREEN}✓ Configuration helper installed${NC}"
echo

# Create printer using modern IPP Everywhere approach
echo -e "${GREEN}Step 3: Creating virtual printer (IPP Everywhere)${NC}"

PRINTER_NAME="RPrint"
# Use localhost as the host since we declared the backend as "network" type
PRINTER_URI="rprint://localhost/"

# Check if printer already exists
if lpstat -p "$PRINTER_NAME" >/dev/null 2>&1; then
    echo -e "${YELLOW}Printer '$PRINTER_NAME' already exists, removing...${NC}"
    lpadmin -x "$PRINTER_NAME"
fi

# Create printer using IPP Everywhere (driverless printing)
lpadmin -p "$PRINTER_NAME" \
    -v "$PRINTER_URI" \
    -m everywhere \
    -D "RPrint Virtual Printer" \
    -L "Remote" \
    -o printer-is-shared=false \
    -E

# Enable the printer
cupsenable "$PRINTER_NAME"
cupsaccept "$PRINTER_NAME"

echo -e "${GREEN}✓ Printer created using IPP Everywhere (modern standard)${NC}"
echo

# Set as default (optional)
read -p "Set RPrint as the default printer? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    lpadmin -d "$PRINTER_NAME"
    echo -e "${GREEN}✓ RPrint set as default printer${NC}"
fi

echo
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Installation Complete! 🎉                   ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo
echo "The RPrint virtual printer is now installed!"
echo
echo -e "${BLUE}To configure and use RPrint:${NC}"
echo "  1. Open any application and print something"
echo "  2. Select 'RPrint' as your printer"
echo "  3. On first use, you'll be prompted to configure:"
echo "     - Server URL (e.g., https://growingsoft.net)"
echo "     - Your authentication token"
echo "     - Your printer ID"
echo
echo -e "${YELLOW}Where to get your credentials:${NC}"
echo "  • Login to https://growingsoft.net"
echo "  • Go to https://growingsoft.net/api-token to copy your token"
echo "  • Go to Admin → Printers to find your printer ID"
echo
echo -e "${BLUE}To reconfigure at any time:${NC}"
echo "  rprint-config"
echo
echo -e "${BLUE}To test:${NC}"
echo "  echo 'Hello RPrint' | lp -d RPrint"
echo
echo -e "${BLUE}To uninstall:${NC}"
echo "  sudo ./uninstall.sh"
echo
