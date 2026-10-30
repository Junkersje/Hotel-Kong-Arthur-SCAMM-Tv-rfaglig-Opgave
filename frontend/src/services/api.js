/**
 * Centraliseret API-klient til HTTP-kald mod Express backenden.
 * Understøtter base URL via miljøvariabler og automatisk fejlhåndtering.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Standardiseret fetch-wrapper der parser JSON og kaster fejl ved status != 2xx.
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, config);

    // Håndter 204 No Content
    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const errorMessage = data?.error?.message || data?.message || `HTTP ${response.status}: ${response.statusText}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`[API Error] ${config.method || 'GET'} ${url}:`, error.message);
    throw error;
  }
}

/**
 * GET forespørgsel
 * @param {string} endpoint 
 * @param {object} [params] Query parametre
 */
export async function apiGet(endpoint, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value);
    }
  });

  const queryString = query.toString();
  const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;

  return request(fullEndpoint, { method: 'GET' });
}

/**
 * POST forespørgsel
 * @param {string} endpoint 
 * @param {object} data Payload body
 */
export async function apiPost(endpoint, data = {}) {
  return request(endpoint, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * PUT forespørgsel
 * @param {string} endpoint 
 * @param {object} data Payload body
 */
export async function apiPut(endpoint, data = {}) {
  return request(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

/**
 * DELETE forespørgsel
 * @param {string} endpoint 
 */
export async function apiDelete(endpoint) {
  return request(endpoint, { method: 'DELETE' });
}

export default {
  apiGet,
  apiPost,
  apiPut,
  apiDelete
};
