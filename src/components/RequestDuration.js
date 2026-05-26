function RequestDuration({ durationMs, label = 'Request' }) {
  if (!Number.isFinite(durationMs)) return null;

  return (
    <div className="result-item result-item--muted">
      <div className="result-header">
        <h3>Request Duration</h3>
      </div>
      <div className="result-details">
        <div className="result-detail-item">
          <div className="detail-header">
            <strong>{label}:</strong>{' '}
            <span className="detail-value">{durationMs} ms</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RequestDuration;

