const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('/var/www/rprint/packages/server/data/rprint.db');

console.log('=== WORKERS ===');
db.all('SELECT id, name, status, last_heartbeat FROM workers', (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log(rows);
  }

  console.log('\n=== PRINTERS ===');
  db.all('SELECT id, name, display_name, worker_id, status FROM printers', (err, rows) => {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log(rows);
    }
    db.close();
  });
});
