import axios from "axios";

// Base URL for the FastAPI backend. Set via VITE_API_BASE_URL in .env;
// falls back to the local Uvicorn default if it's somehow missing.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const TOKEN_STORAGE_KEY = "codeforge_token";

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // localStorage can throw in some private-browsing contexts; nothing
    // useful to do here beyond not crashing the app.
  }
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Attach the bearer token to every outgoing request, if we have one.
apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalize errors so callers always get a plain { status, message } shape
// pulled from FastAPI's default { "detail": "..." } error body.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status ?? null;
    const detail = error.response?.data?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : status === null
        ? "Network error — please check your connection and try again."
        : "Something went wrong. Please try again.";

    return Promise.reject({ status, message, raw: error });
  }
);

// A single place other modules can call to react to a 401 by clearing the
// token and sending the user back to login. Wired up by authStore so this
// module doesn't need to import the store directly (would create a cycle).
let onUnauthorized = null;
export function registerUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
