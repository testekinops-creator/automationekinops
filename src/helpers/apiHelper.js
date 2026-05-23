/**
 * ApiHelper — Axios-based HTTP helper for API-level test operations.
 *
 * Used to:
 *   - Create test data before UI tests (faster than driving the UI)
 *   - Clean up test data after tests without full UI navigation
 *   - Run API-level security / contract checks
 *
 * Logger integration:
 *   Every call logs: method, endpoint, status code.
 *   Errors log the full response body for diagnosis.
 *
 * Usage:
 *   const ApiHelper = require('./apiHelper');
 *   const api = new ApiHelper();
 *   const data = await api.get('/rma/list');
 *   await api.post('/rma/create', { serial: 'X123' });
 */
const axios = require('axios');
const Logger = require('./Logger');
const { BASE_URL } = require('./config');

class ApiHelper {
  /**
   * @param {string} [baseURL] - Defaults to BASE_URL from config
   * @param {string} [token]   - Optional Bearer token for authenticated requests
   */
  constructor(baseURL = BASE_URL, token = null) {
    this.logger = new Logger('ApiHelper');
    this.client = axios.create({
      baseURL,
      timeout: 30_000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    // Response interceptor — log every response
    this.client.interceptors.response.use(
      (response) => {
        this.logger.info(
          `${response.config.method.toUpperCase()} ${response.config.url} → ${response.status}`
        );
        return response;
      },
      (error) => {
        const status = error.response ? error.response.status : 'NO_RESPONSE';
        const url = error.config ? error.config.url : 'unknown';
        const method = error.config ? error.config.method.toUpperCase() : 'UNKNOWN';
        this.logger.error(
          `${method} ${url} → ${status}`,
          new Error(JSON.stringify(error.response?.data || error.message))
        );
        return Promise.reject(error);
      }
    );
  }

  /**
   * HTTP GET request.
   * @param {string} endpoint - API path (e.g. '/rma/list')
   * @param {object} [params] - Query parameters
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  async get(endpoint, params = {}) {
    this.logger.action('GET', endpoint);
    return this.client.get(endpoint, { params });
  }

  /**
   * HTTP POST request.
   * @param {string} endpoint - API path
   * @param {object} [body]   - Request body
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  async post(endpoint, body = {}) {
    this.logger.action('POST', endpoint);
    return this.client.post(endpoint, body);
  }

  /**
   * HTTP PUT request.
   * @param {string} endpoint - API path
   * @param {object} [body]   - Request body
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  async put(endpoint, body = {}) {
    this.logger.action('PUT', endpoint);
    return this.client.put(endpoint, body);
  }

  /**
   * HTTP DELETE request.
   * @param {string} endpoint - API path
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  async delete(endpoint) {
    this.logger.action('DELETE', endpoint);
    return this.client.delete(endpoint);
  }

  /**
   * Set or update the Authorization Bearer token.
   * @param {string} token
   */
  setToken(token) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    this.logger.info('Authorization token updated');
  }
}

module.exports = ApiHelper;
