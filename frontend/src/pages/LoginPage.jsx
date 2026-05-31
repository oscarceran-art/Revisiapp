import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Brain, Eye, EyeSlash, ArrowRight } from "@phosphor-icons/react";

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

    // Simulate a brief async delay for feel
    await new Promise((r) => setTimeout(r, 320));

    const result = login(username, password);
    setLoading(false);

    if (result.ok) {
      navigate(from, { replace: true });
    } else {
      setError(result.error);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "#FAF8F5" }}
    >
      {/* Subtle decorative blob */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div
          style={{
            position: "absolute",
            top: "-10%",
            right: "-8%",
            width: "520px",
            height: "520px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(0,0,0,0.04) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-12%",
            left: "-6%",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(0,0,0,0.03) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="w-full max-w-sm page-fade">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-9 h-9 bg-black rounded-2xl flex items-center justify-center">
            <Brain size={18} color="white" weight="fill" />
          </div>
          <span
            className="text-[22px] font-black tracking-tight"
            style={{ fontFamily: "Nunito, sans-serif" }}
          >
            Revisiapp
          </span>
        </div>

        {/* Card */}
        <div
          className="bg-white border rounded-3xl p-8"
          style={{ borderColor: "hsl(30 15% 88%)" }}
        >
          <h1
            className="text-[26px] font-extrabold tracking-tight mb-1"
            style={{ fontFamily: "Nunito, sans-serif" }}
          >
            Welcome back
          </h1>
          <p
            className="text-[14px] mb-7"
            style={{ color: "rgba(0,0,0,0.45)" }}
          >
            Sign in to continue revising
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-[12px] font-bold uppercase tracking-[0.18em] mb-2"
                style={{ color: "rgba(0,0,0,0.55)" }}
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
                className="w-full px-4 py-3 rounded-2xl text-[15px] outline-none transition-all"
                style={{
                  background: "hsl(38 25% 93%)",
                  border: "1.5px solid transparent",
                  fontFamily: "Nunito, sans-serif",
                }}
                onFocus={(e) => {
                  e.target.style.border = "1.5px solid rgba(0,0,0,0.35)";
                  e.target.style.background = "white";
                }}
                onBlur={(e) => {
                  e.target.style.border = "1.5px solid transparent";
                  e.target.style.background = "hsl(38 25% 93%)";
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-[12px] font-bold uppercase tracking-[0.18em] mb-2"
                style={{ color: "rgba(0,0,0,0.55)" }}
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
                  className="w-full px-4 py-3 pr-12 rounded-2xl text-[15px] outline-none transition-all"
                  style={{
                    background: "hsl(38 25% 93%)",
                    border: "1.5px solid transparent",
                    fontFamily: "Nunito, sans-serif",
                  }}
                  onFocus={(e) => {
                    e.target.style.border = "1.5px solid rgba(0,0,0,0.35)";
                    e.target.style.background = "white";
                  }}
                  onBlur={(e) => {
                    e.target.style.border = "1.5px solid transparent";
                    e.target.style.background = "hsl(38 25% 93%)";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-black/[0.06] transition-colors"
                  style={{ color: "rgba(0,0,0,0.4)" }}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeSlash size={18} weight="regular" />
                  ) : (
                    <Eye size={18} weight="regular" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="text-[13px] px-4 py-2.5 rounded-2xl"
                style={{
                  background: "rgba(220,38,38,0.07)",
                  color: "rgb(185,28,28)",
                  fontFamily: "Nunito, sans-serif",
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white rounded-2xl px-5 py-3.5 text-[15px] font-bold flex items-center justify-center gap-2 hover:bg-black/85 active:scale-[0.98] transition-all disabled:opacity-60 mt-2"
              style={{ fontFamily: "Nunito, sans-serif" }}
            >
              {loading ? (
                <>
                  <span
                    className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={17} weight="bold" />
                </>
              )}
            </button>
          </form>
        </div>

        <p
          className="text-center text-[12px] mt-6"
          style={{ color: "rgba(0,0,0,0.35)", fontFamily: "Nunito, sans-serif" }}
        >
          Enter any username &amp; a password (4+ chars) to get started
        </p>
      </div>
    </div>
  );
}
