import { NavLink, Outlet, useLocation } from "react-router-dom";
import { ChatCircle, BookOpen, FileText, List, X } from "@phosphor-icons/react";
import { useState, useEffect } from "react";

const navItems = [
  { to: "/chat", label: "Chat", icon: ChatCircle, testid: "sidebar-nav-chat" },
  { to: "/subjects", label: "Subjects", icon: BookOpen, testid: "sidebar-nav-subjects" },
  { to: "/worksheets", label: "Worksheets", icon: FileText, testid: "sidebar-nav-worksheets" },
];

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Mobile menu toggle (no top bar, just a floating button) */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-white border border-black/10 rounded-full p-2 shadow-sm"
        onClick={() => setMobileOpen(!mobileOpen)}
        data-testid="mobile-menu-toggle"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} weight="light" /> : <List size={20} weight="light" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-64 bg-[#FCFCFC] border-r border-black/10 flex flex-col transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
        data-testid="sidebar"
      >
        <div className="px-6 pt-10 pb-8">
          <div className="text-3xl tracking-tight" style={{ fontVariationSettings: '"opsz" 144, "wght" 400' }}>
            Revisia
          </div>
          <div className="text-xs uppercase tracking-[0.18em] text-black/50 mt-1">
            revision, refined
          </div>
        </div>

        <nav className="flex-1 px-3">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                data-testid={item.testid}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 my-1 rounded-lg transition-colors ${isActive ? "bg-black text-white" : "text-black/70 hover:bg-black/5 hover:text-black"}`
                }
              >
                <Icon size={20} weight="light" />
                <span className="text-base">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="px-6 py-6 border-t border-black/10 text-xs text-black/40 tracking-wide">
          Powered by Claude Haiku 4.5
        </div>
      </aside>

      {/* Overlay on mobile */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/20"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="min-h-screen md:ml-64">
        <Outlet />
      </main>
    </div>
  );
}
