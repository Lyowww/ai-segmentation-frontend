const PRICING_PER_MILLION = {
  'gpt-4o': { input: 5, output: 15, currency: 'USD' },
  'gpt-4.1': { input: 5, output: 15, currency: 'USD' },
  'gemini-3-pro-preview': { input: 3.5, output: 10.5, currency: 'USD' }
};

const getPricingForModel = (model) => {
  if (!model) return null;
  return PRICING_PER_MILLION[model] || null;
};

const normalizeNumber = (value) => (Number.isFinite(value) ? value : null);

export const formatCost = (value, currency = 'USD') => {
  if (!Number.isFinite(value)) return 'unknown';
  const symbol = currency === 'USD' ? '$' : '';
  return `${symbol}${value.toFixed(6)}`;
};

export const buildUsageSummary = ({ provider, model, response }) => {
  if (!response) return null;

  let inputTokens = null;
  let outputTokens = null;
  let totalTokens = null;

  if (provider === 'openai') {
    inputTokens = normalizeNumber(response?.usage?.prompt_tokens);
    outputTokens = normalizeNumber(response?.usage?.completion_tokens);
    totalTokens = normalizeNumber(response?.usage?.total_tokens);
  } else if (provider === 'gemini') {
    inputTokens = normalizeNumber(response?.usageMetadata?.promptTokenCount);
    outputTokens = normalizeNumber(response?.usageMetadata?.candidatesTokenCount);
    totalTokens = normalizeNumber(response?.usageMetadata?.totalTokenCount);
  }

  if (!Number.isFinite(totalTokens) && Number.isFinite(inputTokens) && Number.isFinite(outputTokens)) {
    totalTokens = inputTokens + outputTokens;
  }

  const pricing = getPricingForModel(model);
  const currency = pricing?.currency || 'USD';

  const inputCost = pricing && Number.isFinite(inputTokens)
    ? (inputTokens / 1_000_000) * pricing.input
    : null;
  const outputCost = pricing && Number.isFinite(outputTokens)
    ? (outputTokens / 1_000_000) * pricing.output
    : null;
  const totalCost = Number.isFinite(inputCost) && Number.isFinite(outputCost)
    ? inputCost + outputCost
    : null;

  return {
    provider: provider || 'unknown',
    model: model || 'unknown',
    inputTokens,
    outputTokens,
    totalTokens,
    inputCost,
    outputCost,
    totalCost,
    currency
  };
};

export const mergeUsageSummaries = (summaries = []) => {
  const validSummaries = summaries.filter(Boolean);
  if (validSummaries.length === 0) return null;

  const providers = new Set(validSummaries.map((summary) => summary.provider));
  const models = new Set(validSummaries.map((summary) => summary.model));
  const currencies = new Set(validSummaries.map((summary) => summary.currency));

  const sum = (key) => validSummaries.reduce((total, summary) => {
    const value = summary[key];
    return total + (Number.isFinite(value) ? value : 0);
  }, 0);

  const hasFinite = (key) => validSummaries.some((summary) => Number.isFinite(summary[key]));

  const inputTokens = hasFinite('inputTokens') ? sum('inputTokens') : null;
  const outputTokens = hasFinite('outputTokens') ? sum('outputTokens') : null;
  const totalTokens = hasFinite('totalTokens')
    ? sum('totalTokens')
    : (Number.isFinite(inputTokens) && Number.isFinite(outputTokens)
      ? inputTokens + outputTokens
      : null);

  const inputCost = hasFinite('inputCost') ? sum('inputCost') : null;
  const outputCost = hasFinite('outputCost') ? sum('outputCost') : null;
  const totalCost = hasFinite('totalCost')
    ? sum('totalCost')
    : (Number.isFinite(inputCost) && Number.isFinite(outputCost)
      ? inputCost + outputCost
      : null);

  return {
    provider: providers.size === 1 ? [...providers][0] : 'mixed',
    model: models.size === 1 ? [...models][0] : 'mixed',
    inputTokens,
    outputTokens,
    totalTokens,
    inputCost,
    outputCost,
    totalCost,
    currency: currencies.size === 1 ? [...currencies][0] : 'USD'
  };
};
