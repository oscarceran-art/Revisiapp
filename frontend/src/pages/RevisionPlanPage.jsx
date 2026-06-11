import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ListChecks, Sparkle, Check, CalendarBlank, Notebook, FileText, ArrowSquareOut, MagicWand } from "@phosphor-icons/react";
import { useSidebarData } from "@/context/SidebarContext";
import { getRevisionPlan, generateRevisionPlan, togglePlanTask, generateTaskContent } from "@/lib/api";
import { celebrateSmall, celebrateBig } from "@/lib/celebrate";

function formatShortDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  } catch { return iso; }
}

export default function RevisionPlanPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { exams, refresh: refreshSidebar } = useSidebarData();
  const exam = exams.find(e => e.id === examId);

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [busyTask, setBusyTask] = useState(null); // `${di}-${ti}-${kind}`

  const load = async () => {
    setLoading(true);
    try {
      const p = await getRevisionPlan(examId);
      setPlan(p);
    } catch { setPlan(null); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [examId]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const p = await generateRevisionPlan(examId);
      setPlan(p);
      toast.success("Plan ready");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Couldn't build plan");
    } finally {
      setGenerating(false);
    }
  };

  const toggle = async (dayIdx, taskIdx, current) => {
    // optimistic
    setPlan(prev => {
      if (!prev) return prev;
      const days = prev.days.map((d, di) =>
        di !== dayIdx ? d : { ...d, tasks: d.tasks.map((t, ti) => ti !== taskIdx ? t : { ...t, done: !current }) }
      );
      return { ...prev, days };
    });
    try {
      const updated = await togglePlanTask(examId, dayIdx, taskIdx, !current);
      // Celebrate when checking a task off
      if (!current) {
        const day = updated?.days?.[dayIdx];
        const allDone = day && day.tasks.length > 0 && day.tasks.every(t => t.done);
        const planAllDone = updated && updated.days.every(d => d.tasks.length > 0 && d.tasks.every(t => t.done));
        if (planAllDone) celebrateBig();
        else if (allDone) celebrateSmall();
        else celebrateSmall();
      }
    } catch {
      toast.error("Couldn't save");
      load();
    }
  };

  const genContent = async (dayIdx, taskIdx, kind) => {
    const key = `${dayIdx}-${taskIdx}-${kind}`;
    if (busyTask) return;
    setBusyTask(key);
    try {
      const updated = await generateTaskContent(examId, dayIdx, taskIdx, kind);
      setPlan(updated);
      await refreshSidebar();
      toast.success(kind === "note" ? "Notes generated" : "Worksheet generated");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Generation failed");
    } finally {
      setBusyTask(null);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-black/40">Loading…</div>;

  const totalTasks = plan?.days?.reduce((a, d) => a + d.tasks.length, 0) || 0;
  const doneTasks = plan?.days?.reduce((a, d) => a + d.tasks.filter(t => t.done).length, 0) || 0;
  const pct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const pendingGenerations = plan?.days?.reduce(
    (a, d) => a + d.tasks.filter(t => (!t.note_id && t.auto_note_topic) || (!t.worksheet_id && t.auto_worksheet_topic)).length,
    0,
  ) || 0;

  const prepareAll = async () => {
    if (!plan || busyTask) return;
    if (!window.confirm(`Generate every pending note & worksheet in this plan? (${pendingGenerations} items — may take a minute)`)) return;
    let workingPlan = plan;
    for (let di = 0; di < workingPlan.days.length; di++) {
      for (let ti = 0; ti < workingPlan.days[di].tasks.length; ti++) {
        const t = workingPlan.days[di].tasks[ti];
        if (!t.note_id && t.auto_note_topic) {
          setBusyTask(`${di}-${ti}-note`);
          try {
            workingPlan = await generateTaskContent(examId, di, ti, "note");
            setPlan(workingPlan);
          } catch { /* keep going */ }
        }
        if (!t.worksheet_id && t.auto_worksheet_topic) {
          setBusyTask(`${di}-${ti}-worksheet`);
          try {
            workingPlan = await generateTaskContent(examId, di, ti, "worksheet");
            setPlan(workingPlan);
          } catch { /* keep going */ }
        }
      }
    }
    setBusyTask(null);
    await refreshSidebar();
    toast.success("Plan content prepared");
  };

  return (
    <div className="min-h-screen pt-14 md:pt-12 px-4 sm:px-6 md:px-10 pb-16" data-testid="revision-plan-page">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate("/exams")} className="text-sm text-black/55 hover:text-black flex items-center gap-1.5 mb-6">
          <ArrowLeft size={14} weight="bold" /> Exams
        </button>

        <div className="mb-6">
          <div className="text-[11px] uppercase tracking-[0.22em] text-black/45 flex items-center gap-2">
            <ListChecks size={12} weight="fill" /> Revision plan
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl mt-2 font-extrabold leading-tight">
            {plan?.exam_name || exam?.name || "Plan"}
          </h1>
        </div>

        {!plan && (
          <div className="bg-white border border-black/10 rounded-3xl p-8 text-center" data-testid="no-plan">
            <CalendarBlank size={48} weight="duotone" className="mx-auto text-black/30" />
            <div className="font-extrabold text-xl mt-4">No plan yet</div>
            <p className="text-black/55 mt-2 max-w-md mx-auto text-sm">Let the AI build a personalised day-by-day plan based on your exam date and subject notes.</p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="mt-6 bg-gradient-to-r from-pink-400 to-blue-500 text-white rounded-2xl px-6 py-3 text-sm font-bold inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-50 active:scale-[0.98] transition-opacity"
              data-testid="generate-plan-btn"
            >
              <Sparkle size={14} weight="fill" /> {generating ? "Building plan…" : "Generate revision plan"}
            </button>
          </div>
        )}

        {plan && (
          <>
            <div className="bg-white border border-black/10 rounded-3xl p-4 sm:p-5 mb-5 flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="text-[11px] uppercase tracking-[0.22em] text-black/45">Progress</div>
                <div className="text-lg font-extrabold tabular-nums mt-1" data-testid="plan-progress">{doneTasks}/{totalTasks} tasks · {pct}%</div>
                <div className="mt-2 h-2 bg-black/10 rounded-full overflow-hidden">
                  <div className="h-full bg-black transition-[width] duration-300" style={{ width: `${pct}%` }} />
                </div>
              </div>
              {pendingGenerations > 0 && (
                <button
                  onClick={prepareAll}
                  disabled={!!busyTask}
                  className="bg-gradient-to-r from-pink-400 to-blue-500 text-white rounded-2xl px-4 py-2 text-sm font-bold flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 active:scale-[0.98] transition-opacity"
                  data-testid="prepare-all-btn"
                  title="Auto-generate every pending note and worksheet across the plan"
                >
                  <MagicWand size={14} weight="fill" /> {busyTask ? "Preparing…" : `Prepare all (${pendingGenerations})`}
                </button>
              )}
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="border border-black/15 rounded-2xl px-3 py-2 text-sm font-bold hover:bg-black/[0.04] disabled:opacity-50"
                title="Rebuild plan from scratch"
                data-testid="regenerate-plan-btn"
              >
                {generating ? "Rebuilding…" : "Rebuild"}
              </button>
            </div>

            <div className="space-y-3">
              {plan.days.map((d, di) => (
                <div key={di} className="bg-white border border-black/10 rounded-3xl p-5" data-testid={`plan-day-${di}`}>
                  <div className="flex items-baseline gap-3 mb-3 flex-wrap">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-black/45 tabular-nums">{formatShortDate(d.date)}</div>
                    <div className="font-extrabold text-base sm:text-lg">{d.focus}</div>
                  </div>
                  <ul className="space-y-1.5">
                    {d.tasks.map((t, ti) => (
                      <li key={ti}>
                        <div
                          className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-2xl transition-colors ${t.done ? "bg-black/[0.04]" : "hover:bg-black/[0.03]"}`}
                          data-testid={`task-${di}-${ti}`}
                        >
                          <button
                            onClick={() => toggle(di, ti, t.done)}
                            className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${t.done ? "bg-black border-black text-white" : "border-black/25 bg-white"}`}
                            aria-label="Toggle task"
                          >
                            {t.done && <Check size={12} weight="bold" />}
                          </button>
                          <button
                            onClick={() => toggle(di, ti, t.done)}
                            className={`flex-1 text-left text-[14px] leading-relaxed ${t.done ? "line-through text-black/45" : "text-black/85"}`}
                          >
                            {t.text}
                          </button>
                          {t.note_id && (
                            <button
                              onClick={() => navigate(`/notes/${t.note_id}`)}
                              className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-black text-white hover:bg-black/85"
                              data-testid={`task-${di}-${ti}-open-note`}
                              title="Open linked notes"
                            >
                              <Notebook size={11} weight="regular" /> Notes <ArrowSquareOut size={9} weight="bold" />
                            </button>
                          )}
                          {t.worksheet_id && (
                            <button
                              onClick={() => navigate(`/worksheets/${t.worksheet_id}`)}
                              className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-black text-white hover:bg-black/85"
                              data-testid={`task-${di}-${ti}-open-worksheet`}
                              title="Open linked worksheet"
                            >
                              <FileText size={11} weight="regular" /> Sheet <ArrowSquareOut size={9} weight="bold" />
                            </button>
                          )}
                          {!t.note_id && t.auto_note_topic && (
                            <button
                              onClick={() => genContent(di, ti, "note")}
                              disabled={!!busyTask}
                              className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border border-black/25 text-black/80 hover:bg-black/[0.05] disabled:opacity-50"
                              data-testid={`task-${di}-${ti}-gen-note`}
                              title={`Generate notes on: ${t.auto_note_topic}`}
                            >
                              <MagicWand size={11} weight="fill" /> {busyTask === `${di}-${ti}-note` ? "Writing…" : "Generate notes"}
                            </button>
                          )}
                          {!t.worksheet_id && t.auto_worksheet_topic && (
                            <button
                              onClick={() => genContent(di, ti, "worksheet")}
                              disabled={!!busyTask}
                              className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border border-black/25 text-black/80 hover:bg-black/[0.05] disabled:opacity-50"
                              data-testid={`task-${di}-${ti}-gen-worksheet`}
                              title={`Generate worksheet on: ${t.auto_worksheet_topic}`}
                            >
                              <MagicWand size={11} weight="fill" /> {busyTask === `${di}-${ti}-worksheet` ? "Building…" : "Generate worksheet"}
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
