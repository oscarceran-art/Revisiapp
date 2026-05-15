import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, Eye, EyeSlash, DownloadSimple, ListChecks, Trash, CheckCircle, Circle, FileText,
} from "@phosphor-icons/react";
import { getWorksheet, deleteWorksheet, markWorksheet } from "@/lib/api";
import { useSidebarData } from "@/context/SidebarContext";
import jsPDF from "jspdf";

function StudentAnswerField({ q, value, onChange, disabled }) {
  if (q.options && q.options.length > 0) {
    return (
      <div className="mt-4 space-y-2" data-testid={`q-${q.number}-options`}>
        {q.options.map((opt, i) => {
          const letter = opt.match(/^([A-D])\)/)?.[1] || String.fromCharCode(65 + i);
          const selected = value === letter;
          return (
            <button
              key={i}
              type="button"
              onClick={() => !disabled && onChange(letter)}
              className={`w-full text-left flex items-start gap-3 px-4 py-3 rounded-2xl border transition-colors ${selected ? "bg-black text-white border-black" : "bg-white border-black/15 hover:bg-black/[0.04]"} disabled:opacity-70`}
              disabled={disabled}
              data-testid={`q-${q.number}-opt-${letter}`}
            >
              {selected ? <CheckCircle size={18} weight="fill" /> : <Circle size={18} weight="regular" className="opacity-50" />}
              <span className="flex-1 text-[15px]">{opt}</span>
            </button>
          );
        })}
      </div>
    );
  }
  const rows = q.type === "long_answer" ? 7 : 3;
  return (
    <textarea
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      rows={rows}
      placeholder="Your answer…"
      className="mt-3 w-full border-b-2 border-dotted border-black/25 bg-transparent focus:border-black focus:outline-none px-1 py-2 text-[15px] resize-none disabled:opacity-70"
      data-testid={`q-${q.number}-answer`}
    />
  );
}

export default function WorksheetViewerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refresh } = useSidebarData();
  const [ws, setWs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [showAnswers, setShowAnswers] = useState(false);
  const [marking, setMarking] = useState(false);
  const paperRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    getWorksheet(id).then(w => {
      setWs(w);
      setAnswers(w.user_answers || {});
      setShowAnswers(!!w.marking_result);
      setLoading(false);
    }).catch(() => { toast.error("Worksheet not found"); navigate("/"); });
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!window.confirm("Delete this worksheet?")) return;
    await deleteWorksheet(id);
    await refresh();
    navigate("/");
  };

  const handleMark = async () => {
    setMarking(true);
    try {
      const updated = await markWorksheet(id, answers);
      setWs(updated);
      setShowAnswers(true);
      refresh();
      toast.success(`Marked: ${updated.marking_result.total_awarded}/${updated.marking_result.total_out_of}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Marking failed");
    } finally {
      setMarking(false);
    }
  };

  const exportPDF = (markscheme) => {
    if (!ws) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 56;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const usableW = pageWidth - margin * 2;
    let y = margin;

    const ensure = (h) => { if (y + h > pageHeight - margin) { doc.addPage(); y = margin; } };
    const writeText = (text, opts = {}) => {
      const { size = 11, bold = false, italic = false, indent = 0, gap = 6, color = [0,0,0] } = opts;
      const style = bold && italic ? "bolditalic" : bold ? "bold" : italic ? "italic" : "normal";
      doc.setFont("times", style);
      doc.setFontSize(size);
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(String(text || ""), usableW - indent);
      lines.forEach(line => {
        ensure(size + 4);
        doc.text(line, margin + indent, y);
        y += size + 4;
      });
      y += gap;
    };

    if (markscheme) {
      // MARKSCHEME front
      writeText("MARK SCHEME", { size: 26, bold: true });
      y += 6;
      writeText(ws.title, { size: 14, italic: true });
      if (ws.subject_name) writeText(`Subject: ${ws.subject_name}`, { size: 11, color: [80,80,80] });
      writeText(`Total: ${ws.total_marks} marks`, { size: 11, color: [80,80,80] });
      y += 6;
      doc.setDrawColor(0); doc.setLineWidth(0.5); doc.line(margin, y, pageWidth - margin, y); y += 18;

      ws.questions.forEach(q => {
        writeText(`Q${q.number} [${q.marks} mark${q.marks !== 1 ? "s" : ""}]`, { size: 12, bold: true, gap: 2 });
        writeText(q.question, { size: 11, italic: true, color: [70,70,70], gap: 4 });
        writeText(`Answer: ${q.answer}`, { size: 11, bold: true, gap: 2 });
        if (q.explanation) writeText(`Markscheme: ${q.explanation}`, { size: 10.5, color: [60,60,60], gap: 10 });
      });
    } else {
      // FRONT PAGE
      writeText(ws.subject_name || "Revision Paper", { size: 12, color: [80,80,80] });
      y += 4;
      writeText(ws.title, { size: 26, bold: true });
      y += 10;
      doc.setDrawColor(0); doc.setLineWidth(1); doc.line(margin, y, pageWidth - margin, y); y += 30;

      writeText("INSTRUCTIONS", { size: 11, bold: true, gap: 8 });
      writeText(ws.instructions || "Answer all questions in the spaces provided.", { size: 11, gap: 14 });

      writeText("INFORMATION", { size: 11, bold: true, gap: 8 });
      writeText(`• The total mark for this paper is ${ws.total_marks}.`, { size: 11, gap: 2 });
      writeText(`• Suggested time: ${ws.duration_minutes} minutes.`, { size: 11, gap: 2 });
      writeText(`• The marks for each question are shown in brackets [ ].`, { size: 11, gap: 14 });

      // Name / Date box
      ensure(60);
      writeText("Name: ____________________________     Date: ____________", { size: 11, gap: 14 });

      doc.addPage(); y = margin;

      ws.questions.forEach(q => {
        ensure(40);
        writeText(`${q.number}. ${q.question}     [${q.marks}]`, { size: 12, bold: true, gap: 4 });
        if (q.options && q.options.length) {
          q.options.forEach(opt => writeText(opt, { size: 11, indent: 18, gap: 2 }));
          y += 4;
        } else {
          const lineCount = q.type === "long_answer" ? 8 : 3;
          for (let i = 0; i < lineCount; i++) {
            ensure(20);
            doc.setDrawColor(170); doc.setLineWidth(0.4);
            doc.line(margin + 10, y, pageWidth - margin, y);
            y += 20;
          }
          y += 4;
        }
      });

      // END marker
      ensure(20);
      doc.setFont("times", "bold"); doc.setFontSize(11); doc.setTextColor(0);
      doc.text("— END OF PAPER —", pageWidth / 2, y, { align: "center" });
    }

    const suffix = markscheme ? "-markscheme" : "";
    const safe = (ws.title || "worksheet").replace(/[^a-z0-9-_ ]/gi, "_");
    doc.save(`${safe}${suffix}.pdf`);
    toast.success(markscheme ? "Markscheme downloaded" : "Question paper downloaded");
  };

  if (loading || !ws) {
    return <div className="min-h-screen flex items-center justify-center text-black/40">Loading…</div>;
  }

  const mr = ws.marking_result;
  const isMarked = !!mr;

  return (
    <div className="min-h-screen pt-20 md:pt-12 px-6 md:px-14 pb-16" data-testid="worksheet-viewer">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6 no-print">
          <button onClick={() => navigate("/")} className="text-sm text-black/50 hover:text-black flex items-center gap-1.5">
            <ArrowLeft size={14} weight="bold" /> Home
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowAnswers(v => !v)}
              className="border border-black/15 rounded-2xl px-4 py-2 text-sm flex items-center gap-2 hover:bg-black/[0.04]"
              data-testid="toggle-answers-btn"
            >
              {showAnswers ? <EyeSlash size={16} weight="regular" /> : <Eye size={16} weight="regular" />}
              {showAnswers ? "Hide answers" : "Show answers"}
            </button>
            <button
              onClick={() => exportPDF(false)}
              className="border border-black/15 rounded-2xl px-4 py-2 text-sm flex items-center gap-2 hover:bg-black/[0.04]"
              data-testid="download-paper-btn"
            >
              <DownloadSimple size={16} weight="regular" /> Question paper
            </button>
            <button
              onClick={() => exportPDF(true)}
              className="border border-black/15 rounded-2xl px-4 py-2 text-sm flex items-center gap-2 hover:bg-black/[0.04]"
              data-testid="download-markscheme-btn"
            >
              <FileText size={16} weight="regular" /> Mark scheme
            </button>
            <button onClick={handleDelete} className="text-black/40 hover:text-red-600 p-2 rounded-full" data-testid="delete-worksheet-btn" aria-label="Delete">
              <Trash size={18} weight="regular" />
            </button>
          </div>
        </div>

        {/* Marking summary banner */}
        {isMarked && (
          <div className="mb-6 bg-white border border-black/10 rounded-3xl p-6 animate-fade-up" data-testid="marking-summary">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-black/45">Your score</div>
                <div className="display text-5xl mt-1">
                  {mr.total_awarded}<span className="text-black/40 text-3xl">/{mr.total_out_of}</span>
                </div>
                <div className="text-sm text-black/55 mt-1">{mr.percentage}%</div>
              </div>
              <div className="flex-1 min-w-[200px] max-w-md">
                <div className="text-[11px] uppercase tracking-[0.22em] text-black/45">Feedback</div>
                <p className="text-sm text-black/75 mt-2 leading-relaxed italic">{mr.overall_feedback}</p>
              </div>
            </div>
          </div>
        )}

        {/* Exam paper */}
        <div ref={paperRef} className="bg-white border border-black/10 rounded-3xl shadow-[0_4px_40px_rgba(0,0,0,0.04)] overflow-hidden print-area" data-testid="worksheet-paper">
          {/* FRONT PAGE */}
          <div className="p-10 md:p-14 border-b-2 border-black/10">
            <div className="text-[11px] uppercase tracking-[0.22em] text-black/50 mb-2">{ws.subject_name || "Revision paper"}</div>
            <h1 className="display text-4xl md:text-5xl mb-2" data-testid="worksheet-title">{ws.title}</h1>
            <div className="text-black/55 italic mb-10">Topic: {ws.topic} • Difficulty: {ws.difficulty}</div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-black/50 mb-3">Instructions</div>
                <p className="text-[15px] leading-relaxed text-black/85">{ws.instructions}</p>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-black/50 mb-3">Information</div>
                <ul className="text-[15px] leading-relaxed text-black/85 space-y-1">
                  <li>• Total marks: <strong className="font-semibold">{ws.total_marks}</strong></li>
                  <li>• Suggested time: <strong className="font-semibold">{ws.duration_minutes} minutes</strong></li>
                  <li>• Questions: <strong className="font-semibold">{ws.questions.length}</strong></li>
                  <li>• Marks are shown in brackets [ ]</li>
                </ul>
              </div>
            </div>
          </div>

          {/* QUESTIONS */}
          <div className="p-8 md:p-14 space-y-10">
            {ws.questions.map(q => {
              const fb = mr?.per_question?.find(p => p.number === q.number);
              return (
                <div key={q.number} data-testid={`question-${q.number}`}>
                  <div className="flex items-start gap-4">
                    <div className="display text-2xl text-black/30 w-10 shrink-0 tabular-nums">{q.number}.</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="text-[17px] leading-relaxed flex-1">{q.question}</div>
                        <div className="text-sm text-black/45 shrink-0 tabular-nums">[{q.marks}]</div>
                      </div>

                      <StudentAnswerField
                        q={q}
                        value={answers[q.number]}
                        onChange={(v) => setAnswers(prev => ({ ...prev, [q.number]: v }))}
                        disabled={isMarked}
                      />

                      {fb && (
                        <div className="mt-4 bg-[#FAF8F5] border border-black/10 rounded-2xl px-4 py-3" data-testid={`feedback-${q.number}`}>
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <div className="text-[11px] uppercase tracking-[0.22em] text-black/50">Marker's feedback</div>
                            <div className="text-sm font-semibold tabular-nums">
                              {fb.awarded}/{fb.out_of}
                            </div>
                          </div>
                          <p className="text-[14px] text-black/75 leading-relaxed">{fb.feedback}</p>
                        </div>
                      )}

                      {showAnswers && (
                        <div className="mt-3 bg-black/[0.03] border-l-2 border-black px-4 py-3 rounded-r-2xl" data-testid={`answer-${q.number}`}>
                          <div className="text-[11px] uppercase tracking-[0.22em] text-black/50 mb-1">Model answer</div>
                          <div className="text-[15px]">{q.answer}</div>
                          {q.explanation && <div className="text-[13px] text-black/55 mt-1.5 italic">{q.explanation}</div>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* FOOTER */}
          <div className="px-8 md:px-14 py-8 border-t border-black/10 text-center text-black/40 text-sm italic">
            — End of paper —
          </div>
        </div>

        {/* Mark action */}
        {!isMarked && (
          <div className="mt-6 flex justify-center no-print">
            <button
              onClick={handleMark}
              disabled={marking}
              className="bg-black text-white rounded-2xl px-8 py-3.5 flex items-center gap-2 hover:bg-black/85 disabled:opacity-50 transition-colors active:scale-[0.98] font-semibold"
              data-testid="mark-worksheet-btn"
            >
              <ListChecks size={18} weight="regular" />
              {marking ? "Marking your paper…" : "Mark my paper"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
