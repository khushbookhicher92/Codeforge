import { useEffect } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import NavBar from "./components/NavBar";
import ProblemsPage from "./problems/ProblemsPage";
import SubmissionPage from "./submissions/SubmissionPage";
import AuthPage from "./auth/AuthPage";
import OAuthSuccessPage from "./auth/OAuthSuccessPage";
import ProfilePage from "./profile/ProfilePage";
import SubmissionHistoryPage from "./history/SubmissionHistoryPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import useAuthStore from "./store/authStore";

// Sends a visitor to the right starting point without forcing a stray
// redirect-to-login flash while hydration is still in flight.
function RootRedirect() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  if (isHydrating) return null;
  return <Navigate to={isAuthenticated ? "/problems" : "/login"} replace />;
}

function App() {
  const location = useLocation();
  const hideNavbar = location.pathname.startsWith("/submit");
  const hydrate = useAuthStore((state) => state.hydrate);

  // Verify any stored token against GET /api/auth/me exactly once, on app load.
  useEffect(() => {
    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {!hideNavbar && <NavBar />}
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/oauth-success" element={<OAuthSuccessPage />} />

        <Route
          path="/problems"
          element={
            <ProtectedRoute>
              <ProblemsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/submit/:problemId"
          element={
            <ProtectedRoute>
              <SubmissionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/submissions"
          element={
            <ProtectedRoute>
              <SubmissionHistoryPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;
