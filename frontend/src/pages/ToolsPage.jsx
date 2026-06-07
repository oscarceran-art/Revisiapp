import { useNavigate } from "react-router-dom";
import { Cards, NotePencil, Image } from "@phosphor-icons/react";

const tools = [
  {
    to: "/flashcards",
    icon: Cards,
    title: "Flashcards",
    desc: "Spaced repetition flashcards with SM-2 algorithm. Create decks, study with AI generation, and track your progress.",
    color: "from-pink-400 to-blue-500",
  },
  {
    to: "/blurting",
    icon: NotePencil,
    title: "Blurting Workspace",
    desc: "Generate model answers, hide them, and recall from memory. AI marks your blurt against the original.",
    color: "from-purple-400 to-pink-500",
  },
  {
    to: "/diagrams",
    icon: Image,
    title: "Diagram Recall Board",
    desc: "Generate diagram descriptions, sketch from memory, and get AI vision-based feedback on your drawings.",
    color: "from-blue-400 to-cyan-500",
  },
];

export default function ToolsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pt-20 md:pt-16 px-4 sm:px-6 md:px-10 lg:px-14 pb-16" data-testid="tools-page">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <div className="text-[11px] uppercase tracking-[0.22em] text-black/45">Study tools</div>
          <h1 className="text-3xl sm:text-4xl font-extrabold mt-1">Choose a tool</h1>
          <p className="text-black/55 mt-2 text-sm">Pick a study technique to get started.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.to}
                onClick={() => navigate(t.to)}
                className="text-left bg-white border border-black/10 rounded-3xl p-6 hover:border-black/25 transition-all active:scale-[0.98] group"
              >
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${t.color} text-white flex items-center justify-center mb-4`}>
                  <Icon size={20} weight="fill" />
                </div>
                <div className="font-extrabold text-lg mb-2">{t.title}</div>
                <div className="text-sm text-black/55 leading-relaxed">{t.desc}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
