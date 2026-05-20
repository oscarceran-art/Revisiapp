import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const TimerContext = createContext(null);

const STORAGE_KEY = "floatingTimer.v2";

const DEFAULT_STATE = {
  open: false,
  design: "digital",           // digital | flip | ring | minimal | neon | matrix
  theme: "dark",               // dark | light
  accent: "red",               // red | blue | green | amber | purple | pink
  soundOn: true,
  mode: "countdown",           // countdown | stopwatch | pomodoro
  durationSeconds: 25 * 60,
  pomodoroBreakSeconds: 5 * 60,
  pomodoroLongBreakSeconds: 15 * 60,
  pomodoroPhase: "work",       // work | break | long-break
  cyclesCompleted: 0,
  running: false,
  remainingMs: 25 * 60 * 1000,
  elapsedMs: 0,
  position: { x: 24, y: 96 },
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed, running: false };
  } catch { return DEFAULT_STATE; }
}

function playChime(accent) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const notes = accent === "blue" ? [659, 880] : accent === "green" ? [523, 784] : accent === "amber" ? [698, 880] : [880, 660, 988];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.18);
      gain.gain.linearRampToValueAtTime(0.18, now + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.18);
      osc.stop(now + i * 0.18 + 0.55);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch { /* ignore */ }
}

export function TimerProvider({ children }) {
  const [state, setState] = useState(loadState);
  const tickRef = useRef(null);
  const lastTickRef = useRef(Date.now());

  useEffect(() => {
    try {
      const { running, ...rest } = state; // eslint-disable-line no-unused-vars
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
    } catch { /* ignore */ }
  }, [state]);

  useEffect(() => {
    if (!state.running) {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
      return;
    }
    lastTickRef.current = Date.now();
    tickRef.current = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      setState(s => {
        if (s.mode === "stopwatch") return { ...s, elapsedMs: s.elapsedMs + delta };
        const rem = s.remainingMs - delta;
        if (rem > 0) return { ...s, remainingMs: rem };
        // Completed
        if (s.soundOn) playChime(s.accent);
        if (s.mode === "pomodoro") {
          let phase = s.pomodoroPhase;
          let cycles = s.cyclesCompleted;
          let next;
          if (phase === "work") {
            cycles += 1;
            phase = (cycles % 4 === 0) ? "long-break" : "break";
            next = (phase === "long-break" ? s.pomodoroLongBreakSeconds : s.pomodoroBreakSeconds) * 1000;
          } else {
            phase = "work";
            next = s.durationSeconds * 1000;
          }
          try {
            if (typeof window !== "undefined" && window.Notification && Notification.permission === "granted") {
              new Notification("Pomodoro", { body: phase === "work" ? "Back to work — focus session." : (phase === "long-break" ? "Long break — recharge." : "Short break — stretch & breathe.") });
            }
          } catch { /* ignore */ }
          return { ...s, pomodoroPhase: phase, cyclesCompleted: cycles, remainingMs: next, running: true };
        }
        try {
          if (typeof window !== "undefined" && window.Notification && Notification.permission === "granted") {
            new Notification("Timer done", { body: "Your countdown has finished." });
          }
        } catch { /* ignore */ }
        return { ...s, running: false, remainingMs: 0 };
      });
    }, 250);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [state.running, state.mode]);

  const start = useCallback(() => setState(s => ({ ...s, running: true, open: true })), []);
  const pause = useCallback(() => setState(s => ({ ...s, running: false })), []);
  const reset = useCallback(() => setState(s => ({
    ...s,
    running: false,
    remainingMs: s.durationSeconds * 1000,
    elapsedMs: 0,
    pomodoroPhase: "work",
    cyclesCompleted: 0,
  })), []);

  const setDesign = useCallback((design) => setState(s => ({ ...s, design })), []);
  const setTheme = useCallback((theme) => setState(s => ({ ...s, theme })), []);
  const setAccent = useCallback((accent) => setState(s => ({ ...s, accent })), []);
  const setSoundOn = useCallback((soundOn) => setState(s => ({ ...s, soundOn })), []);
  const setMode = useCallback((mode) => setState(s => ({
    ...s,
    mode,
    running: false,
    remainingMs: s.durationSeconds * 1000,
    elapsedMs: 0,
    pomodoroPhase: "work",
    cyclesCompleted: 0,
  })), []);
  const setDuration = useCallback((seconds) => setState(s => ({
    ...s,
    durationSeconds: seconds,
    remainingMs: s.running && s.mode !== "stopwatch" ? s.remainingMs : seconds * 1000,
  })), []);
  const setOpen = useCallback((open) => setState(s => ({ ...s, open })), []);
  const setPosition = useCallback((position) => setState(s => ({ ...s, position })), []);

  return (
    <TimerContext.Provider value={{
      state, start, pause, reset,
      setDesign, setTheme, setAccent, setSoundOn,
      setMode, setDuration, setOpen, setPosition,
    }}>
      {children}
    </TimerContext.Provider>
  );
}

export const useTimer = () => {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used within TimerProvider");
  return ctx;
};
