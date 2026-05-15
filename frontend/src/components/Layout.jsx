import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ChatCircle, FileText, List, X, Plus, BookBookmark, CaretDown, CaretRight, Stack } from "@phosphor-icons/react";
import { useState, useEffect, useMemo } from "react";
import { useSidebarData } from "@/context/SidebarContext";

function SubjectGroup({ subject, sessions, worksheets, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const navigate = useNavigate();
  const location = useLocation();
  const name = subject ? subject.name : "General";
  const groupId = subject ? subject.id : "general";

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-2xl hover:bg-black/[0.04] transition-colors"
        data-testid={`sidebar-group-${groupId}`}
      >
        {open ? <CaretDown size={14} weight="bold" /> : <CaretRight size={14} weight="bold" />}
        <span className="text-[17px] font-bold flex-1 text-left truncate">{name}</span>
        <span className="text-[12px] text-black/40 tabular-nums">{sessions.length + worksheets.length}</span>
      </button>
      {open && (
        <div className="ml-3 pl-3 border-l border-black/10 mt-1 mb-2 space-y-0.5">
          {/* New chat/worksheet actions */}
          <div className="flex gap-1.5 px-1 pb-1.5">
            <button
              onClick={() => navigate(`/chat/new?subject=${groupId}`)}
              className="flex-1 text-[13px] flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl bg-black text-white hover:bg-black/85 transition-colors active:scale-[0.97]"
              data-testid={`new-chat-${groupId}`}
            >
              <Plus size={13} weight="bold" /> Chat
            </button>
            <button
              onClick={() => navigate(`/worksheets/new?subject=${groupId}`)}
              className="flex-1 text-[13px] flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl bg-white border border-black/15 hover:bg-black/[0.04] transition-colors"
              data-testid={`new-worksheet-${groupId}`}
            >
              <Plus size={13} weight="bold" /> Sheet
            </button>
          </div>

          {sessions.length === 0 && worksheets.length === 0 && (
            <div className="text-[13px] text-black/35 px-3 py-2 italic">Empty</div>
          )}

          {sessions.map(s => {
            const isActive = location.pathname === `/chat/${s.id}`;
            return (
              <button
                key={s.id}
                onClick={() => navigate(`/chat/${s.id}`)}
                className={`w-full text-left text-[15px] px-3 py-2 rounded-xl flex items-center gap-2 transition-colors ${isActive ? "bg-black text-white" : "hover:bg-black/[0.04] text-black/85"}`}
                data-testid={`sidebar-chat-${s.id}`}
              >
                <ChatCircle size={14} weight="regular" className="shrink-0 opacity-70" />
                <span className="truncate">{s.title || "Untitled"}</span>
              </button>
            );
          })}

          {worksheets.map(w => {
            const isActive = location.pathname === `/worksheets/${w.id}`;
            return (
              <button
                key={w.id}
                onClick={() => navigate(`/worksheets/${w.id}`)}
                className={`w-full text-left text-[15px] px-3 py-2 rounded-xl flex items-center gap-2 transition-colors ${isActive ? "bg-black text-white" : "hover:bg-black/[0.04] text-black/85"}`}
                data-testid={`sidebar-worksheet-${w.id}`}
              >
                <FileText size={14} weight="regular" className="shrink-0 opacity-70" />
                <span className="truncate">{w.title || w.topic}</span>
                {w.marking_result && (
                  <span className={`text-[11px] tabular-nums shrink-0 ${isActive ? "text-white/70" : "text-black/40"}`}>
                    {Math.round(w.marking_result.percentage)}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { subjects, sessions, worksheets } = useSidebarData();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const groups = useMemo(() => {
    const byId = (id) => ({
      sessions: sessions.filter(s => (s.subject_id || null) === id),
      worksheets: worksheets.filter(w => (w.subject_id || null) === id),
    });
    return [
      { subject: null, ...byId(null) },
      ...subjects.map(s => ({ subject: s, ...byId(s.id) })),
    ];
  }, [subjects, sessions, worksheets]);

  return (
    <div className="min-h-screen text-black">
      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-white border border-black/10 rounded-full p-2.5 shadow-sm"
        onClick={() => setMobileOpen(!mobileOpen)}
        data-testid="mobile-menu-toggle"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} weight="bold" /> : <List size={20} weight="bold" />}
      </button>

      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-72 bg-white border-r border-black/10 flex flex-col transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
        data-testid="sidebar"
      >
        <NavLink to="/" className="px-6 pt-9 pb-6 block hover:opacity-80 transition-opacity" data-testid="sidebar-brand">
          <div className="display text-3xl text-black">Revisia</div>
          <div className="text-[12px] uppercase tracking-[0.22em] text-black/45 mt-1">revision, made warmer</div>
        </NavLink>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-black/40 px-3 py-2 flex items-center gap-2">
            <Stack size={12} weight="bold" /> Library
          </div>
          {groups.map(g => (
            <SubjectGroup
              key={g.subject?.id || "general"}
              subject={g.subject}
              sessions={g.sessions}
              worksheets={g.worksheets}
              defaultOpen={true}
            />
          ))}
        </div>

        <div className="px-3 py-3 border-t border-black/10">
          <NavLink
            to="/subjects"
            data-testid="sidebar-manage-subjects"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 rounded-2xl transition-colors ${isActive ? "bg-black text-white" : "hover:bg-black/[0.04] text-black/80"}`
            }
          >
            <BookBookmark size={18} weight="regular" />
            <span className="text-[15px] font-semibold">Manage subjects</span>
          </NavLink>
          <div className="px-3 pt-3 pb-1 text-[11px] text-black/35 tracking-wide">
            Powered by Claude Haiku 4.5
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/20" onClick={() => setMobileOpen(false)} />
      )}

      <main className="min-h-screen md:ml-72">
        <div key={location.pathname} className="page-fade">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
