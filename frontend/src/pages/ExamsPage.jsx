import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CalendarBlank, Plus, Trash, ArrowLeft, Sparkle, Clock, MapPin, ListChecks, ChatCircleText, CheckCircle } from "@phosphor-icons/react";
import { useSidebarData } from "@/context/SidebarContext";
import { createExam, deleteExam, startExamDebrief } from "@/lib/api";
import { celebrateBig } from "@/lib/celebrate";

function daysBetween(targetIso) {
  if (!targetIso) return null;
  try {
    const target = new Date(targetIso);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const diff = Math.round((startOfTarget - startOfToday) / (1000 * 60 * 60 * 24));
    return diff;
  } catch { return null; }
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
  } catch { return iso; }
}

function CountdownBadge({ days }) {
  if (days === null) return null;
  let label, tone;
  if (days < 0) { label = `${Math.abs(days)}d ago`; tone = "bg-black/10 text-black/55"; }
  else if (days === 0) { label = "Today"; tone = "bg-red-600 text-white"; }
  else if (days === 1) { label = "Tomorrow"; tone = "bg-red-500 text-white"; }
  else if (days <= 7) { label = `${days} days`; tone = "bg-amber-500 text-white"; }
  else if (days <= 30) { label = `${days} days`; tone = "bg-black text-white"; }
  else { label = `${days} days`; tone = "bg-black/85 text-white"; }
  return <span className={`text-[12px] font-bold rounded-full px-2.5 py-1 tabular-nums ${tone}`} data-testid="exam-countdown">{label}</span>;
}

export default function ExamsPage() {
  const navigate = useNavigate();
  const { subjects, exams, refresh } = useSidebarData();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", exam_date: "", subject_id: "", location: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.exam_date) { toast.error("Name & date required"); return; }
    setSaving(true);
    try {
      const iso = new Date(form.exam_date).toISOString();
      await createExam({
        name: form.name.trim(),
        exam_date: iso,
        subject_id: form.subject_id || null,
        location: form.location.trim(),
        notes: form.notes.trim(),
      });
      await refresh();
      toast.success("Exam added");
      setForm({ name: "", exam_date: "", subject_id: "", location: "", notes: "" });
      setShowForm(false);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? Any revision plan will be removed too.`)) return;
    try {
      await deleteExam(id);
      await refresh();
      toast.success("Exam deleted");
    } catch { toast.error("Couldn't delete"); }
  };

  const handleDebrief = async (exam) => {
    try {
      const session = await startExamDebrief(exam.id);
      celebrateBig();
      await refresh();
      toast.success(`You did it — let's talk about ${exam.name}`);
      navigate(`/chat/${session.id}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Couldn't start debrief");
    }
  };

  const sorted = [...exams].sort((a, b) => (a.exam_date || "").localeCompare(b.exam_date || ""));
  const upcoming = sorted.filter(e => daysBetween(e.exam_date) >= 0);
  const past = sorted.filter(e => daysBetween(e.exam_date) < 0);

  return (
    <div className="min-h-screen pt-20 md:pt-12 px-4 sm:px-6 md:px-10 pb-16" data-testid="exams-page">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate("/")} className="text-sm text-black/55 hover:text-black flex items-center gap-1.5 mb-6">
          <ArrowLeft size={14} weight="bold" /> Home
        </button>

        <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-black/45 flex items-center gap-2">
              <CalendarBlank size={12} weight="fill" /> Exam dates
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl mt-2 font-extrabold">Countdowns</h1>
            <p className="text-black/55 mt-2 text-sm sm:text-base">Add every exam — we'll keep the days ticking down and build a revision plan whenever you're ready.</p>
          </div>
          <button
            onClick={() => setShowForm(s => !s)}
            className="bg-gradient-to-r from-pink-400 to-blue-500 text-white rounded-2xl px-5 py-2.5 text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-opacity active:scale-[0.98]"
            data-testid="add-exam-toggle"
          >
            <Plus size={14} weight="bold" /> {showForm ? "Close" : "Add exam"}
          </button>
        </div>

        {showForm && (
          <div className="bg-white border border-black/10 rounded-3xl p-5 sm:p-7 mb-8 space-y-4 animate-fade-up">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-2">Exam name</label>
                <input
                  value={form.name}
                  onChange={e => setForm(v => ({ ...v, name: e.target.value }))}
                  placeholder="e.g. Biology Paper 1"
                  className="w-full border border-black/15 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-black text-sm"
                  data-testid="exam-name"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-2">Date & time</label>
                <input
                  type="datetime-local"
                  value={form.exam_date}
                  onChange={e => setForm(v => ({ ...v, exam_date: e.target.value }))}
                  className="w-full border border-black/15 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-black text-sm"
                  data-testid="exam-date"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-2">Subject</label>
                <select
                  value={form.subject_id}
                  onChange={e => setForm(v => ({ ...v, subject_id: e.target.value }))}
                  className="w-full border border-black/15 rounded-2xl px-4 py-2.5 bg-white text-sm focus:outline-none focus:border-black"
                  data-testid="exam-subject"
                >
                  <option value="">No subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-2">Location (optional)</label>
                <input
                  value={form.location}
                  onChange={e => setForm(v => ({ ...v, location: e.target.value }))}
                  placeholder="Sports hall"
                  className="w-full border border-black/15 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-black text-sm"
                  data-testid="exam-location"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-2">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(v => ({ ...v, notes: e.target.value }))}
                rows={2}
                placeholder="Focus on: cell biology, ecology, exam technique."
                className="w-full border border-black/15 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-black text-sm"
                data-testid="exam-notes"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="border border-black/15 rounded-2xl px-4 py-2.5 text-sm font-bold hover:bg-black/[0.04]">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="bg-gradient-to-r from-pink-400 to-blue-500 text-white rounded-2xl px-5 py-2.5 text-sm font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50 active:scale-[0.98]"
                data-testid="exam-save"
              >
                <Sparkle size={14} weight="fill" /> {saving ? "Saving…" : "Save exam"}
              </button>
            </div>
          </div>
        )}

        {/* Upcoming */}
        {upcoming.length === 0 && past.length === 0 && (
          <div className="text-center bg-white border border-black/10 rounded-3xl py-16 px-6" data-testid="exams-empty">
            <CalendarBlank size={48} weight="duotone" className="mx-auto text-black/30" />
            <div className="font-extrabold text-xl mt-4">No exams yet</div>
            <p className="text-black/55 mt-2 max-w-md mx-auto text-sm">Add your first one to start the countdown.</p>
          </div>
        )}

        {upcoming.length > 0 && (
          <div className="mb-10">
            <div className="text-[11px] uppercase tracking-[0.22em] text-black/40 mb-3">Upcoming</div>
            <div className="grid gap-3">
              {upcoming.map(e => {
                const days = daysBetween(e.exam_date);
                return (
                  <div key={e.id} className="bg-white border border-black/10 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4" data-testid={`exam-${e.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CountdownBadge days={days} />
                        {e.subject_name && <span className="text-[10px] uppercase tracking-[0.22em] text-black/45">{e.subject_name}</span>}
                      </div>
                      <div className="text-base sm:text-xl font-extrabold mt-1.5 sm:mt-2 truncate">{e.name}</div>
                      <div className="text-[12px] sm:text-[13px] text-black/55 mt-1 flex flex-wrap items-center gap-2 sm:gap-3">
                        <span className="flex items-center gap-1"><Clock size={11} weight="regular" className="sm:size-[12]" /> {formatDate(e.exam_date)}</span>
                        {e.location && <span className="flex items-center gap-1"><MapPin size={11} weight="regular" className="sm:size-[12]" /> {e.location}</span>}
                      </div>
                      {e.notes && <p className="text-[12px] sm:text-[13px] text-black/55 mt-1.5 sm:mt-2 leading-relaxed">{e.notes}</p>}
                    </div>
                    <div className="flex sm:flex-col gap-1.5 sm:gap-2 shrink-0 flex-wrap">
                      <button
                        onClick={() => navigate(`/exams/${e.id}/plan`)}
                        className="bg-gradient-to-r from-pink-400 to-blue-500 text-white rounded-xl sm:rounded-2xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold flex items-center justify-center gap-1 hover:opacity-90"
                        data-testid={`open-plan-${e.id}`}
                      >
                        <ListChecks size={12} weight="regular" className="sm:size-[14]" /> Plan
                      </button>
                      {e.completed && e.debrief_session_id ? (
                        <button
                          onClick={() => navigate(`/chat/${e.debrief_session_id}`)}
                          className="border border-black/15 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm flex items-center justify-center gap-1 hover:bg-black/[0.04]"
                          data-testid={`open-debrief-${e.id}`}
                        >
                          <ChatCircleText size={12} weight="regular" className="sm:size-[14]" /> Debrief
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDebrief(e)}
                          className="border border-black/15 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm flex items-center justify-center gap-1 hover:bg-black/[0.04]"
                          data-testid={`debrief-${e.id}`}
                        >
                          <CheckCircle size={12} weight="regular" className="sm:size-[14]" /> Sat it
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(e.id, e.name)}
                        className="border border-black/15 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm flex items-center justify-center gap-1 hover:bg-black/[0.04] text-black/65"
                        data-testid={`delete-exam-${e.id}`}
                      >
                        <Trash size={12} weight="regular" className="sm:size-[14]" /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {past.length > 0 && (
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-black/40 mb-3">Past</div>
            <div className="grid gap-3">
              {past.map(e => (
                <div key={e.id} className="bg-white border border-black/10 rounded-3xl p-4 flex items-center gap-3 flex-wrap" data-testid={`exam-past-${e.id}`}>
                  <CountdownBadge days={daysBetween(e.exam_date)} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{e.name}</div>
                    <div className="text-[12px] text-black/50">{formatDate(e.exam_date)}</div>
                  </div>
                  {e.completed && e.debrief_session_id ? (
                    <button
                      onClick={() => navigate(`/chat/${e.debrief_session_id}`)}
                      className="border border-black/15 rounded-2xl px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 hover:bg-black/[0.04]"
                      data-testid={`open-debrief-past-${e.id}`}
                    >
                      <ChatCircleText size={12} weight="regular" /> Debrief
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDebrief(e)}
                      className="bg-gradient-to-r from-pink-400 to-blue-500 text-white rounded-2xl px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 hover:opacity-90"
                      data-testid={`debrief-past-${e.id}`}
                    >
                      <CheckCircle size={12} weight="regular" /> Reflect
                    </button>
                  )}
                  <button onClick={() => handleDelete(e.id, e.name)} className="text-black/45 hover:text-black p-1" aria-label="Delete"><Trash size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
