/**
 * Thin HTTP client for the Recypic backend.
 *
 * Each function below maps 1:1 to a backend endpoint and returns the same
 * `{ data, usage }` envelope. The frontend components only need to read
 * those two fields — all parsing/normalization happens server-side.
 */

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

const post = async (path, formData) => {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      body: formData
    });
  } catch (networkError) {
    throw new ApiError('Network error: unable to reach the analysis server.', {
      code: 'NETWORK_ERROR'
    });
  }

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

export const analyzeSingleImage = ({ image, provider, promptVersion }) => {
  const form = new FormData();
  form.append('image', image);
  form.append('provider', provider);
  form.append('promptVersion', promptVersion);
  return post('/analyze/single', form);
};

export const analyzeMultiObject = ({ image1, image2, provider, promptVersion }) => {
  const form = new FormData();
  form.append('image1', image1);
  if (image2) form.append('image2', image2);
  form.append('provider', provider);
  form.append('promptVersion', promptVersion);
  return post('/analyze/multi', form);
};

export const analyzeFoodWaste = ({ image, provider }) => {
  const form = new FormData();
  form.append('image', image);
  form.append('provider', provider);
  return post('/analyze/food-waste', form);
};

export const analyzeRecyclables = ({ image, provider }) => {
  const form = new FormData();
  form.append('image', image);
  form.append('provider', provider);
  return post('/analyze/recyclables', form);
};

export { ApiError };
