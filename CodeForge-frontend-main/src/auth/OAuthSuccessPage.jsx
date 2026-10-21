import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import useAuthStore from "../store/authStore";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

// Landing route for the backend's OAuth handoff:
// {FRONTEND_ORIGIN}/oauth-success?token={jwt}
// Reads the token, stores it via the same mechanism as a normal login,
// then moves on to the problems list. Kept intentionally brief but
// theme-matched rather than a blank flash, per the provisional handoff
// mechanism noted in API-Contract.md.
export default function OAuthSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setTokenFromOAuth = useAuthStore((state) => state.setTokenFromOAuth);
  const [error, setError] = useState(null);
  const ranOnce = useRef(false);

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;

    const token = searchParams.get("token");
    if (!token) {
      // Synchronous failure case (no token in the redirect URL) — nothing to await first.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError("No sign-in token was received. Please try logging in again.");
      return;
    }

    setTokenFromOAuth(token).then((result) => {
      if (result.success) {
        navigate("/problems", { replace: true });
      } else {
        setError(result.error || "We couldn't complete sign-in. Please try again.");
      }
    });
  }, [searchParams, setTokenFromOAuth, navigate]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#fbe3cf] p-6 relative overflow-hidden">
      <div className="absolute -top-16 -left-16 w-72 h-72 rounded-full bg-[#f4b8a3] opacity-40 blur-sm" />
      <div className="absolute -bottom-24 -right-10 w-96 h-96 rounded-full bg-[#f4b8a3] opacity-40" />

      <div className="relative z-10 w-full max-w-sm bg-[#fffaf5] rounded-2xl shadow-xl p-8 text-center">
        <h1 className="text-lg font-bold text-gray-800 mb-2">
          {error ? "Sign-in problem" : "Signing you in..."}
        </h1>
        {error ? (
          <>
            <ErrorMessage message={error} />
            <button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
              className="mt-5 w-full bg-[#8a1f5c] text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-[#731a4c] transition"
            >
              Back to login
            </button>
          </>
        ) : (
          <LoadingSpinner label="Just a moment while we finish setting things up." />
        )}
      </div>
    </div>
  );
}
