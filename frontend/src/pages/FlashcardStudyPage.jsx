import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { listCards, reviewCard, createCard, deleteCard, generateCards, generateCardsFromNotes, generateCardsFromWorksheet } from "@/lib/api";
import { ArrowLeft, Plus, Trash, Sparkle, NotePencil, FileText, Check, X, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useSidebarData } from "@/context/SidebarContext";
import ModelSelector from "@/components/ModelSelector";

const qualityLabels = [
  { label: "Blackout", desc: "Complete blackout", color: "bg-red-500" },
  { label: "Hard", desc: "Wrong, but familiar", color: "bg-red-400" },
  { label: "Struggled", desc: "Got it with effort", color: "bg-amber-400" },
  { label: "Hesitant", desc: "Recalled after thought", color: "bg-yellow-400" },
  { label: "Good", desc: "Recalled correctly", color: "bg-lime-400" },
  { label: "Perfect", desc: "Instant recall", color: "bg-green-400" },
];

export default function FlashcardStudyPage() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const { notes, worksheets } = useSidebarData();
  const [cards, setCards] = useState([]);
  const [deckName, setDeckName] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [showGenerate, setShowGenerate] = useState(false);
  const [genTopic, setGenTopic] = useState("");
  const [genCount, setGenCount] = useState(10);
  const [genModel, setGenModel] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [mode, setMode] = useState("all"); // "all" | "due"

  const load = useCallback(async () => {
    try {
      const all = await listCards(deckId);
      const due = await listCards(deckId, true);
      setCards(all);
      if (all.length > 0) setDeckName(all[0].deck_id || "Flashcards");
    } catch { toast.error("Failed to load cards"); }
    finally { setLoading(false); }
  }, [deckId]);

  useEffect(() => { load(); }, [load]);

  const currentCards = mode === "due" ? cards.filter(c => new Date(c.next_review) <= new Date()) : cards;
  const current = currentCards[currentIndex];

  const handleReview = async (quality) => {
    if (!current) return;
    try {
      await reviewCard(current.id, quality);
      setFlipped(false);
      await load();
      if (currentIndex < currentCards.length - 1) {
        setCurrentIndex(i => i + 1);
      } else {
        setCurrentIndex(0);
        toast.success("All cards reviewed!");
      }
    } catch { toast.error("Failed to save review"); }
  };

  const handleAddCard = async () => {
    if (!newFront.trim() || !newBack.trim()) return;
    try {
      await createCard(deckId, { front: newFront.trim(), back: newBack.trim() });
      setNewFront(""); setNewBack(""); setShowAdd(false);
      await load();
      toast.success("Card added");
    } catch { toast.error("Failed to add card"); }
  };

  const handleDelete = async (e, cardId) => {
    e.stopPropagation();
    if (!confirm("Delete this card?")) return;
    try {
      await deleteCard(cardId);
      await load();
      if (currentIndex >= currentCards.length - 1 && currentIndex > 0) {
        setCurrentIndex(i => i - 1);
      }
    } catch { toast.error("Failed to delete card"); }
  };

  const handleGenerate = async () => {
    if (!genTopic.trim()) return;
    setGenerating(true);
    try {
      await generateCards(deckId, genTopic.trim(), genCount, genModel);
      setGenTopic(""); setShowGenerate(false);
      await load();
      toast.success("Cards generated!");
    } catch { toast.error("Failed to generate cards"); }
    finally { setGenerating(false); }
  };

  const handleGenerateFromNotes = async (noteId) => {
    setGenerating(true);
    try {
      await generateCardsFromNotes(deckId, noteId, genModel);
      await load();
      toast.success("Cards generated from notes!");
    } catch { toast.error("Failed to generate from notes"); }
    finally { setGenerating(false); }
  };

  const handleGenerateFromWorksheet = async (worksheetId) => {
    setGenerating(true);
    try {
      await generateCardsFromWorksheet(deckId, worksheetId, genModel);
      await load();
      toast.success("Cards generated from worksheet!");
    } catch { toast.error("Failed to generate from worksheet"); }
    finally { setGenerating(false); }
  };

  if (loading) return (
    <div className="min-h-screen pt-20 flex items-start justify-center">
      <div className="animate-spin w-6 h-6 border-2 border-black/20 border-t-black rounded-full" />
    </div>
  );

  const dueCount = cards.filter(c => new Date(c.next_review) <= new Date()).length;

  return (
    <div className="min-h-screen pt-20 md:pt-16 px-4 sm:px-6 md:px-10 lg:px-14 pb-16" data-testid="flashcard-study-page">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate("/flashcards")} className="text-sm text-black/55 hover:text-black flex items-center gap-1.5">
            <ArrowLeft size={14} weight="bold" /> Back to decks
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGenerate(true)}
              className="text-xs border border-black/15 rounded-full px-3 py-1.5 hover:bg-black/[0.04] flex items-center gap-1.5"
            >
              <Sparkle size={12} /> Generate
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="text-xs border border-black/15 rounded-full px-3 py-1.5 hover:bg-black/[0.04] flex items-center gap-1.5"
            >
              <Plus size={12} /> Add card
            </button>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => { setMode("due"); setCurrentIndex(0); setFlipped(false); }}
            className={`text-xs rounded-full px-3 py-1.5 font-bold transition-colors ${mode === "due" ? "bg-black text-white" : "bg-black/5 text-black/60 hover:bg-black/10"}`}
          >
            Due ({dueCount})
          </button>
          <button
            onClick={() => { setMode("all"); setCurrentIndex(0); setFlipped(false); }}
            className={`text-xs rounded-full px-3 py-1.5 font-bold transition-colors ${mode === "all" ? "bg-black text-white" : "bg-black/5 text-black/60 hover:bg-black/10"}`}
          >
            All ({cards.length})
          </button>
        </div>

        {/* Card */}
        {currentCards.length === 0 ? (
          <div className="text-center py-16">
            <NotePencil size={40} className="mx-auto text-black/20 mb-4" />
            <p className="text-black/50 text-sm mb-6">
              {mode === "due" ? "No cards due for review! Add more cards or switch to all." : "No cards in this deck yet."}
            </p>
            <button onClick={() => setShowGenerate(true)} className="bg-black text-white rounded-2xl px-5 py-2.5 text-sm font-bold flex items-center gap-2 mx-auto active:scale-[0.98]">
              <Sparkle size={14} weight="fill" /> Generate flashcards
            </button>
          </div>
        ) : (
          <>
            <div className="text-xs text-black/40 mb-2 text-center">
              {currentIndex + 1} / {currentCards.length}
            </div>

            <div
              onClick={() => setFlipped(!flipped)}
              className="bg-white border border-black/10 rounded-3xl p-8 sm:p-12 min-h-[280px] flex items-center justify-center cursor-pointer hover:border-black/20 transition-colors select-none"
            >
              <div className="text-center">
                <div className="text-[11px] uppercase tracking-[0.22em] text-black/30 mb-4">
                  {flipped ? "Answer" : "Question"}
                </div>
                <div className="text-lg sm:text-xl font-bold leading-relaxed whitespace-pre-wrap">
                  {flipped ? current.back : current.front}
                </div>
                {current.hint && !flipped && (
                  <div className="text-xs text-black/30 mt-4 italic">Tap to reveal answer</div>
                )}
                {!current.hint && !flipped && (
                  <div className="text-xs text-black/30 mt-4 italic">Tap to reveal answer</div>
                )}
                {current.repetitions > 0 && flipped && (
                  <div className="text-xs text-black/30 mt-4">
                    Reviewed {current.repetitions} time{current.repetitions !== 1 ? "s" : ""} &middot; Interval: {current.interval}d &middot; Ease: {current.ease_factor}
                  </div>
                )}
              </div>
            </div>

            {/* Delete card */}
            <div className="flex justify-center mt-3">
              <button onClick={(e) => handleDelete(e, current.id)} className="text-xs text-black/30 hover:text-red-500 transition-colors flex items-center gap-1">
                <Trash size={12} /> Delete card
              </button>
            </div>

            {/* Rating buttons (only when flipped) */}
            {flipped && (
              <div className="mt-6 animate-fade-up">
                <div className="text-[11px] uppercase tracking-[0.22em] text-black/40 text-center mb-3">How well did you remember?</div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {qualityLabels.map((ql, i) => (
                    <button
                      key={i}
                      onClick={() => handleReview(i)}
                      className={`${ql.color} text-white rounded-2xl py-2.5 px-2 text-xs font-bold active:scale-[0.95] transition-transform hover:opacity-90`}
                      title={ql.desc}
                    >
                      {ql.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => { if (currentIndex > 0) { setCurrentIndex(i => i - 1); setFlipped(false); } }}
                disabled={currentIndex === 0}
                className="text-sm text-black/40 hover:text-black disabled:opacity-20 flex items-center gap-1"
              >
                <CaretLeft size={14} weight="bold" /> Previous
              </button>
              <button
                onClick={() => { if (currentIndex < currentCards.length - 1) { setCurrentIndex(i => i + 1); setFlipped(false); } }}
                disabled={currentIndex === currentCards.length - 1}
                className="text-sm text-black/40 hover:text-black disabled:opacity-20 flex items-center gap-1"
              >
                Next <CaretRight size={14} weight="bold" />
              </button>
            </div>
          </>
        )}

        {/* Add card modal */}
        {showAdd && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
            <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-extrabold mb-4">Add card</h3>
              <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 mb-1.5 block">Front (question)</label>
              <textarea
                autoFocus
                value={newFront}
                onChange={e => setNewFront(e.target.value)}
                className="w-full border border-black/15 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-black mb-3 min-h-[60px]"
              />
              <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 mb-1.5 block">Back (answer)</label>
              <textarea
                value={newBack}
                onChange={e => setNewBack(e.target.value)}
                className="w-full border border-black/15 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-black mb-4 min-h-[60px]"
              />
              <div className="flex gap-2">
                <button onClick={handleAddCard} className="flex-1 bg-black text-white rounded-2xl py-2.5 text-sm font-bold active:scale-[0.98]">Add card</button>
                <button onClick={() => setShowAdd(false)} className="px-4 text-sm text-black/60">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Generate modal */}
        {showGenerate && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowGenerate(false)}>
            <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-extrabold mb-4">Generate flashcards</h3>

              <div className="mb-5">
                <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 mb-1.5 block">From topic</label>
                <input
                  value={genTopic}
                  onChange={e => setGenTopic(e.target.value)}
                  placeholder="e.g. Photosynthesis, World War II..."
                  className="w-full border border-black/15 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-black mb-2"
                />
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-black/50">Cards:</span>
                  {[5, 10, 15, 20].map(n => (
                    <button
                      key={n}
                      onClick={() => setGenCount(n)}
                      className={`text-xs rounded-full px-2.5 py-1 ${genCount === n ? "bg-black text-white" : "bg-black/5 text-black/60"}`}
                    >{n}</button>
                  ))}
                </div>
                <div className="mb-3">
                  <ModelSelector value={genModel} onChange={setGenModel} />
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={generating || !genTopic.trim()}
                  className="w-full bg-black text-white rounded-2xl py-2 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                >
                  {generating ? <><div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Generating...</> : <><Sparkle size={14} weight="fill" /> Generate</>}
                </button>
              </div>

              <div className="border-t border-black/10 pt-4">
                <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 mb-3 block">From existing content</label>
                {notes.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-bold text-black/60 mb-1.5">Study notes</div>
                    <div className="flex flex-wrap gap-1.5">
                      {notes.map(n => (
                        <button
                          key={n.id}
                          onClick={() => handleGenerateFromNotes(n.id)}
                          disabled={generating}
                          className="text-xs border border-black/15 rounded-full px-2.5 py-1 hover:bg-black/[0.04] disabled:opacity-50 flex items-center gap-1"
                        >
                          <NotePencil size={10} /> {n.title || n.topic}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {worksheets.length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-black/60 mb-1.5">Worksheets</div>
                    <div className="flex flex-wrap gap-1.5">
                      {worksheets.map(w => (
                        <button
                          key={w.id}
                          onClick={() => handleGenerateFromWorksheet(w.id)}
                          disabled={generating}
                          className="text-xs border border-black/15 rounded-full px-2.5 py-1 hover:bg-black/[0.04] disabled:opacity-50 flex items-center gap-1"
                        >
                          <FileText size={10} /> {w.title || w.topic}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {notes.length === 0 && worksheets.length === 0 && (
                  <p className="text-xs text-black/40">No notes or worksheets yet. Create some first.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
