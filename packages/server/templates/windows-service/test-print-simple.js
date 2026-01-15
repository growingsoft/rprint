// RPrint Simple Print Test
// Tests pdf-to-printer without creating images

const pdfToPrinter = require('pdf-to-printer');

console.log('========================================');
console.log('  RPrint Simple Print Test');
console.log('========================================');
console.log('');

async function runTest() {
  try {
    // Step 1: Get all printers
    console.log('[1/3] Getting available printers...');
    const printers = await pdfToPrinter.getPrinters();

    console.log(`Found ${printers.length} printer(s):\n`);
    printers.forEach((printer, index) => {
      console.log(`  ${index + 1}. ${printer.name}`);
      if (printer.paperSizes && printer.paperSizes.length > 0) {
        console.log(`     Paper sizes: ${printer.paperSizes.join(', ')}`);
      }
      if (printer.name.toLowerCase().includes('rollo')) {
        console.log('     ✓ This is the Rollo printer!');
      }
    });
    console.log('');

    // Step 2: Find Rollo printer
    console.log('[2/3] Looking for Rollo Printer...');
    const rolloPrinter = printers.find(p =>
      p.name === 'Rollo Printer' ||
      p.name.toLowerCase().includes('rollo')
    );

    if (!rolloPrinter) {
      console.log('✗ Rollo Printer not found!');
      console.log('');
      console.log('Available printer names:');
      printers.forEach(p => console.log(`  - "${p.name}"`));
      console.log('');
      console.log('The printer name in the database must match EXACTLY.');
      console.log('Check Windows printer name with: Get-Printer | Select Name');
      process.exit(1);
    }

    console.log(`✓ Found: ${rolloPrinter.name}`);
    if (rolloPrinter.paperSizes && rolloPrinter.paperSizes.length > 0) {
      console.log(`  Supported paper sizes: ${rolloPrinter.paperSizes.join(', ')}`);

      const hasCustomSize = rolloPrinter.paperSizes.some(size =>
        size.toLowerCase().includes('label') ||
        size.toLowerCase().includes('1.5') ||
        size.toLowerCase().includes('3')
      );

      if (hasCustomSize) {
        console.log('  ✓ Custom label size detected!');
      } else {
        console.log('  ⚠ Custom label size "Label_1.5x3" not found in supported sizes');
        console.log('  You may need to create it in Windows printer properties');
      }
    }
    console.log('');

    // Step 3: Check default printer
    console.log('[3/3] Checking default printer...');
    const defaultPrinter = await pdfToPrinter.getDefaultPrinter();
    if (defaultPrinter) {
      console.log(`✓ Default printer: ${defaultPrinter.name}`);
    } else {
      console.log('⚠ No default printer set');
    }
    console.log('');

    // Summary
    console.log('========================================');
    console.log('  Test Results');
    console.log('========================================');
    console.log('');
    console.log('✓ pdf-to-printer is working');
    console.log('✓ Can access Windows printers');
    console.log(`✓ Found Rollo printer: "${rolloPrinter.name}"`);
    console.log('');
    console.log('Next Steps:');
    console.log('');
    console.log('1. Verify printer name in database matches:');
    console.log(`   "${rolloPrinter.name}"`);
    console.log('');
    console.log('2. Create custom paper size in Windows:');
    console.log('   a) Open: Control Panel > Devices and Printers');
    console.log('   b) Right-click Rollo Printer > Printer Properties');
    console.log('   c) Device Settings or Printing Preferences');
    console.log('   d) Create new paper size: "Label_1.5x3"');
    console.log('      Width: 1.5 inches');
    console.log('      Height: 3.0 inches');
    console.log('');
    console.log('3. Make sure Windows paper size name matches exactly:');
    console.log('   Database uses: "Label_1.5x3"');
    console.log('   Windows must have a paper form with this EXACT name');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('========================================');
    console.error('  ERROR');
    console.error('========================================');
    console.error('');
    console.error(error.message);
    console.error('');
    console.error('This usually means:');
    console.error('1. pdf-to-printer is not installed correctly');
    console.error('2. SumatraPDF is not in the PATH');
    console.error('3. Permissions issue');
    console.error('');
    process.exit(1);
  }
}

runTest();
