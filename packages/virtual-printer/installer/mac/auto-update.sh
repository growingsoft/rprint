#!/bin/bash
#
# RPrint Auto-Update Script
# Downloads latest version and replaces ALL files
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

DOWNLOAD_URL="https://growingsoft.net/api/downloads/virtual-printer/mac"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     RPrint Virtual Printer Auto-Update Script        ║${NC}"
echo -e "${BLUE}║     Downloads and replaces ALL files                  ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: This script must be run as root${NC}"
    echo "Please run: sudo $0"
    exit 1
fi

# Step 1: Download latest version to Downloads
echo -e "${CYAN}[Step 1/7]${NC} Downloading latest version..."

# Go to Downloads directory
cd "$HOME/Downloads" || cd /Users/*/Downloads 2>/dev/null || { echo "Could not find Downloads"; exit 1; }

# Backup old mac directory if it exists
if [ -d "mac" ]; then
    echo "  Creating backup of current installation..."
    BACKUP_DIR="mac-backup-$(date +%Y%m%d-%H%M%S)"
    mv mac "$BACKUP_DIR"
    echo "  ✓ Backed up to: $BACKUP_DIR"
fi

# Download latest
if curl -f -s -o rprint-virtual-printer-mac.zip "$DOWNLOAD_URL"; then
    echo -e "${GREEN}✓ Download successful${NC}"
    DOWNLOADED_MD5=$(md5 -q rprint-virtual-printer-mac.zip 2>/dev/null || md5sum rprint-virtual-printer-mac.zip | awk '{print $1}')
    echo "  MD5: $DOWNLOADED_MD5"
else
    echo -e "${RED}✗ Download failed${NC}"
    # Restore backup if download failed
    if [ -d "$BACKUP_DIR" ]; then
        mv "$BACKUP_DIR" mac
        echo "  Restored backup"
    fi
    exit 1
fi

# Step 2: Extract
echo ""
echo -e "${CYAN}[Step 2/7]${NC} Extracting..."
if unzip -q -o rprint-virtual-printer-mac.zip; then
    echo -e "${GREEN}✓ Extracted successfully${NC}"
    rm rprint-virtual-printer-mac.zip
else
    echo -e "${RED}✗ Extraction failed${NC}"
    # Restore backup if extraction failed
    if [ -d "$BACKUP_DIR" ]; then
        mv "$BACKUP_DIR" mac
    fi
    exit 1
fi

# Step 3: Show version
echo ""
echo -e "${CYAN}[Step 3/7]${NC} Version information:"
if [ -f mac/VERSION ]; then
    cat mac/VERSION | head -12
else
    echo -e "${YELLOW}⚠ VERSION file not found${NC}"
fi

# Step 4: Make scripts executable
echo ""
echo -e "${CYAN}[Step 4/7]${NC} Making scripts executable..."
chmod +x mac/*.sh 2>/dev/null || true
echo -e "${GREEN}✓ Scripts are executable${NC}"

# Step 5: Install backend
echo ""
echo -e "${CYAN}[Step 5/7]${NC} Installing backend..."
if [ -f mac/rprint-backend ]; then
    cp mac/rprint-backend /usr/libexec/cups/backend/rprint
    chmod 755 /usr/libexec/cups/backend/rprint
    chown root:wheel /usr/libexec/cups/backend/rprint
    echo -e "${GREEN}✓ Backend installed${NC}"
    echo "  Location: /usr/libexec/cups/backend/rprint"
    echo "  Permissions: $(ls -l /usr/libexec/cups/backend/rprint | awk '{print $1, $3, $4}')"
else
    echo -e "${RED}✗ Backend file not found${NC}"
    exit 1
fi

# Step 6: Enable printer and clear queue
echo ""
echo -e "${CYAN}[Step 6/7]${NC} Enabling printer and clearing queue..."

# Clear failed jobs
CLEARED=$(cancel -a RPrint 2>&1 | wc -l)
if [ $CLEARED -gt 0 ]; then
    echo "  ✓ Cleared pending jobs"
fi

# Enable printer
cupsenable RPrint 2>/dev/null || true
cupsaccept RPrint 2>/dev/null || true
echo -e "${GREEN}✓ Printer enabled and accepting jobs${NC}"

# Check printer status
PRINTER_STATUS=$(lpstat -p RPrint 2>/dev/null | grep -o "idle\|disabled\|processing" || echo "unknown")
echo "  Status: $PRINTER_STATUS"

# Step 7: Test print
echo ""
echo -e "${CYAN}[Step 7/7]${NC} Running test print..."
echo ""

# Check if test PDF exists
if [ -f mac/mac.pdf ]; then
    echo -e "${YELLOW}Printing test PDF file (mac.pdf)...${NC}"
    lp -d RPrint mac/mac.pdf
    echo "  ✓ Sent mac.pdf to printer"
else
    echo -e "${YELLOW}Test PDF not found, using text print...${NC}"
    echo "Auto-update test - Version check" | lp -d RPrint
    echo "  ✓ Sent text to printer"
fi

# Wait for job to start
sleep 3

# Show recent logs
echo ""
echo -e "${BLUE}Recent CUPS logs (last 30 lines with INFO/ERROR):${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
tail -30 /var/log/cups/error_log 2>/dev/null | grep -E "(INFO|ERROR)" | tail -20 || echo "No recent logs found"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

# Summary
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Auto-Update Complete!                                ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Updated files in: $HOME/Downloads/mac${NC}"
echo ""
echo -e "${BLUE}Available commands:${NC}"
echo "  ./collect-logs.sh ......... Collect all logs for debugging"
echo "  ./test-backend-direct.sh .. Test backend directly"
echo "  rprint-test ............... Run diagnostic tests"
echo "  sudo rprint-fix ........... Fix permissions and issues"
echo ""
echo -e "${BLUE}What to do next:${NC}"
echo "  1. Check the logs above for any errors"
echo "  2. If errors, run: cd ~/Downloads/mac && ./collect-logs.sh"
echo "  3. Share the collected logs for debugging"
echo ""
echo -e "${BLUE}To monitor logs in real-time:${NC}"
echo "  sudo tail -f /var/log/cups/error_log | grep -E '(INFO|ERROR)'"
echo ""
