const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const db = new sqlite3.Database('/var/www/rprint/packages/server/data/rprint.db');

// Get a client and printer
db.get('SELECT id FROM clients LIMIT 1', (err, client) => {
  if (err || !client) {
    console.error('No client found. Please register first.');
    db.close();
    return;
  }

  db.get('SELECT id, name FROM printers WHERE worker_id = ? LIMIT 1', ['c339822e-fbd0-4f61-a557-2323277a13b7'], (err, printer) => {
    if (err || !printer) {
      console.error('No printer found for APrinter worker');
      db.close();
      return;
    }

    // Create test PDF
    const testPdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>>>>>endobj
4 0 obj<</Length 44>>stream
BT /F1 12 Tf 100 700 Td (Test Print Job) Tj ET
endstream endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000293 00000 n
trailer<</Size 5/Root 1 0 R>>
startxref
385
%%EOF`;

    const fileName = `test-${Date.now()}.pdf`;
    const filePath = path.join('/var/www/rprint/packages/server/uploads', fileName);

    fs.writeFileSync(filePath, testPdf);

    const jobId = uuidv4();
    const now = new Date().toISOString();

    db.run(`INSERT INTO print_jobs (
      id, client_id, printer_id, file_name, file_path, file_size, mime_type,
      status, copies, color_mode, duplex, orientation, paper_size, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      jobId,
      client.id,
      printer.id,
      fileName,
      filePath,
      Buffer.byteLength(testPdf),
      'application/pdf',
      'pending',
      1,
      'color',
      'none',
      'portrait',
      'Letter',
      now
    ], (err) => {
      if (err) {
        console.error('Error creating job:', err);
      } else {
        console.log(`✓ Created test job: ${jobId}`);
        console.log(`  Printer: ${printer.name}`);
        console.log(`  File: ${fileName}`);
        console.log(`\nNow test polling with:`);
        console.log(`curl "http://localhost:3001/api/jobs/poll/pending?printerId=${printer.id}" -H "X-API-Key: 914276cef5583f25cb501696250693a476d02a40c89d7376ffa69b565d9ac09a"`);
      }
      db.close();
    });
  });
});
