import { useState, useRef, useEffect, useCallback } from "react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

function getRouteInstructions(url) {
  try {
    const path = new URL(url).pathname;
    if (path === "/" || path === "/home")
      return "This is the home page. Shows an overview of recent activity and quick actions.";
    if (path.startsWith("/chat/new"))
      return "Chat starter page. User selects a subject and optionally past papers to begin a tutoring session.";
    if (path.startsWith("/chat/"))
      return "Active chat/tutoring session. Users ask questions and get AI responses. The sidebar shows chat history.";
    if (path.startsWith("/worksheets/new"))
      return "Worksheet generator. Users select a subject, topic, question type, difficulty, and generate exam-style worksheets.";
    if (path.startsWith("/worksheets/"))
      return "Worksheet viewer. Shows worksheet questions. User can write answers and submit for marking.";
    if (path.startsWith("/notes/new"))
      return "Notes generator page. Users select a subject and topic to generate AI study notes.";
    if (path.startsWith("/notes/"))
      return "Study note viewer. Displays AI-generated revision notes with full markdown formatting and LaTeX math.";
    if (path.startsWith("/exams/"))
      return "Exam detail and revision plan page. Shows countdown, plan, morning briefs, and debrief.";
    if (path === "/exams")
      return "Exams list page. Shows all upcoming exams with countdown timers.";
    if (path.startsWith("/flashcards/"))
      return "Flashcard study page. Shows cards one at a time. User can flip, rate recall quality, and review.";
    if (path === "/flashcards")
      return "Flashcard decks page. Manage flashcard decks - create, delete, and generate cards from notes or worksheets.";
    if (path === "/subjects")
      return "Manage subjects page. Create, rename, and delete subjects with their descriptions.";
    if (path === "/workspace")
      return "Revision workspace for active recall. Two modes: Text Recall (generate Q&A, hide answer, reconstruct from memory, AI checks accuracy) and Diagram Recall (generate diagram, label structures, AI checks). Has views for both text and diagram exercises side by side in Mixed mode.";
    if (path === "/tools")
      return "Tools page listing available study tools and utilities.";
    if (path === "/admin")
      return "Admin panel. Manage users: toggle admin status, change passwords, delete users, reset token usage.";
    return "Revisiapp - an AI-powered revision platform. Key features: tutoring chat, worksheets, revision notes, flashcards, exams with countdown, revision workspace with active recall. The sidebar shows subjects and their resources (chats, worksheets, notes, exercises).";
  } catch {
    return "Revisiapp - an AI-powered revision platform.";
  }
}

export default function usePageAgent() {
  const agentRef = useRef(null);
  const [status, setStatus] = useState("idle");
  const [activity, setActivity] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { PageAgent } = await import("page-agent");
      if (!mounted) return;

      const raw = localStorage.getItem("revisiapp_auth");
      let token = "";
      try {
        token = JSON.parse(raw || "{}").token || "";
      } catch {}

      const agent = new PageAgent({
        baseURL: `${BACKEND_URL}/api/ai`,
        model: "gpt-5.4-nano",
        apiKey: "dummy",
        language: "en-US",
        enablePanel: false,
        enableMask: false,
        maxSteps: 8,
        temperature: 0.0,
        customFetch: async (url, init) => {
          const headers = new Headers(init.headers);
          if (token) headers.set("Authorization", `Bearer ${token}`);
          return fetch(url, { ...init, headers });
        },
        instructions: {
          getPageInstructions: (url) => getRouteInstructions(url),
        },
      });

      agent.addEventListener("statuschange", () => {
        if (mounted) setStatus(agent.status);
      });

      agent.addEventListener("activity", (e) => {
        if (mounted) setActivity(e.detail);
      });

      agentRef.current = agent;
    }

    init();

    return () => {
      mounted = false;
      agentRef.current?.dispose();
      agentRef.current = null;
    };
  }, []);

  const execute = useCallback(async (task) => {
    if (!agentRef.current) throw new Error("Agent not initialised");
    setLastResult(null);
    const res = await agentRef.current.execute(task);
    setLastResult(res);
    return res;
  }, []);

  const reset = useCallback(() => {
    setActivity(null);
    setLastResult(null);
  }, []);

  return { status, activity, lastResult, execute, reset, agent: agentRef.current };
}
