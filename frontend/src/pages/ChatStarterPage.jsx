import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ChatCircle, Users, Student, Sparkle } from "@phosphor-icons/react";
import { createSession, listPersonas } from "@/lib/api";
import { useSidebarData } from "@/context/SidebarContext";
import PersonaPicker from "@/components/PersonaPicker";

const MODES = [
  { id: "solo", label: "Solo chat", icon: ChatCircle, desc: "Chat with one tutor or historical figure." },
  { id: "group", label: "Group debate", icon: Users, desc: "Multiple figures, they reply in turn — agree, build, challenge." },
  { id: "feynman", label: "Feynman mode", icon: Student, desc: "Teach a curious student. They ask questions until you've truly explained it." },
];

export default function ChatStarterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { subjects, refresh } = useSidebarData();
  const subjectParam = searchParams.get("subject");
  const defaultSubjectId = subjectParam && subjectParam !== "general" ? subjectParam : "";

  const [mode, setMode] = useState("solo");
  const [personas, setPersonas] = useState([]);
  const [selected, setSelected] = useState([]);
  const [subjectId, setSubjectId] = useState(defaultSubjectId);
  const [starting, setStarting] = useState(false);

  const refreshPersonas = async () => {
    const list = await listPersonas();
    setPersonas(list);
  };

  useEffect(() => { refreshPersonas(); }, []);

  useEffect(() => {
    if (mode === "feynman") setSelected(["curious-student"]);
    else if (mode === "solo" && selected.length > 1) setSelected(selected.slice(0, 1));
    else if (mode === "solo" && selected.includes("curious-student")) setSelected([]);
  }, [mode]);

  const handleStart = async () => {
    setStarting(true);
    try {
      const s = await createSession({
        title: "New chat",
        subject_id: subjectId || null,
        personas: selected,
        mode,
      });
      await refresh();
      navigate(`/chat/${s.id}`);
    } catch {
      toast.error("Couldn't start chat");
    } finally {
      setStarting(false);
    }
  };

  const pickerMulti = mode === "group";
  const visiblePersonas = mode === "feynman" ? personas.filter(p => p.id === "curious-student") : personas.filter(p => p.id !== "curious-student");

  return (
    <div className="min-h-screen pt-20 md:pt-12 px-4 sm:px-6 md:px-10 pb-16" data-testid="chat-starter-page">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate("/")} className="text-sm text-black/55 hover:text-black flex items-center gap-1.5 mb-6">
          <ArrowLeft size={14} weight="bold" /> Home
        </button>

        <div className="mb-8">
          <div className="text-[11px] uppercase tracking-[0.22em] text-black/45">New chat</div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl mt-2 font-extrabold leading-tight">Who would you like to talk to?</h1>
        </div>

        {/* Mode picker */}
        <div className="grid sm:grid-cols-3 gap-3 mb-8">
          {MODES.map(m => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                data-testid={`mode-${m.id}`}
                className={`text-left p-4 rounded-2xl border transition-all ${active ? "bg-black text-white border-black" : "bg-white border-black/15 hover:border-black/30"}`}
              >
                <Icon size={20} weight="regular" />
                <div className="font-bold text-base mt-2">{m.label}</div>
                <div className={`text-xs mt-1 leading-snug ${active ? "text-white/70" : "text-black/55"}`}>{m.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Subject selector */}
        <div className="mb-6">
          <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-2">Subject context (optional)</label>
          <select
            value={subjectId}
            onChange={e => setSubjectId(e.target.value)}
            className="w-full sm:w-auto border border-black/15 rounded-2xl px-4 py-2.5 bg-white text-sm focus:outline-none focus:border-black"
            data-testid="starter-subject-select"
          >
            <option value="">General (no subject)</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {/* Persona picker */}
        <div className="mb-8">
          <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-3">
            {mode === "group" ? "Pick 2 or more (they'll respond in turn)" : mode === "feynman" ? "Your curious student" : "Pick a persona (or leave empty for default tutor)"}
          </label>
          <PersonaPicker
            personas={visiblePersonas}
            selectedIds={selected}
            onChange={setSelected}
            multi={pickerMulti}
          />
        </div>

        <button
          onClick={handleStart}
          disabled={starting || (mode === "group" && selected.length < 2)}
          className="w-full sm:w-auto bg-black text-white rounded-2xl px-7 py-3.5 flex items-center justify-center gap-2 hover:bg-black/85 disabled:opacity-50 transition-colors active:scale-[0.98] text-base font-bold"
          data-testid="start-chat-btn"
        >
          <Sparkle size={16} weight="fill" /> {starting ? "Starting…" : "Start chat"}
        </button>
        {mode === "group" && selected.length < 2 && (
          <div className="text-xs text-black/45 mt-2">Pick at least 2 personas for a group chat.</div>
        )}
      </div>
    </div>
  );
}
