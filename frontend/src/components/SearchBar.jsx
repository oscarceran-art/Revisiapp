import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlass, ChatCircle, FileText, Notebook, BookBookmark, CalendarBlank } from "@phosphor-icons/react";
import { search } from "@/lib/api";

const GROUPS = [
  { key: "chats", label: "Chats", icon: ChatCircle, to: (it) => `/chat/${it.id}`, sub: (it) => it.title },
  { key: "notes", label: "Notes", icon: Notebook, to: (it) => `/notes/${it.id}`, sub: (it) => it.title },
  { key: "worksheets", label: "Worksheets", icon: FileText, to: (it) => `/worksheets/${it.id}`, sub: (it) => it.title || it.topic },
  { key: "subjects", label: "Subjects", icon: BookBookmark, to: () => `/subjects`, sub: (it) => it.name },
  { key: "exams", label: "Exams", icon: CalendarBlank, to: () => `/exams`, sub: (it) => it.name },
];

export default function SearchBar() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const wrapRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults(null); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await search(q.trim());
        setResults(r);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [q]);

  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        wrapRef.current?.querySelector("input")?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const totalResults = results
    ? Object.values(results).reduce((a, b) => a + (Array.isArray(b) ? b.length : 0), 0)
    : 0;

  const go = (path) => {
    navigate(path);
    setOpen(false);
    setQ("");
  };

  return (
    <div ref={wrapRef} className="relative px-3 pt-3 pb-2" data-testid="search-wrap">
      <div className="relative">
        <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search…  ⌘K"
          className="w-full bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] focus:bg-background border border-transparent focus:border-foreground/30 rounded-2xl pl-9 pr-3 py-2 text-[13px] outline-none transition-colors"
          data-testid="sidebar-search-input"
        />
      </div>

      {open && q.trim() && (
        <div
          className="absolute left-3 right-3 top-full mt-1 glass-card rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] max-h-[60vh] overflow-y-auto z-50"
          data-testid="search-results-panel"
        >
          {loading && totalResults === 0 && (
            <div className="px-4 py-3 text-[12px] text-muted-foreground">Searching…</div>
          )}
          {!loading && totalResults === 0 && results && (
            <div className="px-4 py-3 text-[12px] text-muted-foreground" data-testid="search-no-results">No results for "{q}"</div>
          )}
          {results && GROUPS.map(g => {
            const items = results[g.key] || [];
            if (!items.length) return null;
            const Icon = g.icon;
            return (
              <div key={g.key} className="py-1.5">
                <div className="px-3 pt-1.5 pb-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground flex items-center gap-1.5">
                  <Icon size={10} weight="fill" /> {g.label}
                </div>
                {items.map(it => (
                  <button
                    key={`${g.key}-${it.id}`}
                    onClick={() => go(g.to(it))}
                    className="w-full text-left px-3 py-1.5 text-[13px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] flex items-center gap-2"
                    data-testid={`search-result-${g.key}-${it.id}`}
                  >
                    <Icon size={12} weight="regular" className="opacity-60 shrink-0" />
                    <span className="truncate">{g.sub(it)}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
