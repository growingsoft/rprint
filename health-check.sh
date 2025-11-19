#!/bin/bash
#
# RPrint Server Health Check
# This script checks if the server is running and restarts it if needed
#

# Check if server is responding
if ! curl -s -f http://localhost:3001/api/printers/virtual-printer/list -H "Authorization: Bearer test" >/dev/null 2>&1; then
    echo "$(date): Server not responding, attempting restart..."

    # Kill any process on port 3001
    fuser -k 3001/tcp 2>/dev/null

    # Wait a moment
    sleep 2

    # Restart PM2
    pm2 restart rprint-server

    echo "$(date): Server restarted"
fi
