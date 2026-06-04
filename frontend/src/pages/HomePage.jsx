import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSidebarData } from "@/context/SidebarContext";
import { ChatCircle, FileText, BookBookmark, Sparkle, Notebook, CalendarBlank, Plus } from "@phosphor-icons/react";

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

export default function HomePage() {
  const navigate = useNavigate();
  const { subjects, sessions, worksheets, notes, exams } = useSidebarData();

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

  return (
    <div className="min-h-screen pt-20 md:pt-16 px-4 sm:px-6 md:px-10 lg:px-14 pb-16" data-testid="home-page">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10 sm:mb-12 animate-fade-up">
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground flex items-center gap-2">
            <Sparkle size={12} weight="fill" /> welcome back
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl mt-2 sm:mt-3 leading-[1.05] font-extrabold">
            What would you like<br className="hidden sm:inline" />{" "}to revise today?
          </h1>
        </div>

        {/* Upcoming exams countdown */}
        {upcomingExams.length > 0 && (
          <div className="mb-10 animate-fade-up" data-testid="home-exam-countdowns">
            <div className="flex items-end justify-between mb-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground flex items-center gap-2">
                  <CalendarBlank size={12} weight="fill" /> next up
                </div>
                <h2 className="display text-2xl md:text-3xl mt-1.5">Exam countdown</h2>
              </div>
              <button onClick={() => navigate("/exams")} className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">All exams →</button>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              {upcomingExams.map(e => {
                const d = e._days;
                let big, sub, tone;
                if (d === 0) { big = "Today"; sub = "Good luck!"; tone = "bg-red-600/15 dark:bg-red-600/25 text-red-600 dark:text-red-400 backdrop-blur-xl border border-red-600/20"; }
                else if (d === 1) { big = "Tomorrow"; sub = "One sleep to go"; tone = "bg-red-500/15 dark:bg-red-500/25 text-red-500 dark:text-red-400 backdrop-blur-xl border border-red-500/20"; }
                else { big = `${d}`; sub = `day${d === 1 ? "" : "s"} to go`; tone = d <= 7 ? "bg-amber-500/15 dark:bg-amber-500/25 text-amber-600 dark:text-amber-400 backdrop-blur-xl border border-amber-500/20" : "glass-card text-foreground"; }
                return (
                  <button
                    key={e.id}
                    onClick={() => navigate(`/exams/${e.id}/plan`)}
                    className={`text-left ${tone} rounded-3xl p-5 hover:opacity-95 transition-all active:scale-[0.99] group relative overflow-hidden after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:opacity-0 group-hover:after:opacity-100 after:transition-opacity after:duration-300 after:pointer-events-none after:bg-gradient-to-br after:from-pink-400/10 after:via-purple-400/10 after:to-blue-400/10`}
                    data-testid={`home-exam-${e.id}`}
                  >
                    <div className="text-[10px] uppercase tracking-[0.22em] opacity-70 relative z-10">{e.subject_name || "Exam"}</div>
                    <div className="text-4xl sm:text-5xl font-extrabold mt-2 tabular-nums leading-none relative z-10">{big}</div>
                    <div className="text-xs opacity-80 mt-1 relative z-10">{sub}</div>
                    <div className="text-sm font-bold mt-3 truncate relative z-10">{e.name}</div>
                  </button>
                );
              })}
              {upcomingExams.length < 3 && (
                <button
                  onClick={() => navigate("/exams")}
                  className="text-left border border-dashed border-border rounded-3xl p-5 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-colors flex items-center justify-center text-muted-foreground text-sm"
                  data-testid="home-add-exam"
                >
                  <Plus size={14} weight="bold" className="mr-1.5" /> Add another exam
                </button>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {cards.map(c => {
            const Icon = c.icon;
            return (
              <button
                key={c.to}
                onClick={() => navigate(c.to)}
                data-testid={c.testid}
                className="text-left glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 hover:border-border hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all active:scale-[0.99] group relative overflow-hidden after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:opacity-0 group-hover:after:opacity-100 after:transition-opacity after:duration-300 after:pointer-events-none after:bg-gradient-to-br after:from-pink-400/10 after:via-purple-400/10 after:to-blue-400/10"
              >
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-foreground text-background group-hover:bg-gradient-to-br group-hover:from-pink-400 group-hover:to-blue-500 flex items-center justify-center mb-2 sm:mb-4 transition-all duration-300 relative z-10">
                  <Icon size={16} weight="regular" className="sm:size-[20]" />
                </div>
                <div className="text-sm sm:text-xl font-extrabold mb-0.5 sm:mb-1.5 relative z-10">{c.title}</div>
                <div className="text-[11px] sm:text-sm text-muted-foreground leading-relaxed relative z-10">{c.desc}</div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mt-6 sm:mt-12">
          {[
            { label: "Subjects", value: subjects.length, icon: BookBookmark },
            { label: "Chats", value: sessions.length, icon: ChatCircle },
            { label: "Worksheets", value: worksheets.length, icon: FileText },
            { label: "Notes", value: notes.length, icon: Notebook },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="glass-card rounded-2xl sm:rounded-3xl px-3 sm:px-6 py-3 sm:py-5 hover:border-border transition-colors group relative overflow-hidden after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:opacity-0 group-hover:after:opacity-100 after:transition-opacity after:duration-300 after:pointer-events-none after:bg-gradient-to-br after:from-pink-400/10 after:via-purple-400/10 after:to-blue-400/10">
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-muted-foreground relative z-10">{s.label}</div>
                  <Icon size={12} weight="regular" className="text-muted-foreground/60 sm:size-[14] relative z-10" />
                </div>
                <div className="text-2xl sm:text-4xl font-extrabold relative z-10">{s.value}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
