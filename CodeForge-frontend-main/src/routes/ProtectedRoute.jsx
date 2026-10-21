import { Navigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import LoadingSpinner from "../components/LoadingSpinner";

// Wrap any route element that requires an authenticated user. While the
// app is still verifying a stored token against GET /api/auth/me, we show a
// spinner instead of redirecting — otherwise a logged-in user would get
// bounced to /login on every page refresh before hydration finishes.
export default function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrating = useAuthStore((state) => state.isHydrating);

  if (isHydrating) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ backgroundColor: "#FFE6C8" }}>
        <LoadingSpinner label="Checking your session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
