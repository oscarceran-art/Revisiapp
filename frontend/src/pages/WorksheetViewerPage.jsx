import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, Eye, EyeSlash, ListChecks, Trash, CheckCircle, Circle, FileText, ArrowsClockwise, Target, Star,
} from "@phosphor-icons/react";
import { getWorksheet, deleteWorksheet, markWorksheet, setWorksheetConfidence } from "@/lib/api";
import { useSidebarData } from "@/context/SidebarContext";
import { celebrateForScore } from "@/lib/celebrate";

function ConfidenceRow({ ws, onSaved }) {
  const [saving, setSaving] = useState(false);
  const current = ws.confidence?.rating || 0;
  const set = async (rating) => {
    if (saving) return;
    setSaving(true);
    try {
      const updated = await setWorksheetConfidence(ws.id, rating);
      onSaved(updated);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="mt-5 pt-5 border-t border-border flex items-center justify-between flex-wrap gap-3" data-testid="confidence-row">
      <div>
        <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">How confident are you on this topic now?</div>
        <div className="text-[12px] text-muted-foreground mt-1">Helps track your progress on this topic.</div>
      </div>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => set(n)}
            disabled={saving}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${n <= current ? "bg-foreground text-primary-foreground" : "bg-black/[0.05] dark:bg-white/[0.1] text-muted-foreground hover:bg-black/10 dark:hover:bg-white/20"}`}
            data-testid={`confidence-${n}`}
            aria-label={`${n} out of 5`}
          >
            <Star size={14} weight={n <= current ? "fill" : "regular"} />
          </button>
        ))}
        {current > 0 && <span className="ml-2 text-[12px] font-bold tabular-nums">{current}/5</span>}
      </div>
    </div>
  );
}

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
              className={`w-full text-left flex items-start gap-3 px-4 py-3 rounded-2xl border transition-colors ${selected ? "bg-foreground text-primary-foreground border-foreground" : "bg-background border-border hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"} disabled:opacity-70`}
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
      className="mt-3 w-full border-b-2 border-dotted border-foreground/25 bg-transparent focus:border-foreground focus:outline-none px-1 py-2 text-[15px] resize-none disabled:opacity-70"
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
      const pct = updated.marking_result.percentage;
      toast.success(`Marked: ${updated.marking_result.total_awarded}/${updated.marking_result.total_out_of} (${Math.round(pct)}%)`);
      celebrateForScore(pct);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Marking failed");
    } finally {
      setMarking(false);
    }
  };

  if (loading || !ws) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  const mr = ws.marking_result;
  const isMarked = !!mr;

  return (
    <div className="min-h-screen pt-20 md:pt-12 px-4 sm:px-6 md:px-14 pb-16" data-testid="worksheet-viewer">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6 no-print">
          <button onClick={() => navigate("/")} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5">
            <ArrowLeft size={14} weight="bold" /> Home
          </button>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            <button
              onClick={() => setShowAnswers(v => !v)}
              className="border border-border rounded-2xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm flex items-center gap-1.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              data-testid="toggle-answers-btn"
            >
              {showAnswers ? <EyeSlash size={14} weight="regular" /> : <Eye size={14} weight="regular" />}
              <span className="hidden sm:inline">{showAnswers ? "Hide answers" : "Show answers"}</span>
              <span className="sm:hidden">{showAnswers ? "Hide" : "Show"}</span>
            </button>
            <button
              onClick={() => navigate(`/worksheets/${id}/markscheme`)}
              className="border border-border rounded-2xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm flex items-center gap-1.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              data-testid="view-markscheme-btn"
            >
              <FileText size={14} weight="regular" />
              <span className="hidden sm:inline">View markscheme</span>
              <span className="sm:hidden">Mark scheme</span>
            </button>
            {isMarked && mr.percentage < 100 && (
              <button
                onClick={() => navigate(`/worksheets/${id}/cheat-sheet`)}
                className="bg-gradient-to-r from-pink-400 to-blue-500 text-white rounded-2xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm flex items-center gap-1.5 hover:opacity-90 font-bold"
                data-testid="view-cheat-sheet-btn"
              >
                <Target size={14} weight="regular" />
                <span className="hidden sm:inline">Cheat sheet</span>
                <span className="sm:hidden">Cheat</span>
              </button>
            )}
            <button onClick={handleDelete} className="text-muted-foreground hover:text-red-600 p-1.5 sm:p-2 rounded-full" data-testid="delete-worksheet-btn" aria-label="Delete">
              <Trash size={16} weight="regular" />
            </button>
          </div>
        </div>

        {/* Marking summary banner */}
        {isMarked && (
          <div className="mb-6 glass-card rounded-3xl p-5 sm:p-6 animate-fade-up" data-testid="marking-summary">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex items-center gap-4 sm:gap-5 w-full sm:w-auto">
                <div className="text-center">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Score</div>
                  <div className="display text-4xl sm:text-5xl leading-none">
                    {mr.total_awarded}<span className="text-foreground/30 text-2xl sm:text-3xl">/{mr.total_out_of}</span>
                  </div>
                </div>
                <div className="w-px h-14 sm:h-16 bg-border shrink-0" />
                <div>
                  <div className={`text-xl sm:text-2xl font-extrabold ${mr.percentage >= 80 ? "text-green-600" : mr.percentage >= 50 ? "text-amber-600" : "text-red-600"}`}>
                    {Math.round(mr.percentage)}%
                  </div>
                  <div className="w-24 sm:w-32 h-1.5 bg-black/8 dark:bg-white/8 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${mr.percentage >= 80 ? "bg-green-500" : mr.percentage >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${Math.min(100, mr.percentage)}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex-1 w-full sm:min-w-[200px] sm:max-w-md">
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Feedback</div>
                <p className="text-sm text-foreground/75 mt-1.5 sm:mt-2 leading-relaxed italic">{mr.overall_feedback}</p>
              </div>
            </div>
            {(() => {
              const weakTopics = mr.per_question
                .filter(p => p.awarded < p.out_of)
                .map(p => ws.questions.find(q => q.number === p.number)?.question)
                .filter(Boolean);
              if (weakTopics.length === 0) return null;
              const topic = `Areas to revisit from "${ws.title}": ${weakTopics.slice(0, 3).join("; ")}`;
              const url = `/worksheets/new?subject=${ws.subject_id || "general"}&topic=${encodeURIComponent(topic)}`;
              return (
                <div className="mt-5 pt-5 border-t border-border flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-sm text-muted-foreground">
                    <strong className="font-bold text-foreground">{weakTopics.length}</strong> question{weakTopics.length !== 1 ? "s" : ""} need more work.
                  </div>
                  <button
                    onClick={() => navigate(url)}
                    className="bg-gradient-to-r from-pink-400 to-blue-500 text-white rounded-2xl px-5 py-2.5 flex items-center gap-2 hover:opacity-90 transition-opacity active:scale-[0.98] text-sm font-bold"
                    data-testid="practice-mistakes-btn"
                  >
                    <ArrowsClockwise size={14} weight="bold" /> Practice your mistakes
                  </button>
                </div>
              );
            })()}
            <ConfidenceRow ws={ws} onSaved={setWs} />
          </div>
        )}

        {/* Exam paper */}
        <div className="glass-card rounded-3xl shadow-[0_4px_40px_rgba(0,0,0,0.04)] overflow-hidden print-area" data-testid="worksheet-paper">
          {/* FRONT PAGE */}
          <div className="p-10 md:p-14 border-b-2 border-border">
            <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-2">{ws.subject_name || "Revision paper"}</div>
            <h1 className="display text-4xl md:text-5xl mb-2" data-testid="worksheet-title">{ws.title}</h1>
            <div className="text-muted-foreground italic mb-10">Topic: {ws.topic} • Difficulty: {ws.difficulty}</div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-3">Instructions</div>
                <ul className="text-[15px] leading-relaxed text-foreground/85 space-y-1.5 list-disc pl-5">
                  {(ws.instructions || "")
                    .split(/(?:•|\n|\.\s+(?=[A-Z]))/)
                    .map(s => s.trim())
                    .filter(Boolean)
                    .map((line, i) => <li key={i}>{line.replace(/\.$/, "")}.</li>)}
                </ul>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-3">Information</div>
                <ul className="text-[15px] leading-relaxed text-foreground/85 space-y-1">
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
                    <div className="display text-2xl text-foreground/30 w-10 shrink-0 tabular-nums">{q.number}.</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="text-[17px] leading-relaxed flex-1">{q.question}</div>
                        <div className="text-sm text-muted-foreground shrink-0 tabular-nums">[{q.marks}]</div>
                      </div>

                      <StudentAnswerField
                        q={q}
                        value={answers[q.number]}
                        onChange={(v) => setAnswers(prev => ({ ...prev, [q.number]: v }))}
                        disabled={isMarked}
                      />

                      {fb && (
                        <div className="mt-4 glass-card rounded-2xl px-4 py-3" data-testid={`feedback-${q.number}`}>
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Marker's feedback</div>
                            <div className="text-sm font-semibold tabular-nums">
                              {fb.awarded}/{fb.out_of}
                            </div>
                          </div>
                          <p className="text-[14px] text-foreground/75 leading-relaxed">{fb.feedback}</p>
                        </div>
                      )}

                      {showAnswers && (
                        <div className="mt-3 bg-black/[0.03] dark:bg-white/[0.05] border-l-2 border-foreground px-4 py-3 rounded-r-2xl" data-testid={`answer-${q.number}`}>
                          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Model answer</div>
                          <div className="text-[15px]">{q.answer}</div>
                          {q.explanation && <div className="text-[13px] text-muted-foreground mt-1.5 italic">{q.explanation}</div>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* FOOTER */}
          <div className="px-8 md:px-14 py-8 border-t border-border text-center text-muted-foreground text-sm italic">
            — End of paper —
          </div>
        </div>

        {/* Mark action */}
        {!isMarked && (
          <div className="mt-6 flex justify-center no-print">
            <button
              onClick={handleMark}
              disabled={marking}
              className="bg-gradient-to-r from-pink-400 to-blue-500 text-white rounded-2xl px-8 py-3.5 flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity active:scale-[0.98] font-semibold"
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
