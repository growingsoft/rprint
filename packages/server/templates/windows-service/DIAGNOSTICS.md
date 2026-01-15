# RPrint Windows Worker Diagnostics

This diagnostics script checks if your Windows worker is configured correctly and can communicate with the RPrint server.

## How to Run

```bash
cd packages/windows-service
npm run diagnostics
```

## What It Checks

The diagnostics script performs the following tests:

### 1. Environment Configuration
- ✓ Checks if `SERVER_URL` is set in `.env`
- ✓ Checks if `API_KEY` is set in `.env`
- ✓ Checks if `POLL_INTERVAL` is set (optional)

### 2. Server Connectivity
- ✓ Tests if the RPrint server is reachable
- ✓ Verifies network connectivity
- ✓ Checks for firewall or DNS issues

### 3. API Key Authentication
- ✓ Validates your API key with the server
- ✓ Tests worker authentication endpoint
- ✓ Ensures API key is valid and not expired

### 4. Local Printers
- ✓ Detects all printers installed on Windows
- ✓ Shows printer names and status
- ✓ Identifies default printer

### 5. Printer Sync
- ✓ Tests syncing printers with the server
- ✓ Verifies server receives printer data
- ✓ Shows assigned printer IDs from server

### 6. Print Job Polling
- ✓ Tests polling for pending print jobs
- ✓ Shows if any jobs are waiting
- ✓ Verifies the complete print workflow

### 7. File System Permissions
- ✓ Checks if worker can write to logs directory
- ✓ Tests file system access

## Example Output

```
=================================================
  RPrint Windows Worker Diagnostics
=================================================

1. Checking Environment Configuration...

✓ SERVER_URL: Set to: https://growingsoft.net
✓ API_KEY: Set (length: 64 chars)
✓ POLL_INTERVAL: Set to: 5000ms

2. Checking Server Connectivity...

✓ Server Reachable: Server is reachable

3. Checking API Key Authentication...

✓ API Key Valid: API key is valid and authentication works

4. Checking Local Printers...

✓ Local Printers: Found 19 printer(s)
  Details: [
    'Brother HL-L8360CDW series (online)',
    'ROLL1 (online)',
    'GK420d (online)',
    ...
  ]

5. Testing Printer Sync with Server...

✓ Printer Sync: Successfully synced 19 printer(s) with server
  Details: [
    'Brother HL-L8360CDW series (ID: abc-123-def)',
    'ROLL1 (ID: xyz-456-uvw)',
    ...
  ]

6. Testing Print Job Polling...

✓ Job Polling: Polling works! Found 2 pending job(s) for Brother HL-L8360CDW series
  Details: [
    'document.pdf (pending)',
    'test-page.pdf (pending)'
  ]

7. Checking File System Permissions...

✓ Log Directory: Can write to logs directory

=================================================
  Diagnostics Summary
=================================================

Total Tests: 8
✓ Passed: 8
✗ Failed: 0
⚠ Warnings: 0

✅ All critical tests passed!
The Windows worker is configured correctly and ready to run.

Start the worker with: npm run dev

=================================================
```

## Troubleshooting

### Server Not Reachable
If the server connectivity test fails:
- Check your `SERVER_URL` in `.env`
- Ensure the URL is correct (should be `https://growingsoft.net`)
- Check your firewall settings
- Verify internet connection

### API Key Invalid
If authentication fails:
- Verify your `API_KEY` in `.env`
- The API key should be 64 characters long
- If you lost your API key, register a new worker:
  ```bash
  curl -X POST https://growingsoft.net/api/auth/register-worker \
    -H "Content-Type: application/json" \
    -d '{"name":"My-Worker"}'
  ```

### No Printers Found
If no printers are detected:
- Install at least one printer in Windows
- Check printer status in Windows Settings
- Ensure printers are not paused or offline

### Printer Sync Failed
If sync fails:
- Check API key is valid
- Verify server is running
- Check server logs for errors

### Job Polling Failed
If polling doesn't work:
- Restart the diagnostics after printer sync completes
- Check if printers have correct IDs
- Verify server can reach worker

## Next Steps

After all tests pass:

1. **Start the worker:**
   ```bash
   npm run dev
   ```

2. **Test printing:**
   - Go to https://growingsoft.net
   - Upload a document
   - Select a printer
   - The job should print within 5-10 seconds

3. **Install as Windows service** (optional):
   ```bash
   npm run build
   npm run install-service
   ```

## Getting Help

If diagnostics fail and you can't resolve the issue:
1. Save the diagnostic output to a file
2. Check the Windows worker logs
3. Report the issue with diagnostic output and logs
