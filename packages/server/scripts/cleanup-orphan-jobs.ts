import { db } from '../src/database';
import * as path from 'path';

async function cleanupOrphanJobs() {
  console.log('Starting orphan job cleanup...');

  // Initialize database
  const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/rprint.db');
  await db.connect(dbPath);
  await db.initialize();

  // Find all pending jobs with printers that no longer exist
  const orphanJobs = await db.all<any>(`
    SELECT pj.id, pj.file_name, pj.printer_id
    FROM print_jobs pj
    LEFT JOIN printers p ON pj.printer_id = p.id
    WHERE pj.status = 'pending'
    AND p.id IS NULL
  `);

  console.log(`Found ${orphanJobs.length} orphan jobs`);

  for (const job of orphanJobs) {
    console.log(`Marking job ${job.id} (${job.file_name}) as failed - printer ${job.printer_id} no longer exists`);

    await db.run(`
      UPDATE print_jobs
      SET status = 'failed',
          error_message = 'Printer no longer exists',
          completed_at = ?
      WHERE id = ?
    `, [new Date().toISOString(), job.id]);
  }

  console.log('Cleanup complete!');
  process.exit(0);
}

cleanupOrphanJobs().catch(error => {
  console.error('Error during cleanup:', error);
  process.exit(1);
});
