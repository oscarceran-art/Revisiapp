import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeSlash, ArrowElbowDownRight } from "@phosphor-icons/react";

// TODO: Replace with actual logo image when available
// import imgLogo from "./5b94b68947f8b548e93e77e9ae76bd9188ecc7c8.png";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    await new Promise((r) => setTimeout(r, 320));

    const result = await login(username, password);
    setLoading(false);

    if (result.ok) {
      navigate(result.user?.is_admin ? "/admin" : from, { replace: true });
    } else {
      setError(result.error);
    }
  };

  const inputBase = {
    fontFamily: "Inter, Nunito, sans-serif",
    background: "rgba(0,0,0,0.2)",
    border: "1.5px solid transparent",
  };

  const inputFocus = {
    border: "1.5px solid rgba(255,255,255,0.35)",
    background: "rgba(0,0,0,0.25)",
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "#121C2F" }}
    >
      {/* Maroon overlay */}
      <div
        className="pointer-events-none fixed inset-0"
        aria-hidden="true"
        style={{ background: "rgba(128, 59, 69, 0.5)" }}
      />

      <div className="relative w-full max-w-[642px] page-fade">
        {/* Card */}
        <div
          className="rounded-2xl p-8 sm:p-10"
          style={{
            background: "rgba(0,0,0,0.2)",
          }}
        >
          {/* Logo badge */}
          <div className="flex items-center gap-2 mb-10">
            <div
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl"
              style={{ background: "rgba(0,0,0,0.2)" }}
            >
              {/* Placeholder logo — replace with img when file is available */}
              <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center overflow-hidden shrink-0">
                {/*
                <img
                  alt="Logomark"
                  className="w-full h-full object-cover"
                  src={imgLogo}
                />
                */}
                <span className="text-white text-[10px] font-black">R</span>
              </div>
              <span
                className="text-white font-semibold text-sm"
                style={{ fontFamily: "Inter, Nunito, sans-serif" }}
              >
                Revisiapp Login
              </span>
            </div>
          </div>

          {/* Heading */}
          <h1
            className="text-white font-semibold text-[32px] leading-tight mb-1"
            style={{ fontFamily: "Inter, Nunito, sans-serif" }}
          >
            Welcome back.
          </h1>
          <p
            className="text-[#D6D6D6] font-semibold text-xl mb-8"
            style={{ fontFamily: "Inter, Nunito, sans-serif" }}
          >
            Lets pick up right where you left off.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-[#D6D6D6] font-semibold text-sm mb-2"
                style={{ fontFamily: "Inter, Nunito, sans-serif" }}
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                placeholder="your name"
                className="w-full px-5 py-4 rounded-2xl text-white text-[15px] outline-none transition-all placeholder:text-white/40"
                style={inputBase}
                onFocus={(e) => {
                  e.target.style.border = inputFocus.border;
                  e.target.style.background = inputFocus.background;
                }}
                onBlur={(e) => {
                  e.target.style.border = inputBase.border;
                  e.target.style.background = inputBase.background;
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-[#D6D6D6] font-semibold text-sm mb-2"
                style={{ fontFamily: "Inter, Nunito, sans-serif" }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="••••••••"
                  className="w-full px-5 py-4 pr-12 rounded-2xl text-white text-[15px] outline-none transition-all placeholder:text-white/40"
                  style={inputBase}
                  onFocus={(e) => {
                    e.target.style.border = inputFocus.border;
                    e.target.style.background = inputFocus.background;
                  }}
                  onBlur={(e) => {
                    e.target.style.border = inputBase.border;
                    e.target.style.background = inputBase.background;
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white/80"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeSlash size={20} weight="regular" />
                  ) : (
                    <Eye size={20} weight="regular" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="text-[13px] px-4 py-2.5 rounded-2xl text-red-300"
                style={{
                  background: "rgba(220,38,38,0.15)",
                  fontFamily: "Inter, Nunito, sans-serif",
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 bg-white text-black font-semibold text-lg rounded-2xl px-6 py-3 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
              style={{ fontFamily: "Inter, Nunito, sans-serif" }}
            >
              {loading ? (
                <>
                  <span
                    className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  Signing in…
                </>
              ) : (
                <>
                  Login
                  <ArrowElbowDownRight size={20} weight="bold" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
