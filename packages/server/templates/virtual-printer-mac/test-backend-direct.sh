#!/bin/bash
# Direct test of the backend without CUPS

echo "=== Testing RPrint Backend Directly ==="
echo ""

BACKEND="/usr/libexec/cups/backend/rprint"

if [ ! -f "$BACKEND" ]; then
    echo "ERROR: Backend not installed at $BACKEND"
    exit 1
fi

# Create a test PDF in CUPS temp directory
CUPS_TMP="/private/var/spool/cups/tmp"
if [ ! -d "$CUPS_TMP" ]; then
    echo "ERROR: CUPS temp directory doesn't exist: $CUPS_TMP"
    exit 1
fi

# Check if we can write to CUPS temp
if [ ! -w "$CUPS_TMP" ]; then
    echo "WARNING: CUPS temp directory not writable (expected, will use sudo)"
fi

# Create test file
TEST_FILE="$CUPS_TMP/test-backend-$$"
echo "Test content for RPrint backend" | sudo tee "$TEST_FILE" > /dev/null
sudo chmod 644 "$TEST_FILE"

echo "Created test file: $TEST_FILE"
echo "File size: $(stat -f%z "$TEST_FILE" 2>/dev/null || stat -c%s "$TEST_FILE" 2>/dev/null) bytes"
echo ""

# Run backend with test file
echo "Running backend with test file..."
echo "Command: sudo $BACKEND 999 testuser \"Direct Test\" 1 \"\" \"$TEST_FILE\""
echo ""
echo "=== Backend Output ==="
sudo "$BACKEND" 999 testuser "Direct Test" 1 "" "$TEST_FILE" 2>&1
EXIT_CODE=$?
echo "=== End Backend Output ==="
echo ""
echo "Backend exit code: $EXIT_CODE"

# Cleanup
sudo rm -f "$TEST_FILE"
echo ""
echo "Test complete!"
