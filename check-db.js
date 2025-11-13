const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('/var/www/rprint/packages/server/data/rprint.db');

console.log('=== WORKERS ===');
db.all('SELECT id, name, status, last_heartbeat FROM workers ORDER BY last_heartbeat DESC LIMIT 5', (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log(rows);
  }

  console.log('\n=== PRINTERS (Last 10) ===');
  db.all('SELECT id, name, display_name, worker_id, status FROM printers LIMIT 10', (err, rows) => {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log(rows);
    }

    console.log('\n=== PRINT JOBS (Last 20) ===');
    db.all('SELECT id, file_name, status, printer_id, created_at, error_message FROM print_jobs ORDER BY created_at DESC LIMIT 20', (err, rows) => {
      if (err) {
        console.error('Error:', err);
      } else {
        console.log(rows);
      }
      db.close();
    });
  });
});
