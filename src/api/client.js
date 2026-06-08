/**
 * Thin HTTP client for the Recypic backend.
 *
 * Images are compressed in the browser before upload so requests stay under
 * Vercel's 4.5 MiB serverless body limit. Dual-image multi-object analysis
 * uses two API calls (/analyze/multi/image1 then /analyze/multi/image2).
 */

import { compressImageFile } from './compressImage';

const DEFAULT_API_URL = 'http://localhost:3001/api';
const API_URL = (process.env.REACT_APP_API_URL || DEFAULT_API_URL).replace(/\/$/, '');

class ApiError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

const parseResponse = async (response) => {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // Response was not JSON — fall through to error handling below.
  }

  if (!response.ok) {
    const code = payload?.error?.code;
    const message = payload?.error?.message || `Request failed with status ${response.status}.`;
    throw new ApiError(message, { status: response.status, code });
  }

  return payload;
};

const postJson = async (path, body) => {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch {
    throw new ApiError('Network error: unable to reach the analysis server.', {
      code: 'NETWORK_ERROR'
    });
  }
  return parseResponse(response);
};

const pickMetrics = (data) => ({
  ai_co2_kg: data.ai_co2_kg,
  estimated_weight_kg: data.estimated_weight_kg,
  purity: data.purity
});

export const analyzeSingleImage = async ({ image, provider, promptVersion }) => {
  const imageData = await compressImageFile(image, 'singleImage');
  return postJson('/analyze/single', { imageData, provider, promptVersion });
};

export const analyzeMultiObject = async ({ image1, image2, provider, promptVersion }) => {
  const image1Data = await compressImageFile(image1, 'multiObject');
  const isCapsule = promptVersion === 'v4';

  if (isCapsule || !image2) {
    return postJson('/analyze/multi/image1', { image1Data, provider, promptVersion });
  }

  const step1 = await postJson('/analyze/multi/image1', { image1Data, provider, promptVersion });
  const image2Data = await compressImageFile(image2, 'multiObject');

  return postJson('/analyze/multi/image2', {
    image2Data,
    provider,
    promptVersion,
    image1Results: step1.data.image1Results,
    usage1: step1.usage,
    metrics1: pickMetrics(step1.data)
  });
};

export const analyzeFoodWaste = async ({ image, provider }) => {
  const imageData = await compressImageFile(image, 'foodWaste');
  return postJson('/analyze/food-waste', { imageData, provider });
};

export const analyzeRecyclables = async ({ image, provider }) => {
  const imageData = await compressImageFile(image, 'recyclables');
  return postJson('/analyze/recyclables', { imageData, provider });
};

export { ApiError };
