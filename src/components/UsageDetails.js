import { formatCost } from '../utils/usage';

const formatTokens = (value) => (Number.isFinite(value) ? value.toLocaleString() : 'unknown');

function UsageDetails({ usage }) {
  const safeUsage = usage || {};

  return (
    <div className="result-item result-item--muted">
      <div className="result-header">
        <h3 className="usage-title">Token Usage & Cost</h3>
      </div>
      <div className="result-details">
        {!usage && (
          <div className="result-detail-item">
            <div className="detail-header">
              <span className="detail-value">Run an analysis to see token usage and cost.</span>
            </div>
          </div>
        )}
        <div className="result-detail-item">
          <div className="detail-header">
            <strong>Model:</strong>{' '}
            <span className="detail-value">{safeUsage.model || 'unknown'}</span>
          </div>
        </div>
        <div className="result-detail-item">
          <div className="detail-header">
            <strong>Input Tokens:</strong>{' '}
            <span className="detail-value">{formatTokens(safeUsage.inputTokens)}</span>
          </div>
        </div>
        <div className="result-detail-item">
          <div className="detail-header">
            <strong>Output Tokens:</strong>{' '}
            <span className="detail-value">{formatTokens(safeUsage.outputTokens)}</span>
          </div>
        </div>
        <div className="result-detail-item">
          <div className="detail-header">
            <strong>Total Tokens:</strong>{' '}
            <span className="detail-value">{formatTokens(safeUsage.totalTokens)}</span>
          </div>
        </div>
        <div className="result-detail-item">
          <div className="detail-header">
            <strong>Input Cost:</strong>{' '}
            <span className="detail-value">{formatCost(safeUsage.inputCost, safeUsage.currency)}</span>
          </div>
        </div>
        <div className="result-detail-item">
          <div className="detail-header">
            <strong>Output Cost:</strong>{' '}
            <span className="detail-value">{formatCost(safeUsage.outputCost, safeUsage.currency)}</span>
          </div>
        </div>
        <div className="result-detail-item usage-total">
          <div className="detail-header">
            <strong>Total Cost:</strong>{' '}
            <span className="detail-value usage-total-value">
              {formatCost(safeUsage.totalCost, safeUsage.currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UsageDetails;
