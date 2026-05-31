import { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);
const STORAGE_KEY = "revisiapp_auth";

function loadAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => loadAuth());

  const login = useCallback(async (username, password) => {
    if (!username.trim() || !password.trim())
      return { ok: false, error: "Please fill in both fields." };
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL || "http://localhost:8000"}/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username.trim(), password }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { ok: false, error: err.detail || "Login failed" };
      }
      const data = await res.json();
      const authData = { token: data.token, user: data.user };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
      setAuth(authData);
      return { ok: true, user: data.user }; // ← FIXED: return user so LoginPage can check is_admin
    } catch {
      return { ok: false, error: "Could not reach the server. Is the backend running?" };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAuth(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user: auth?.user || null, token: auth?.token || null, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
