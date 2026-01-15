#!/bin/bash
#
# RPrint Virtual Printer Installer for macOS
# Pre-configured installation - no setup required!
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
echo -e "${BLUE}║        Pre-Configured - No Setup Required!           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════╝${NC}"
echo

# Install backend
echo -e "${GREEN}Step 1: Installing CUPS backend${NC}"

BACKEND_DIR="/usr/libexec/cups/backend"
BACKEND_FILE="$BACKEND_DIR/rprint"

cp rprint-backend "$BACKEND_FILE"
chmod 755 "$BACKEND_FILE"
chown root:wheel "$BACKEND_FILE"

echo -e "${GREEN}✓ CUPS backend installed${NC}"
echo

# Install test script
echo -e "${GREEN}Step 2: Installing test and fix scripts${NC}"

TEST_SCRIPT="/usr/local/bin/rprint-test"
cp rprint-test "$TEST_SCRIPT"
chmod 755 "$TEST_SCRIPT"

FIX_SCRIPT="/usr/local/bin/rprint-fix"
cp rprint-fix "$FIX_SCRIPT"
chmod 755 "$FIX_SCRIPT"

echo -e "${GREEN}✓ Test and fix scripts installed${NC}"
echo

# Create printer
echo -e "${GREEN}Step 3: Creating virtual printer${NC}"

PRINTER_NAME="RPrint"
PRINTER_URI="rprint:/"

# Check if printer already exists
if lpstat -p "$PRINTER_NAME" >/dev/null 2>&1; then
    echo -e "${YELLOW}Printer '$PRINTER_NAME' already exists, removing...${NC}"
    lpadmin -x "$PRINTER_NAME"
fi

# Create printer using generic PostScript driver
lpadmin -p "$PRINTER_NAME" \
    -v "$PRINTER_URI" \
    -m drv:///sample.drv/generic.ppd \
    -D "RPrint Virtual Printer" \
    -L "Remote" \
    -o printer-is-shared=false \
    -E

# Enable the printer
cupsenable "$PRINTER_NAME"
cupsaccept "$PRINTER_NAME"

echo -e "${GREEN}✓ Printer created successfully${NC}"
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
echo "The RPrint virtual printer is now installed and pre-configured!"
echo
echo -e "${BLUE}To test the installation:${NC}"
echo "  rprint-test"
echo
echo -e "${BLUE}To fix any issues:${NC}"
echo "  sudo rprint-fix"
echo
echo -e "${BLUE}To print a test page:${NC}"
echo "  echo 'Hello RPrint' | lp -d RPrint"
echo
echo -e "${BLUE}To uninstall:${NC}"
echo "  sudo ./uninstall.sh"
echo
