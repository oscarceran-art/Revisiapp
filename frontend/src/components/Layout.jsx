import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ChatCircle, FileText, List, X, Plus, BookBookmark, CaretDown, CaretRight, Stack, Trash, Notebook, SidebarSimple, CalendarBlank, Timer, Bell, SignOut, ShieldCheck } from "@phosphor-icons/react";
import { useState, useEffect, useMemo } from "react";
import { useSidebarData } from "@/context/SidebarContext";
import { useTimer } from "@/context/TimerContext";
import { useAuth } from "@/context/AuthContext";
import { deleteSession, deleteWorksheet, deleteNote } from "@/lib/api";
import { toast } from "sonner";
import SearchBar from "@/components/SearchBar";
import useExamReminders from "@/hooks/useExamReminders";

function SubjectGroup({ subject, sessions, worksheets, notes, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = useSidebarData();
  const name = subject ? subject.name : "General";
  const groupId = subject ? subject.id : "general";
  const total = sessions.length + worksheets.length + notes.length;

  const handleDeleteChat = async (e, s) => {
    e.stopPropagation();
    if (!window.confirm(`Delete chat "${s.title || 'Untitled'}"?`)) return;
    try {
      await deleteSession(s.id);
      await refresh();
      toast.success("Chat deleted");
      if (location.pathname === `/chat/${s.id}`) navigate("/");
    } catch { toast.error("Couldn't delete chat"); }
  };
  const handleDeleteWs = async (e, w) => {
    e.stopPropagation();
    if (!window.confirm(`Delete worksheet "${w.title || w.topic}"?`)) return;
    try {
      await deleteWorksheet(w.id);
      await refresh();
      toast.success("Worksheet deleted");
      if (location.pathname === `/worksheets/${w.id}`) navigate("/");
    } catch { toast.error("Couldn't delete worksheet"); }
  };
  const handleDeleteNote = async (e, n) => {
    e.stopPropagation();
    if (!window.confirm(`Delete notes "${n.title}"?`)) return;
    try {
      await deleteNote(n.id);
      await refresh();
      toast.success("Notes deleted");
      if (location.pathname === `/notes/${n.id}`) navigate("/");
    } catch { toast.error("Couldn't delete notes"); }
  };

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-2xl hover:bg-black/[0.04] transition-colors"
        data-testid={`sidebar-group-${groupId}`}
      >
        {open ? <CaretDown size={14} weight="bold" /> : <CaretRight size={14} weight="bold" />}
        <span className="text-[16px] font-bold flex-1 text-left truncate">{name}</span>
        <span className="text-[12px] text-black/40 tabular-nums">{total}</span>
      </button>
      {open && (
        <div className="ml-3 pl-3 border-l border-black/10 mt-1 mb-2 space-y-0.5">
          <div className="flex gap-1.5 px-1 pb-1.5">
            <button
              onClick={() => navigate(`/chat/new?subject=${groupId}`)}
              className="flex-1 text-[12px] flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl bg-gradient-to-r from-pink-400 to-blue-500 text-white hover:opacity-90 transition-opacity"
            >
              <Plus size={12} weight="bold" /> Chat
            </button>
            <button
              onClick={() => navigate(`/worksheets/new?subject=${groupId}`)}
              className="flex-1 text-[12px] flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl bg-white border border-black/15 hover:bg-black/[0.04] transition-colors"
            >
              <Plus size={12} weight="bold" /> Sheet
            </button>
            <button
              onClick={() => navigate(`/notes/new?subject=${groupId}`)}
              className="flex-1 text-[12px] flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl bg-white border border-black/15 hover:bg-black/[0.04] transition-colors"
            >
              <Plus size={12} weight="bold" /> Notes
            </button>
          </div>

          {total === 0 && <div className="text-[13px] text-black/35 px-3 py-2 italic">Empty</div>}

          {sessions.map(s => {
            const isActive = location.pathname === `/chat/${s.id}`;
            return (
              <div
                key={s.id} onClick={() => navigate(`/chat/${s.id}`)}
                className={`group/item cursor-pointer text-[14px] pl-3 pr-2 py-2 rounded-xl flex items-center gap-2 transition-colors ${isActive ? "bg-black text-white" : "hover:bg-black/[0.04] text-black/85"}`}
                data-testid={`sidebar-chat-${s.id}`}
              >
                <ChatCircle size={13} weight="regular" className="shrink-0 opacity-70" />
                <span className="truncate flex-1">{s.title || "Untitled"}</span>
                <button onClick={(e) => handleDeleteChat(e, s)} className={`opacity-0 group-hover/item:opacity-100 transition-opacity p-1 rounded-md ${isActive ? "hover:bg-white/15" : "hover:bg-black/10"}`} data-testid={`delete-chat-${s.id}`} aria-label="Delete chat">
                  <Trash size={12} weight="regular" />
                </button>
              </div>
            );
          })}

          {worksheets.map(w => {
            const isActive = location.pathname === `/worksheets/${w.id}`;
            return (
              <div
                key={w.id} onClick={() => navigate(`/worksheets/${w.id}`)}
                className={`group/item cursor-pointer text-[14px] pl-3 pr-2 py-2 rounded-xl flex items-center gap-2 transition-colors ${isActive ? "bg-black text-white" : "hover:bg-black/[0.04] text-black/85"}`}
                data-testid={`sidebar-worksheet-${w.id}`}
              >
                <FileText size={13} weight="regular" className="shrink-0 opacity-70" />
                <span className="truncate flex-1">{w.title || w.topic}</span>
                {w.marking_result && (
                  <span className={`text-[10px] tabular-nums shrink-0 ${isActive ? "text-white/70" : "text-black/40"}`}>
                    {Math.round(w.marking_result.percentage)}%
                  </span>
                )}
                <button onClick={(e) => handleDeleteWs(e, w)} className={`opacity-0 group-hover/item:opacity-100 transition-opacity p-1 rounded-md ${isActive ? "hover:bg-white/15" : "hover:bg-black/10"}`} data-testid={`delete-worksheet-${w.id}`} aria-label="Delete worksheet">
                  <Trash size={12} weight="regular" />
                </button>
              </div>
            );
          })}

          {notes.map(n => {
            const isActive = location.pathname === `/notes/${n.id}`;
            return (
              <div
                key={n.id} onClick={() => navigate(`/notes/${n.id}`)}
                className={`group/item cursor-pointer text-[14px] pl-3 pr-2 py-2 rounded-xl flex items-center gap-2 transition-colors ${isActive ? "bg-black text-white" : "hover:bg-black/[0.04] text-black/85"}`}
                data-testid={`sidebar-note-${n.id}`}
              >
                <Notebook size={13} weight="regular" className="shrink-0 opacity-70" />
                <span className="truncate flex-1">{n.title}</span>
                <button onClick={(e) => handleDeleteNote(e, n)} className={`opacity-0 group-hover/item:opacity-100 transition-opacity p-1 rounded-md ${isActive ? "hover:bg-white/15" : "hover:bg-black/10"}`} data-testid={`delete-note-${n.id}`} aria-label="Delete notes">
                  <Trash size={12} weight="regular" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifPerm, setNotifPerm] = useState(typeof Notification !== "undefined" ? Notification.permission : "denied");
  const location = useLocation();
  const navigate = useNavigate();
  const { subjects, sessions, worksheets, notes, collapsed, toggleCollapsed } = useSidebarData();
  const { state: timerState, setOpen: setTimerOpen } = useTimer();
  const { user, logout } = useAuth();
  useExamReminders();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const requestNotif = async () => {
    if (typeof Notification === "undefined") { toast.error("This browser doesn't support notifications"); return; }
    try {
      const perm = await Notification.requestPermission();
      setNotifPerm(perm);
      if (perm === "granted") toast.success("Exam reminders enabled");
    } catch { /* ignore */ }
  };

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const groups = useMemo(() => {
    const byId = (id) => ({
      sessions: sessions.filter(s => (s.subject_id || null) === id),
      worksheets: worksheets.filter(w => (w.subject_id || null) === id),
      notes: notes.filter(n => (n.subject_id || null) === id),
    });
    return [
      { subject: null, ...byId(null) },
      ...subjects.map(s => ({ subject: s, ...byId(s.id) })),
    ];
  }, [subjects, sessions, worksheets, notes]);

  const sidebarWidth = collapsed && !mobileOpen ? "w-16" : "w-72";
  const mainOffset = collapsed ? "md:ml-16" : "md:ml-72";
  const showCollapsed = collapsed && !mobileOpen;

  return (
    <div className="min-h-screen text-black">
      <button
        className="md:hidden fixed top-3 left-3 z-50 bg-white border border-black/10 rounded-full p-2.5 shadow-sm"
        onClick={() => setMobileOpen(!mobileOpen)}
        data-testid="mobile-menu-toggle"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} weight="bold" /> : <List size={20} weight="bold" />}
      </button>

      <aside
        className={`fixed top-0 left-0 z-40 h-[100dvh] bg-white/95 backdrop-blur-sm border-r border-black/10 flex flex-col transition-all duration-200 ${sidebarWidth} ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 shadow-[2px_0_20px_rgba(0,0,0,0.03)]`}
        data-testid="sidebar"
      >
        <div className={`flex items-center justify-between pt-5 pb-3 ${showCollapsed ? "px-3" : "px-5"}`}>
          {!showCollapsed && (
            <NavLink to="/" className="block hover:opacity-80 transition-opacity flex-1 min-w-0" data-testid="sidebar-brand">
              <div className="text-2xl font-extrabold text-black truncate">Revision AI</div>
            </NavLink>
          )}
          <button
            onClick={toggleCollapsed}
            className="p-2 rounded-xl hover:bg-black/[0.04] transition-colors shrink-0"
            data-testid="sidebar-collapse-toggle"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <SidebarSimple size={18} weight="regular" />
          </button>
        </div>

        {showCollapsed ? (
          <div className="flex-1 overflow-y-auto px-2 py-3 space-y-2 flex flex-col items-center">
            {[
              { to: "/", icon: ChatCircle, label: "Home" },
              { to: "/chat/new", icon: ChatCircle, label: "New chat" },
              { to: "/worksheets/new", icon: FileText, label: "New sheet" },
              { to: "/notes/new", icon: Notebook, label: "New notes" },
              { to: "/exams", icon: CalendarBlank, label: "Exams" },
              { to: "/subjects", icon: BookBookmark, label: "Subjects" },
            ].map(it => {
              const Icon = it.icon;
              const active = location.pathname === it.to;
              return (
                <button
                  key={it.to}
                  onClick={() => navigate(it.to)}
                  title={it.label}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${active ? "bg-gradient-to-br from-pink-400 to-blue-500 text-white" : "hover:bg-black/[0.05] text-black/70"}`}
                  data-testid={`collapsed-nav-${it.label.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <Icon size={18} weight="regular" />
                </button>
              );
            })}
            <button
              onClick={() => setTimerOpen(!timerState.open)}
              title="Focus timer"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${timerState.open ? "bg-black text-white" : "hover:bg-black/[0.05] text-black/70"}`}
              data-testid="collapsed-nav-timer"
            >
              <Timer size={18} weight="regular" />
            </button>
            {/* Logout - collapsed */}
            <button
              onClick={handleLogout}
              title="Log out"
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:bg-red-50 text-black/40 hover:text-red-500 mt-auto"
            >
              <SignOut size={18} weight="regular" />
            </button>
          </div>
        ) : (
          <>
            <SearchBar />
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
                  notes={g.notes}
                  defaultOpen={false}
                />
              ))}
            </div>

            <div className="px-3 py-3 border-t border-black/10">
              <NavLink
                to="/exams"
                data-testid="sidebar-exams-link"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-2xl transition-colors mb-1 ${isActive ? "bg-black text-white" : "hover:bg-black/[0.04] text-black/80"}`
                }
              >
                <CalendarBlank size={16} weight="regular" />
                <span className="text-[14px] font-semibold">Exams & countdowns</span>
              </NavLink>
              <NavLink
                to="/subjects"
                data-testid="sidebar-manage-subjects"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-2xl transition-colors ${isActive ? "bg-black text-white" : "hover:bg-black/[0.04] text-black/80"}`
                }
              >
                <BookBookmark size={16} weight="regular" />
                <span className="text-[14px] font-semibold">Manage subjects</span>
              </NavLink>

              {/* Admin link — only visible to admins */}
              {user?.is_admin && (
                <NavLink
                  to="/admin"
                  data-testid="sidebar-admin-link"
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2.5 rounded-2xl transition-colors mt-1 ${isActive ? "bg-black text-white" : "hover:bg-black/[0.04] text-black/80"}`
                  }
                >
                  <ShieldCheck size={16} weight="regular" />
                  <span className="text-[14px] font-semibold">Admin</span>
                </NavLink>
              )}

              <div className="mt-3 pt-3 border-t border-black/10 flex gap-2">
                <button
                  onClick={() => setTimerOpen(!timerState.open)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl text-[12px] font-bold border transition-colors ${timerState.open ? "bg-black text-white border-black" : "border-black/15 hover:bg-black/[0.04]"}`}
                  data-testid="sidebar-timer-toggle"
                >
                  <Timer size={13} weight="regular" /> Timer
                  {timerState.running && <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse ml-1" />}
                </button>
                {notifPerm !== "granted" && (
                  <button
                    onClick={requestNotif}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl text-[12px] font-bold border border-black/15 hover:bg-black/[0.04]"
                    data-testid="sidebar-enable-notif"
                    title="Enable browser notifications for exam-morning reminders"
                  >
                    <Bell size={13} weight="regular" /> Enable alerts
                  </button>
                )}
                {notifPerm === "granted" && (
                  <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl text-[12px] font-bold text-black/55" title="Exam reminders on">
                    <Bell size={13} weight="fill" /> Alerts on
                  </div>
                )}
              </div>

              {/* User info + logout */}
              <div className="mt-3 pt-3 border-t border-black/10 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold truncate">{user?.username}</div>
                  <div className="text-[11px] text-black/40">{user?.is_admin ? "Admin" : "Student"}</div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="p-2 rounded-xl hover:bg-red-50 text-black/40 hover:text-red-500 transition-colors"
                  data-testid="sidebar-logout"
                  aria-label="Log out"
                >
                  <SignOut size={16} weight="regular" />
                </button>
              </div>

            </div>
          </>
        )}
      </aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/20" onClick={() => setMobileOpen(false)} />
      )}

      <main className={`min-h-screen ${mainOffset} transition-all duration-200`}>
        <div key={location.pathname} className="page-fade">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
