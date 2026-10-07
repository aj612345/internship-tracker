const express = require('express');
const db = require('./database');

const app = express();
const port = process.env.PORT || 3000;
const statuses = ['Applied', 'Interview', 'Rejected', 'Offer'];

// Convert incoming JSON request bodies into JavaScript objects in req.body.
app.use(express.json({ limit: '100kb' }));

function validateApplication(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Send an application as a JSON object.';
  }
  for (const field of ['company', 'role', 'dateApplied', 'status']) {
    if (typeof body[field] !== 'string' || !body[field].trim()) {
      return `${field} is required and must be text.`;
    }
  }
  if (!statuses.includes(body.status)) {
    return 'Status must be Applied, Interview, Rejected, or Offer.';
  }
  const date = new Date(`${body.dateApplied}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.dateApplied) || Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== body.dateApplied) {
    return 'dateApplied must be a real date in YYYY-MM-DD format.';
  }
  for (const field of ['location', 'notes']) {
    if (body[field] !== undefined && typeof body[field] !== 'string') {
      return `${field} must be text.`;
    }
  }
  return null;
}

function applicationValues(body) {
  return [body.company.trim(), body.role.trim(), body.dateApplied, body.status,
    (body.location || '').trim(), (body.notes || '').trim()];
}

// Validate route IDs before using them in a database query.
app.param('id', (req, res, next, value) => {
  const id = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Application ID must be a positive integer.' });
  }
  req.applicationId = id;
  next();
});

app.get('/', (req, res) => {
  res.send('Internship Tracker API');
});

app.get('/api/applications', (req, res) => {
  const applications = db.prepare('SELECT * FROM applications ORDER BY dateApplied DESC, id DESC').all();
  res.json(applications);
});

app.post('/api/applications', (req, res) => {
  const error = validateApplication(req.body);
  if (error) return res.status(400).json({ error });

  // Placeholders keep user input separate from the SQL statement.
  const result = db.prepare(`
    INSERT INTO applications (company, role, dateApplied, status, location, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(...applicationValues(req.body));
  const application = db.prepare('SELECT * FROM applications WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(application);
});

app.put('/api/applications/:id', (req, res) => {
  const error = validateApplication(req.body);
  if (error) return res.status(400).json({ error });

  const result = db.prepare(`
    UPDATE applications SET company = ?, role = ?, dateApplied = ?, status = ?, location = ?, notes = ?
    WHERE id = ?
  `).run(...applicationValues(req.body), req.applicationId);
  if (result.changes === 0) return res.status(404).json({ error: 'Application not found.' });
  res.json(db.prepare('SELECT * FROM applications WHERE id = ?').get(req.applicationId));
});

app.delete('/api/applications/:id', (req, res) => {
  const result = db.prepare('DELETE FROM applications WHERE id = ?').run(req.applicationId);
  if (result.changes === 0) return res.status(404).json({ error: 'Application not found.' });
  res.status(204).end();
});

app.get('/api/stats', (req, res) => {
  const stats = db.prepare(`
    SELECT COUNT(*) AS total,
      COUNT(CASE WHEN status = 'Interview' THEN 1 END) AS interviews,
      COUNT(CASE WHEN status = 'Rejected' THEN 1 END) AS rejections,
      COUNT(CASE WHEN status = 'Offer' THEN 1 END) AS offers
    FROM applications
  `).get();
  const responses = stats.interviews + stats.rejections + stats.offers;
  stats.responseRate = stats.total === 0 ? 0 : Number((responses / stats.total * 100).toFixed(1));
  res.json(stats);
});

app.use((req, res) => res.status(404).json({ error: 'Endpoint not found.' }));

app.use((error, req, res, next) => {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body must contain valid JSON.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Application is too large. Please shorten your text.' });
  }
  console.error(error);
  res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
});

// Importing app in tests does not start the normal server.
if (require.main === module) {
  app.listen(port, () => console.log(`Server running at http://localhost:${port}`))
    .on('error', (error) => {
      console.error(`Could not start server: ${error.message}`);
      process.exitCode = 1;
    });
}

module.exports = app;
