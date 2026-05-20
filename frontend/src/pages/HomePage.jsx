import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSidebarData } from "@/context/SidebarContext";
import { ChatCircle, FileText, BookBookmark, Sparkle, Brain, CheckCircle, XCircle, Notebook, CalendarBlank, Plus } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { toast } from "sonner";

function daysBetween(targetIso) {
  if (!targetIso) return null;
  try {
    const target = new Date(targetIso);
    const now = new Date();
    const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const b = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    return Math.round((b - a) / (1000 * 60 * 60 * 24));
  } catch { return null; }
}

function ReviewCard({ item, onMarked }) {
  const [revealed, setRevealed] = useState(false);
  const [working, setWorking] = useState(false);

  const send = async (remembered) => {
    setWorking(true);
    try {
      await api.post("/review/mark", {
        worksheet_id: item.worksheet_id,
        question_number: item.question_number,
        remembered,
      });
      toast.success(remembered ? "Nice — moved further out" : "Will resurface tomorrow");
      onMarked();
    } catch {
      toast.error("Couldn't update");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="bg-white border border-black/10 rounded-3xl p-6" data-testid={`review-item-${item.worksheet_id}-${item.question_number}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] uppercase tracking-[0.22em] text-black/45">
          {item.subject_name || "General"} · {item.worksheet_title}
        </div>
        {item.is_due && <span className="text-[11px] bg-black text-white rounded-full px-2.5 py-0.5">Due</span>}
      </div>
      <div className="text-[17px] leading-relaxed mb-4">{item.question}</div>

      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="text-sm text-black/55 hover:text-black underline underline-offset-4"
          data-testid="reveal-answer-btn"
        >
          Show answer
        </button>
      ) : (
        <>
          <div className="bg-[#FAF8F5] border-l-2 border-black px-4 py-3 rounded-r-2xl mb-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-black/50 mb-1">Answer</div>
            <div className="text-[15px]">{item.answer}</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => send(false)}
              disabled={working}
              className="flex-1 border border-black/15 rounded-2xl px-4 py-2.5 text-sm flex items-center justify-center gap-2 hover:bg-black/[0.04] disabled:opacity-50"
              data-testid="forgot-btn"
            >
              <XCircle size={16} weight="regular" /> Still forgetting
            </button>
            <button
              onClick={() => send(true)}
              disabled={working}
              className="flex-1 bg-black text-white rounded-2xl px-4 py-2.5 text-sm flex items-center justify-center gap-2 hover:bg-black/85 disabled:opacity-50 active:scale-[0.98]"
              data-testid="remembered-btn"
            >
              <CheckCircle size={16} weight="regular" /> Got it
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { subjects, sessions, worksheets, notes, exams } = useSidebarData();
  const [review, setReview] = useState({ items: [], due_count: 0 });

  const loadReview = () => {
    api.get("/review/queue").then(r => setReview(r.data)).catch(() => {});
  };
  useEffect(() => { loadReview(); }, []);

  const upcomingExams = (exams || [])
    .map(e => ({ ...e, _days: daysBetween(e.exam_date) }))
    .filter(e => e._days !== null && e._days >= 0)
    .sort((a, b) => a._days - b._days)
    .slice(0, 3);

  const cards = [
    { to: "/chat/new", icon: ChatCircle, title: "Start a chat", desc: "Talk with a tutor or historical figure. Group chats supported.", testid: "home-card-chat" },
    { to: "/worksheets/new", icon: FileText, title: "Make a worksheet", desc: "Exam-style paper. AI marks you, then builds a cheat sheet on your mistakes.", testid: "home-card-worksheet" },
    { to: "/notes/new", icon: Notebook, title: "Generate notes", desc: "Crisp study notes on any topic. One click turns them into a worksheet.", testid: "home-card-notes" },
    { to: "/exams", icon: CalendarBlank, title: "Exam countdowns", desc: "Track every exam date and get a day-by-day revision plan.", testid: "home-card-exams" },
  ];

  const dueItems = review.items.filter(i => i.is_due).slice(0, 6);

  return (
    <div className="min-h-screen pt-20 md:pt-16 px-4 sm:px-6 md:px-10 lg:px-14 pb-16" data-testid="home-page">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10 sm:mb-12 animate-fade-up">
          <div className="text-[11px] uppercase tracking-[0.22em] text-black/45 flex items-center gap-2">
            <Sparkle size={12} weight="fill" /> welcome back
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl mt-3 leading-[1.05] font-extrabold">
            What would you like<br className="hidden sm:inline" />{" "}to revise today?
          </h1>
        </div>

        {/* Upcoming exams countdown */}
        {upcomingExams.length > 0 && (
          <div className="mb-10 animate-fade-up" data-testid="home-exam-countdowns">
            <div className="flex items-end justify-between mb-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-black/45 flex items-center gap-2">
                  <CalendarBlank size={12} weight="fill" /> next up
                </div>
                <h2 className="display text-2xl md:text-3xl mt-1.5">Exam countdown</h2>
              </div>
              <button onClick={() => navigate("/exams")} className="text-sm text-black/55 hover:text-black underline underline-offset-4">All exams →</button>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              {upcomingExams.map(e => {
                const d = e._days;
                let big, sub, tone;
                if (d === 0) { big = "Today"; sub = "Good luck!"; tone = "bg-red-600 text-white"; }
                else if (d === 1) { big = "Tomorrow"; sub = "One sleep to go"; tone = "bg-red-500 text-white"; }
                else { big = `${d}`; sub = `day${d === 1 ? "" : "s"} to go`; tone = d <= 7 ? "bg-amber-500 text-white" : "bg-black text-white"; }
                return (
                  <button
                    key={e.id}
                    onClick={() => navigate(`/exams/${e.id}/plan`)}
                    className={`text-left ${tone} rounded-3xl p-5 hover:opacity-95 transition-opacity active:scale-[0.99]`}
                    data-testid={`home-exam-${e.id}`}
                  >
                    <div className="text-[10px] uppercase tracking-[0.22em] opacity-70">{e.subject_name || "Exam"}</div>
                    <div className="text-4xl sm:text-5xl font-extrabold mt-2 tabular-nums leading-none">{big}</div>
                    <div className="text-xs opacity-80 mt-1">{sub}</div>
                    <div className="text-sm font-bold mt-3 truncate">{e.name}</div>
                  </button>
                );
              })}
              {upcomingExams.length < 3 && (
                <button
                  onClick={() => navigate("/exams")}
                  className="text-left border border-dashed border-black/20 rounded-3xl p-5 hover:bg-black/[0.03] transition-colors flex items-center justify-center text-black/45 text-sm"
                  data-testid="home-add-exam"
                >
                  <Plus size={14} weight="bold" className="mr-1.5" /> Add another exam
                </button>
              )}
            </div>
          </div>
        )}

        {/* Spaced repetition due section */}
        {review.due_count > 0 && (
          <div className="mb-12 animate-fade-up">
            <div className="flex items-end justify-between mb-5">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-black/45 flex items-center gap-2">
                  <Brain size={12} weight="fill" /> spaced repetition
                </div>
                <h2 className="display text-3xl md:text-4xl mt-2">
                  {review.due_count} question{review.due_count !== 1 ? "s" : ""} due for review
                </h2>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {dueItems.map(item => (
                <ReviewCard
                  key={`${item.worksheet_id}-${item.question_number}`}
                  item={item}
                  onMarked={loadReview}
                />
              ))}
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {cards.map(c => {
            const Icon = c.icon;
            return (
              <button
                key={c.to}
                onClick={() => navigate(c.to)}
                data-testid={c.testid}
                className="text-left bg-white border border-black/10 rounded-3xl p-5 sm:p-6 hover:border-black/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all active:scale-[0.99]"
              >
                <div className="w-11 h-11 rounded-2xl bg-black text-white flex items-center justify-center mb-4">
                  <Icon size={20} weight="regular" />
                </div>
                <div className="text-lg sm:text-xl font-extrabold mb-1.5">{c.title}</div>
                <div className="text-xs sm:text-sm text-black/55 leading-relaxed">{c.desc}</div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8 sm:mt-12">
          {[
            { label: "Subjects", value: subjects.length },
            { label: "Chats", value: sessions.length },
            { label: "Worksheets", value: worksheets.length },
            { label: "Notes", value: notes.length },
          ].map(s => (
            <div key={s.label} className="bg-white border border-black/10 rounded-3xl px-4 sm:px-6 py-4 sm:py-5">
              <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-black/40">{s.label}</div>
              <div className="text-3xl sm:text-4xl mt-1 font-extrabold">{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
