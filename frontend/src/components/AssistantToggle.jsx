import { Robot, X, Pause } from "@phosphor-icons/react";
import usePageAgent from "@/hooks/usePageAgent";
import { useEffect, useRef } from "react";

export default function AssistantToggle() {
  const { status, agent } = usePageAgent();
  const visible = useRef(false);

  const toggle = () => {
    if (!agent?.panel) return;
    visible.current = !visible.current;
    if (visible.current) agent.panel.show();
    else agent.panel.hide();
  };

  const stopTask = (e) => {
    e.stopPropagation();
    agent?.stop();
  };

  useEffect(() => {
    if (!agent?.panel) return;
    // Start hidden
    agent.panel.wrapper.style.display = "none";
  }, [agent]);

  const running = status === "running";

  return (
    <div className="fixed bottom-7 right-5 z-[2147483643] flex flex-col items-center gap-2">
      <button
        onClick={toggle}
        className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-400 to-blue-500 text-white shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity active:scale-[0.95]"
        data-testid="ai-assistant-toggle"
        aria-label={visible.current ? "Close AI assistant" : "Open AI assistant"}
      >
        {visible.current ? <X size={20} weight="bold" /> : <Robot size={20} weight="fill" />}
      </button>
      {running && (
        <button
          onClick={stopTask}
          className="w-10 h-10 rounded-full bg-red-500 text-white shadow-md flex items-center justify-center hover:opacity-85 transition-opacity active:scale-[0.95]"
          data-testid="ai-assistant-stop"
          aria-label="Stop agent"
          title="Stop"
        >
          <Pause size={16} weight="fill" />
        </button>
      )}
      {running && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
    </div>
  );
}
