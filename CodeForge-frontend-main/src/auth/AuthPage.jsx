import { useState } from "react";
import { useNavigate } from "react-router-dom";
import skeleton1 from "../assets/skeleton1.png";
import useAuthStore from "../store/authStore";
import { redirectToGoogleLogin, redirectToGithubLogin } from "../api/auth";
import ErrorMessage from "../components/ErrorMessage";
import LoadingSpinner from "../components/LoadingSpinner";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-4 h-4">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-1.9 13.5-5.1l-6.2-5.2C29.3 35.5 26.8 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.7l6.2 5.2C40.9 36 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#181717">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.38 7.86 10.9.57.1.78-.25.78-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.78 1.2 1.78 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.72-1.55-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.5 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.41-5.27 5.7.41.36.78 1.08.78 2.17 0 1.57-.01 2.83-.01 3.22 0 .3.2.66.79.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register, error, clearError } = useAuthStore();

  const [mode, setMode] = useState("login"); // "login" | "signup"
  const isLogin = mode === "login";

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setFormError(null);
    clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!isLogin && password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const result = isLogin
      ? await login({ email, password })
      : await register({ email, password, username });
    setIsSubmitting(false);

    if (result.success) {
      navigate("/problems");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#fbe3cf] p-6 relative overflow-hidden">
      {/* background decorative circles, like reference */}
      <div className="absolute -top-16 -left-16 w-72 h-72 rounded-full bg-[#f4b8a3] opacity-40 blur-sm" />
      <div className="absolute top-60 left-20 w-40 h-40 rounded-full bg-[#e88a6d] opacity-30" />
      <div className="absolute -bottom-24 -right-10 w-96 h-96 rounded-full bg-[#f4b8a3] opacity-40" />
      <div className="absolute bottom-100 right-24 w-16 h-16 rounded-full bg-[#e88a6d] opacity-50" />

      <div className="relative z-10 w-full max-w-4xl bg-[#fffaf5] rounded-2xl shadow-xl overflow-hidden grid md:grid-cols-2">
        {/* Left panel — the illustration already contains the skeleton, chat bubbles, and tagline */}
        <div className="bg-[#fbe3cf] relative">
          <img
            src={skeleton1}
            alt="Skeleton working on a laptop, surrounded by chat bubbles, with the tagline 'Turn your ideas into reality.'"
            className="w-120 h-120 flex items-center justify-center object-cover"
          />
        </div>

        {/* Right panel */}
        <div className="px-8 py-10 flex flex-col justify-center">
          <h1 className="text-2xl font-bold text-gray-800">
            {isLogin ? "Login to your Account" : "Create a new Account"}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {isLogin
              ? "Solve problem, Build logic, Master DSA"
              : "Join us and start your journey today"}
          </p>

          {(formError || error) && (
            <div className="mt-4">
              <ErrorMessage message={formError || error} />
            </div>
          )}

          {/* social buttons */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={redirectToGoogleLogin}
              className="flex-1 flex items-center justify-center gap-2 border border-gray-200 rounded-lg py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              <GoogleIcon />
              Google
            </button>
            <button
              type="button"
              onClick={redirectToGithubLogin}
              className="flex-1 flex items-center justify-center gap-2 border border-gray-200 rounded-lg py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              <GithubIcon />
              GitHub
            </button>
          </div>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">or continue with email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {!isLogin && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your name"
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8a1f5c]/40"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8a1f5c]/40"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-500">
                  Password
                </label>
                {isLogin && (
                  <button
                    type="button"
                    className="text-xs text-[#8a1f5c] font-medium hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                maxLength={128}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8a1f5c]/40"
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8a1f5c]/40"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#8a1f5c] text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-[#731a4c] transition disabled:opacity-60"
            >
              {isSubmitting ? (
                <LoadingSpinner label="" size="sm" />
              ) : isLogin ? (
                "Login"
              ) : (
                "Sign Up"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {isLogin ? "Not Registered Yet? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => switchMode(isLogin ? "signup" : "login")}
              className="text-[#8a1f5c] font-semibold hover:underline"
            >
              {isLogin ? "Create an account" : "Login"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
