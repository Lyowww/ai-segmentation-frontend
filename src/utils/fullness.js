export const FULLNESS_METRICS = /** @type {const} */ (['medium', 'high']);

export function normalizeFullnessMetric(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  // Legacy support: collapse the old "low" bucket into "medium".
  if (v === 'low') return 'medium';
  if (v === 'medium' || v === 'high') return v;
  return null;
}

/**
 * Map a legacy 0–10 fullness score to a metric label.
 * Only returns "medium" or "high" (no "low" bucket).
 * This intentionally skews "medium-to-high" toward **high**:
 * - 0–4 => medium
 * - 5–10 => high
 */
export function fullnessMetricFromScore(score) {
  if (!Number.isFinite(score)) return null;
  if (score >= 5) return 'high';
  return 'medium';
}

export function fullnessMetricToBarPercent(metric) {
  const m = normalizeFullnessMetric(metric);
  if (!m) return 0;
  if (m === 'medium') return 66;
  return 100;
}

export function fullnessMetricColor(metric) {
  const m = normalizeFullnessMetric(metric);
  if (!m) return '#94a3b8'; // slate-400
  // medium=amber, high=red (more full => more "attention")
  if (m === 'medium') return '#f59e0b';
  return '#ef4444';
}

export function formatFullnessMetric(metric) {
  const m = normalizeFullnessMetric(metric);
  if (!m) return 'unknown';
  return m.charAt(0).toUpperCase() + m.slice(1);
}

