import { useState } from "react";
import Avatar from "@/components/Avatar";
import { Check, MagnifyingGlass } from "@phosphor-icons/react";

export default function PersonaPicker({ personas, selectedIds, onChange, multi = false, excludeIds = [] }) {
  const [q, setQ] = useState("");
  const filtered = personas.filter(p =>
    !excludeIds.includes(p.id) &&
    (p.name.toLowerCase().includes(q.toLowerCase()) ||
      (p.tags || []).some(t => t.toLowerCase().includes(q.toLowerCase())))
  );

  const toggle = (id) => {
    if (multi) {
      const set = new Set(selectedIds);
      if (set.has(id)) set.delete(id); else set.add(id);
      onChange([...set]);
    } else {
      onChange(selectedIds.includes(id) ? [] : [id]);
    }
  };

  return (
    <div data-testid="persona-picker">
      <div className="relative mb-3">
        <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search personas, e.g. physics, biology…"
          className="w-full border border-black/15 rounded-2xl pl-9 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:border-black"
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
        {filtered.map(p => {
          const isSel = selectedIds.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              data-testid={`persona-${p.id}`}
              className={`relative text-left p-3 rounded-2xl border transition-all ${isSel ? "border-black bg-black text-white" : "border-black/15 bg-white hover:border-black/30"}`}
            >
              {isSel && (
                <span className="absolute top-2 right-2 bg-white text-black rounded-full p-0.5">
                  <Check size={11} weight="bold" />
                </span>
              )}
              <div className="flex items-center gap-2.5 mb-1.5">
                <Avatar persona={p} size={36} />
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate">{p.name}</div>
                  <div className={`text-[10px] truncate ${isSel ? "text-white/60" : "text-black/45"}`}>{p.era}</div>
                </div>
              </div>
              <div className={`text-[11px] leading-snug ${isSel ? "text-white/70" : "text-black/55"} line-clamp-2`}>
                {p.title}
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-8 text-sm text-black/40">No matches</div>
        )}
      </div>
    </div>
  );
}
