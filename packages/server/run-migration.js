const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/rprint.db');
const MIGRATION_FILE = path.join(__dirname, 'src/database/migrations/add-virtual-printer-fields.sql');

console.log('Running migration: add-virtual-printer-fields.sql');
console.log('Database:', DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
});

const migration = fs.readFileSync(MIGRATION_FILE, 'utf8');

// Split by semicolon and filter out empty statements
const statements = migration
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`Found ${statements.length} statements to execute\n`);

let completed = 0;

statements.forEach((statement, index) => {
  db.run(statement, (err) => {
    if (err) {
      // Ignore "duplicate column" errors (migration already run)
      if (err.message.includes('duplicate column')) {
        console.log(`Statement ${index + 1}: Already applied (column exists)`);
      } else {
        console.error(`Error in statement ${index + 1}:`, err.message);
      }
    } else {
      console.log(`Statement ${index + 1}: Success`);
    }

    completed++;
    if (completed === statements.length) {
      db.close();
      console.log('\nMigration complete!');
    }
  });
});
