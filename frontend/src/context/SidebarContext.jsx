import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { listSubjects, listSessions, listWorksheets } from "@/lib/api";

const SidebarContext = createContext(null);

export function SidebarProvider({ children }) {
  const [subjects, setSubjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [worksheets, setWorksheets] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [s, sess, w] = await Promise.all([
        listSubjects().catch(() => []),
        listSessions().catch(() => []),
        listWorksheets().catch(() => []),
      ]);
      setSubjects(s);
      setSessions(sess);
      setWorksheets(w);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <SidebarContext.Provider value={{ subjects, sessions, worksheets, loading, refresh, setSubjects, setSessions, setWorksheets }}>
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebarData = () => {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebarData must be used within SidebarProvider");
  return ctx;
};
