import apiClient from "./client";

// Base URL is needed here too, since OAuth login is a plain browser
// redirect (not an axios call) straight to the backend.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export async function register({ email, password, username }) {
  const { data } = await apiClient.post("/api/auth/register", {
    email,
    password,
    username,
  });
  return data; // { id, email, username, created_at }
}

export async function login({ email, password }) {
  const { data } = await apiClient.post("/api/auth/login", {
    email,
    password,
  });
  return data; // { access_token, token_type, user: { id, email, username } }
}

export async function fetchCurrentUser() {
  const { data } = await apiClient.get("/api/auth/me");
  return data; // { id, email, username }
}

// The backend owns the entire OAuth redirect dance — these are not API
// calls, they're full-page navigations to the backend's redirect routes.
export function redirectToGoogleLogin() {
  window.location.href = `${API_BASE_URL}/api/auth/oauth/google/login`;
}

export function redirectToGithubLogin() {
  window.location.href = `${API_BASE_URL}/api/auth/oauth/github/login`;
}
