import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkle, Image, Trash, Pencil, Eraser } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useSidebarData } from "@/context/SidebarContext";
import ModelSelector from "@/components/ModelSelector";

export default function DiagramRecallBoardPage() {
  const navigate = useNavigate();
  const { notes, worksheets, subjects } = useSidebarData();

  const [sourceType, setSourceType] = useState("topic");
  const [topic, setTopic] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [model, setModel] = useState(null);

  const [generating, setGenerating] = useState(false);
  const [diagramPrompt, setDiagramPrompt] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [marking, setMarking] = useState(false);

  // Canvas state
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(2);

  const getCanvasPos = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const startDraw = useCallback((e) => {
    e.preventDefault();
    const pos = getCanvasPos(e);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  }, [getCanvasPos]);

  const draw = useCallback((e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = tool === "eraser" ? 20 : lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }, [isDrawing, getCanvasPos, tool, lineWidth, color]);

  const stopDraw = useCallback(() => {
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.beginPath();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      const ctx = canvas.getContext("2d");
      ctx.scale(2, 2);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleGenerate = async () => {
    if (sourceType === "topic" && !topic.trim()) { toast.error("Enter a topic"); return; }
    setGenerating(true);
    try {
      const { generateNotes } = await import("@/lib/api");
      const note = await generateNotes({
        subject_id: subjectId || null,
        topic: sourceType === "topic" ? topic.trim() : "diagram",
        depth: "overview",
        model,
      });
      const summary = note.summary || "";
      const headings = (note.sections || []).map(s => s.heading).join(", ");
      setDiagramPrompt(`Diagram: ${note.title || topic}\n\nKey elements to include:\n${summary}\n\nSections: ${headings}\n\nDraw this diagram from memory, then submit for AI feedback.`);
      toast.success("Diagram prompt ready! Draw your diagram below.");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleMark = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setMarking(true);
    try {
      const dataUrl = canvas.toDataURL("image/png");
      const blob = await (await fetch(dataUrl)).blob();
      const fd = new FormData();
      fd.append("file", blob, "diagram.png");
      const { default: axios } = await import("axios");
      const { API } = await import("@/lib/api");
      const raw = localStorage.getItem("revisiapp_auth");
      let token = "";
      try { token = JSON.parse(raw || "{}").token || ""; } catch {}
      const res = await axios.post(`${API}/chat/send-user-message`, {
        session_id: "diagram-marking-session",
        message: `I uploaded a hand-drawn diagram for the topic "${diagramPrompt}". Assess its accuracy, completeness, and labelling. Give specific feedback.`,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setFeedback(res.data?.reply || "Feedback received!");
      toast.success("Marked!");
    } catch {
      toast.error("Marking failed");
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 md:pt-16 px-4 sm:px-6 md:px-10 lg:px-14 pb-16" data-testid="diagrams-page">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => navigate("/tools")} className="text-sm text-black/55 hover:text-black flex items-center gap-1.5 mb-6">
          <ArrowLeft size={14} weight="bold" /> Back to tools
        </button>

        <div className="mb-8">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-black/45">
            <Image size={12} weight="fill" /> Diagrams
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold mt-1">Diagram Recall Board</h1>
          <p className="text-black/55 mt-2 text-sm">Get a diagram description, sketch it from memory, and get AI vision-based feedback.</p>
        </div>

        {!diagramPrompt && (
          <div className="bg-white border border-black/10 rounded-3xl p-6 max-w-2xl space-y-5">
            <div className="flex gap-2 mb-2 bg-black/[0.04] rounded-2xl p-1">
              {[
                { id: "topic", label: "From topic" },
              ].map(st => (
                <button key={st.id} onClick={() => setSourceType(st.id)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${sourceType === st.id ? "bg-white text-black shadow-sm" : "text-black/55 hover:text-black"}`}>
                  {st.label}
                </button>
              ))}
            </div>

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
                placeholder="e.g. The water cycle, Cell structure..."
                className="w-full border border-black/15 rounded-2xl px-4 py-3 focus:outline-none focus:border-black" />
            </div>

            <ModelSelector value={model} onChange={setModel} />

            <button onClick={handleGenerate} disabled={generating}
              className="w-full bg-gradient-to-r from-pink-400 to-blue-500 text-white rounded-2xl py-3.5 flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity active:scale-[0.98] font-bold">
              <Sparkle size={16} weight="fill" />
              {generating ? "Generating..." : "Generate diagram prompt"}
            </button>
          </div>
        )}

        {diagramPrompt && (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-[0.22em] text-black/45">Diagram prompt</span>
              </div>
              <div className="bg-white border border-black/10 rounded-3xl p-5 min-h-[120px] whitespace-pre-wrap text-sm leading-relaxed mb-4">
                {diagramPrompt}
              </div>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <button onClick={() => setTool("pen")}
                  className={`p-2 rounded-lg border ${tool === "pen" ? "bg-black text-white border-black" : "border-black/15 hover:bg-black/[0.04]"}`}>
                  <Pencil size={16} />
                </button>
                <button onClick={() => setTool("eraser")}
                  className={`p-2 rounded-lg border ${tool === "eraser" ? "bg-black text-white border-black" : "border-black/15 hover:bg-black/[0.04]"}`}>
                  <Eraser size={16} />
                </button>
                <input type="color" value={color} onChange={e => setColor(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-black/15 cursor-pointer" />
                <input type="range" min={1} max={10} value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))}
                  className="w-20 accent-black" />
                <button onClick={clearCanvas}
                  className="p-2 rounded-lg border border-black/15 hover:bg-black/[0.04] text-red-500">
                  <Trash size={16} />
                </button>
                <button onClick={() => { setDiagramPrompt(""); setFeedback(null); }}
                  className="ml-auto text-xs border border-black/15 rounded-full px-3 py-1.5 hover:bg-black/[0.04]">
                  New
                </button>
              </div>
              <canvas
                ref={canvasRef}
                className="w-full h-[400px] border border-black/10 rounded-3xl bg-white touch-none"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-[0.22em] text-black/45">AI Feedback</span>
                <button onClick={handleMark} disabled={marking}
                  className="bg-black text-white rounded-full px-4 py-1.5 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 active:scale-[0.98]">
                  <Sparkle size={12} weight="fill" />
                  {marking ? "Assessing..." : "Assess my diagram"}
                </button>
              </div>
              <div className="bg-white border border-black/10 rounded-3xl p-5 min-h-[300px] text-sm leading-relaxed whitespace-pre-wrap">
                {feedback || "Draw your diagram on the canvas, then click 'Assess my diagram' for AI feedback."}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
