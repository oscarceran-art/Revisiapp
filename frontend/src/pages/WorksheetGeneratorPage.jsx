import { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Sparkle, ArrowLeft, UploadSimple, FileText } from "@phosphor-icons/react";
import { generateWorksheet, worksheetFromPastPaper } from "@/lib/api";
import { useSidebarData } from "@/context/SidebarContext";
import ModelSelector from "@/components/ModelSelector";

const DIFFICULTIES = ["easy", "medium", "hard", "mixed"];
const TYPES = [
  { value: "mixed", label: "Mixed (full mock paper)" },
  { value: "multiple_choice", label: "Multiple choice only" },
  { value: "short_answer", label: "Short answer only" },
  { value: "long_answer", label: "Long answer only" },
];

export default function WorksheetGeneratorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { subjects, refresh } = useSidebarData();
  const subjectParam = searchParams.get("subject");
  const topicParam = searchParams.get("topic");
  const defaultSubjectId = subjectParam && subjectParam !== "general" ? subjectParam : "";

  const [mode, setMode] = useState("topic"); // "topic" | "past-paper"
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);

  const [form, setForm] = useState({
    subject_id: defaultSubjectId,
    topic: topicParam || "",
    num_questions: 10,
    difficulty: "medium",
    question_type: "mixed",
    extra_instructions: "",
    model: null,
  });
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!form.topic.trim()) { toast.error("Please enter a topic"); return; }
    setGenerating(true);
    try {
      const ws = await generateWorksheet({ ...form, num_questions: Number(form.num_questions) });
      await refresh();
      toast.success("Worksheet ready");
      navigate(`/worksheets/${ws.id}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleImport = async () => {
    if (!file) { toast.error("Please select a past paper file"); return; }
    setGenerating(true);
    try {
      const ws = await worksheetFromPastPaper(
        file,
        form.subject_id || null,
        form.difficulty,
        form.num_questions < 30 ? Number(form.num_questions) : null
      );
      await refresh();
      toast.success("Past paper imported");
      navigate(`/worksheets/${ws.id}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Import failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen pt-14 md:pt-14 px-4 sm:px-6 md:px-14 pb-16" data-testid="worksheet-generator-page">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="text-sm text-black/50 hover:text-black flex items-center gap-1.5 mb-6">
          <ArrowLeft size={14} weight="bold" /> Back
        </button>

        <div className="mb-8">
          <div className="text-[11px] uppercase tracking-[0.22em] text-black/45">New paper</div>
          <h1 className="display text-4xl md:text-5xl mt-2">Design your worksheet</h1>
          <p className="text-black/55 mt-3">A quick quiz, a full mock, or import a real past paper.</p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-6 bg-black/[0.04] rounded-2xl p-1">
          <button
            onClick={() => setMode("topic")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors ${mode === "topic" ? "bg-white text-black shadow-sm" : "text-black/55 hover:text-black"}`}
            data-testid="mode-topic"
          >
            <Sparkle size={14} weight="fill" /> From topic
          </button>
          <button
            onClick={() => setMode("past-paper")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors ${mode === "past-paper" ? "bg-white text-black shadow-sm" : "text-black/55 hover:text-black"}`}
            data-testid="mode-past-paper"
          >
            <UploadSimple size={14} weight="regular" /> Upload past paper
          </button>
        </div>

        <div className="bg-white border border-black/10 rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-5 sm:space-y-6">
          {mode === "topic" ? (
            <>
              <div>
                <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-2">Subject</label>
                <select
                  value={form.subject_id}
                  onChange={e => setForm(v => ({ ...v, subject_id: e.target.value }))}
                  className="w-full border border-black/15 rounded-2xl px-4 py-3 bg-white focus:outline-none focus:border-black"
                  data-testid="worksheet-subject-select"
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
                  placeholder="e.g. Photosynthesis"
                  className="w-full border border-black/15 rounded-2xl px-4 py-3 focus:outline-none focus:border-black"
                  data-testid="worksheet-topic-input"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-2">
                  Number of questions <span className="text-black ml-2">{form.num_questions}</span>
                </label>
                <input
                  type="range" min={3} max={30} step={1}
                  value={form.num_questions}
                  onChange={e => setForm(v => ({ ...v, num_questions: e.target.value }))}
                  className="w-full accent-black"
                  data-testid="worksheet-count-slider"
                />
                <div className="flex justify-between text-xs text-black/40 mt-1"><span>3</span><span>Full mock (30)</span></div>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-2">Difficulty</label>
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                  {DIFFICULTIES.map(d => (
                    <button
                      key={d}
                      onClick={() => setForm(v => ({ ...v, difficulty: d }))}
                      className={`text-xs sm:text-sm py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border transition-colors capitalize ${form.difficulty === d ? "bg-black text-white border-black" : "bg-white border-black/15 hover:bg-black/[0.04]"}`}
                      data-testid={`difficulty-${d}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-2">Question style</label>
                <select
                  value={form.question_type}
                  onChange={e => setForm(v => ({ ...v, question_type: e.target.value }))}
                  className="w-full border border-black/15 rounded-2xl px-4 py-3 bg-white focus:outline-none focus:border-black"
                  data-testid="question-type-select"
                >
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-2">Extra instructions (optional)</label>
                <textarea
                  rows={3}
                  value={form.extra_instructions}
                  onChange={e => setForm(v => ({ ...v, extra_instructions: e.target.value }))}
                  placeholder="e.g. Focus on Krebs cycle, GCSE level"
                  className="w-full border border-black/15 rounded-2xl px-4 py-3 focus:outline-none focus:border-black text-sm"
                  data-testid="worksheet-extra-input"
                />
              </div>

              <ModelSelector value={form.model} onChange={m => setForm(v => ({ ...v, model: m }))} />

              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full bg-gradient-to-r from-pink-400 to-blue-500 text-white rounded-2xl py-3.5 flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity active:scale-[0.98] font-semibold"
                data-testid="generate-worksheet-btn"
              >
                <Sparkle size={16} weight="fill" />
                {generating ? "Generatingâ€¦" : "Generate worksheet"}
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-2">Subject</label>
                <select
                  value={form.subject_id}
                  onChange={e => setForm(v => ({ ...v, subject_id: e.target.value }))}
                  className="w-full border border-black/15 rounded-2xl px-4 py-3 bg-white focus:outline-none focus:border-black"
                  data-testid="pastpaper-subject-select"
                >
                  <option value="">General (no subject)</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-2">Past paper file</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-colors ${file ? "border-black bg-black/[0.02]" : "border-black/15 hover:border-black/30 hover:bg-black/[0.02]"}`}
                  data-testid="pastpaper-dropzone"
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={e => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                    data-testid="pastpaper-file-input"
                  />
                  {file ? (
                    <div className="flex flex-col items-center gap-1">
                      <FileText size={28} weight="regular" className="text-black/60" />
                      <div className="text-sm font-bold mt-1">{file.name}</div>
                      <div className="text-xs text-black/45">{(file.size / 1024).toFixed(0)} KB</div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                        className="text-xs text-red-500 hover:text-red-700 mt-1 underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <UploadSimple size={28} weight="regular" className="text-black/30" />
                      <div className="text-sm font-bold mt-1 text-black/60">Click to upload a past paper</div>
                      <div className="text-xs text-black/40">PDF, DOCX, or TXT</div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-2">Difficulty (for AI marking)</label>
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                  {DIFFICULTIES.map(d => (
                    <button
                      key={d}
                      onClick={() => setForm(v => ({ ...v, difficulty: d }))}
                      className={`text-xs sm:text-sm py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border transition-colors capitalize ${form.difficulty === d ? "bg-black text-white border-black" : "bg-white border-black/15 hover:bg-black/[0.04]"}`}
                      data-testid={`pastpaper-difficulty-${d}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-2">
                  Max questions <span className="text-black ml-2">{form.num_questions === 30 ? "All" : form.num_questions}</span>
                </label>
                <input
                  type="range" min={3} max={30} step={1}
                  value={form.num_questions}
                  onChange={e => setForm(v => ({ ...v, num_questions: Number(e.target.value) }))}
                  className="w-full accent-black"
                  data-testid="pastpaper-count-slider"
                />
                <div className="flex justify-between text-xs text-black/40 mt-1"><span>3</span><span>All</span></div>
              </div>

              <button
                onClick={handleImport}
                disabled={generating || !file}
                className="w-full bg-gradient-to-r from-pink-400 to-blue-500 text-white rounded-2xl py-3.5 flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity active:scale-[0.98] font-semibold"
                data-testid="import-pastpaper-btn"
              >
                <UploadSimple size={16} weight="regular" />
                {generating ? "Importingâ€¦" : "Import as worksheet"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
