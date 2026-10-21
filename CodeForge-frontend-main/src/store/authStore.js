import { create } from "zustand";
import { fetchCurrentUser, login as loginRequest, register as registerRequest } from "../api/auth";
import { getStoredToken, registerUnauthorizedHandler, setStoredToken } from "../api/client";

const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  // isHydrating starts true so ProtectedRoute can show a loading state
  // instead of bouncing a logged-in user to /login on a page refresh
  // before we've had a chance to verify their token.
  isHydrating: true,
  error: null,

  // Verifies whatever token is in localStorage against the backend via
  // GET /api/auth/me, rather than trusting mere token presence. Called once
  // on app load.
  hydrate: async () => {
    const token = getStoredToken();
    if (!token) {
      set({ user: null, isAuthenticated: false, isHydrating: false });
      return;
    }
    try {
      const user = await fetchCurrentUser();
      set({ user, isAuthenticated: true, isHydrating: false });
    } catch {
      setStoredToken(null);
      set({ user: null, isAuthenticated: false, isHydrating: false });
    }
  },

  login: async ({ email, password }) => {
    set({ error: null });
    try {
      const data = await loginRequest({ email, password });
      setStoredToken(data.access_token);
      set({ user: data.user, isAuthenticated: true });
      return { success: true };
    } catch (err) {
      set({ error: err.message });
      return { success: false, error: err.message };
    }
  },

  register: async ({ email, password, username }) => {
    set({ error: null });
    try {
      await registerRequest({ email, password, username });
      // Registration doesn't return a token — log the user in right after,
      // matching the API contract (no auto-issued session on register).
      return get().login({ email, password });
    } catch (err) {
      set({ error: err.message });
      return { success: false, error: err.message };
    }
  },

  // Used by OAuthSuccessPage, which receives the token directly via the
  // ?token= query param rather than through a login call.
  setTokenFromOAuth: async (token) => {
    setStoredToken(token);
    try {
      const user = await fetchCurrentUser();
      set({ user, isAuthenticated: true, isHydrating: false });
      return { success: true };
    } catch (err) {
      setStoredToken(null);
      set({ user: null, isAuthenticated: false, isHydrating: false });
      return { success: false, error: err.message };
    }
  },

  logout: () => {
    setStoredToken(null);
    set({ user: null, isAuthenticated: false });
  },

  clearError: () => set({ error: null }),
}));

// Wire up the 401 handler once, outside the component tree: any authenticated
// call that comes back 401 (expired/invalid token mid-session) clears the
// stored token and drops isAuthenticated, which ProtectedRoute reacts to by
// redirecting to /login.
registerUnauthorizedHandler(() => {
  setStoredToken(null);
  useAuthStore.setState({ user: null, isAuthenticated: false, isHydrating: false });
});

export default useAuthStore;
