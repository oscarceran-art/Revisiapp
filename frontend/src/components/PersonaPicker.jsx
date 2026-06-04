import { useState } from "react";
import Avatar from "@/components/Avatar";
import { Check, MagnifyingGlass, Plus, Sparkle, X, Trash } from "@phosphor-icons/react";
import { createCustomPersona, deleteCustomPersona } from "@/lib/api";
import { toast } from "sonner";

export default function PersonaPicker({ personas, selectedIds, onChange, multi = false, excludeIds = [], onPersonasChanged }) {
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBrief, setNewBrief] = useState("");

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

  const handleCreate = async () => {
    if (!newName.trim() || !newBrief.trim()) { toast.error("Name and brief required"); return; }
    setCreating(true);
    try {
      const p = await createCustomPersona({ name: newName.trim(), brief: newBrief.trim() });
      toast.success(`${p.name} added`);
      setNewName(""); setNewBrief(""); setShowModal(false);
      if (onPersonasChanged) await onPersonasChanged();
      // Auto-select the freshly created persona
      toggle(p.id);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Couldn't create persona");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCustom = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this custom character?")) return;
    try {
      await deleteCustomPersona(id);
      if (onPersonasChanged) await onPersonasChanged();
      onChange(selectedIds.filter(x => x !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Couldn't delete");
    }
  };

  return (
    <div data-testid="persona-picker">
      <div className="flex flex-col sm:flex-row gap-2.5 mb-3">
        <div className="relative flex-1">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search personas, e.g. physics, biology…"
            className="w-full border border-black/15 rounded-2xl pl-9 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:border-black"
          />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-gradient-sweep rounded-2xl px-4 py-2.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98]"
          data-testid="open-create-persona-modal"
        >
          <Plus size={14} weight="bold" /> Create your own
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
        {filtered.map(p => {
          const isSel = selectedIds.includes(p.id);
          const isCustom = !!p.custom;
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              data-testid={`persona-${p.id}`}
              className={`group relative text-left p-3 rounded-2xl border transition-all ${isSel ? "border-black bg-black text-white" : "border-black/15 bg-white hover:border-black/30"}`}
            >
              {isSel && (
                <span className="absolute top-2 right-2 bg-white text-black rounded-full p-0.5">
                  <Check size={11} weight="bold" />
                </span>
              )}
              {isCustom && (
                <span className={`absolute top-2 ${isSel ? "right-9" : "right-2"} text-[9px] uppercase tracking-widest font-bold rounded-full px-1.5 py-0.5 ${isSel ? "bg-white/15 text-white" : "bg-black/85 text-white"}`}>
                  Yours
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
              {isCustom && (
                <button
                  onClick={(e) => handleDeleteCustom(e, p.id)}
                  className={`absolute bottom-2 right-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md ${isSel ? "hover:bg-white/15" : "hover:bg-black/10"}`}
                  aria-label="Delete custom persona"
                >
                  <Trash size={11} weight="regular" />
                </button>
              )}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-8 text-sm text-black/40">No matches</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-fade-up" onClick={() => !creating && setShowModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()} data-testid="create-persona-modal">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-black/45">Custom character</div>
                <h3 className="text-2xl font-extrabold mt-1">Create your own</h3>
              </div>
              <button onClick={() => !creating && setShowModal(false)} className="text-black/40 hover:text-black p-1" aria-label="Close">
                <X size={20} weight="regular" />
              </button>
            </div>
            <p className="text-sm text-black/55 mb-5">The AI will craft a unique personality, voice and area of expertise from your brief.</p>

            <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-2">Name</label>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Detective Briar"
              className="w-full border border-black/15 rounded-2xl px-4 py-2.5 mb-4 focus:outline-none focus:border-black text-sm"
              data-testid="custom-persona-name"
            />

            <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-2">Brief</label>
            <textarea
              value={newBrief}
              onChange={e => setNewBrief(e.target.value)}
              rows={4}
              placeholder="e.g. A 1920s noir detective who solves chemistry puzzles. Smokes a pipe, distrusts technology, quotes Sherlock Holmes."
              className="w-full border border-black/15 rounded-2xl px-4 py-3 mb-5 focus:outline-none focus:border-black text-sm"
              data-testid="custom-persona-brief"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                disabled={creating}
                className="flex-1 border border-black/15 rounded-2xl py-2.5 text-sm font-bold hover:bg-black/[0.04]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim() || !newBrief.trim()}
                className="flex-1 btn-gradient-sweep rounded-2xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                data-testid="confirm-create-persona"
              >
                <Sparkle size={14} weight="fill" /> {creating ? "Crafting…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
