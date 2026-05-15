import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Plus, Trash, DownloadSimple, Eye, EyeSlash, Sparkle } from "@phosphor-icons/react";
import { listSubjects, generateWorksheet, listWorksheets, getWorksheet, deleteWorksheet } from "@/lib/api";
import jsPDF from "jspdf";

const DIFFICULTIES = ["easy", "medium", "hard", "mixed"];
const TYPES = [
  { value: "mixed", label: "Mixed (full mock)" },
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "short_answer", label: "Short answer" },
  { value: "long_answer", label: "Long answer" },
];

export default function WorksheetsPage() {
  const [subjects, setSubjects] = useState([]);
  const [worksheets, setWorksheets] = useState([]);
  const [active, setActive] = useState(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [generating, setGenerating] = useState(false);
  const paperRef = useRef(null);

  const [form, setForm] = useState({
    subject_id: "",
    topic: "",
    num_questions: 10,
    difficulty: "medium",
    question_type: "mixed",
    extra_instructions: "",
  });

  useEffect(() => {
    listSubjects().then(setSubjects).catch(() => {});
    listWorksheets().then(setWorksheets).catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!form.topic.trim()) { toast.error("Please enter a topic"); return; }
    setGenerating(true);
    try {
      const ws = await generateWorksheet({ ...form, num_questions: Number(form.num_questions) });
      setWorksheets(prev => [ws, ...prev]);
      setActive(ws);
      setShowAnswers(false);
      toast.success("Worksheet ready");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleOpen = async (id) => {
    const ws = await getWorksheet(id);
    setActive(ws);
    setShowAnswers(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this worksheet?")) return;
    await deleteWorksheet(id);
    setWorksheets(prev => prev.filter(w => w.id !== id));
    if (active?.id === id) setActive(null);
  };

  const exportPDF = (includeAnswers) => {
    if (!active) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 56;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const usableW = pageWidth - margin * 2;
    let y = margin;

    const ensureSpace = (h) => {
      if (y + h > pageHeight - margin) { doc.addPage(); y = margin; }
    };

    const writeText = (text, opts = {}) => {
      const { size = 11, bold = false, indent = 0, gap = 6 } = opts;
      doc.setFont("times", bold ? "bold" : "normal");
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(text, usableW - indent);
      lines.forEach(line => {
        ensureSpace(size + 4);
        doc.text(line, margin + indent, y);
        y += size + 4;
      });
      y += gap;
    };

    // Header
    doc.setFont("times", "bold");
    doc.setFontSize(22);
    doc.text(active.title, margin, y);
    y += 28;

    doc.setFont("times", "italic");
    doc.setFontSize(10);
    const meta = [
      active.subject_name && `Subject: ${active.subject_name}`,
      `Topic: ${active.topic}`,
      `Difficulty: ${active.difficulty}`,
      `${active.num_questions} questions`,
    ].filter(Boolean).join("  •  ");
    doc.text(meta, margin, y);
    y += 22;
    doc.setDrawColor(0); doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 18;

    active.questions.forEach((q) => {
      writeText(`${q.number}. ${q.question}`, { size: 12, bold: true, gap: 4 });
      if (q.options && q.options.length) {
        q.options.forEach(opt => writeText(opt, { size: 11, indent: 16, gap: 2 }));
      } else {
        // Lines for handwritten answers
        const lineCount = q.type === "long_answer" ? 8 : 3;
        for (let i = 0; i < lineCount; i++) {
          ensureSpace(18);
          doc.setDrawColor(180); doc.setLineWidth(0.4);
          doc.line(margin + 8, y, pageWidth - margin, y);
          y += 18;
        }
      }
      y += 6;
    });

    if (includeAnswers) {
      doc.addPage();
      y = margin;
      doc.setFont("times", "bold"); doc.setFontSize(20);
      doc.text("Answers", margin, y); y += 28;
      active.questions.forEach((q) => {
        writeText(`${q.number}. ${q.answer}`, { size: 11, bold: true, gap: 2 });
        if (q.explanation) writeText(q.explanation, { size: 10, gap: 8 });
      });
    }

    doc.save(`${active.title.replace(/[^a-z0-9-_ ]/gi, "_")}.pdf`);
  };

  return (
    <div className="min-h-screen pt-16 md:pt-12 px-6 md:px-12 pb-16" data-testid="worksheets-page">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <div className="text-xs uppercase tracking-[0.18em] text-black/50">Generator</div>
          <h1 className="text-4xl md:text-5xl tracking-tight mt-1" style={{ fontVariationSettings: '"opsz" 144, "wght" 400' }}>
            Worksheets
          </h1>
          <p className="text-black/60 mt-2">Craft a quick quiz or a full mock — fully customisable.</p>
        </div>

        <div className="grid lg:grid-cols-[360px_1fr] gap-8">
          {/* Generator form */}
          <div className="bg-white border border-black/10 rounded-xl p-6 self-start">
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-[0.18em] text-black/50 block mb-2">Subject</label>
                <select
                  value={form.subject_id}
                  onChange={e => setForm(v => ({ ...v, subject_id: e.target.value }))}
                  className="w-full border border-black/15 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:border-black"
                  data-testid="worksheet-subject-select"
                >
                  <option value="">No subject context</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.18em] text-black/50 block mb-2">Topic</label>
                <input
                  value={form.topic}
                  onChange={e => setForm(v => ({ ...v, topic: e.target.value }))}
                  placeholder="e.g. Photosynthesis"
                  className="w-full border border-black/15 rounded-lg px-3 py-2.5 focus:outline-none focus:border-black"
                  data-testid="worksheet-topic-input"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.18em] text-black/50 block mb-2">
                  Number of questions: <span className="text-black">{form.num_questions}</span>
                </label>
                <input
                  type="range" min={3} max={30} step={1}
                  value={form.num_questions}
                  onChange={e => setForm(v => ({ ...v, num_questions: e.target.value }))}
                  className="w-full accent-black"
                  data-testid="worksheet-count-slider"
                />
                <div className="flex justify-between text-xs text-black/40 mt-1"><span>3</span><span>30</span></div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.18em] text-black/50 block mb-2">Difficulty</label>
                <div className="grid grid-cols-4 gap-1">
                  {DIFFICULTIES.map(d => (
                    <button
                      key={d}
                      onClick={() => setForm(v => ({ ...v, difficulty: d }))}
                      className={`text-xs py-2 rounded-md border transition-colors capitalize ${form.difficulty === d ? "bg-black text-white border-black" : "bg-white border-black/15 hover:bg-black/5"}`}
                      data-testid={`difficulty-${d}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.18em] text-black/50 block mb-2">Question style</label>
                <select
                  value={form.question_type}
                  onChange={e => setForm(v => ({ ...v, question_type: e.target.value }))}
                  className="w-full border border-black/15 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:border-black"
                  data-testid="question-type-select"
                >
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.18em] text-black/50 block mb-2">Extra instructions (optional)</label>
                <textarea
                  rows={3}
                  value={form.extra_instructions}
                  onChange={e => setForm(v => ({ ...v, extra_instructions: e.target.value }))}
                  placeholder="e.g. Focus on Krebs cycle, GCSE level"
                  className="w-full border border-black/15 rounded-lg px-3 py-2 focus:outline-none focus:border-black text-sm"
                  data-testid="worksheet-extra-input"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full bg-black text-white rounded-lg py-3 flex items-center justify-center gap-2 hover:bg-black/85 disabled:opacity-50 transition-colors active:scale-[0.98]"
                data-testid="generate-worksheet-btn"
              >
                <Sparkle size={16} weight="fill" />
                {generating ? "Generating…" : "Generate worksheet"}
              </button>
            </div>

            {worksheets.length > 0 && (
              <div className="mt-8 pt-6 border-t border-black/10">
                <div className="text-xs uppercase tracking-[0.18em] text-black/50 mb-3">History</div>
                <div className="space-y-1 max-h-80 overflow-y-auto">
                  {worksheets.map(w => (
                    <div
                      key={w.id}
                      className={`group flex items-center justify-between gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors ${active?.id === w.id ? "bg-black/5" : "hover:bg-black/5"}`}
                      onClick={() => handleOpen(w.id)}
                      data-testid={`worksheet-history-${w.id}`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm truncate">{w.title}</div>
                        <div className="text-xs text-black/40 truncate">{w.topic}  •  {w.difficulty}</div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(w.id); }} className="opacity-0 group-hover:opacity-100 text-black/40 hover:text-black" aria-label="Delete">
                        <Trash size={14} weight="light" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Viewer */}
          <div>
            {!active ? (
              <div className="bg-white border border-dashed border-black/15 rounded-xl p-16 text-center">
                <FileText size={48} weight="thin" className="mx-auto text-black/30" />
                <h3 className="text-2xl tracking-tight mt-4" style={{ fontVariationSettings: '"opsz" 144' }}>No worksheet yet</h3>
                <p className="text-black/50 mt-2">Configure on the left and hit generate.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-end gap-2 mb-4 no-print">
                  <button
                    onClick={() => setShowAnswers(v => !v)}
                    className="border border-black/15 rounded-lg px-3 py-2 text-sm flex items-center gap-2 hover:bg-black/5"
                    data-testid="toggle-answers-btn"
                  >
                    {showAnswers ? <EyeSlash size={16} weight="light" /> : <Eye size={16} weight="light" />}
                    {showAnswers ? "Hide answers" : "Show answers"}
                  </button>
                  <button
                    onClick={() => exportPDF(false)}
                    className="border border-black/15 rounded-lg px-3 py-2 text-sm flex items-center gap-2 hover:bg-black/5"
                    data-testid="export-questions-pdf"
                  >
                    <DownloadSimple size={16} weight="light" /> Questions PDF
                  </button>
                  <button
                    onClick={() => exportPDF(true)}
                    className="bg-black text-white rounded-lg px-3 py-2 text-sm flex items-center gap-2 hover:bg-black/85 active:scale-[0.98]"
                    data-testid="export-with-answers-pdf"
                  >
                    <DownloadSimple size={16} weight="light" /> With answers
                  </button>
                </div>

                <div ref={paperRef} className="bg-white border border-black/10 rounded-sm shadow-[0_0_40px_rgba(0,0,0,0.03)] p-8 md:p-14 print-area" data-testid="worksheet-paper">
                  <div className="border-b border-black/10 pb-5 mb-6">
                    <div className="text-xs uppercase tracking-[0.18em] text-black/50">
                      {active.subject_name || "Worksheet"}
                    </div>
                    <h2 className="text-3xl md:text-4xl tracking-tight mt-1" style={{ fontVariationSettings: '"opsz" 144' }}>
                      {active.title}
                    </h2>
                    <div className="text-sm text-black/50 mt-2">
                      Topic: {active.topic}  •  Difficulty: {active.difficulty}  •  {active.num_questions} questions
                    </div>
                  </div>

                  <ol className="space-y-7">
                    {active.questions.map(q => (
                      <li key={q.number} data-testid={`question-${q.number}`}>
                        <div className="flex gap-3">
                          <span className="text-black/40 tabular-nums">{q.number}.</span>
                          <div className="flex-1">
                            <div className="text-[17px] leading-relaxed">{q.question}</div>
                            {q.options && q.options.length > 0 && (
                              <ul className="mt-3 space-y-1.5">
                                {q.options.map((opt, i) => (
                                  <li key={i} className="text-[15px] text-black/80 pl-4">{opt}</li>
                                ))}
                              </ul>
                            )}
                            {!q.options && (
                              <div className="mt-3 space-y-3">
                                {Array.from({ length: q.type === "long_answer" ? 5 : 2 }).map((_, i) => (
                                  <div key={i} className="border-b border-black/15 h-6" />
                                ))}
                              </div>
                            )}
                            {showAnswers && (
                              <div className="mt-3 bg-black/[0.03] border-l-2 border-black px-4 py-3 rounded-sm" data-testid={`answer-${q.number}`}>
                                <div className="text-xs uppercase tracking-[0.15em] text-black/50 mb-1">Answer</div>
                                <div className="text-[15px]">{q.answer}</div>
                                {q.explanation && <div className="text-sm text-black/60 mt-1.5 italic">{q.explanation}</div>}
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
