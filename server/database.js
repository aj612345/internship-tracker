const Database = require('better-sqlite3');
const path = require('node:path');
const fs = require('node:fs');

const databasePath = path.resolve(__dirname, process.env.DB_FILE || 'data/applications.db');
fs.mkdirSync(path.dirname(databasePath), { recursive: true });
const db = new Database(databasePath);

db.exec(`
  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    dateApplied TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Applied', 'Interview', 'Rejected', 'Offer')),
    location TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT ''
  )
`);

// These are fictional examples. Seed only when the table is empty at startup.
if (db.prepare('SELECT COUNT(*) AS total FROM applications').get().total === 0) {
  const insert = db.prepare(`
    INSERT INTO applications (company, role, dateApplied, status, location, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const seed = db.transaction(() => {
    insert.run('Stripe', 'Software Engineering Intern', '2026-10-05', 'Applied',
      'San Francisco, CA', 'Applied through the careers page. Interested in the payments team.');
    insert.run('Spotify', 'Backend Engineering Intern', '2026-10-02', 'Interview',
      'New York, NY', 'Recruiter screen complete. Review APIs and data structures for the next round.');
    insert.run('Notion', 'Product Engineering Intern', '2026-09-28', 'Rejected',
      'Remote', 'Received an update by email. Keep an eye on future openings.');
  });
  seed();
}

module.exports = db;
