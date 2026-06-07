import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkle, NotePencil, FileText } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useSidebarData } from "@/context/SidebarContext";
import ModelSelector from "@/components/ModelSelector";

export default function BlurtingWorkspacePage() {
  const navigate = useNavigate();
  const { notes, worksheets, subjects } = useSidebarData();

  const [sourceType, setSourceType] = useState("topic");
  const [topic, setTopic] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState("");
  const [selectedWorksheetId, setSelectedWorksheetId] = useState("");
  const [model, setModel] = useState(null);

  const [generating, setGenerating] = useState(false);
  const [modelAnswer, setModelAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [blurt, setBlurt] = useState("");
  const [marking, setMarking] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleGenerate = async () => {
    if (sourceType === "topic" && !topic.trim()) { toast.error("Enter a topic"); return; }
    setGenerating(true);
    setRevealed(false);
    setBlurt("");
    setFeedback(null);
    try {
      const { generateNotes } = await import("@/lib/api");
      const note = await generateNotes({
        subject_id: subjectId || null,
        topic: sourceType === "topic" ? topic.trim() : "placeholder",
        depth: "standard",
        model,
      });
      let answer;
      if (sourceType === "note" && selectedNoteId) {
        const noteData = await (await import("@/lib/api")).getNote(selectedNoteId);
        answer = [noteData.summary, ...(noteData.sections || []).map(s => `${s.heading}:\n${(s.bullets || []).join("\n")}`)].join("\n\n");
      } else if (sourceType === "worksheet" && selectedWorksheetId) {
        const wsData = await (await import("@/lib/api")).getWorksheet(selectedWorksheetId);
        answer = (wsData.questions || []).map((q, i) => `Q${i + 1}: ${q.question}\nA: ${q.answer}`).join("\n\n");
      } else {
        answer = [note.summary, ...(note.sections || []).map(s => `${s.heading}:\n${(s.bullets || []).join("\n")}`)].join("\n\n");
      }
      if (!answer) { toast.error("Could not generate model answer"); return; }
      setModelAnswer(answer);
      toast.success("Model answer ready! Hide it and start blurting.");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleMark = async () => {
    if (!blurt.trim()) { toast.error("Write your blurt first"); return; }
    setMarking(true);
    try {
      const { default: axios } = await import("axios");
      const { API } = await import("@/lib/api");
      const raw = localStorage.getItem("revisiapp_auth");
      let token = "";
      try { token = JSON.parse(raw || "{}").token || ""; } catch {}
      const res = await axios.post(`${API}/chat/send-user-message`, {
        session_id: "blurt-marking-session",
        message: `I want you to mark the following blurt against the model answer. Give a score out of 10 and specific feedback on what was missed or inaccurate.\n\nMODEL ANSWER:\n${modelAnswer}\n\nSTUDENT BLURT:\n${blurt}`,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setFeedback(res.data?.reply || "Marking complete — refresh to see feedback.");
      toast.success("Marked!");
    } catch {
      toast.error("Marking failed");
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 md:pt-16 px-4 sm:px-6 md:px-10 lg:px-14 pb-16" data-testid="blurting-page">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => navigate("/tools")} className="text-sm text-black/55 hover:text-black flex items-center gap-1.5 mb-6">
          <ArrowLeft size={14} weight="bold" /> Back to tools
        </button>

        <div className="mb-8">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-black/45">
            <NotePencil size={12} weight="fill" /> Blurting
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold mt-1">Blurting Workspace</h1>
          <p className="text-black/55 mt-2 text-sm">Generate a model answer, hide it, then recall everything you can. AI marks your blurt.</p>
        </div>

        {!modelAnswer && (
          <div className="bg-white border border-black/10 rounded-3xl p-6 max-w-2xl space-y-5">
            <div className="flex gap-2 mb-2 bg-black/[0.04] rounded-2xl p-1">
              {[
                { id: "topic", label: "From topic" },
                { id: "note", label: "From notes" },
                { id: "worksheet", label: "From worksheet" },
              ].map(st => (
                <button key={st.id} onClick={() => setSourceType(st.id)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${sourceType === st.id ? "bg-white text-black shadow-sm" : "text-black/55 hover:text-black"}`}>
                  {st.label}
                </button>
              ))}
            </div>

            {sourceType === "topic" && (
              <>
                <div>
                  <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-2">Subject</label>
                  <select value={subjectId} onChange={e => setSubjectId(e.target.value)}
                    className="w-full border border-black/15 rounded-2xl px-4 py-3 bg-white focus:outline-none focus:border-black">
                    <option value="">General (no subject)</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-2">Topic</label>
                  <input value={topic} onChange={e => setTopic(e.target.value)}
                    placeholder="e.g. Photosynthesis"
                    className="w-full border border-black/15 rounded-2xl px-4 py-3 focus:outline-none focus:border-black" />
                </div>
              </>
            )}

            {sourceType === "note" && (
              <div>
                <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-2">Select notes</label>
                <select value={selectedNoteId} onChange={e => setSelectedNoteId(e.target.value)}
                  className="w-full border border-black/15 rounded-2xl px-4 py-3 bg-white focus:outline-none focus:border-black">
                  <option value="">Choose...</option>
                  {notes.map(n => <option key={n.id} value={n.id}>{n.title || n.topic}</option>)}
                </select>
              </div>
            )}

            {sourceType === "worksheet" && (
              <div>
                <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-2">Select worksheet</label>
                <select value={selectedWorksheetId} onChange={e => setSelectedWorksheetId(e.target.value)}
                  className="w-full border border-black/15 rounded-2xl px-4 py-3 bg-white focus:outline-none focus:border-black">
                  <option value="">Choose...</option>
                  {worksheets.map(w => <option key={w.id} value={w.id}>{w.title || w.topic}</option>)}
                </select>
              </div>
            )}

            <ModelSelector value={model} onChange={setModel} />

            <button onClick={handleGenerate} disabled={generating}
              className="w-full bg-gradient-to-r from-pink-400 to-blue-500 text-white rounded-2xl py-3.5 flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity active:scale-[0.98] font-bold">
              <Sparkle size={16} weight="fill" />
              {generating ? "Generating model answer..." : "Generate model answer"}
            </button>
          </div>
        )}

        {modelAnswer && (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-[0.22em] text-black/45">
                  {revealed ? "Model answer (revealed)" : "Model answer (hidden)"}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setRevealed(!revealed)}
                    className="text-xs border border-black/15 rounded-full px-3 py-1.5 hover:bg-black/[0.04]">
                    {revealed ? "Hide" : "Reveal"}
                  </button>
                  <button onClick={() => { setModelAnswer(""); setBlurt(""); setFeedback(null); }}
                    className="text-xs border border-black/15 rounded-full px-3 py-1.5 hover:bg-black/[0.04]">
                    New
                  </button>
                </div>
              </div>
              <div className="bg-white border border-black/10 rounded-3xl p-5 min-h-[300px] whitespace-pre-wrap text-sm leading-relaxed">
                {revealed ? modelAnswer : "Click \"Reveal\" to see the model answer after you've finished blurting."}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-[0.22em] text-black/45">Your blurt</span>
                <button onClick={handleMark} disabled={marking || !blurt.trim()}
                  className="bg-black text-white rounded-full px-4 py-1.5 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 active:scale-[0.98]">
                  <Sparkle size={12} weight="fill" />
                  {marking ? "Marking..." : "Mark my blurt"}
                </button>
              </div>
              <textarea
                value={blurt}
                onChange={e => setBlurt(e.target.value)}
                placeholder="Write everything you remember here..."
                className="w-full border border-black/10 rounded-3xl p-5 min-h-[300px] focus:outline-none focus:border-black/30 text-sm leading-relaxed resize-y"
              />
              {feedback && (
                <div className="mt-4 bg-white border border-black/10 rounded-3xl p-5">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-black/45 mb-2">AI Feedback</div>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{feedback}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
