#!/bin/bash
#
# RPrint Virtual Printer Uninstaller for macOS
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
    echo "Please run: sudo ./uninstall.sh"
    exit 1
fi

echo -e "${BLUE}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    RPrint Virtual Printer Uninstaller for macOS      ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════╝${NC}"
echo

read -p "Are you sure you want to uninstall RPrint Virtual Printer? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Uninstall cancelled."
    exit 0
fi

echo
echo "Removing RPrint Virtual Printer..."

# Remove printer
PRINTER_NAME="RPrint"
if lpstat -p "$PRINTER_NAME" >/dev/null 2>&1; then
    lpadmin -x "$PRINTER_NAME"
    echo -e "${GREEN}✓ Removed printer${NC}"
else
    echo -e "${YELLOW}Printer not found (already removed?)${NC}"
fi

# Remove backend
BACKEND_FILE="/usr/libexec/cups/backend/rprint"
if [ -f "$BACKEND_FILE" ]; then
    rm -f "$BACKEND_FILE"
    echo -e "${GREEN}✓ Removed CUPS backend${NC}"
else
    echo -e "${YELLOW}Backend not found (already removed?)${NC}"
fi

# Ask about configuration
echo
read -p "Remove configuration file? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    CONFIG_DIR="/etc/rprint"
    if [ -d "$CONFIG_DIR" ]; then
        rm -rf "$CONFIG_DIR"
        echo -e "${GREEN}✓ Removed configuration${NC}"
    fi
fi

echo
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Uninstall Complete! 👋                        ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo
echo "RPrint Virtual Printer has been removed from your system."
echo
