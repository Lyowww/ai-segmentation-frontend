import './AnalysisMetrics.css';

const formatKg = (value, digits = 2) => {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)} kg`;
};

const formatPurity = (value) => {
  if (!Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(0)}%`;
};

const purityColor = (value) => {
  if (!Number.isFinite(value)) return '#94a3b8';
  const pct = value * 100;
  if (pct < 40) return '#ef4444';
  if (pct < 75) return '#f59e0b';
  return '#10b981';
};

function AnalysisMetrics({ ai_co2_kg, estimated_weight_kg, purity, title = 'AI Estimates' }) {
  const hasAny =
    Number.isFinite(ai_co2_kg) || Number.isFinite(estimated_weight_kg) || Number.isFinite(purity);

  if (!hasAny) return null;

  return (
    <div className="analysis-metrics">
      <h3 className="analysis-metrics__title">{title}</h3>
      <div className="analysis-metrics__grid">
        <div className="analysis-metrics__card">
          <span className="analysis-metrics__label">AI CO₂ (est.)</span>
          <span className="analysis-metrics__value">{formatKg(ai_co2_kg)}</span>
        </div>
        <div className="analysis-metrics__card">
          <span className="analysis-metrics__label">Estimated weight</span>
          <span className="analysis-metrics__value">{formatKg(estimated_weight_kg)}</span>
        </div>
        <div className="analysis-metrics__card">
          <span className="analysis-metrics__label">Purity</span>
          <span
            className="analysis-metrics__value analysis-metrics__value--purity"
            style={{ color: purityColor(purity) }}
          >
            {formatPurity(purity)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default AnalysisMetrics;
