import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Sparkle, Notebook } from "@phosphor-icons/react";
import { generateNotes } from "@/lib/api";
import { useSidebarData } from "@/context/SidebarContext";
import ModelSelector from "@/components/ModelSelector";

const DEPTHS = [
  { id: "overview", label: "Overview", desc: "Quick summary" },
  { id: "standard", label: "Standard", desc: "Balanced notes" },
  { id: "deep", label: "Deep dive", desc: "Everything you need" },
];

export default function NotesGeneratorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { subjects, refresh } = useSidebarData();
  const subjectParam = searchParams.get("subject");
  const defaultSubjectId = subjectParam && subjectParam !== "general" ? subjectParam : "";

  const [form, setForm] = useState({
    subject_id: defaultSubjectId,
    topic: "",
    depth: "standard",
    model: null,
  });
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!form.topic.trim()) { toast.error("Please enter a topic"); return; }
    setGenerating(true);
    try {
      const note = await generateNotes(form);
      await refresh();
      toast.success("Notes ready");
      navigate(`/notes/${note.id}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen pt-14 md:pt-12 px-4 sm:px-6 md:px-10 pb-16" data-testid="notes-generator-page">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="text-sm text-black/55 hover:text-black flex items-center gap-1.5 mb-6">
          <ArrowLeft size={14} weight="bold" /> Back
        </button>

        <div className="mb-8">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-black/45">
            <Notebook size={12} weight="fill" /> New notes
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl mt-2 font-extrabold">Generate study notes</h1>
          <p className="text-black/55 mt-2 sm:mt-3 text-sm sm:text-base">Crisp, structured notes you can read, revise from, and turn into a worksheet later.</p>
        </div>

        <div className="bg-white border border-black/10 rounded-3xl p-5 sm:p-7 space-y-6">
          <div>
            <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-2">Subject</label>
            <select
              value={form.subject_id}
              onChange={e => setForm(v => ({ ...v, subject_id: e.target.value }))}
              className="w-full border border-black/15 rounded-2xl px-4 py-3 bg-white focus:outline-none focus:border-black"
              data-testid="notes-subject-select"
            >
              <option value="">General (no subject)</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-2">Topic</label>
            <input
              value={form.topic}
              onChange={e => setForm(v => ({ ...v, topic: e.target.value }))}
              placeholder="e.g. Photosynthesis in C4 plants"
              className="w-full border border-black/15 rounded-2xl px-4 py-3 focus:outline-none focus:border-black"
              data-testid="notes-topic-input"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-2">Depth</label>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {DEPTHS.map(d => (
                <button
                  key={d.id}
                  onClick={() => setForm(v => ({ ...v, depth: d.id }))}
                  className={`text-left p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border transition-colors ${form.depth === d.id ? "bg-black text-white border-black" : "bg-white border-black/15 hover:bg-black/[0.04]"}`}
                  data-testid={`depth-${d.id}`}
                >
                  <div className="text-xs sm:text-sm font-bold">{d.label}</div>
                  <div className={`text-[10px] sm:text-[11px] mt-0.5 ${form.depth === d.id ? "text-white/70" : "text-black/50"}`}>{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <ModelSelector value={form.model} onChange={m => setForm(v => ({ ...v, model: m }))} />

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full bg-gradient-to-r from-pink-400 to-blue-500 text-white rounded-2xl py-3.5 flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity active:scale-[0.98] font-bold"
            data-testid="generate-notes-btn"
          >
            <Sparkle size={16} weight="fill" />
            {generating ? "Writing notesâ€¦" : "Generate notes"}
          </button>
        </div>
      </div>
    </div>
  );
}
