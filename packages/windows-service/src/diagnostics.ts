/**
 * RPrint Windows Worker Diagnostics Script
 *
 * Run this script to check if everything is configured correctly
 * Usage: npm run diagnostics
 */

import * as dotenv from 'dotenv';
import axios from 'axios';
import { PrinterUtils } from './utils/printer-utils';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

interface DiagnosticResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

const results: DiagnosticResult[] = [];

function log(result: DiagnosticResult) {
  results.push(result);
  const icon = result.status === 'PASS' ? '✓' : result.status === 'FAIL' ? '✗' : '⚠';
  const color = result.status === 'PASS' ? '\x1b[32m' : result.status === 'FAIL' ? '\x1b[31m' : '\x1b[33m';
  console.log(`${color}${icon}\x1b[0m ${result.test}: ${result.message}`);
  if (result.details) {
    console.log(`  Details:`, result.details);
  }
}

async function runDiagnostics() {
  console.log('\n=================================================');
  console.log('  RPrint Windows Worker Diagnostics');
  console.log('=================================================\n');

  // 1. Check environment variables
  console.log('1. Checking Environment Configuration...\n');

  const serverUrl = process.env.SERVER_URL;
  const apiKey = process.env.API_KEY;
  const pollInterval = process.env.POLL_INTERVAL;

  if (!serverUrl) {
    log({
      test: 'SERVER_URL',
      status: 'FAIL',
      message: 'SERVER_URL not set in .env file'
    });
  } else {
    log({
      test: 'SERVER_URL',
      status: 'PASS',
      message: `Set to: ${serverUrl}`
    });
  }

  if (!apiKey) {
    log({
      test: 'API_KEY',
      status: 'FAIL',
      message: 'API_KEY not set in .env file'
    });
  } else {
    log({
      test: 'API_KEY',
      status: 'PASS',
      message: `Set (length: ${apiKey.length} chars)`
    });
  }

  if (!pollInterval) {
    log({
      test: 'POLL_INTERVAL',
      status: 'WARN',
      message: 'POLL_INTERVAL not set, will use default (5000ms)'
    });
  } else {
    log({
      test: 'POLL_INTERVAL',
      status: 'PASS',
      message: `Set to: ${pollInterval}ms`
    });
  }

  if (!serverUrl || !apiKey) {
    console.log('\n❌ Cannot proceed without SERVER_URL and API_KEY. Please check your .env file.\n');
    return;
  }

  // 2. Check server connectivity
  console.log('\n2. Checking Server Connectivity...\n');

  try {
    const response = await axios.get(`${serverUrl}/api/health`, { timeout: 5000 });
    log({
      test: 'Server Reachable',
      status: 'PASS',
      message: 'Server is reachable'
    });
  } catch (error: any) {
    log({
      test: 'Server Reachable',
      status: 'FAIL',
      message: `Cannot reach server: ${error.message}`,
      details: error.code
    });
    console.log('\n❌ Cannot reach server. Check if the server is running and accessible.\n');
    return;
  }

  // 3. Check API key validity
  console.log('\n3. Checking API Key Authentication...\n');

  try {
    const response = await axios.post(
      `${serverUrl}/api/workers/heartbeat`,
      {},
      {
        headers: {
          'X-API-Key': apiKey
        },
        timeout: 5000
      }
    );
    log({
      test: 'API Key Valid',
      status: 'PASS',
      message: 'API key is valid and authentication works'
    });
  } catch (error: any) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      log({
        test: 'API Key Valid',
        status: 'FAIL',
        message: 'API key is invalid or expired',
        details: error.response?.data
      });
    } else {
      log({
        test: 'API Key Valid',
        status: 'FAIL',
        message: `Authentication check failed: ${error.message}`
      });
    }
    console.log('\n❌ API key authentication failed. Please check your API_KEY in .env file.\n');
    return;
  }

  // 4. Check local printers
  console.log('\n4. Checking Local Printers...\n');

  try {
    const localPrinters = await PrinterUtils.getPrinters();

    if (localPrinters.length === 0) {
      log({
        test: 'Local Printers',
        status: 'WARN',
        message: 'No printers found on this system'
      });
    } else {
      log({
        test: 'Local Printers',
        status: 'PASS',
        message: `Found ${localPrinters.length} printer(s)`,
        details: localPrinters.map(p => `${p.name} (${p.status})`)
      });
    }
  } catch (error: any) {
    log({
      test: 'Local Printers',
      status: 'FAIL',
      message: `Cannot detect printers: ${error.message}`
    });
  }

  // 5. Test printer sync
  console.log('\n5. Testing Printer Sync with Server...\n');

  try {
    const localPrinters = await PrinterUtils.getPrinters();
    const printerData = localPrinters.map(p => ({
      name: p.name,
      displayName: p.name,
      isDefault: p.isDefault,
      status: p.status,
      description: p.description || '',
      location: p.location || '',
      capabilities: {
        color: true,
        duplex: true,
        paperSizes: ['A4', 'Letter', 'Legal', 'A3'],
        maxCopies: 99
      }
    }));

    const response = await axios.post(
      `${serverUrl}/api/printers/sync`,
      { printers: printerData },
      {
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    const syncedPrinters = response.data.printers || [];
    log({
      test: 'Printer Sync',
      status: 'PASS',
      message: `Successfully synced ${syncedPrinters.length} printer(s) with server`,
      details: syncedPrinters.map((p: any) => `${p.displayName} (ID: ${p.id})`)
    });

    // 6. Test polling for print jobs
    console.log('\n6. Testing Print Job Polling...\n');

    if (syncedPrinters.length > 0) {
      const testPrinter = syncedPrinters[0];
      try {
        const pollResponse = await axios.get(
          `${serverUrl}/api/jobs/poll/pending`,
          {
            params: { printerId: testPrinter.id },
            headers: { 'X-API-Key': apiKey },
            timeout: 5000
          }
        );

        const jobs = pollResponse.data.jobs || [];
        log({
          test: 'Job Polling',
          status: 'PASS',
          message: `Polling works! Found ${jobs.length} pending job(s) for ${testPrinter.displayName}`,
          details: jobs.length > 0 ? jobs.map((j: any) => `${j.fileName} (${j.status})`) : 'No pending jobs'
        });
      } catch (error: any) {
        log({
          test: 'Job Polling',
          status: 'FAIL',
          message: `Cannot poll for jobs: ${error.message}`
        });
      }
    } else {
      log({
        test: 'Job Polling',
        status: 'WARN',
        message: 'Cannot test polling - no printers synced'
      });
    }

  } catch (error: any) {
    log({
      test: 'Printer Sync',
      status: 'FAIL',
      message: `Printer sync failed: ${error.message}`,
      details: error.response?.data
    });
  }

  // 7. Check write permissions for logs
  console.log('\n7. Checking File System Permissions...\n');

  const logDir = path.join(__dirname, '../logs');
  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const testFile = path.join(logDir, 'test.txt');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    log({
      test: 'Log Directory',
      status: 'PASS',
      message: 'Can write to logs directory'
    });
  } catch (error: any) {
    log({
      test: 'Log Directory',
      status: 'WARN',
      message: `Cannot write to logs: ${error.message}`
    });
  }

  // Summary
  console.log('\n=================================================');
  console.log('  Diagnostics Summary');
  console.log('=================================================\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warnings = results.filter(r => r.status === 'WARN').length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`\x1b[32m✓ Passed: ${passed}\x1b[0m`);
  console.log(`\x1b[31m✗ Failed: ${failed}\x1b[0m`);
  console.log(`\x1b[33m⚠ Warnings: ${warnings}\x1b[0m\n`);

  if (failed === 0) {
    console.log('✅ \x1b[32mAll critical tests passed!\x1b[0m');
    console.log('The Windows worker is configured correctly and ready to run.\n');
    console.log('Start the worker with: npm run dev\n');
  } else {
    console.log('❌ \x1b[31mSome tests failed.\x1b[0m');
    console.log('Please fix the errors above before running the worker.\n');
  }

  console.log('=================================================\n');
}

// Run diagnostics
runDiagnostics().catch(error => {
  console.error('Diagnostics failed:', error);
  process.exit(1);
});
