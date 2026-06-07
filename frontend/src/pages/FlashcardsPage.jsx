import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { listDecks, createDeck, deleteDeck, getDueCount } from "@/lib/api";
import { Plus, Trash, Notebook, Spinner } from "@phosphor-icons/react";
import { toast } from "sonner";

const EMOJIS = ["🧬", "⚛️", "🌍", "📚", "➗", "🔬", "🧪", "🔭", "📝", "🎯", "🧠", "💡", "📊", "🔢", "🌿", "🧲", "💻", "🎨", "🏛️", "🌊"];

export default function FlashcardsPage() {
  const navigate = useNavigate();
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newIcon, setNewIcon] = useState("🧬");

  const load = async () => {
    try {
      const d = await listDecks();
      setDecks(d);
    } catch { toast.error("Failed to load decks"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createDeck({ name: newName.trim(), description: newDesc.trim(), icon: newIcon });
      setNewName(""); setNewDesc(""); setShowCreate(false);
      await load();
      toast.success("Deck created");
    } catch { toast.error("Failed to create deck"); }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Delete this deck and all its cards?")) return;
    try {
      await deleteDeck(id);
      await load();
      toast.success("Deck deleted");
    } catch { toast.error("Failed to delete deck"); }
  };

  if (loading) return (
    <div className="min-h-screen pt-20 flex items-start justify-center">
      <Spinner size={24} className="animate-spin text-black/30" />
    </div>
  );

  return (
    <div className="min-h-screen pt-20 md:pt-16 px-4 sm:px-6 md:px-10 lg:px-14 pb-16" data-testid="flashcards-page">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-black/45">Study tools</div>
            <h1 className="text-3xl sm:text-4xl font-extrabold mt-1">Flashcards</h1>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-black text-white rounded-2xl px-4 py-2.5 text-sm font-bold flex items-center gap-2 active:scale-[0.98]"
          >
            <Plus size={14} weight="bold" /> New deck
          </button>
        </div>

        {showCreate && (
          <div className="bg-white border border-black/15 rounded-2xl p-4 mb-6 animate-fade-up">
            <input
              autoFocus
              placeholder="Deck name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
              className="w-full border border-black/15 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-black mb-2"
            />
            <input
              placeholder="Description (optional)"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              className="w-full border border-black/15 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-black mb-3"
            />
            <div className="mb-3">
              <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-1.5">Icon</label>
              <div className="flex flex-wrap gap-1.5">
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => setNewIcon(e)}
                    className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-colors ${newIcon === e ? "bg-black text-white" : "hover:bg-black/[0.05]"}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} className="bg-black text-white rounded-xl px-4 py-1.5 text-sm font-bold active:scale-[0.98]">Create</button>
              <button onClick={() => setShowCreate(false)} className="text-sm text-black/60 px-3 py-1.5">Cancel</button>
            </div>
          </div>
        )}

        {decks.length === 0 && !showCreate && (
          <div className="text-center py-16">
            <Notebook size={40} className="mx-auto text-black/20 mb-4" />
            <p className="text-black/50 text-sm">No decks yet. Create one to start studying with spaced repetition.</p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {decks.map(deck => (
            <button
              key={deck.id}
              onClick={() => navigate(`/flashcards/${deck.id}`)}
              className="text-left bg-white border border-black/10 rounded-2xl p-5 hover:border-black/25 transition-colors active:scale-[0.99] group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center text-base">
                  {deck.icon || "📚"}
                </div>
                <button onClick={(e) => handleDelete(e, deck.id)} className="text-black/20 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100">
                  <Trash size={14} />
                </button>
              </div>
              <div className="font-extrabold text-base mb-1 truncate">{deck.name}</div>
              {deck.description && <div className="text-xs text-black/50 mb-3 line-clamp-2">{deck.description}</div>}
              <div className="flex items-center gap-3 text-xs text-black/40">
                <span>{deck.card_count} card{deck.card_count !== 1 ? "s" : ""}</span>
                {deck.due_count > 0 && (
                  <span className="text-pink-500 font-bold">{deck.due_count} due</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
