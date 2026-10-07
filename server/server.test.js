const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { execFileSync } = require('node:child_process');

// Tests use a disposable database and never change your applications.
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'internship-tracker-test-'));
process.env.DB_FILE = path.join(directory, 'test.db');
const app = require('./server');
const db = require('./database');
let server;
let baseUrl;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise(resolve => server.close(resolve));
  db.close();
  fs.rmSync(directory, { recursive: true, force: true });
});

async function request(route, method = 'GET', body) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, data: response.status === 204 ? null : await response.json() };
}

const example = {
  company: '  Test Company  ', role: 'Software Intern', dateApplied: '2026-10-07',
  status: 'Applied', location: 'Remote', notes: "Learn SQL; don't DROP TABLE applications;",
};

test('seeds exactly three applications and calculates starting statistics', async () => {
  const response = await request('/api/applications');
  assert.equal(response.status, 200);
  assert.equal(response.data.length, 3);
  assert.deepEqual(Object.keys(response.data[0]).sort(),
    ['id', 'company', 'role', 'dateApplied', 'status', 'location', 'notes'].sort());
  assert.deepEqual((await request('/api/stats')).data,
    { total: 3, interviews: 1, rejections: 1, offers: 0, responseRate: 66.7 });
});

test('creates, reads, updates, persists, and deletes with accurate statistics', async () => {
  const created = await request('/api/applications', 'POST', example);
  assert.equal(created.status, 201);
  assert.equal(created.data.company, 'Test Company');
  const id = created.data.id;
  assert.deepEqual((await request('/api/applications')).data.find(item => item.id === id), created.data);
  assert.deepEqual((await request('/api/stats')).data,
    { total: 4, interviews: 1, rejections: 1, offers: 0, responseRate: 50 });

  for (const status of ['Interview', 'Rejected', 'Offer']) {
    const updated = await request(`/api/applications/${id}`, 'PUT', { ...example, status });
    assert.equal(updated.status, 200);
    assert.equal(updated.data.status, status);
    const stats = (await request('/api/stats')).data;
    assert.equal(stats.responseRate, 75);
    assert.equal(stats.interviews, status === 'Interview' ? 2 : 1);
    assert.equal(stats.rejections, status === 'Rejected' ? 2 : 1);
    assert.equal(stats.offers, status === 'Offer' ? 1 : 0);
  }

  // A separate Node process reopens the same file and runs startup initialization.
  const persisted = JSON.parse(execFileSync(process.execPath, ['-e',
    "const db = require('./database'); console.log(JSON.stringify(db.prepare('SELECT * FROM applications').all())); db.close();",
  ], { cwd: __dirname, encoding: 'utf8', env: process.env }));
  assert.equal(persisted.length, 4, 'startup does not duplicate the seed');
  assert.equal(persisted.find(item => item.id === id).status, 'Offer');

  assert.equal((await request(`/api/applications/${id}`, 'DELETE')).status, 204);
  assert.equal((await request('/api/applications')).data.some(item => item.id === id), false);
  assert.deepEqual((await request('/api/stats')).data,
    { total: 3, interviews: 1, rejections: 1, offers: 0, responseRate: 66.7 });
  assert.equal((await request(`/api/applications/${id}`, 'DELETE')).status, 404);
});

test('rejects missing required fields, invalid types, statuses, and impossible dates', async () => {
  const invalidBodies = [null, [], {}, { ...example, company: '   ' },
    { ...example, role: 7 }, { ...example, status: 'Pending' },
    { ...example, dateApplied: '2026-02-30' }, { ...example, dateApplied: 'yesterday' },
    { ...example, location: null }, { ...example, notes: [] }];
  for (const field of ['company', 'role', 'dateApplied', 'status']) {
    const body = { ...example };
    delete body[field];
    invalidBodies.push(body);
  }
  for (const body of invalidBodies) {
    for (const [route, method] of [['/api/applications', 'POST'], ['/api/applications/1', 'PUT']]) {
      const response = await request(route, method, body);
      assert.equal(response.status, 400);
      assert.equal(typeof response.data.error, 'string');
    }
  }
  assert.equal((await request('/api/stats')).data.total, 3);
});

test('handles bad IDs, missing records, malformed JSON, oversized bodies, and unknown routes', async () => {
  for (const id of ['abc', '0', '-1', '1.5', '9007199254740992']) {
    assert.equal((await request(`/api/applications/${id}`, 'DELETE')).status, 400);
    assert.equal((await request(`/api/applications/${id}`, 'PUT', example)).status, 400);
  }
  assert.equal((await request('/api/applications/999999', 'PUT', example)).status, 404);
  assert.equal((await request('/api/missing')).status, 404);
  const malformed = await fetch(`${baseUrl}/api/applications`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad json',
  });
  assert.equal(malformed.status, 400);
  assert.match((await malformed.json()).error, /valid JSON/);
  assert.equal((await request('/api/applications', 'POST', { ...example, notes: 'x'.repeat(110000) })).status, 413);
});

test('optional fields default to empty text and an empty database has a zero response rate', async () => {
  const created = await request('/api/applications', 'POST', {
    company: 'Minimal', role: 'Intern', dateApplied: '2024-02-29', status: 'Applied',
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.location, '');
  assert.equal(created.data.notes, '');
  for (const application of (await request('/api/applications')).data) {
    assert.equal((await request(`/api/applications/${application.id}`, 'DELETE')).status, 204);
  }
  assert.deepEqual((await request('/api/applications')).data, []);
  assert.deepEqual((await request('/api/stats')).data,
    { total: 0, interviews: 0, rejections: 0, offers: 0, responseRate: 0 });
});
