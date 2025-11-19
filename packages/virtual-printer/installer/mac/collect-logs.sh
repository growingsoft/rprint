#!/bin/bash
#
# RPrint Log Collection Script
# Collects all relevant logs for debugging
#

echo "╔═══════════════════════════════════════════════════════╗"
echo "║     RPrint Log Collection Script                     ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

OUTPUT_FILE="/tmp/rprint-logs-$(date +%Y%m%d-%H%M%S).txt"

echo "Collecting logs to: $OUTPUT_FILE"
echo ""

{
    echo "=== RPrint Diagnostic Logs ==="
    echo "Generated: $(date)"
    echo ""

    echo "=== Version Information ==="
    if [ -f VERSION ]; then
        cat VERSION
    else
        echo "VERSION file not found"
    fi
    echo ""

    echo "=== Printer Status ==="
    lpstat -p RPrint 2>&1
    echo ""

    echo "=== Pending Jobs ==="
    lpstat -o RPrint 2>&1
    echo ""

    echo "=== Backend File ==="
    ls -l /usr/libexec/cups/backend/rprint 2>&1
    echo ""

    echo "=== CUPS Temp Directory ==="
    sudo ls -la /private/var/spool/cups/tmp/ 2>&1 | tail -20
    echo ""

    echo "=== Recent CUPS Error Log (last 100 lines) ==="
    sudo tail -100 /var/log/cups/error_log 2>&1
    echo ""

    echo "=== Recent CUPS Access Log (last 50 lines) ==="
    sudo tail -50 /var/log/cups/access_log 2>&1
    echo ""

    echo "=== System Info ==="
    echo "macOS Version: $(sw_vers -productVersion)"
    echo "CUPS Version: $(lpstat -v | head -1)"
    echo ""

} > "$OUTPUT_FILE" 2>&1

echo "✓ Logs collected!"
echo ""
echo "File: $OUTPUT_FILE"
echo "Size: $(ls -lh "$OUTPUT_FILE" | awk '{print $5}')"
echo ""
echo "To view logs:"
echo "  cat $OUTPUT_FILE"
echo ""
echo "To share logs (copy to clipboard):"
echo "  cat $OUTPUT_FILE | pbcopy"
echo ""
