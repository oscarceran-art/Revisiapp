import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { PaperPlaneTilt, ChatCircleText } from "@phosphor-icons/react";
import { createSession, getMessages, sendMessage } from "@/lib/api";
import { useSidebarData } from "@/context/SidebarContext";
import Markdown from "@/components/Markdown";

export default function ChatPage() {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { subjects, sessions, refresh } = useSidebarData();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [newSubjectId, setNewSubjectId] = useState("");
  const [streamingId, setStreamingId] = useState(null);
  const [streamingText, setStreamingText] = useState("");
  const scrollRef = useRef(null);

  const isNew = !sessionId;
  const activeSession = sessions.find(s => s.id === sessionId);
  const activeSubject = subjects.find(s => s.id === activeSession?.subject_id);

  useEffect(() => {
    if (isNew) {
      const sub = searchParams.get("subject");
      setNewSubjectId(sub && sub !== "general" ? sub : "");
      setMessages([]);
      return;
    }
    getMessages(sessionId).then(setMessages).catch(() => setMessages([]));
  }, [sessionId, isNew, searchParams]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending, streamingText]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    let sid = sessionId;
    if (!sid) {
      try {
        const s = await createSession({ title: input.slice(0, 60), subject_id: newSubjectId || null });
        sid = s.id;
        await refresh();
        navigate(`/chat/${sid}`, { replace: true });
      } catch {
        toast.error("Could not start chat");
        return;
      }
    }
    const userMsg = { id: `tmp-${Date.now()}`, role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    const text = input;
    setInput("");
    setSending(true);
    try {
      const ai = await sendMessage(sid, text);
      // Typewriter effect: reveal text gradually
      setStreamingId(ai.id);
      setStreamingText("");
      const full = ai.content;
      const total = full.length;
      const chunkSize = Math.max(2, Math.ceil(total / 120));
      const intervalMs = 18;
      let i = 0;
      await new Promise(resolve => {
        const tick = () => {
          i = Math.min(i + chunkSize, total);
          setStreamingText(full.slice(0, i));
          if (i < total) {
            setTimeout(tick, intervalMs);
          } else {
            resolve();
          }
        };
        tick();
      });
      setMessages(prev => [...prev, ai]);
      setStreamingId(null);
      setStreamingText("");
      refresh();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "AI failed to respond");
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
    } finally {
      setSending(false);
    }
  };

  const subjectLabel = activeSubject?.name || (isNew && newSubjectId ? subjects.find(s => s.id === newSubjectId)?.name : null) || "General";

  return (
    <div className="flex flex-col h-screen" data-testid="chat-page">
      <div className="px-6 md:px-10 pt-14 md:pt-5 pb-3 border-b border-black/10 bg-[#FAF8F5]/85 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.22em] text-black/45">{subjectLabel}</div>
            <div className="text-base md:text-lg font-bold truncate">
              {activeSession?.title || "Start a new chat"}
            </div>
          </div>
          {isNew && (
            <select
              value={newSubjectId}
              onChange={e => setNewSubjectId(e.target.value)}
              className="text-sm border border-black/15 rounded-full px-3 py-1.5 bg-white focus:outline-none focus:border-black"
              data-testid="chat-subject-select"
            >
              <option value="">General</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 md:px-12 py-8 font-fraunces" data-testid="chat-messages">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 && !sending && (
            <div className="text-center pt-16 animate-fade-up">
              <ChatCircleText size={64} weight="duotone" className="mx-auto text-black/30" />
              <h2 className="display text-3xl md:text-4xl mt-6">What shall we work on?</h2>
              <p className="text-black/50 mt-3 max-w-md mx-auto">
                {activeSubject || newSubjectId ? `Context loaded from "${subjectLabel}". Ask away.` : "Tied to General. Pick a subject above for context."}
              </p>
            </div>
          )}

          {messages.map(m => (
            <div key={m.id} className={`flex mb-5 ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade-up`}>
              <div
                className={
                  m.role === "user"
                    ? "bg-black text-white rounded-3xl rounded-tr-md px-5 py-3.5 max-w-[85%]"
                    : "bg-white border border-black/10 rounded-3xl rounded-tl-md px-5 py-3.5 max-w-[85%] shadow-[0_2px_12px_rgba(0,0,0,0.02)]"
                }
                data-testid={`chat-msg-${m.role}`}
              >
                {m.role === "assistant" ? <Markdown text={m.content} /> : <div className="whitespace-pre-wrap">{m.content}</div>}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start mb-5">
              <div className="bg-white border border-black/10 rounded-3xl rounded-tl-md px-5 py-3.5 text-black/40">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 bg-black/40 rounded-full animate-pulse" />
                  <span className="w-1.5 h-1.5 bg-black/40 rounded-full animate-pulse [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-black/40 rounded-full animate-pulse [animation-delay:0.4s]" />
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-black/10 px-6 md:px-12 py-4 bg-white">
        <div className="max-w-3xl mx-auto flex items-end gap-3">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            rows={1}
            placeholder="Ask anything…"
            className="flex-1 resize-none rounded-3xl border border-black/15 px-5 py-3.5 focus:outline-none focus:border-black bg-[#FAF8F5] text-base font-fraunces"
            data-testid="chat-input-field"
            style={{ minHeight: "52px", maxHeight: "200px" }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="bg-black text-white rounded-full p-3.5 disabled:opacity-30 hover:bg-black/85 transition-colors active:scale-[0.95]"
            data-testid="chat-send-btn"
            aria-label="Send"
          >
            <PaperPlaneTilt size={20} weight="fill" />
          </button>
        </div>
      </div>
    </div>
  );
}
