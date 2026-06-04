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

    await new Promise((r) => setTimeout(r, 320));

    const result = await login(username, password);
    setLoading(false);

    if (result.ok) {
      navigate(result.user?.is_admin ? "/admin" : from, { replace: true });
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-br from-background via-background to-pink-50/30 dark:to-pink-950/10 relative overflow-hidden">
      {/* Iridescent decorative blobs */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute -top-[10%] -right-[8%] w-[520px] h-[520px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(244,114,182,0.12) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-[12%] -left-[6%] w-[400px] h-[400px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="w-full max-w-sm page-fade relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-9 h-9 bg-foreground rounded-2xl flex items-center justify-center">
            <Brain size={18} color="white" weight="fill" />
          </div>
          <span
            className="text-[22px] font-black tracking-tight text-foreground"
            style={{ fontFamily: "Nunito, sans-serif" }}
          >
            Revisiapp
          </span>
        </div>

        {/* Glass card */}
        <div className="glass-card rounded-3xl p-8">
          <h1
            className="text-[26px] font-extrabold tracking-tight mb-1 text-foreground"
            style={{ fontFamily: "Nunito, sans-serif" }}
          >
            Welcome back
          </h1>
          <p className="text-[14px] mb-7 text-muted-foreground">
            Sign in to continue revising
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-[12px] font-bold uppercase tracking-[0.18em] mb-2 text-muted-foreground"
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
                className="w-full px-4 py-3 rounded-2xl text-[15px] outline-none transition-all bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-foreground/30"
                style={{ fontFamily: "Nunito, sans-serif" }}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-[12px] font-bold uppercase tracking-[0.18em] mb-2 text-muted-foreground"
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
                  className="w-full px-4 py-3 pr-12 rounded-2xl text-[15px] outline-none transition-all bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-foreground/30"
                  style={{ fontFamily: "Nunito, sans-serif" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-foreground/10 transition-colors text-muted-foreground"
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
                className="text-[13px] px-4 py-2.5 rounded-2xl bg-destructive/10 text-destructive"
                style={{ fontFamily: "Nunito, sans-serif" }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-400 to-blue-500 text-white rounded-2xl px-5 py-3.5 text-[15px] font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 mt-2"
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
          className="text-center text-[12px] mt-6 text-muted-foreground/70"
          style={{ fontFamily: "Nunito, sans-serif" }}
        >
          Enter any username &amp; a password (4+ chars) to get started
        </p>
      </div>
    </div>
  );
}
