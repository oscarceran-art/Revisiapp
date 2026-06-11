import { useNavigate } from "react-router-dom";
import { Stack, NotePencil, Image, Cards } from "@phosphor-icons/react";

const tools = [
  {
    to: "/workspace",
    icon: Stack,
    title: "Revision Workspace",
    desc: "Active recall studio with text blurting, diagram labelling, and AI marking in one whiteboard-style environment.",
    gradient: "from-pink-400 to-blue-500",
  },
  {
    to: "/flashcards",
    icon: Cards,
    title: "Flashcards",
    desc: "Spaced repetition flashcards with SM-2 algorithm. Create decks, study with AI generation.",
    gradient: "from-purple-400 to-pink-500",
  },
  {
    to: "/worksheets/new",
    icon: NotePencil,
    title: "Worksheets",
    desc: "Generate exam-style worksheets, mark them, and get AI feedback on your answers.",
    gradient: "from-blue-400 to-cyan-500",
  },
];

export default function ToolsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pt-14 md:pt-16 px-4 sm:px-6 md:px-10 lg:px-14 pb-16" data-testid="tools-page">
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
                className="group text-left bg-white border border-black/10 rounded-3xl p-6 hover:border-black/25 transition-all active:scale-[0.98]"
              >
                <div className="w-11 h-11 rounded-2xl bg-black flex items-center justify-center mb-4 group-hover:bg-gradient-to-br group-hover:from-pink-400 group-hover:to-blue-500 transition-all duration-300">
                  <Icon size={20} weight="fill" className="text-white" />
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
