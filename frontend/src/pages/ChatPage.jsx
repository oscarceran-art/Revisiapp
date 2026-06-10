import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  PaperPlaneTilt, ChatCircleText, Gear, Sun, NotePencil, X, Brain, Microphone, Cpu
} from "@phosphor-icons/react";
import {
  getMessages, sendUserMessage, streamReply,
  updateSessionSettings, generateMorningQuiz, summariseChat,
} from "@/lib/api";
import { useSidebarData } from "@/context/SidebarContext";
import Markdown from "@/components/Markdown";
import Avatar from "@/components/Avatar";

function findPersona(personas, id) { return personas.find(p => p.id === id); }

const AI_MODES = [
  { id: "normal", label: "Normal", desc: "Patient tutor explaining clearly." },
  { id: "quiz", label: "Quiz", desc: "AI quizzes you, one question at a time." },
  { id: "socratic", label: "Socratic", desc: "Only asks questions back - you do the thinking." },
  { id: "flashcard", label: "Flashcards", desc: "Q then A, rapid-fire study cards." },
  { id: "exam_prep", label: "Exam prep", desc: "Mark-scheme rigour, exam command words." },
  { id: "eli5", label: "ELI5", desc: "Explain like I'm 5 - pure analogies." },
];

const MODEL_OPTIONS = [
  { id: "gpt-5.4-nano", label: "GPT-5.4 nano", desc: "Fastest and cheapest." },
  { id: "gpt-5.4-mini", label: "GPT-5.4 mini", desc: "Better answers, still cheap." },
  { id: "gpt-5.4", label: "GPT-5.4", desc: "Strongest for hard tasks." },
];

const CONTEXT_OPTIONS = [
  { value: 1, label: "Last message only", desc: "Cheapest" },
  { value: 3, label: "Last 3 messages", desc: "Very light" },
  { value: 5, label: "Last 5 messages", desc: "Light" },
  { value: 10, label: "Last 10 messages", desc: "Balanced" },
  { value: 20, label: "Last 20 messages", desc: "Heavy" },
  { value: 0, label: "Whole chat", desc: "Full context (costliest)" },
];

const DEFAULT_SETTINGS = { model: "gpt-5.4-nano", ai_mode: "normal", strictness: 5, context_window: 0 };

export default function ChatPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { subjects, sessions, personas, refresh, collapsed } = useSidebarData();

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const rafRef = useRef(null);
  const streamBufferRef = useRef("");
  const fullTextRef = useRef("");
  const recognitionRef = useRef(null);
  const baseInputRef = useRef("");

  const activeSession = useMemo(
    () => (sessionId ? sessions.find(s => s.id === sessionId) ?? null : null),
    [sessionId, sessions]
  );
  const activeSubject = useMemo(
    () => (activeSession?.subject_id ? subjects.find(s => s.id === activeSession.subject_id) ?? null : null),
    [activeSession?.subject_id, subjects]
  );
  const sessionPersonas = useMemo(
    () => (activeSession?.personas || []).map(pid => personas.find(p => p.id === pid)).filter(Boolean),
    [activeSession?.personas, personas]
  );
  const isGroup = activeSession?.mode === "group";
  const subjectLabel = activeSubject?.name || "General";

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streamingPersonaId, setStreamingPersonaId] = useState(null);
  const [streamingText, setStreamingText] = useState("");
  const [typingPersonaId, setTypingPersonaId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [busyAction, setBusyAction] = useState(null); // 'quiz' | 'summary'
  const [listening, setListening] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  useEffect(() => {
    if (activeSession?.settings) {
      setSettings({ ...DEFAULT_SETTINGS, ...activeSession.settings });
    } else {
      setSettings(DEFAULT_SETTINGS);
    }
  }, [activeSession?.id, activeSession?.settings]);

  useEffect(() => {
    if (!sessionId) { setMessages([]); return; }
    getMessages(sessionId).then(setMessages).catch(() => setMessages([]));
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId && !sessions.length) return;
    if (!sessionId) navigate("/chat/new");
  }, [sessionId, sessions, navigate]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 220;
    if (nearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, streamingText, typingPersonaId]);

  // Auto-resize the textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const next = Math.min(ta.scrollHeight, 280);
    ta.style.height = `${Math.max(48, next)}px`;
  }, [input]);

  const scheduleFlush = () => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const buf = streamBufferRef.current;
      if (buf) setStreamingText(prev => prev + buf);
      streamBufferRef.current = "";
    });
  };

  const handleSend = async () => {
    if (!input.trim() || sending || !sessionId) return;
    const text = input;
    setInput("");
    setSending(true);

    const tempUser = { id: `tmp-${Date.now()}`, role: "user", content: text };
    setMessages(prev => [...prev, tempUser]);

    try {
      const saved = await sendUserMessage(sessionId, text);
      setMessages(prev => prev.map(m => m.id === tempUser.id ? saved : m));

      const replyOrder = (activeSession?.personas || []).length > 0 ? activeSession.personas : [null];

      for (const pid of replyOrder) {
        setTypingPersonaId(pid || "default");
        setStreamingPersonaId(pid);
        setStreamingText("");
        streamBufferRef.current = "";
        fullTextRef.current = "";
        let finalMsg = null;
        try {
          for await (const chunk of streamReply(sessionId, pid)) {
            if (chunk.delta) {
              streamBufferRef.current += chunk.delta;
              fullTextRef.current += chunk.delta;
              scheduleFlush();
            } else if (chunk.done) {
              finalMsg = {
                id: chunk.message_id,
                role: "assistant",
                content: "",
                persona_id: chunk.persona_id || pid,
              };
            } else if (chunk.error) {
              throw new Error(chunk.error);
            }
          }
          if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
          if (streamBufferRef.current) {
            setStreamingText(prev => prev + streamBufferRef.current);
            streamBufferRef.current = "";
          }
          if (finalMsg) {
            const committed = { ...finalMsg, content: fullTextRef.current };
            setMessages(prev =>
              prev.some(m => m.id === committed.id) ? prev : [...prev, committed]
            );
          }
          setStreamingText("");
          setStreamingPersonaId(null);
          fullTextRef.current = "";
        } catch (e) {
          toast.error(`${pid || "AI"} failed: ${e.message || "error"}`);
          setStreamingPersonaId(null);
          setStreamingText("");
          fullTextRef.current = "";
        }
      }
      setTypingPersonaId(null);
      refresh();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to send");
      setMessages(prev => prev.filter(m => m.id !== tempUser.id));
    } finally {
      setSending(false);
    }
  };

  useEffect(() => () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); }, []);

  const updateSetting = async (patch) => {
    const optimistic = { ...settings, ...patch };
    setSettings(optimistic);
    try {
      await updateSessionSettings(sessionId, patch);
      await refresh();
    } catch {
      toast.error("Couldn't save setting");
    }
  };

  const handleMorningQuiz = async () => {
    if (busyAction) return;
    if (messages.length === 0) { toast.error("Chat first, then run a morning quiz."); return; }
    setBusyAction("quiz");
    try {
      const ws = await generateMorningQuiz(sessionId);
      await refresh();
      toast.success("Morning quiz ready");
      navigate(`/worksheets/${ws.id}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Couldn't make quiz");
    } finally {
      setBusyAction(null);
    }
  };

  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      toast.error("Voice input isn't supported in this browser. Try Chrome.");
      return;
    }
    if (listening) {
      try { recognitionRef.current?.stop(); } catch (_) { /* ignore */ }
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || "en-GB";
    baseInputRef.current = input;
    rec.onresult = (event) => {
      let chunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        chunk += event.results[i][0].transcript;
      }
      const joiner = baseInputRef.current && !baseInputRef.current.endsWith(" ") ? " " : "";
      setInput(baseInputRef.current + joiner + chunk);
    };
    rec.onerror = (e) => {
      if (e.error && e.error !== "no-speech" && e.error !== "aborted") {
        if (e.error === "service-not-allowed") {
          toast.error("Microphone access denied. Check your browser's mic permissions (camera/mic icon in the address bar) and ensure you're using HTTPS.");
        } else if (e.error === "not-allowed") {
          toast.error("Microphone permission was denied. Please allow microphone access and try again.");
        } else {
          toast.error(`Voice error: ${e.error}`);
        }
      }
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      toast.error("Couldn't start voice input");
    }
  };

  useEffect(() => () => { try { recognitionRef.current?.stop(); } catch (_) { /* ignore */ } }, []);

  const handleSummarise = async () => {    if (busyAction) return;
    if (messages.length === 0) { toast.error("Chat first, then summarise."); return; }
    setBusyAction("summary");
    try {
      const note = await summariseChat(sessionId);
      await refresh();
      toast.success("Summary saved as notes");
      navigate(`/notes/${note.id}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Couldn't summarise");
    } finally {
      setBusyAction(null);
    }
  };

  const renderHeader = () => (
    <div className="px-3 sm:px-6 md:px-10 pt-12 md:pt-5 pb-2 sm:pb-3 border-b border-black/10 bg-[#FAF8F5]/85 backdrop-blur sticky top-0 z-10">
      <div className={`${collapsed ? "max-w-5xl" : "max-w-3xl"} mx-auto flex items-center justify-between gap-3 transition-[max-width] duration-200`}>
        <div className="min-w-0 flex items-center gap-3">
          {sessionPersonas.length > 0 && (
            <div className="flex -space-x-2 shrink-0">
              {sessionPersonas.slice(0, 4).map(p => (
                <Avatar key={p.id} persona={p} size={28} className="border-2 border-white" />
              ))}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.22em] text-black/45 truncate">
              {sessionPersonas.length > 0 ? sessionPersonas.map(p => p.name).join(" - ") : subjectLabel}
            </div>
            <div className="text-base sm:text-lg font-bold truncate">
              {activeSession?.title || "Start a new chat"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleMorningQuiz}
            disabled={busyAction !== null}
            className="hidden sm:inline-flex items-center gap-1.5 text-[12px] font-bold border border-black/15 rounded-full px-3 py-1.5 hover:bg-black/[0.04] disabled:opacity-50 transition-colors"
            data-testid="morning-quiz-btn"
            title="Generate a fast 6-question quiz from this chat"
          >
            <Sun size={14} weight="fill" /> {busyAction === "quiz" ? "Brewing..." : "Morning quiz"}
          </button>
          <button
            onClick={handleSummarise}
            disabled={busyAction !== null}
            className="hidden sm:inline-flex items-center gap-1.5 text-[12px] font-bold border border-black/15 rounded-full px-3 py-1.5 hover:bg-black/[0.04] disabled:opacity-50 transition-colors"
            data-testid="summarise-btn"
            title="Save a study-note summary of this chat"
          >
            <NotePencil size={14} weight="regular" /> {busyAction === "summary" ? "Writing..." : "Summary"}
          </button>
        </div>
      </div>
    </div>
  );

  const renderMessage = (m) => {
    const persona = m.persona_id ? findPersona(personas, m.persona_id) : null;
    const isUser = m.role === "user";
    return (
      <div key={m.id} className={`flex mb-5 ${isUser ? "justify-end" : "justify-start"} gap-2.5 animate-fade-up`}>
        {!isUser && (
          persona ? <Avatar persona={persona} size={32} />
            : <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold shrink-0">AI</div>
        )}
        <div className="max-w-[88%] sm:max-w-[85%]">
          {!isUser && persona && (
            <div className="text-[11px] font-bold text-black/65 mb-1 ml-1">{persona.name}</div>
          )}
          <div
            className={
              isUser
                ? "bg-black text-white rounded-2xl sm:rounded-3xl rounded-tr-md px-3 py-2.5 sm:px-5 sm:py-3.5"
                : "bg-white border border-black/10 rounded-2xl sm:rounded-3xl rounded-tl-md px-3 py-2.5 sm:px-5 sm:py-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]"
            }
            data-testid={`chat-msg-${m.role}`}
          >
            {isUser ? <div className="whitespace-pre-wrap break-words">{m.content}</div> : <Markdown text={m.content} />}
          </div>
        </div>
      </div>
    );
  };

  const typingPersona = typingPersonaId && typingPersonaId !== "default" ? findPersona(personas, typingPersonaId) : null;
  const streamingPersona = streamingPersonaId ? findPersona(personas, streamingPersonaId) : null;
  const containerWidth = collapsed ? "max-w-5xl" : "max-w-3xl";

  return (
    <div className="flex flex-col h-[100dvh] font-fraunces" data-testid="chat-page">
      {renderHeader()}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-10 py-4 sm:py-8 scroll-smooth" data-testid="chat-messages">
        <div className={`${containerWidth} mx-auto transition-[max-width] duration-200`}>
          {messages.length === 0 && !sending && (
            <div className="text-center pt-12 sm:pt-16 animate-fade-up">
              <ChatCircleText size={40} weight="duotone" className="mx-auto text-black/30 sm:size-[56]" />
              <h2 className="text-xl sm:text-3xl md:text-4xl mt-3 sm:mt-5 font-extrabold">
                {sessionPersonas.length > 1 ? `${sessionPersonas.map(p => p.name.split(" ").slice(-1)[0]).join(" & ")} are listening` :
                 sessionPersonas.length === 1 ? `Say hello to ${sessionPersonas[0].name}` :
                 activeSession?.mode === "feynman" ? "Teach me something" :
                 <>What shall we <span className="gradient-fade">work</span> on?</>}
              </h2>
              <p className="text-black/50 mt-3 max-w-md mx-auto text-sm sm:text-base">
                {isGroup ? "Each personality replies in turn - you'll see them debating and building on each other." :
                 activeSession?.mode === "feynman" ? "I'm a curious student. Explain a topic and I'll keep asking until I really get it." :
                 activeSubject ? `Context from "${subjectLabel}" loaded.` : "Just type below."}
              </p>
            </div>
          )}

          {messages.map(renderMessage)}

          {(streamingPersonaId !== null || streamingText) && (
            <div className="flex mb-5 justify-start gap-2.5 animate-fade-up">
              {streamingPersona ? <Avatar persona={streamingPersona} size={32} />
                : <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold shrink-0">AI</div>}
              <div className="max-w-[85%]">
                {streamingPersona && (
                  <div className="text-[11px] font-bold text-black/65 mb-1 ml-1">{streamingPersona.name}</div>
                )}
                <div className="bg-white border border-black/10 rounded-3xl rounded-tl-md px-4 py-3 sm:px-5 sm:py-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] streaming-bubble">
                  {streamingText ? (
                    <>
                      <Markdown text={streamingText} />
                      <span className="stream-cursor" />
                    </>
                  ) : (
                    <span className="inline-flex gap-1 text-black/40">
                      <span className="w-1.5 h-1.5 bg-black/40 rounded-full animate-pulse" />
                      <span className="w-1.5 h-1.5 bg-black/40 rounded-full animate-pulse [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-black/40 rounded-full animate-pulse [animation-delay:0.4s]" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {typingPersonaId && !streamingPersonaId && !streamingText && (
            <div className="text-xs text-black/45 italic pl-12 animate-fade-up" data-testid="typing-indicator">
              {typingPersona ? `${typingPersona.name} is thinking...` : "Thinking..."}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-black/10 px-3 sm:px-6 md:px-10 py-2 sm:py-4 bg-white">
        <div className={`${containerWidth} mx-auto transition-[max-width] duration-200`}>
          {/* Quick chips for mobile (morning quiz / summary) */}
          <div className="flex sm:hidden gap-1.5 mb-2">
            <button
              onClick={handleMorningQuiz}
              disabled={busyAction !== null}
              className="flex-1 items-center justify-center gap-1.5 text-[12px] font-bold border border-black/15 rounded-full px-3 py-1.5 hover:bg-black/[0.04] disabled:opacity-50 inline-flex"
              data-testid="morning-quiz-btn-mobile"
            >
              <Sun size={14} weight="fill" /> Morning quiz
            </button>
            <button
              onClick={handleSummarise}
              disabled={busyAction !== null}
              className="flex-1 items-center justify-center gap-1.5 text-[12px] font-bold border border-black/15 rounded-full px-3 py-1.5 hover:bg-black/[0.04] disabled:opacity-50 inline-flex"
              data-testid="summarise-btn-mobile"
            >
              <NotePencil size={14} weight="regular" /> Summary
            </button>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center border border-black/15 bg-white hover:bg-black/[0.04] text-black/70 transition-colors"
              data-testid="chat-settings-btn"
              aria-label="Chat settings"
              title="AI behaviour & context settings"
            >
              <Gear size={18} weight="regular" />
            </button>
            <div className="flex-1 min-w-0 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                rows={1}
                placeholder={listening ? "Listening... speak now" : (activeSession?.mode === "feynman" ? "Explain something to your curious student..." : "Ask anything...  (Shift+Enter for new line)")}
                className="w-full resize-none rounded-3xl border border-black/15 px-5 py-3 pr-14 focus:outline-none focus:border-black bg-[#FAF8F5] text-base font-fraunces leading-relaxed block overflow-y-auto"
                data-testid="chat-input-field"
                style={{ minHeight: "48px", maxHeight: "280px" }}
                disabled={sending}
              />
              <button
                type="button"
                onClick={toggleVoice}
                className={`absolute right-2 bottom-2 w-9 h-9 rounded-full flex items-center justify-center transition-colors appearance-none ${listening ? "bg-red-500 text-white animate-pulse" : "bg-transparent text-black/55 hover:bg-black/[0.06]"}`}
                data-testid="voice-input-btn"
                aria-label={listening ? "Stop voice input" : "Start voice input"}
                title={listening ? "Stop recording" : "Hold-free voice input (browser native)"}
              >
                <Microphone size={16} weight={listening ? "fill" : "regular"} />
              </button>
            </div>
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="shrink-0 w-12 h-12 bg-gradient-to-r from-pink-400 to-blue-500 text-white rounded-full flex items-center justify-center disabled:opacity-30 hover:opacity-90 transition-opacity active:scale-[0.95]"
              data-testid="chat-send-btn"
              aria-label="Send"
            >
              <PaperPlaneTilt size={18} weight="fill" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1.5 px-1 text-[10px] uppercase tracking-[0.18em] text-black/35">
            <span data-testid="settings-summary">
              {MODEL_OPTIONS.find(m => m.id === settings.model)?.label || "GPT-5.4 nano"} - {AI_MODES.find(m => m.id === settings.ai_mode)?.label || "Normal"} - Strictness {settings.strictness}/10 - {CONTEXT_OPTIONS.find(c => c.value === settings.context_window)?.label || "Whole chat"}
            </span>
          </div>
        </div>
      </div>

      {/* Settings sheet */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-up"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[88vh] overflow-y-auto font-fraunces"
            onClick={e => e.stopPropagation()}
            data-testid="chat-settings-sheet"
          >
            <div className="flex items-start justify-between mb-5">
              <h3 className="text-2xl font-extrabold">Tune the AI</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-black/40 hover:text-black p-1"
                aria-label="Close"
                data-testid="close-settings-btn"
              >
                <X size={20} weight="regular" />
              </button>
            </div>

            {/* Model */}
            <div className="mb-6">
              <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-2 flex items-center gap-1.5">
                <Cpu size={11} weight="fill" /> Model
              </label>
              <div className="grid grid-cols-1 gap-2">
                {MODEL_OPTIONS.map(m => {
                  const active = settings.model === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => updateSetting({ model: m.id })}
                      data-testid={`model-${m.id}`}
                      className={`text-left p-3 rounded-2xl border transition-all ${active ? "bg-black text-white border-black" : "bg-white border-black/15 hover:border-black/30"}`}
                    >
                      <div className="text-sm font-bold">{m.label}</div>
                      <div className={`text-[11px] mt-0.5 leading-snug ${active ? "text-white/70" : "text-black/55"}`}>{m.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mode */}
            <div className="mb-6">
              <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-2 flex items-center gap-1.5">
                <Brain size={11} weight="fill" /> Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                {AI_MODES.map(m => {
                  const active = settings.ai_mode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => updateSetting({ ai_mode: m.id })}
                      data-testid={`ai-mode-${m.id}`}
                      className={`text-left p-3 rounded-2xl border transition-all ${active ? "bg-black text-white border-black" : "bg-white border-black/15 hover:border-black/30"}`}
                    >
                      <div className="text-sm font-bold">{m.label}</div>
                      <div className={`text-[11px] mt-0.5 leading-snug ${active ? "text-white/70" : "text-black/55"}`}>{m.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Strictness */}
            <div className="mb-6">
              <div className="flex items-baseline justify-between mb-2">
                <label className="text-[11px] uppercase tracking-[0.22em] text-black/50">Strictness</label>
                <span className="text-sm font-bold tabular-nums" data-testid="strictness-value">{settings.strictness}/10</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={settings.strictness}
                onChange={e => setSettings(s => ({ ...s, strictness: parseInt(e.target.value, 10) }))}
                onMouseUp={e => updateSetting({ strictness: parseInt(e.target.value, 10) })}
                onTouchEnd={e => updateSetting({ strictness: parseInt(e.target.value, 10) })}
                onKeyUp={e => updateSetting({ strictness: parseInt(e.target.value, 10) })}
                className="w-full accent-black"
                data-testid="strictness-slider"
              />
              <div className="flex justify-between text-[10px] uppercase tracking-[0.18em] text-black/40 mt-1">
                <span>Lenient</span>
                <span>Strict</span>
              </div>
            </div>

            {/* Context window */}
            <div className="mb-2">
              <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-2">Context window</label>
              <p className="text-[12px] text-black/55 mb-3 leading-snug">How much of the past chat the AI re-reads. Less context = cheaper & faster, but it forgets earlier turns.</p>
              <div className="grid grid-cols-2 gap-2">
                {CONTEXT_OPTIONS.map(c => {
                  const active = settings.context_window === c.value;
                  return (
                    <button
                      key={c.value}
                      onClick={() => updateSetting({ context_window: c.value })}
                      data-testid={`context-${c.value}`}
                      className={`text-left p-3 rounded-2xl border transition-all ${active ? "bg-black text-white border-black" : "bg-white border-black/15 hover:border-black/30"}`}
                    >
                      <div className="text-sm font-bold">{c.label}</div>
                      <div className={`text-[11px] mt-0.5 ${active ? "text-white/70" : "text-black/55"}`}>{c.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
