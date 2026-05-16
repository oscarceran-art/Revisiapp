import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, FileText, BookOpen, Sparkle } from "@phosphor-icons/react";
import { getNote, worksheetFromNotes } from "@/lib/api";
import { useSidebarData } from "@/context/SidebarContext";

export default function NoteViewerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refresh } = useSidebarData();
  const [note, setNote] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    getNote(id).then(setNote).catch(() => { toast.error("Notes not found"); navigate("/"); });
  }, [id, navigate]);

  const handleMakeWorksheet = async () => {
    setGenerating(true);
    try {
      const ws = await worksheetFromNotes(id, { num_questions: 8, difficulty: "medium", question_type: "mixed" });
      await refresh();
      toast.success("Worksheet generated");
      navigate(`/worksheets/${ws.id}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed");
    } finally {
      setGenerating(false);
    }
  };

  if (!note) return <div className="min-h-screen flex items-center justify-center text-black/40">Loading…</div>;

  return (
    <div className="min-h-screen pt-20 md:pt-12 px-4 sm:px-6 md:px-10 pb-16" data-testid="note-viewer">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <button onClick={() => navigate("/")} className="text-sm text-black/55 hover:text-black flex items-center gap-1.5">
            <ArrowLeft size={14} weight="bold" /> Home
          </button>
          <button
            onClick={handleMakeWorksheet}
            disabled={generating}
            className="bg-black text-white rounded-2xl px-4 sm:px-5 py-2 sm:py-2.5 text-sm flex items-center gap-2 hover:bg-black/85 disabled:opacity-50 transition-colors font-bold"
            data-testid="make-worksheet-from-notes-btn"
          >
            <FileText size={14} weight="regular" /> {generating ? "Generating…" : "Make worksheet from these notes"}
          </button>
        </div>

        <div className="bg-white border border-black/10 rounded-3xl p-6 sm:p-10">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-black/45">
            <BookOpen size={12} weight="fill" /> {note.subject_name || "Notes"}
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl mt-2 font-extrabold leading-tight">{note.title}</h1>
          {note.summary && <p className="text-black/65 italic mt-4 text-base sm:text-lg leading-relaxed">{note.summary}</p>}

          <div className="mt-8 sm:mt-10 space-y-8">
            {note.sections.map((s, i) => (
              <div key={i} data-testid={`note-section-${i}`}>
                <h2 className="text-xl sm:text-2xl font-extrabold mb-3 flex items-baseline gap-3">
                  <span className="text-black/30 text-base tabular-nums">{i + 1}.</span>
                  {s.heading}
                </h2>
                <ul className="space-y-2.5 list-disc pl-6 text-[15px] sm:text-base leading-relaxed text-black/85">
                  {s.bullets.map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>

          {note.key_terms && note.key_terms.length > 0 && (
            <div className="mt-10 pt-8 border-t border-black/10">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-black/45 mb-4">
                <Sparkle size={11} weight="fill" /> Key terms
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {note.key_terms.map((t, i) => (
                  <div key={i} className="bg-[#FAF8F5] rounded-2xl p-4">
                    <div className="font-extrabold text-sm">{t.term}</div>
                    <div className="text-sm text-black/65 mt-1 leading-relaxed">{t.definition}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
