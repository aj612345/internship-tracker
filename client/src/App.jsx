import { useEffect, useRef, useState } from 'react';
import { apiRequest } from './api';
import { STATUSES } from './constants';
import ApplicationForm from './ApplicationForm';
import ApplicationTable from './ApplicationTable';

export default function App() {
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const addButton = useRef(null);
  const busy = loading || saving || deletingId !== null;

  async function refreshData() {
    setLoading(true);
    setError('');
    try {
      const [nextApplications, nextStats] = await Promise.all([
        apiRequest('/api/applications'), apiRequest('/api/stats'),
      ]);
      setApplications(nextApplications);
      setStats(nextStats);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refreshData(); }, []);

  function openForm(application = null) {
    setEditing(application);
    setFormError('');
    setMessage('');
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setFormError('');
    addButton.current?.focus();
  }

  async function saveApplication(values) {
    setSaving(true);
    setFormError('');
    try {
      await apiRequest(editing ? `/api/applications/${editing.id}` : '/api/applications', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(values),
      });
      setMessage(editing ? 'Application updated.' : 'Application added. Another step forward!');
      closeForm();
      await refreshData();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteApplication(application) {
    setDeletingId(application.id);
    setError('');
    setMessage('');
    try {
      await apiRequest(`/api/applications/${application.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      if (editing?.id === application.id) closeForm();
      setMessage('Application deleted.');
      await refreshData();
    } catch (error) {
      setError(error.message);
    } finally {
      setDeletingId(null);
    }
  }

  // Filters affect the list; statistic cards always show overall progress.
  const filteredApplications = applications.filter(application =>
    application.company.toLowerCase().includes(search.trim().toLowerCase()) &&
    (!statusFilter || application.status === statusFilter),
  );
  const hasFilters = search.trim() !== '' || statusFilter !== '';
  const cards = [
    { label: 'Total applications', value: stats?.total, detail: 'Opportunities explored', symbol: '↗' },
    { label: 'Interviews', value: stats?.interviews, detail: 'Conversations started', symbol: '◷' },
    { label: 'Rejections', value: stats?.rejections, detail: 'Part of the process', symbol: '−' },
    { label: 'Offers', value: stats?.offers, detail: 'Doors opened', symbol: '✦' },
    { label: 'Response rate', value: stats ? `${stats.responseRate}%` : null, detail: 'Interview, rejection, or offer', symbol: '%' },
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Internship Tracker home">
          <span className="brand-mark" aria-hidden="true">↗</span> internship<span className="brand-light">tracker</span>
        </a>
        <span className="workspace-label"><span aria-hidden="true">●</span> Your career workspace</span>
      </header>
      <main>
        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow">SMALL STEPS. BIG POSSIBILITIES.</p>
          <h1 id="page-title">Your next chapter starts here.</h1>
          <p className="intro-description">A little organization for a big next step. Keep every opportunity in view.</p>
        </section>
        <section className="stats-grid" aria-label="Application statistics" aria-busy={loading}>
          {cards.map((card, index) => (
            <article className={`stat-card ${index === 0 ? 'stat-featured' : ''}`} key={card.label}>
              <div className="stat-heading"><h2>{card.label}</h2><span aria-hidden="true">{card.symbol}</span></div>
              <p className="stat-value">{card.value ?? '—'}</p>
              <p className="stat-detail">{card.detail}</p>
            </article>
          ))}
        </section>
        {error && <div className="notice error" role="alert">
          <span>{error}</span><button className="text-button" onClick={refreshData} disabled={busy}>Retry</button>
        </div>}
        {message && <div className="notice success" role="status">{message}</div>}
        <section className="applications-section" aria-labelledby="applications-title">
          <div className="section-heading applications-heading">
            <div><p className="eyebrow">THE OPPORTUNITY BOARD</p><h2 id="applications-title">Your applications</h2></div>
            <span className="muted small">One place for every next step.</span>
          </div>
          <div className="toolbar">
            <label className="search-field">Search companies
              <input type="search" placeholder="Search by company…" value={search} onChange={event => setSearch(event.target.value)} />
            </label>
            <label className="filter-field">Status
              <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
                <option value="">All statuses</option>
                {STATUSES.map(status => <option key={status}>{status}</option>)}
              </select>
            </label>
            {hasFilters && <button className="text-button clear-button" onClick={() => { setSearch(''); setStatusFilter(''); }}>Clear filters</button>}
          </div>
          <div className="list-heading">
            <p className="muted small" aria-live="polite">
              {loading ? 'Loading applications…' : `${filteredApplications.length} of ${applications.length} applications`}
            </p>
            <button ref={addButton} className="button primary" disabled={busy || formOpen || !!deleteTarget} onClick={() => openForm()}>
              <span aria-hidden="true">＋</span> Add Application
            </button>
          </div>
          {deleteTarget && <section className="delete-panel" aria-labelledby="delete-title">
            <h3 id="delete-title">Delete application at {deleteTarget.company}?</h3>
            <p>This will permanently remove your {deleteTarget.role} application.</p>
            <div className="form-actions">
              <button autoFocus className="button secondary" disabled={busy} onClick={() => setDeleteTarget(null)}>Keep application</button>
              <button className="button delete-button" disabled={busy} onClick={() => deleteApplication(deleteTarget)}>
                {deletingId ? 'Deleting…' : 'Confirm delete'}
              </button>
            </div>
          </section>}
          {formOpen && <ApplicationForm key={editing?.id ?? 'new'} application={editing}
            onSave={saveApplication} onCancel={closeForm} saving={saving} error={formError} />}
          <div className="applications-panel" aria-busy={loading}>
            {filteredApplications.length > 0 ? (
              <ApplicationTable applications={filteredApplications} onEdit={openForm} onDelete={setDeleteTarget}
                busy={busy || formOpen || !!deleteTarget} deletingId={deletingId} />
            ) : (
              <div className="empty-state">
                <span className="empty-symbol" aria-hidden="true">↗</span>
                <h3>{loading ? 'Gathering your opportunities…' : error ? 'Your applications could not be loaded' : hasFilters ? 'No matching applications' : 'Your next opportunity goes here'}</h3>
                <p>{loading ? 'Just a moment.' : error ? 'Check the message above and try again.' : hasFilters ? 'Try another company or clear your filters.' : 'Add your first application to start tracking your progress.'}</p>
              </div>
            )}
          </div>
          <p className="table-footnote">Statistics include all applications. Response rate = (interviews + rejections + offers) ÷ total × 100.</p>
        </section>
      </main>
      <footer>Built for the journey ahead.<span>Internship Application Tracker</span></footer>
    </div>
  );
}
