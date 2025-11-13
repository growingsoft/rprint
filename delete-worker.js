const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('/var/www/rprint/packages/server/data/rprint.db');

const workerName = process.argv[2];

if (!workerName) {
  console.error('Usage: node delete-worker.js <worker-name>');
  process.exit(1);
}

// First, get the worker ID
db.get('SELECT id, name FROM workers WHERE name = ?', [workerName], (err, worker) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  if (!worker) {
    console.error(`Worker "${workerName}" not found`);
    db.close();
    return;
  }

  console.log(`Found worker: ${worker.name} (${worker.id})`);

  // Count printers for this worker
  db.get('SELECT COUNT(*) as count FROM printers WHERE worker_id = ?', [worker.id], (err, result) => {
    if (err) {
      console.error('Error counting printers:', err);
      db.close();
      return;
    }

    console.log(`  - Has ${result.count} printers`);

    // Delete all printers for this worker (CASCADE should handle this, but let's be explicit)
    db.run('DELETE FROM printers WHERE worker_id = ?', [worker.id], function(err) {
      if (err) {
        console.error('Error deleting printers:', err);
        db.close();
        return;
      }

      console.log(`  - Deleted ${this.changes} printers`);

      // Delete the worker
      db.run('DELETE FROM workers WHERE id = ?', [worker.id], function(err) {
        if (err) {
          console.error('Error deleting worker:', err);
          db.close();
          return;
        }

        console.log(`  - Deleted worker "${workerName}"`);
        console.log('\nSuccess! Worker and all associated printers have been deleted.');
        db.close();
      });
    });
  });
});
