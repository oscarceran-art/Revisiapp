import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { listSubjects, listSessions, listWorksheets, listNotes, listPersonas } from "@/lib/api";

const SidebarContext = createContext(null);

export function SidebarProvider({ children }) {
  const [subjects, setSubjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [worksheets, setWorksheets] = useState([]);
  const [notes, setNotes] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebarCollapsed") === "1"; } catch { return false; }
  });

  const toggleCollapsed = () => {
    setCollapsed(v => {
      const next = !v;
      try { localStorage.setItem("sidebarCollapsed", next ? "1" : "0"); } catch (_) { /* ignore */ }
      return next;
    });
  };

  const refresh = useCallback(async () => {
    try {
      const [s, sess, w, n] = await Promise.all([
        listSubjects().catch(() => []),
        listSessions().catch(() => []),
        listWorksheets().catch(() => []),
        listNotes().catch(() => []),
      ]);
      setSubjects(s); setSessions(sess); setWorksheets(w); setNotes(n);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    listPersonas().then(setPersonas).catch(() => {});
  }, [refresh]);

  return (
    <SidebarContext.Provider value={{
      subjects, sessions, worksheets, notes, personas, loading,
      refresh, setSubjects, setSessions, setWorksheets, setNotes,
      collapsed, toggleCollapsed,
    }}>
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebarData = () => {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebarData must be used within SidebarProvider");
  return ctx;
};
