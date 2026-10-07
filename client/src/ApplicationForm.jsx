import { useState } from 'react';
import { STATUSES } from './constants';

function today() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export default function ApplicationForm({ application, onSave, onCancel, saving, error }) {
  const [form, setForm] = useState(application || {
    company: '', role: '', dateApplied: today(), status: 'Applied', location: '', notes: '',
  });

  function updateField(event) {
    const { name, value } = event.target;
    setForm({ ...form, [name]: value });
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSave(form);
  }

  return (
    <section className="form-panel" aria-labelledby="form-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{application ? 'MAKE AN UPDATE' : 'A NEW OPPORTUNITY'}</p>
          <h2 id="form-title">{application ? 'Edit application' : 'Add an application'}</h2>
        </div>
        <span className="muted small">* Required fields</span>
      </div>
      <form onSubmit={handleSubmit}>
        <fieldset disabled={saving}>
          <div className="form-grid">
            <label>Company *
              <input autoFocus required name="company" value={form.company} onChange={updateField} placeholder="e.g. Stripe" />
            </label>
            <label>Role *
              <input required name="role" value={form.role} onChange={updateField} placeholder="e.g. Software Engineering Intern" />
            </label>
            <label>Date applied *
              <input required type="date" name="dateApplied" value={form.dateApplied} onChange={updateField} />
            </label>
            <label>Status *
              <select required name="status" value={form.status} onChange={updateField}>
                {STATUSES.map(status => <option key={status}>{status}</option>)}
              </select>
            </label>
            <label className="full-width">Location
              <input name="location" value={form.location} onChange={updateField} placeholder="e.g. New York, NY or Remote" />
            </label>
            <label className="full-width">Notes
              <textarea name="notes" value={form.notes} onChange={updateField} rows="3" placeholder="Contacts, next steps, or anything worth remembering…" />
            </label>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions">
            <button className="button secondary" type="button" onClick={onCancel}>Cancel</button>
            <button className="button primary" type="submit">
              {saving ? 'Saving…' : application ? 'Save changes' : 'Save application'}
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
