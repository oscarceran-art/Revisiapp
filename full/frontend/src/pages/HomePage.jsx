import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSidebarData } from "@/context/SidebarContext";
import { ChatCircle, FileText, BookBookmark, Sparkle, Brain, CheckCircle, XCircle } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { toast } from "sonner";

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
  const { subjects, sessions, worksheets } = useSidebarData();
  const [review, setReview] = useState({ items: [], due_count: 0 });

  const loadReview = () => {
    api.get("/review/queue").then(r => setReview(r.data)).catch(() => {});
  };
  useEffect(() => { loadReview(); }, []);

  const cards = [
    { to: "/chat/new", icon: ChatCircle, title: "Start a chat", desc: "Ask Claude Haiku 4.5 anything. Add a subject for context.", testid: "home-card-chat" },
    { to: "/worksheets/new", icon: FileText, title: "Make a worksheet", desc: "Generate an exam-style paper. AI marks your answers when you're done.", testid: "home-card-worksheet" },
    { to: "/subjects", icon: BookBookmark, title: "Manage subjects", desc: "Add subjects and upload notes — they fuel every chat & worksheet.", testid: "home-card-subjects" },
  ];

  const dueItems = review.items.filter(i => i.is_due).slice(0, 6);

  return (
    <div className="min-h-screen pt-20 md:pt-16 px-6 md:px-14 pb-16" data-testid="home-page">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12 animate-fade-up">
          <div className="text-[11px] uppercase tracking-[0.22em] text-black/45 flex items-center gap-2">
            <Sparkle size={12} weight="fill" /> welcome back
          </div>
          <h1 className="display text-5xl md:text-6xl lg:text-7xl mt-3 leading-[1.05]">
            What would you like<br />to revise today?
          </h1>
        </div>

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

        <div className="grid md:grid-cols-3 gap-5">
          {cards.map(c => {
            const Icon = c.icon;
            return (
              <button
                key={c.to}
                onClick={() => navigate(c.to)}
                data-testid={c.testid}
                className="text-left bg-white border border-black/10 rounded-3xl p-7 hover:border-black/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all active:scale-[0.99]"
              >
                <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center mb-5">
                  <Icon size={22} weight="regular" />
                </div>
                <div className="display text-2xl mb-2">{c.title}</div>
                <div className="text-sm text-black/55 leading-relaxed">{c.desc}</div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-4 mt-12">
          {[
            { label: "Subjects", value: subjects.length },
            { label: "Chats", value: sessions.length },
            { label: "Worksheets", value: worksheets.length },
          ].map(s => (
            <div key={s.label} className="bg-white border border-black/10 rounded-3xl px-6 py-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-black/40">{s.label}</div>
              <div className="display text-4xl mt-1">{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
