import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { PaperPlaneTilt, ChatCircleText } from "@phosphor-icons/react";
import { getMessages, sendUserMessage, streamReply } from "@/lib/api";
import { useSidebarData } from "@/context/SidebarContext";
import Markdown from "@/components/Markdown";
import Avatar from "@/components/Avatar";

function findPersona(personas, id) { return personas.find(p => p.id === id); }

export default function ChatPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { subjects, sessions, personas, refresh } = useSidebarData();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState(null); // {persona_id, text}
  const [typingPersonaId, setTypingPersonaId] = useState(null);
  const scrollRef = useRef(null);

  const activeSession = sessions.find(s => s.id === sessionId);
  const activeSubject = subjects.find(s => s.id === activeSession?.subject_id);
  const sessionPersonas = (activeSession?.personas || []).map(id => findPersona(personas, id)).filter(Boolean);
  const isGroup = activeSession?.mode === "group";
  const subjectLabel = activeSubject?.name || "General";

  useEffect(() => {
    if (!sessionId) { setMessages([]); return; }
    getMessages(sessionId).then(setMessages).catch(() => setMessages([]));
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId && !sessions.length) return;
    if (!sessionId) navigate("/chat/new");
  }, [sessionId, sessions, navigate]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streaming, typingPersonaId, sending]);

  const handleSend = async () => {
    if (!input.trim() || sending || !sessionId) return;
    const text = input;
    setInput("");
    setSending(true);

    // Optimistic user message
    const tempUser = { id: `tmp-${Date.now()}`, role: "user", content: text };
    setMessages(prev => [...prev, tempUser]);

    try {
      const saved = await sendUserMessage(sessionId, text);
      setMessages(prev => prev.map(m => m.id === tempUser.id ? saved : m));

      // Determine which personas will reply
      const replyOrder = (activeSession?.personas || []).length > 0
        ? activeSession.personas
        : [null]; // null = default tutor

      for (const pid of replyOrder) {
        setTypingPersonaId(pid || "default");
        setStreaming({ persona_id: pid, text: "" });
        try {
          let finalMsg = null;
          for await (const chunk of streamReply(sessionId, pid)) {
            if (chunk.delta) {
              setStreaming(s => s ? { ...s, text: s.text + chunk.delta } : s);
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
          // Commit
          setStreaming(curr => {
            if (finalMsg && curr) {
              setMessages(prev => [...prev, { ...finalMsg, content: curr.text }]);
            }
            return null;
          });
        } catch (e) {
          toast.error(`${pid || "AI"} failed: ${e.message || "error"}`);
          setStreaming(null);
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

  const renderHeader = () => (
    <div className="px-4 sm:px-6 md:px-10 pt-14 md:pt-5 pb-3 border-b border-black/10 bg-[#FAF8F5]/85 backdrop-blur sticky top-0 z-10">
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
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
              {sessionPersonas.length > 0 ? sessionPersonas.map(p => p.name).join(" · ") : subjectLabel}
            </div>
            <div className="text-base sm:text-lg font-bold truncate">
              {activeSession?.title || "Start a new chat"}
            </div>
          </div>
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
        <div className="max-w-[85%]">
          {!isUser && persona && (
            <div className="text-[11px] font-bold text-black/65 mb-1 ml-1">{persona.name}</div>
          )}
          <div
            className={
              isUser
                ? "bg-black text-white rounded-3xl rounded-tr-md px-4 py-3 sm:px-5 sm:py-3.5"
                : "bg-white border border-black/10 rounded-3xl rounded-tl-md px-4 py-3 sm:px-5 sm:py-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]"
            }
            data-testid={`chat-msg-${m.role}`}
          >
            {isUser ? <div className="whitespace-pre-wrap">{m.content}</div> : <Markdown text={m.content} />}
          </div>
        </div>
      </div>
    );
  };

  const typingPersona = typingPersonaId && typingPersonaId !== "default" ? findPersona(personas, typingPersonaId) : null;

  return (
    <div className="flex flex-col h-screen font-fraunces" data-testid="chat-page">
      {renderHeader()}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-10 py-6 sm:py-8" data-testid="chat-messages">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 && !sending && (
            <div className="text-center pt-12 sm:pt-16 animate-fade-up">
              <ChatCircleText size={56} weight="duotone" className="mx-auto text-black/30" />
              <h2 className="text-2xl sm:text-3xl md:text-4xl mt-5 font-extrabold">
                {sessionPersonas.length > 1 ? `${sessionPersonas.map(p => p.name.split(" ").slice(-1)[0]).join(" & ")} are listening` :
                 sessionPersonas.length === 1 ? `Say hello to ${sessionPersonas[0].name}` :
                 activeSession?.mode === "feynman" ? "Teach me something" :
                 "What shall we work on?"}
              </h2>
              <p className="text-black/50 mt-3 max-w-md mx-auto text-sm sm:text-base">
                {isGroup ? "Each personality replies in turn — you'll see them debating and building on each other." :
                 activeSession?.mode === "feynman" ? "I'm a curious student. Explain a topic and I'll keep asking until I really get it." :
                 activeSubject ? `Context from "${subjectLabel}" loaded.` : "Just type below."}
              </p>
            </div>
          )}

          {messages.map(renderMessage)}

          {/* Live streaming bubble */}
          {streaming && (
            <div className="flex mb-5 justify-start gap-2.5">
              {(() => {
                const p = streaming.persona_id ? findPersona(personas, streaming.persona_id) : null;
                return p ? <Avatar persona={p} size={32} />
                  : <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold shrink-0">AI</div>;
              })()}
              <div className="max-w-[85%]">
                {streaming.persona_id && (() => {
                  const p = findPersona(personas, streaming.persona_id);
                  return p ? <div className="text-[11px] font-bold text-black/65 mb-1 ml-1">{p.name}</div> : null;
                })()}
                <div className="bg-white border border-black/10 rounded-3xl rounded-tl-md px-4 py-3 sm:px-5 sm:py-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                  {streaming.text ? <Markdown text={streaming.text + "▍"} />
                    : <span className="inline-flex gap-1 text-black/40">
                        <span className="w-1.5 h-1.5 bg-black/40 rounded-full animate-pulse" />
                        <span className="w-1.5 h-1.5 bg-black/40 rounded-full animate-pulse [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 bg-black/40 rounded-full animate-pulse [animation-delay:0.4s]" />
                      </span>}
                </div>
              </div>
            </div>
          )}

          {/* Typing indicator (between personas) */}
          {typingPersonaId && !streaming && (
            <div className="text-xs text-black/45 italic pl-12" data-testid="typing-indicator">
              {typingPersona ? `${typingPersona.name} is thinking…` : "Thinking…"}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-black/10 px-4 sm:px-6 md:px-10 py-3 sm:py-4 bg-white">
        <div className="max-w-3xl mx-auto flex items-end gap-2.5">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            rows={1}
            placeholder={activeSession?.mode === "feynman" ? "Explain something to your curious student…" : "Ask anything…"}
            className="flex-1 resize-none rounded-3xl border border-black/15 px-4 py-3 sm:px-5 sm:py-3.5 focus:outline-none focus:border-black bg-[#FAF8F5] text-base font-fraunces"
            data-testid="chat-input-field"
            style={{ minHeight: "48px", maxHeight: "200px" }}
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="bg-black text-white rounded-full p-3 sm:p-3.5 disabled:opacity-30 hover:bg-black/85 transition-colors active:scale-[0.95]"
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
