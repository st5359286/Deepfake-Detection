const db = require('./db');
const fs = require('fs');
const path = require('path');

const TTL_DAYS = parseInt(process.env.CACHE_TTL_DAYS || '90', 10);
const RESULTS_DIR = path.join(__dirname, 'public', 'results');

function cleanup() {
  console.log('[CLEANUP] Starting cleanup job...');
  const cutoff = new Date(Date.now() - TTL_DAYS * 24 * 60 * 60 * 1000);
  const cutoffStr = cutoff.toISOString().slice(0, 19).replace('T', ' ');

  // Find old detections
  const query = `SELECT id, heatmap_path FROM detections WHERE processed_at IS NOT NULL AND processed_at < ?`;
  db.query(query, [cutoffStr], (err, results) => {
    if (err) {
      console.error('[CLEANUP] DB query failed:', err);
      return;
    }

    results.forEach(row => {
      if (row.heatmap_path) {
        // heatmap_path expected like '/results/filename.png'
        const filename = row.heatmap_path.replace(/^\/results\//, '');
        const filePath = path.join(__dirname, 'public', 'results', filename);
        fs.unlink(filePath, (e) => {
          if (e) console.log('[CLEANUP] Failed to delete file', filePath, e.message);
          else console.log('[CLEANUP] Deleted file', filePath);
        });
      }
    });

    // Delete rows
    db.query('DELETE FROM detections WHERE processed_at IS NOT NULL AND processed_at < ?', [cutoffStr], (err2, result) => {
      if (err2) console.error('[CLEANUP] Failed to delete old detections:', err2);
      else console.log('[CLEANUP] Deleted old detections older than', cutoffStr);
    });
  });
}

if (require.main === module) {
  // Run once immediately and then every 24 hours
  cleanup();
  setInterval(cleanup, 24 * 60 * 60 * 1000);
}

module.exports = { cleanup };
