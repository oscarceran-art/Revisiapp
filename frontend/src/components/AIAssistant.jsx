import { useState, useRef, useEffect } from "react";
import { Robot, X, PaperPlaneTilt, Sparkle, CaretDown } from "@phosphor-icons/react";
import usePageAgent from "@/hooks/usePageAgent";

function friendlyActivity(act) {
  if (!act) return null;
  switch (act.type) {
    case "thinking":
      return { text: "Thinking...", icon: Sparkle };
    case "executing":
      const toolLabels = {
        click_element: "Clicking a button...",
        input_text: "Typing text...",
        select_option: "Selecting an option...",
        scroll_vertically: "Scrolling...",
        scroll_horizontally: "Scrolling...",
        wait: "Waiting...",
      };
      return { text: toolLabels[act.tool] || `Running ${act.tool}...`, icon: CaretDown };
    case "executed":
      return null;
    case "retrying":
      return { text: `Retrying (${act.attempt}/${act.maxAttempts})...`, icon: Sparkle };
    case "error":
      return { text: `Error: ${act.message}`, icon: X };
    default:
      return null;
  }
}

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [command, setCommand] = useState("");
  const [messages, setMessages] = useState([]);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const { status, activity, lastResult, execute, reset } = usePageAgent();

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activity]);

  useEffect(() => {
    if (lastResult) {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          text: lastResult.success
            ? `✅ Done: ${lastResult.data}`
            : `❌ Failed: ${lastResult.data}`,
          success: lastResult.success,
        },
      ]);
    }
  }, [lastResult]);

  const handleSend = async () => {
    const cmd = command.trim();
    if (!cmd || status === "running") return;
    setCommand("");
    setMessages((prev) => [...prev, { role: "user", text: cmd }]);
    reset();
    try {
      await execute(cmd);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "agent", text: `Error: ${e.message}`, success: false },
      ]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activityDisplay = friendlyActivity(activity);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div
          className="w-[360px] max-h-[560px] bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.18)] border border-black/10 flex flex-col overflow-hidden"
          data-testid="ai-assistant-panel"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 bg-gradient-to-r from-pink-400 to-blue-500 text-white">
            <div className="flex items-center gap-2">
              <Robot size={16} weight="fill" />
              <span className="text-sm font-bold">AI Assistant</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg hover:bg-white/15 transition-colors"
              aria-label="Close assistant"
              data-testid="ai-assistant-close"
            >
              <X size={16} weight="bold" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0 max-h-[360px]">
            {messages.length === 0 && !activity && (
              <div className="text-center py-8 text-black/40 text-xs">
                <Robot size={32} className="mx-auto mb-2 opacity-30" weight="thin" />
                <p>Tell me what to do on Revisiapp.</p>
                <p className="mt-1">e.g. "Create a worksheet on photosynthesis"</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-black text-white rounded-br-md"
                      : msg.success !== false
                      ? "bg-black/5 text-black rounded-bl-md"
                      : "bg-red-50 text-red-700 rounded-bl-md"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {activityDisplay && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm bg-blue-50 text-blue-700 rounded-bl-md flex items-center gap-2">
                  <activityDisplay.icon size={14} className="animate-pulse" weight="bold" />
                  {activityDisplay.text}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-black/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  status === "running"
                    ? "Agent is running..."
                    : "Type a command..."
                }
                disabled={status === "running"}
                className="flex-1 border border-black/15 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-black disabled:opacity-50"
                data-testid="ai-assistant-input"
              />
              <button
                onClick={handleSend}
                disabled={!command.trim() || status === "running"}
                className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center hover:opacity-80 disabled:opacity-30 transition-opacity active:scale-[0.95] shrink-0"
                data-testid="ai-assistant-send"
                aria-label="Send command"
              >
                <PaperPlaneTilt size={16} weight="fill" />
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-400 to-blue-500 text-white shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity active:scale-[0.95]"
        data-testid="ai-assistant-toggle"
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
      >
        {open ? <X size={20} weight="bold" /> : <Robot size={20} weight="fill" />}
      </button>
    </div>
  );
}
