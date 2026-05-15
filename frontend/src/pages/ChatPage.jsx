import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { PaperPlaneTilt, Plus, Trash, ChatCircleText } from "@phosphor-icons/react";
import {
  listSessions, createSession, deleteSession,
  getMessages, sendMessage, listSubjects,
} from "@/lib/api";
import Markdown from "@/components/Markdown";

export default function ChatPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const scrollRef = useRef(null);

  const activeSession = sessions.find(s => s.id === sessionId);

  useEffect(() => {
    listSubjects().then(setSubjects).catch(() => {});
    listSessions().then(s => {
      setSessions(s);
      if (!sessionId && s.length > 0) navigate(`/chat/${s[0].id}`, { replace: true });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!sessionId) { setMessages([]); return; }
    getMessages(sessionId).then(setMessages).catch(() => setMessages([]));
  }, [sessionId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  const handleNewChat = async () => {
    try {
      const s = await createSession({ title: "New chat", subject_id: selectedSubjectId || null });
      setSessions(prev => [s, ...prev]);
      navigate(`/chat/${s.id}`);
    } catch (e) {
      toast.error("Could not start chat");
    }
  };

  const handleDeleteSession = async (id) => {
    await deleteSession(id);
    const remaining = sessions.filter(s => s.id !== id);
    setSessions(remaining);
    if (sessionId === id) {
      if (remaining.length) navigate(`/chat/${remaining[0].id}`);
      else navigate("/chat");
    }
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    let sid = sessionId;
    if (!sid) {
      const s = await createSession({ title: input.slice(0, 60), subject_id: selectedSubjectId || null });
      setSessions(prev => [s, ...prev]);
      sid = s.id;
      navigate(`/chat/${sid}`);
    }
    const userMsg = { id: `tmp-${Date.now()}`, role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    const text = input;
    setInput("");
    setSending(true);
    try {
      const ai = await sendMessage(sid, text);
      setMessages(prev => [...prev, ai]);
      // refresh session list (title may have updated)
      listSessions().then(setSessions).catch(() => {});
    } catch (e) {
      toast.error(e?.response?.data?.detail || "AI failed to respond");
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-screen" data-testid="chat-page">
      {/* Sessions rail */}
      <div className="hidden lg:flex flex-col w-72 border-r border-black/10 bg-white">
        <div className="p-5 border-b border-black/10">
          <button
            onClick={handleNewChat}
            className="w-full bg-black text-white rounded-lg py-2.5 px-4 flex items-center justify-center gap-2 hover:bg-black/85 transition-colors active:scale-[0.98]"
            data-testid="new-chat-btn"
          >
            <Plus size={16} weight="bold" /> New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {sessions.length === 0 && (
            <div className="text-sm text-black/40 px-3 py-2">No chats yet.</div>
          )}
          {sessions.map(s => {
            const subj = subjects.find(x => x.id === s.subject_id);
            return (
              <div
                key={s.id}
                onClick={() => navigate(`/chat/${s.id}`)}
                className={`group cursor-pointer rounded-lg px-3 py-2.5 mb-1 flex items-start justify-between gap-2 transition-colors ${sessionId === s.id ? "bg-black/5" : "hover:bg-black/5"}`}
                data-testid={`chat-session-${s.id}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm truncate text-black">{s.title || "Untitled"}</div>
                  {subj && <div className="text-xs text-black/40 truncate mt-0.5">{subj.name}</div>}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }}
                  className="opacity-0 group-hover:opacity-100 text-black/40 hover:text-black"
                  data-testid={`delete-chat-${s.id}`}
                  aria-label="Delete chat"
                >
                  <Trash size={16} weight="light" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-6 md:px-12 pt-16 md:pt-10 pb-4 border-b border-black/10 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.18em] text-black/50">Conversation</div>
            <div className="text-2xl md:text-3xl tracking-tight truncate" style={{ fontVariationSettings: '"opsz" 144' }}>
              {activeSession?.title || "Start a new conversation"}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={activeSession?.subject_id || selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              disabled={!!activeSession}
              className="text-sm border border-black/15 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-black"
              data-testid="chat-subject-select"
            >
              <option value="">No subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 md:px-12 py-8" data-testid="chat-messages">
          <div className="max-w-3xl mx-auto">
            {messages.length === 0 && !sending && (
              <div className="text-center pt-16 animate-fade-up">
                <ChatCircleText size={56} weight="thin" className="mx-auto text-black/30" />
                <h2 className="text-3xl tracking-tight mt-6" style={{ fontVariationSettings: '"opsz" 144' }}>
                  What are we revising today?
                </h2>
                <p className="text-black/50 mt-3 max-w-md mx-auto">
                  Pick a subject for context, or just type a question. Claude Haiku 4.5 is ready.
                </p>
              </div>
            )}

            {messages.map(m => (
              <div key={m.id} className={`flex mb-5 ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade-up`}>
                <div
                  className={
                    m.role === "user"
                      ? "bg-black text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%]"
                      : "bg-white border border-black/10 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]"
                  }
                  data-testid={`chat-msg-${m.role}`}
                >
                  {m.role === "assistant" ? <Markdown text={m.content} /> : <div className="whitespace-pre-wrap">{m.content}</div>}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start mb-5">
                <div className="bg-white border border-black/10 rounded-2xl rounded-tl-sm px-4 py-3 text-black/40">
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
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              rows={1}
              placeholder="Ask anything…"
              className="flex-1 resize-none rounded-lg border border-black/15 px-4 py-3 focus:outline-none focus:border-black bg-white text-base"
              data-testid="chat-input-field"
              style={{ minHeight: "48px", maxHeight: "200px" }}
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="bg-black text-white rounded-lg p-3 disabled:opacity-30 hover:bg-black/85 transition-colors active:scale-[0.97]"
              data-testid="chat-send-btn"
              aria-label="Send"
            >
              <PaperPlaneTilt size={20} weight="light" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
