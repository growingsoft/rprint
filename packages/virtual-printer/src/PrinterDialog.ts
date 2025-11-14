import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';

interface Printer {
  id: string;
  name: string;
  displayName: string;
  status: string;
  description?: string;
  location?: string;
  tags?: string;
}

interface PrintJobOptions {
  printerIds: string[];
  copies: number;
  colorMode: 'color' | 'grayscale';
}

export class PrinterDialog {
  private server: http.Server | null = null;
  private port: number = 0;
  private resolvePromise: ((value: PrintJobOptions | null) => void) | null = null;
  private printers: Printer[] = [];

  /**
   * Show a printer selection dialog
   * @param printers Available printers to choose from
   * @returns Selected print job options or null if cancelled
   */
  async show(printers: Printer[]): Promise<PrintJobOptions | null> {
    this.printers = printers;

    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.startServer();
    });
  }

  private startServer() {
    this.server = http.createServer((req, res) => {
      if (req.method === 'GET' && req.url === '/') {
        // Serve the dialog HTML
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(this.getDialogHTML());
      } else if (req.method === 'GET' && req.url === '/printers') {
        // Return printer data as JSON
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.printers));
      } else if (req.method === 'POST' && req.url === '/submit') {
        // Handle form submission
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));

            // Resolve the promise with the selected options
            this.resolvePromise?.(data);
            this.cleanup();
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid data' }));
          }
        });
      } else if (req.method === 'POST' && req.url === '/cancel') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        this.resolvePromise?.(null);
        this.cleanup();
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    this.server.listen(0, 'localhost', () => {
      const address = this.server!.address();
      if (address && typeof address !== 'string') {
        this.port = address.port;
        console.log(`Dialog server started on port ${this.port}`);
        this.openBrowser();
      }
    });
  }

  private openBrowser() {
    const url = `http://localhost:${this.port}`;
    const start = process.platform === 'darwin' ? 'open' :
                  process.platform === 'win32' ? 'start' : 'xdg-open';

    child_process.exec(`${start} ${url}`);
  }

  private cleanup() {
    setTimeout(() => {
      this.server?.close();
      this.server = null;
    }, 500);
  }

  private getDialogHTML(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RPrint - Select Printer</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      width: 100%;
      max-width: 600px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    }

    .header {
      padding: 24px;
      border-bottom: 1px solid #e5e7eb;
    }

    .header h1 {
      font-size: 24px;
      color: #1f2937;
      margin-bottom: 8px;
    }

    .header p {
      color: #6b7280;
      font-size: 14px;
    }

    .content {
      padding: 24px;
      overflow-y: auto;
      flex: 1;
    }

    .printer-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }

    .printer-card {
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
    }

    .printer-card:hover {
      border-color: #667eea;
      background: #f9fafb;
    }

    .printer-card.selected {
      border-color: #667eea;
      background: #eef2ff;
    }

    .printer-card input[type="checkbox"] {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 20px;
      height: 20px;
      cursor: pointer;
    }

    .printer-name {
      font-weight: 600;
      color: #1f2937;
      font-size: 16px;
      margin-bottom: 4px;
      padding-right: 40px;
    }

    .printer-details {
      color: #6b7280;
      font-size: 14px;
    }

    .printer-status {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      margin-top: 8px;
    }

    .printer-status.online {
      background: #d1fae5;
      color: #065f46;
    }

    .printer-status.offline {
      background: #fee2e2;
      color: #991b1b;
    }

    .options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
    }

    .option-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .option-group label {
      font-weight: 500;
      color: #374151;
      font-size: 14px;
    }

    .option-group input,
    .option-group select {
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
    }

    .option-group input:focus,
    .option-group select:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .footer {
      padding: 24px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .btn {
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover {
      background: #5568d3;
    }

    .btn-primary:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
    }

    .btn-secondary:hover {
      background: #e5e7eb;
    }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: #6b7280;
    }

    .empty-state h3 {
      font-size: 18px;
      margin-bottom: 8px;
      color: #374151;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🖨️ Select Printer</h1>
      <p>Choose one or more printers for your print job</p>
    </div>

    <div class="content">
      <div id="printer-list" class="printer-list">
        <!-- Printers will be loaded here -->
      </div>

      <div class="options">
        <div class="option-group">
          <label for="copies">Copies</label>
          <input type="number" id="copies" min="1" max="99" value="1">
        </div>
        <div class="option-group">
          <label for="colorMode">Color Mode</label>
          <select id="colorMode">
            <option value="color">Color</option>
            <option value="grayscale">Grayscale</option>
          </select>
        </div>
      </div>
    </div>

    <div class="footer">
      <button class="btn btn-secondary" onclick="cancel()">Cancel</button>
      <button class="btn btn-primary" id="submitBtn" onclick="submit()" disabled>Print</button>
    </div>
  </div>

  <script>
    let selectedPrinters = new Set();

    async function loadPrinters() {
      try {
        const response = await fetch('/printers');
        const printers = await response.json();

        const printerList = document.getElementById('printer-list');

        if (printers.length === 0) {
          printerList.innerHTML = \`
            <div class="empty-state">
              <h3>No Printers Available</h3>
              <p>No printers are currently online and enabled.</p>
            </div>
          \`;
          return;
        }

        printerList.innerHTML = printers.map(printer => \`
          <div class="printer-card" onclick="togglePrinter('\${printer.id}')" id="card-\${printer.id}">
            <input type="checkbox" id="printer-\${printer.id}" onchange="togglePrinter('\${printer.id}')">
            <div class="printer-name">\${printer.displayName}</div>
            <div class="printer-details">
              \${printer.location ? '📍 ' + printer.location : ''}
              \${printer.description ? '<br>' + printer.description : ''}
            </div>
            <span class="printer-status \${printer.status}">\${printer.status}</span>
          </div>
        \`).join('');
      } catch (error) {
        console.error('Failed to load printers:', error);
      }
    }

    function togglePrinter(id) {
      const checkbox = document.getElementById('printer-' + id);
      const card = document.getElementById('card-' + id);

      checkbox.checked = !checkbox.checked;

      if (checkbox.checked) {
        selectedPrinters.add(id);
        card.classList.add('selected');
      } else {
        selectedPrinters.delete(id);
        card.classList.remove('selected');
      }

      updateSubmitButton();
    }

    function updateSubmitButton() {
      const submitBtn = document.getElementById('submitBtn');
      submitBtn.disabled = selectedPrinters.size === 0;
    }

    async function submit() {
      const copies = parseInt(document.getElementById('copies').value);
      const colorMode = document.getElementById('colorMode').value;

      const data = {
        printerIds: Array.from(selectedPrinters),
        copies: copies,
        colorMode: colorMode
      };

      try {
        await fetch('/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        window.close();
      } catch (error) {
        console.error('Failed to submit:', error);
      }
    }

    async function cancel() {
      try {
        await fetch('/cancel', { method: 'POST' });
        window.close();
      } catch (error) {
        console.error('Failed to cancel:', error);
      }
    }

    // Load printers on page load
    loadPrinters();
  </script>
</body>
</html>`;
  }
}
