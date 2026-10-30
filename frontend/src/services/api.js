/**
 * Hotel Kong Arthur — Frontend API Klient
 * Håndterer HTTP-kommunikation mod backendens REST API via fetch wrapper.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Udfører et standardiseret fetch-kald med JSON-parsing og fejlhåndtering.
 * @param {string} endpoint - Sti f.eks. '/bookings'
 * @param {object} options - Fetch options
 * @returns {Promise<any>}
 */
async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {})
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  // Håndter No Content (204)
  if (response.status === 204) {
    return null;
  }

  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data?.error?.message || data?.message || `HTTP fejl ${response.status}: ${response.statusText}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.details = data?.error?.details || null;
    err.data = data;
    throw err;
  }

  return data;
}

export function apiGet(endpoint) {
  return request(endpoint, { method: 'GET' });
}

export function apiPost(endpoint, body) {
  return request(endpoint, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export function apiPut(endpoint, body) {
  return request(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body)
  });
}

export function apiDelete(endpoint) {
  return request(endpoint, { method: 'DELETE' });
}

export default {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete
};
