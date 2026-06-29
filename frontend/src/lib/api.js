import axios from 'axios';

/**
 * 🛰️ Centralized Axios API Infrastructure Client
 * Connects your Next.js frontend application directly to your Express port 5000 engine
 */
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: true, // Universally includes secure HTTP-Only session cookies automatically
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000 // 15-second cutoff ceiling prevents UI frames from hanging on poor node connections
});

/**
 * 🔒 Outbound Security Request Interceptor Matrix
 * Automatically injects active cryptographic token passports into every network call footprint
 */
api.interceptors.request.use(
  (config) => {
    // Check if running in browser context before tapping local storage windows
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      
      if (token) {
        // Automatically append the security Bearer header to clear your backend protect firewall
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * 🚨 Inbound Response Error Interceptor Gateway
 * Intercepts incoming server rejections to automatically handle expired tokens or structural failures
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If your backend auth gateway returns a 401, the user's session token is dead or corrupted
    if (error.response && error.response.status === 401) {
      console.warn('⚠️ Session passport invalid or expired. Terminating node access privileges...');
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        // Force an immediate layout reset right back to the auth security wall login sheet
        window.location.href = '/login'; 
      }
    }
    return Promise.reject(error);
  }
);

export default api;