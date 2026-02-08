import axios from 'axios';

import { CONFIG } from 'src/global-config';
import { JWT_STORAGE_KEY } from 'src/auth/context/jwt/constant';

// ----------------------------------------------------------------------

const observabilityAxiosInstance = axios.create({
  baseURL: CONFIG.observabilityUrl || CONFIG.serverUrl,
});

// Add JWT token to requests
observabilityAxiosInstance.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem(JWT_STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

observabilityAxiosInstance.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

// ----------------------------------------------------------------------

export async function fetchLogs(params) {
  try {
    const response = await observabilityAxiosInstance.get('/api/logs', { params });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch logs:', error);
    throw error;
  }
}
