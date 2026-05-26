export function contaminationItemsFromResponse(parsedResponse) {
  if (!parsedResponse || typeof parsedResponse !== 'object') return [];

  const fromArray = (value) =>
    Array.isArray(value)
      ? value.map((v) => String(v).trim()).filter(Boolean)
      : null;

  const direct = fromArray(parsedResponse.contamination_items);
  if (direct) return direct;

  const legacyArray = fromArray(parsedResponse.contamination_reason);
  if (legacyArray) return legacyArray;

  if (typeof parsedResponse.contamination_reason === 'string') {
    const raw = parsedResponse.contamination_reason.trim();
    if (!raw || raw.toLowerCase() === 'unknown') return [];
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return [];
}

