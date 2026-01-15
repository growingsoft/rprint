// RPrint Test Print Script
// This script tests printing directly using pdf-to-printer

const pdfToPrinter = require('pdf-to-printer');
const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('  RPrint Print Test Utility');
console.log('========================================');
console.log('');

// Step 1: List all available printers
console.log('[Step 1] Listing available printers...');
pdfToPrinter.getPrinters()
  .then(printers => {
    console.log('Found', printers.length, 'printer(s):');
    printers.forEach((printer, index) => {
      console.log(`  ${index + 1}. ${printer.name}`);
      if (printer.name.toLowerCase().includes('rollo')) {
        console.log('     ✓ This looks like the Rollo printer!');
      }
    });
    console.log('');

    // Step 2: Get default printer
    return pdfToPrinter.getDefaultPrinter();
  })
  .then(defaultPrinter => {
    console.log('[Step 2] Default printer:', defaultPrinter ? defaultPrinter.name : 'None');
    console.log('');

    // Step 3: Create a test image
    console.log('[Step 3] Creating test label image...');

    // Create a simple test PNG (1.5" x 3" at 203dpi = 305x610 pixels)
    const { createCanvas } = require('canvas');
    const canvas = createCanvas(305, 610);
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 305, 610);

    // Add border
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.strokeRect(5, 5, 295, 600);

    // Add text
    ctx.fillStyle = 'black';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('RPrint Test Label', 152, 100);

    ctx.font = '18px Arial';
    ctx.fillText('1.5" x 3" Format', 152, 150);
    ctx.fillText(new Date().toLocaleString(), 152, 200);

    ctx.font = 'bold 48px Arial';
    ctx.fillText('SUCCESS!', 152, 350);

    ctx.font = '14px Arial';
    ctx.fillText('If you can see this,', 152, 450);
    ctx.fillText('printing is working!', 152, 480);

    const testFile = path.join(__dirname, 'test-label.png');
    const out = fs.createWriteStream(testFile);
    const stream = canvas.createPNGStream();
    stream.pipe(out);

    return new Promise((resolve, reject) => {
      out.on('finish', () => {
        console.log('✓ Test image created:', testFile);
        console.log('');
        resolve(testFile);
      });
      out.on('error', reject);
    });
  })
  .then(testFile => {
    // Step 4: Test print to Rollo printer
    console.log('[Step 4] Testing print to Rollo Printer...');
    console.log('');

    const printerName = 'Rollo Printer'; // Try exact name from database
    const printOptions = {
      printer: printerName,
      paperSize: 'Label_1.5x3',
      copies: 1,
      scale: 'noscale'
    };

    console.log('Printer:', printerName);
    console.log('Paper Size:', printOptions.paperSize);
    console.log('File:', testFile);
    console.log('');
    console.log('Sending to printer...');

    return pdfToPrinter.print(testFile, printOptions)
      .then(() => {
        console.log('');
        console.log('========================================');
        console.log('✓ Print command completed successfully!');
        console.log('========================================');
        console.log('');
        console.log('Check your Rollo printer now.');
        console.log('If nothing printed, try these:');
        console.log('');
        console.log('1. Check printer name matches exactly');
        console.log('2. Add custom paper size in Windows:');
        console.log('   - Control Panel > Printers');
        console.log('   - Right-click Rollo > Printer Properties');
        console.log('   - Advanced > Paper Size > New');
        console.log('   - Create: "Label_1.5x3" - 1.5" x 3"');
        console.log('');

        // Clean up
        fs.unlinkSync(testFile);
      })
      .catch(error => {
        console.log('');
        console.log('========================================');
        console.log('✗ Print failed with error:');
        console.log('========================================');
        console.log(error.message);
        console.log('');
        console.log('Troubleshooting:');
        console.log('');
        console.log('1. Try with default printer instead:');
        console.log('   Remove the "printer:" option');
        console.log('');
        console.log('2. Try without paperSize:');
        console.log('   Remove the "paperSize:" option');
        console.log('');
        console.log('3. Check printer name - it must match EXACTLY');
        console.log('   Run: Get-Printer | Select Name');
        console.log('');

        // Clean up
        try { fs.unlinkSync(testFile); } catch(e) {}
        throw error;
      });
  })
  .catch(error => {
    console.error('');
    console.error('ERROR:', error.message);
    console.error('');
    process.exit(1);
  });
