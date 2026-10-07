function formatDate(value) {
  // Treat a date-only value as local midnight to avoid timezone date shifts.
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function ApplicationTable({ applications, onEdit, onDelete, busy, deletingId }) {
  return (
    <div className="table-scroll">
      <table>
        <caption className="sr-only">Internship applications, newest application date first</caption>
        <thead><tr>
          <th scope="col">Company / role</th><th scope="col">Date applied</th>
          <th scope="col">Status</th><th scope="col">Location</th>
          <th scope="col">Notes</th><th scope="col">Actions</th>
        </tr></thead>
        <tbody>
          {applications.map(application => (
            <tr key={application.id}>
              <td>
                <div className="company-cell">
                  <span className={`company-mark mark-${application.id % 3}`} aria-hidden="true">
                    {application.company.slice(0, 1).toUpperCase()}
                  </span>
                  <div><span className="company-name">{application.company}</span>
                    <span className="role-name">{application.role}</span></div>
                </div>
              </td>
              <td className="date-cell">{formatDate(application.dateApplied)}</td>
              <td><span className={`status status-${application.status.toLowerCase()}`}>
                <span aria-hidden="true">●</span> {application.status}
              </span></td>
              <td className="location-cell">{application.location || '—'}</td>
              <td className="notes-cell">{application.notes ? (
                <details><summary>View note</summary><p>{application.notes}</p></details>
              ) : <span className="muted">—</span>}</td>
              <td><div className="row-actions">
                <button className="text-button" disabled={busy} onClick={() => onEdit(application)}
                  aria-label={`Edit ${application.company} application`}>Edit</button>
                <button className="text-button danger" disabled={busy} onClick={() => onDelete(application)}
                  aria-label={`Delete ${application.company} application`}>
                  {deletingId === application.id ? 'Deleting…' : 'Delete'}
                </button>
              </div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
