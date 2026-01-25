import { auth } from './firebase';

const BASE_URL = import.meta.env.VITE_API_URL || '';

async function fetchClient(endpoint, options = {}) {
  // Handle absolute URLs (optional, but good for safety)
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Auth token injection
  try {
    const token = await auth.currentUser?.getIdToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.warn('Error fetching auth token', e);
  }

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (error) {
    // Network error mimicking Axios structure
    throw {
      message: error.message,
      response: undefined,
      request: {},
    };
  }
  
  // Parse body
  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  const result = {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    data: data,
    ok: response.ok
  };

  if (!response.ok) {
     // Throw error with response attached, like Axios
     throw {
       response: result,
       message: `Request failed with status ${response.status}`,
     };
  }

  return result;
}

const api = {
  get: (url, config) => fetchClient(url, { ...config, method: 'GET' }),
  post: (url, data, config) => fetchClient(url, { ...config, method: 'POST', body: data }),
  put: (url, data, config) => fetchClient(url, { ...config, method: 'PUT', body: data }),
  patch: (url, data, config) => fetchClient(url, { ...config, method: 'PATCH', body: data }),
  delete: (url, config) => fetchClient(url, { ...config, method: 'DELETE' }),
};

export default api;
