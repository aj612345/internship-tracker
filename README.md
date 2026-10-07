# Internship Application Tracker

A full-stack dashboard for keeping internship applications and progress in one place. Built with a small, readable codebase for learning React, HTTP APIs, and relational databases.

## Features

- Add, view, edit, and delete internship applications.
- Record company, role, date applied, status, location, and notes. Each record has an automatically generated ID.
- Four statuses: **Applied**, **Interview**, **Rejected**, and **Offer**.
- Search companies (case-insensitive), filter by status, or use both together.
- Dashboard cards for total applications, interviews, rejections, offers, and response rate.
- Required-field and date validation, helpful error messages, delete confirmation, and loading/empty states.
- SQLite persistence and three fictional sample applications on an empty database.
- Responsive layout with a horizontally scrollable table on smaller screens.

Response rate is `(interviews + rejections + offers) / total applications * 100`, rounded to one decimal place. It is **0%** when there are no applications. Counts reflect each application's current status, not its history. Dashboard cards always include all applications, even when the list is filtered.

## Tech stack

- **Frontend:** React, Vite, plain CSS, and native `fetch()`.
- **Backend:** Node.js and Express.
- **Database:** SQLite through `better-sqlite3`; no separate database service or ORM.
- **Tests:** Node's built-in test runner and assertions; no test framework dependency.

## Architecture

```text
React dashboard → fetch('/api/...') → Vite proxy → Express → SQLite file
       ↑                                            │
       └────────────── JSON responses ───────────────┘
```

The frontend and backend run as two processes during development. Vite forwards `/api` requests to `http://localhost:3000`, avoiding the need for CORS configuration. After a successful add, edit, or delete, React requests the updated applications and statistics. Search and filtering run in React on the loaded applications, so typing does not need another network request.

```text
client/
  index.html                HTML entry point
  vite.config.js            React plugin, ports, and API proxy
  src/
    main.jsx                Mounts React and loads CSS
    App.jsx                 Dashboard, state, filters, and save/delete flows
    ApplicationForm.jsx     Shared add/edit form
    ApplicationTable.jsx    Table, notes, and row actions
    api.js                  fetch helper and response/error handling
    constants.js            Allowed statuses for the UI
    styles.css              All styling and responsive layouts
server/
  server.js                 Express routes, validation, and error handling
  database.js               SQLite connection, table creation, and seed data
  server.test.js            API integration tests with a disposable database
  .env.example              Optional backend configuration
  data/applications.db      Generated SQLite file (ignored by Git)
```

Each folder has its own `package.json` and `package-lock.json`. The package file lists dependencies and commands; the lockfile records exact installed versions. SQL statements use placeholders so submitted values are treated as data.

## Setup

Use **Node.js 22.12 or newer** (tested with 22.16) and npm. No SQLite CLI installation is needed.

From the repository root, install dependencies:

```bash
cd server
npm install
cd ../client
npm install
```

Start the backend in one terminal, from the repository root:

```bash
cd server
npm start
```

Start the frontend in a second terminal, from the repository root:

```bash
cd client
npm run dev
```

- Frontend: **http://localhost:5173**
- Backend: **http://localhost:3000**
- Applications JSON: **http://localhost:3000/api/applications**
- Statistics JSON: **http://localhost:3000/api/stats**

Press **Ctrl+C** in each terminal to stop it. During backend development, use `npm run dev` instead of `npm start` to restart automatically when backend code changes. Vite updates the frontend automatically.

### Optional environment variables

The defaults work without an `.env` file. To customize the backend, run `cp .env.example .env` inside `server`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Backend HTTP port |
| `DB_FILE` | `data/applications.db` | SQLite path, relative to `server` or absolute |

Node loads `server/.env` when you run the backend npm scripts. If you change `PORT`, update the proxy target in `client/vite.config.js` and restart Vite as well. No frontend environment variables are required. `node_modules`, `.env` files, build output, and database files are ignored by Git; `.env.example` is safe to track.

### Persistence and sample data

Starting the backend creates `server/data/applications.db` and the applications table if needed. When the table is empty **at startup**, it inserts three fictional applications for Stripe, Spotify, and Notion. Existing records are preserved, and restarting a nonempty database does not insert duplicates.

Data survives browser reloads and backend restarts. If you delete every application, the dashboard stays empty while the server runs; restarting it seeds the three examples again. The database file is local and is not included in Git.

## API endpoints

All API responses are JSON except a successful deletion, which has no response body.

| Method | Path | Behavior | Success status |
| --- | --- | --- | --- |
| GET | `/` | Returns `Internship Tracker API` | 200 |
| GET | `/api/applications` | Lists applications, newest application date first | 200 |
| POST | `/api/applications` | Creates and returns an application | 201 |
| PUT | `/api/applications/:id` | Replaces editable fields and returns the updated application | 200 |
| DELETE | `/api/applications/:id` | Deletes an application | 204 |
| GET | `/api/stats` | Returns overall counts and response rate | 200 |

Send this JSON shape for POST and PUT:

```json
{
  "company": "Acme",
  "role": "Software Engineering Intern",
  "dateApplied": "2026-10-07",
  "status": "Applied",
  "location": "Remote",
  "notes": "Applied through the careers page."
}
```

`company`, `role`, `dateApplied`, and `status` are required strings. Company and role cannot be blank. `dateApplied` must be a real date in `YYYY-MM-DD` format. Status must exactly match one of the four allowed values. `location` and `notes` are optional strings and default to empty strings; omitting them in PUT clears their existing values. IDs are generated by SQLite and cannot be changed through PUT.

Example statistics response for the seeded data:

```json
{
  "total": 3,
  "interviews": 1,
  "rejections": 1,
  "offers": 0,
  "responseRate": 66.7
}
```

Errors have the shape `{ "error": "Helpful message" }`. Invalid input or IDs return **400**, missing applications/routes return **404**, JSON bodies over 100 KB return **413**, and unexpected server errors return **500**. The API returns all applications; the frontend handles company search and status filtering.

## Verification

Run automated API tests from `server`:

```bash
npm test
```

The tests start a server on an available port and use a temporary SQLite database, leaving your real data untouched. They cover seeding, CRUD, persistence in a separate process, statistics after changes, validation, malformed JSON, missing records, and the empty state.

Build the frontend from `client`:

```bash
npm run build
```

To inspect the production build locally, keep the backend running and run `npm run preview` in `client`, then visit **http://localhost:4173**. The preview proxy also forwards `/api` to port 3000. The `dist` output by itself does not contain the backend; a real deployment would need to route `/api` to Express.

Manual browser checks:

1. Add an application with all fields; verify the row and total update.
2. Edit its status to Offer; verify the row, offers count, and response rate update.
3. Search for its company using different letter casing, then combine the search with a status filter.
4. Choose a mismatching status to see the no-results message; clear the filters.
5. Reload the page and verify saved data remains.
6. Delete the test application using the confirmation, then verify the counts return to their previous values.

If port 3000 or 5173 is already in use, stop the previous instance before restarting. If the frontend cannot load data, check that the backend is running and use **Retry** in the error message.

This MVP is a local, single-user project with no authentication. No deployment is configured.

## Reference documentation

- [Vite setup and requirements](https://vite.dev/guide/)
- [Vite's API proxy configuration](https://vite.dev/config/server-options#server-proxy)
- [better-sqlite3 usage](https://github.com/WiseLibs/better-sqlite3)
