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

  if (!note) return <div className="min-h-screen flex items-center justify-center text-black/40">Loadingâ€¦</div>;

  return (
    <div className="min-h-screen pt-14 md:pt-12 px-4 sm:px-6 md:px-10 pb-16" data-testid="note-viewer">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <button onClick={() => navigate("/")} className="text-sm text-black/55 hover:text-black flex items-center gap-1.5">
            <ArrowLeft size={14} weight="bold" /> Home
          </button>
          <button
            onClick={handleMakeWorksheet}
            disabled={generating}
              className="bg-gradient-to-r from-pink-400 to-blue-500 text-white rounded-2xl px-4 sm:px-5 py-2 sm:py-2.5 text-sm flex items-center gap-2 disabled:opacity-50 active:scale-[0.98] font-bold hover:opacity-90 transition-opacity"
            data-testid="make-worksheet-from-notes-btn"
          >
            <FileText size={14} weight="regular" /> {generating ? "Generatingâ€¦" : "Make worksheet from these notes"}
          </button>
        </div>

        <div className="bg-white border border-black/10 rounded-3xl p-6 sm:p-10 shadow-[0_2px_20px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-black/45">
            <BookOpen size={12} weight="fill" /> {note.subject_name || "Notes"}
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl mt-2 font-extrabold leading-tight">{note.title}</h1>
          {note.summary && (
            <div className="mt-5 border-l-2 border-black/15 pl-5">
              <p className="text-black/65 italic text-base sm:text-lg leading-relaxed">{note.summary}</p>
            </div>
          )}

          <div className="mt-8 sm:mt-10 space-y-10">
            {note.sections.map((s, i) => (
              <div key={i} data-testid={`note-section-${i}`}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-8 h-8 rounded-full bg-black text-white text-sm flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                  <h2 className="text-xl sm:text-2xl font-extrabold">{s.heading.replace(/^\d+\.?\s*/, "")}</h2>
                </div>
                <ul className="space-y-3 pl-4 text-[15px] sm:text-base leading-relaxed text-black/85">
                  {s.bullets.map((b, j) => (
                    <li key={j} className="flex gap-3">
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-black/30 shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {note.key_terms && note.key_terms.length > 0 && (
            <div className="mt-10 pt-8 border-t border-black/10">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-black/45 mb-4">
                <Sparkle size={11} weight="fill" /> Key terms â€” {note.key_terms.length}
              </div>
              <div className="flex flex-wrap gap-2">
                {note.key_terms.map((t, i) => (
                  <div key={i} className="group relative">
                    <span tabIndex={0} className="inline-block bg-black text-white text-[13px] font-bold px-3 py-1.5 rounded-full cursor-default outline-none focus:ring-2 focus:ring-pink-400/50">{t.term}</span>
                    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:absolute md:bottom-full md:left-1/2 md:-translate-x-1/2 md:z-auto mb-2 w-56 bg-black text-white text-[13px] p-3 rounded-2xl opacity-0 invisible group-hover:opacity-100 group-focus-within:opacity-100 group-hover:visible group-focus-within:visible transition-all pointer-events-none shadow-lg">
                      {t.definition}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-black" />
                    </div>
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
