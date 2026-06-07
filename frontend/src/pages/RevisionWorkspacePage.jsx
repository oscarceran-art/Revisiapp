import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkle, NotePencil, Image, Stack } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useSidebarData } from "@/context/SidebarContext";
import ModelSelector from "@/components/ModelSelector";
import { workspaceGenerateText, workspaceGenerateDiagram, workspaceCheckRecall } from "@/lib/api";

const IMAGE_MODELS = {
  "gpt-image-1-mini": { label: "GPT Image 1 Mini", desc: "Fastest, lowest cost" },
  "gpt-image-1": { label: "GPT Image 1", desc: "Fast, good for general diagrams" },
  "gpt-image-1.5": { label: "GPT Image 1.5", desc: "Better detail for complex diagrams" },
  "gpt-image-2": { label: "GPT Image 2", desc: "Best quality, higher cost" },
};

const MODES = [
  { id: "text", icon: NotePencil, label: "Text Recall", desc: "Generate exam Q&A, hide it, and recall from memory" },
  { id: "diagram", icon: Image, label: "Diagram Recall", desc: "Generate a diagram to help visualise the topic" },
  { id: "mixed", icon: Stack, label: "Mixed Recall", desc: "Combine text and diagram recall side by side" },
];

export default function RevisionWorkspacePage() {
  const navigate = useNavigate();
  const { subjects } = useSidebarData();

  const [mode, setMode] = useState("text");

  // Common state
  const [subjectId, setSubjectId] = useState("");
  const [topic, setTopic] = useState("");
  const [textModel, setTextModel] = useState(null);
  const [imageModel, setImageModel] = useState("gpt-image-1");
  const [generating, setGenerating] = useState(false);

  // Text recall state
  const [exercise, setExercise] = useState(null);
  const [keyPoints, setKeyPoints] = useState([]);
  const [contentHidden, setContentHidden] = useState(false);
  const [recall, setRecall] = useState("");
  const [marking, setMarking] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Diagram recall state
  const [diagramExercise, setDiagramExercise] = useState(null);

  const handleGenerate = async () => {
    if (!topic.trim()) { toast.error("Enter a topic"); return; }
    setGenerating(true);
    setFeedback(null);
    setContentHidden(false);
    setRecall("");
    try {
      if (mode === "text" || mode === "mixed") {
        const res = await workspaceGenerateText({ subject_id: subjectId || null, topic: topic.trim(), model: textModel });
        setExercise(res.exercise);
        setKeyPoints(res.key_points || []);
      }
      if (mode === "diagram" || mode === "mixed") {
        const res = await workspaceGenerateDiagram({ subject_id: subjectId || null, topic: topic.trim(), image_model: imageModel });
        setDiagramExercise(res.exercise);
      }
      toast.success("Content generated!");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleCheckRecall = async () => {
    if (!recall.trim()) { toast.error("Write your recall first"); return; }
    if (!exercise) return;
    setMarking(true);
    try {
      const res = await workspaceCheckRecall({ exercise_id: exercise.id, student_recall: recall });
      setFeedback(res);
      toast.success("Recalled checked!");
    } catch {
      toast.error("Failed to check recall");
    } finally {
      setMarking(false);
    }
  };

  const handleReset = () => {
    setExercise(null);
    setDiagramExercise(null);
    setKeyPoints([]);
    setFeedback(null);
    setRecall("");
    setContentHidden(false);
    setTopic("");
  };

  const showTextMode = mode === "text" || mode === "mixed";
  const showDiagramMode = mode === "diagram" || mode === "mixed";

  return (
    <div className="min-h-screen pt-20 md:pt-14 px-4 sm:px-6 md:px-10 lg:px-14 pb-16" data-testid="workspace-page">
      <div className="max-w-7xl mx-auto">
        <button onClick={() => navigate("/")} className="text-sm text-black/55 hover:text-black flex items-center gap-1.5 mb-4">
          <ArrowLeft size={14} weight="bold" /> Back
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-black/45">
            <Stack size={12} weight="fill" /> Revision Workspace
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold mt-1">Active Recall Studio</h1>
          <p className="text-black/55 mt-1 text-sm">Generate content, hide it, and reconstruct from memory. AI checks your accuracy.</p>
        </div>

        {/* Mode selector */}
        <div className="flex gap-2 mb-6 bg-black/[0.04] rounded-2xl p-1 max-w-xl">
          {MODES.map(m => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); handleReset(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors ${mode === m.id ? "bg-white text-black shadow-sm" : "text-black/55 hover:text-black"}`}
              >
                <Icon size={14} weight={mode === m.id ? "fill" : "regular"} />
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Generate panel (shown when no content) */}
        {!exercise && !diagramExercise && (
          <div className="bg-white border border-black/10 rounded-3xl p-6 max-w-2xl space-y-5">
            <div>
              <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-2">Subject</label>
              <select value={subjectId} onChange={e => setSubjectId(e.target.value)}
                className="w-full border border-black/15 rounded-2xl px-4 py-3 bg-white focus:outline-none focus:border-black">
                <option value="">General (no subject)</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-2">
                {showTextMode ? "What do you want to recall?" : "Diagram topic"}
              </label>
              <input value={topic} onChange={e => setTopic(e.target.value)}
                placeholder={showTextMode ? "e.g. Define osmosis, Natural selection, 4-marker on..." : "e.g. Kidney, Heart, Plant Cell..."}
                className="w-full border border-black/15 rounded-2xl px-4 py-3 focus:outline-none focus:border-black" />
            </div>

            {showTextMode && (
              <ModelSelector value={textModel} onChange={setTextModel} />
            )}

            {showDiagramMode && (
              <div>
                <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-2">Image model</label>
                <select value={imageModel} onChange={e => setImageModel(e.target.value)}
                  className="w-full border border-black/15 rounded-2xl px-4 py-3 bg-white focus:outline-none focus:border-black">
                  {Object.entries(IMAGE_MODELS).map(([key, m]) => (
                    <option key={key} value={key}>{m.label} — {m.desc}</option>
                  ))}
                </select>
              </div>
            )}

            <button onClick={handleGenerate} disabled={generating}
              className="w-full bg-gradient-to-r from-pink-400 to-blue-500 text-white rounded-2xl py-3.5 flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity active:scale-[0.98] font-bold">
              <Sparkle size={16} weight="fill" />
              {generating ? "Generating..." : "Generate"}
            </button>
          </div>
        )}

        {/* Active workspace */}
        {(exercise || diagramExercise) && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-black/40">
                <span className="font-semibold text-black/60">{topic}</span>
                {exercise && <span>Text recall</span>}
                {diagramExercise && <span>Diagram</span>}
              </div>
              <button onClick={handleReset}
                className="text-xs border border-black/15 rounded-full px-3 py-1.5 hover:bg-black/[0.04]">
                New
              </button>
            </div>

            <div className={`grid gap-6 ${showTextMode && showDiagramMode ? "lg:grid-cols-2" : "grid-cols-1"}`}>
              {/* Text recall column */}
              {showTextMode && exercise && (
                <div className="space-y-4">
                  <div className="bg-white border border-black/10 rounded-3xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] uppercase tracking-[0.22em] text-black/45">Question</span>
                      <button onClick={() => setContentHidden(!contentHidden)}
                        className="text-xs border border-black/15 rounded-full px-3 py-1 hover:bg-black/[0.04]">
                        {contentHidden ? "Reveal" : "Hide content"}
                      </button>
                    </div>
                    {!contentHidden ? (
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">{exercise.model_answer}</div>
                    ) : (
                      <div className="text-sm leading-relaxed whitespace-pre-wrap select-none blur-sm cursor-pointer" onClick={() => setContentHidden(false)}>
                        {exercise.model_answer}
                      </div>
                    )}
                    {keyPoints.length > 0 && !contentHidden && (
                      <div className="mt-4 pt-4 border-t border-black/10">
                        <div className="text-[11px] uppercase tracking-[0.22em] text-black/45 mb-2">Key points to cover</div>
                        <ul className="list-disc list-inside text-xs text-black/60 space-y-1">
                          {keyPoints.map((kp, i) => <li key={i}>{kp}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] uppercase tracking-[0.22em] text-black/45">Your recall</span>
                      <button onClick={handleCheckRecall} disabled={marking || !recall.trim()}
                        className="bg-black text-white rounded-full px-4 py-1.5 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 active:scale-[0.98]">
                        <Sparkle size={12} weight="fill" />
                        {marking ? "Checking..." : "Check my recall"}
                      </button>
                    </div>
                    <textarea value={recall} onChange={e => setRecall(e.target.value)}
                      placeholder="Write everything you remember..."
                      className="w-full border border-black/10 rounded-3xl p-5 min-h-[200px] focus:outline-none focus:border-black/30 text-sm leading-relaxed" />
                  </div>

                  {feedback && (
                    <div className="bg-white border border-black/10 rounded-3xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-[0.22em] text-black/45">AI Feedback</span>
                        <span className="text-2xl font-extrabold">{feedback.score}/10</span>
                      </div>
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">{feedback.feedback}</div>
                      {feedback.missing_points?.length > 0 && (
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.22em] text-red-500 mb-1">Missing points</div>
                          <ul className="list-disc list-inside text-xs text-red-600 space-y-0.5">
                            {feedback.missing_points.map((p, i) => <li key={i}>{p}</li>)}
                          </ul>
                        </div>
                      )}
                      {feedback.misconceptions?.length > 0 && (
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.22em] text-amber-600 mb-1">Misconceptions</div>
                          <ul className="list-disc list-inside text-xs text-amber-700 space-y-0.5">
                            {feedback.misconceptions.map((p, i) => <li key={i}>{p}</li>)}
                          </ul>
                        </div>
                      )}
                      {feedback.follow_up_question && (
                        <div className="mt-3 pt-3 border-t border-black/10">
                          <div className="text-[11px] uppercase tracking-[0.22em] text-black/45 mb-1">Follow-up</div>
                          <div className="text-sm font-bold">{feedback.follow_up_question}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Diagram recall column */}
              {showDiagramMode && diagramExercise && (
                <div className="space-y-4">
                  <div className="bg-white border border-black/10 rounded-3xl overflow-hidden">
                    {diagramExercise.image_url && (
                      <img src={diagramExercise.image_url} alt={topic} className="w-full object-contain max-h-[400px]" />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
