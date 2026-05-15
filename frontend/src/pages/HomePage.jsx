import { useNavigate } from "react-router-dom";
import { useSidebarData } from "@/context/SidebarContext";
import { ChatCircle, FileText, BookBookmark, Sparkle } from "@phosphor-icons/react";

export default function HomePage() {
  const navigate = useNavigate();
  const { subjects, sessions, worksheets } = useSidebarData();

  const cards = [
    {
      to: "/chat/new",
      icon: ChatCircle,
      title: "Start a chat",
      desc: "Ask Claude Haiku 4.5 anything. Add a subject for context.",
      testid: "home-card-chat",
    },
    {
      to: "/worksheets/new",
      icon: FileText,
      title: "Make a worksheet",
      desc: "Generate an exam-style paper. AI marks your answers when you're done.",
      testid: "home-card-worksheet",
    },
    {
      to: "/subjects",
      icon: BookBookmark,
      title: "Manage subjects",
      desc: "Add subjects and upload notes — they fuel every chat & worksheet.",
      testid: "home-card-subjects",
    },
  ];

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
          <p className="text-black/55 text-lg mt-5 max-w-xl">
            Pick where to start. Everything you make lives in the sidebar, grouped by subject.
          </p>
        </div>

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
