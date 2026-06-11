import { useEffect, useRef, useState } from "react";
import { useTimer } from "@/context/TimerContext";
import {
  Play, Pause, ArrowClockwise, X, Minus, Hourglass, Timer, BatteryCharging,
  GearSix, ArrowsOut, ArrowsIn, SpeakerHigh, SpeakerSlash, Sun, Moon,
} from "@phosphor-icons/react";

const ACCENTS = {
  red:    { fg: "#ef4444", glow: "rgba(239,68,68,0.35)" },
  blue:   { fg: "#3b82f6", glow: "rgba(59,130,246,0.35)" },
  green:  { fg: "#10b981", glow: "rgba(16,185,129,0.35)" },
  amber:  { fg: "#f59e0b", glow: "rgba(245,158,11,0.35)" },
  purple: { fg: "#a855f7", glow: "rgba(168,85,247,0.35)" },
  pink:   { fg: "#ec4899", glow: "rgba(236,72,153,0.35)" },
};

const DESIGNS = ["digital", "flip", "ring", "minimal", "neon", "matrix"];

const PRESETS = [
  { label: "5m", seconds: 5 * 60 },
  { label: "10m", seconds: 10 * 60 },
  { label: "25m", seconds: 25 * 60 },
  { label: "45m", seconds: 45 * 60 },
  { label: "60m", seconds: 60 * 60 },
];

function fmtTime(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
function splitParts(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? [pad(h), pad(m), pad(s)] : [pad(m), pad(s)];
}

/* ---------- Designs ---------- */
function DigitalFace({ ms, size = 56, light, accent }) {
  return (
    <div className="text-center select-none">
      <div
        className="font-extrabold tabular-nums tracking-tight leading-none"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: `${size}px`,
          color: light ? "#0a0a0a" : "#fff",
        }}
      >
        {fmtTime(ms)}
      </div>
    </div>
  );
}

function MinimalFace({ ms, size = 56, light }) {
  return (
    <div className="text-center">
      <div
        className="font-extrabold tabular-nums"
        style={{
          fontFamily: "Nunito, system-ui, sans-serif",
          fontSize: `${size}px`,
          letterSpacing: "-0.04em",
          lineHeight: 1,
          color: light ? "#0a0a0a" : "#fff",
        }}
      >
        {fmtTime(ms)}
      </div>
    </div>
  );
}

function NeonFace({ ms, size = 56, accent }) {
  return (
    <div className="text-center">
      <div
        className="font-extrabold tabular-nums timer-neon"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: `${size}px`,
          color: ACCENTS[accent].fg,
          "--neon-c": ACCENTS[accent].glow,
          lineHeight: 1,
        }}
      >
        {fmtTime(ms)}
      </div>
    </div>
  );
}

function MatrixFace({ ms, size = 56, light, accent }) {
  // pixel/LED feel: tight-letter-spaced monospace with a subtle dot underline pattern via shadow
  return (
    <div className="text-center">
      <div
        className="font-black tabular-nums"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: `${size}px`,
          color: light ? "#0a0a0a" : ACCENTS[accent].fg,
          letterSpacing: "0.04em",
          lineHeight: 1,
          textShadow: light
            ? "0 1px 0 rgba(0,0,0,0.1)"
            : `0 0 2px ${ACCENTS[accent].fg}, 0 0 16px ${ACCENTS[accent].glow}`,
        }}
      >
        {fmtTime(ms).split("").map((ch, i) => (
          <span key={i} style={{ display: "inline-block", padding: "0 0.04em" }}>{ch}</span>
        ))}
      </div>
    </div>
  );
}

function RingFace({ ms, totalMs, size = 200, stroke = 8, light, accent }) {
  const safeTotal = totalMs > 0 ? totalMs : 1;
  const progress = Math.max(0, Math.min(1, 1 - ms / safeTotal));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - progress);
  const colorTrack = light ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.10)";
  const colorBar = ACCENTS[accent].fg;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={colorTrack} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={colorBar} strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.25s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="font-extrabold tabular-nums"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: `${Math.round(size * 0.22)}px`,
            color: light ? "#0a0a0a" : "#fff",
          }}
        >
          {fmtTime(ms)}
        </div>
      </div>
    </div>
  );
}

/* Proper FlipCard with real CSS card-flip on value change */
function FlipCard({ value, width, height, light }) {
  const [prev, setPrev] = useState(value);
  const [animKey, setAnimKey] = useState(0);
  useEffect(() => {
    if (value !== prev) {
      setAnimKey(k => k + 1);
      const t = setTimeout(() => setPrev(value), 900);
      return () => clearTimeout(t);
    }
  }, [value, prev]);

  const fontSize = Math.round(height * 0.78);
  return (
    <div className={`flip-card ${light ? "flip-light" : ""}`} style={{ width, height, fontSize }}>
      <div className="flip-static">
        <div className="flip-half flip-top"><span>{value}</span></div>
        <div className="flip-half flip-bottom"><span>{prev}</span></div>
        {value !== prev && (
          <>
            <div key={`a-${animKey}`} className="flip-anim"><span>{prev}</span></div>
            <div key={`b-${animKey}`} className="flip-anim-bottom"><span>{value}</span></div>
          </>
        )}
      </div>
    </div>
  );
}

function FlipFace({ ms, cardW = 50, cardH = 64, light }) {
  const parts = splitParts(ms);
  return (
    <div className="flex items-center justify-center gap-1.5">
      {parts.map((v, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <FlipCard value={v} width={cardW} height={cardH} light={light} />
          {i < parts.length - 1 && (
            <span className="font-extrabold tabular-nums opacity-30" style={{
              fontSize: cardH * 0.55,
              color: light ? "#0a0a0a" : "#fff",
              fontFamily: "'JetBrains Mono', monospace",
            }}>:</span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------- Picker dispatch ---------- */
function Face({ design, ms, totalMs, light, accent, scale }) {
  if (design === "flip") {
    const w = scale === "huge" ? 180 : scale === "med" ? 90 : 50;
    const h = scale === "huge" ? 240 : scale === "med" ? 120 : 64;
    return <FlipFace ms={ms} cardW={w} cardH={h} light={light} />;
  }
  if (design === "ring") {
    const sz = scale === "huge" ? 420 : scale === "med" ? 220 : 160;
    return <RingFace ms={ms} totalMs={totalMs} size={sz} stroke={scale === "huge" ? 14 : 8} light={light} accent={accent} />;
  }
  const size = scale === "huge" ? 240 : scale === "med" ? 96 : 52;
  if (design === "minimal") return <MinimalFace ms={ms} size={size} light={light} />;
  if (design === "neon")    return <NeonFace ms={ms} size={size} accent={accent} />;
  if (design === "matrix")  return <MatrixFace ms={ms} size={size} light={light} accent={accent} />;
  return <DigitalFace ms={ms} size={size} light={light} accent={accent} />;
}

/* ---------- Component ---------- */
export default function FloatingTimer() {
  const { state, start, pause, reset, setDesign, setTheme, setAccent, setSoundOn, setMode, setDuration, setOpen, setPosition } = useTimer();
  const [showOptions, setShowOptions] = useState(false);
  const [minimised, setMinimised] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const dragRef = useRef(null);
  const dragState = useRef(null);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragState.current) return;
      const { startX, startY } = dragState.current;
      const px = e.touches ? e.touches[0].clientX : e.clientX;
      const py = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = px - startX;
      const dy = py - startY;
      setPosition({
        x: Math.max(8, dragState.current.startRightPx - dx),
        y: Math.max(8, dragState.current.startBottomPx - dy),
      });
    };
    const onUp = () => { dragState.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [setPosition]);

  const startDrag = (e) => {
    const px = e.touches ? e.touches[0].clientX : e.clientX;
    const py = e.touches ? e.touches[0].clientY : e.clientY;
    dragState.current = {
      startX: px, startY: py,
      startRightPx: state.position.x,
      startBottomPx: state.position.y,
    };
  };

  if (!state.open) return null;

  const ms = state.mode === "stopwatch" ? state.elapsedMs : state.remainingMs;
  const totalMs = state.mode === "pomodoro"
    ? (state.pomodoroPhase === "work" ? state.durationSeconds
      : (state.pomodoroPhase === "long-break" ? state.pomodoroLongBreakSeconds : state.pomodoroBreakSeconds)) * 1000
    : state.durationSeconds * 1000;
  const progress = state.mode === "stopwatch" ? 0 : (totalMs > 0 ? 1 - (state.remainingMs / totalMs) : 0);

  const positionStyle = { right: `${state.position.x}px`, bottom: `${state.position.y}px` };
  const light = state.theme === "light";
  const accentFg = ACCENTS[state.accent].fg;
  const accentGlow = ACCENTS[state.accent].glow;

  const bgClass = light ? "bg-white text-black" : "bg-black text-white";
  const subTxt = light ? "text-black/55" : "text-white/65";
  const borderC = light ? "border-black/10" : "border-white/15";
  const hoverBg = light ? "hover:bg-black/[0.05]" : "hover:bg-white/10";
  const pillBg = light ? "bg-black/[0.05]" : "bg-white/5";
  const activeBg = light ? "bg-black text-white" : "bg-white text-black";

  /* ---------- Fullscreen ---------- */
  if (fullscreen) {
    const phaseLabel = state.mode === "pomodoro"
      ? (state.pomodoroPhase === "work" ? "Focus" : state.pomodoroPhase === "break" ? "Short break" : "Long break")
      : (state.mode === "stopwatch" ? "Stopwatch" : "Countdown");

    return (
      <div
        className={`fixed inset-0 z-[100] flex flex-col select-none overflow-hidden ${bgClass}`}
        style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
        data-testid="floating-timer-fullscreen"
      >
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[120vw] h-[60vh] rounded-full blur-3xl"
             style={{ background: `radial-gradient(closest-side, ${accentGlow}, transparent 70%)` }} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3"
             style={{ background: `linear-gradient(to top, ${accentGlow}, transparent)` }} />

        <div className="relative flex items-center justify-between px-6 py-5">
          <div className={`flex items-center gap-2 text-[11px] uppercase tracking-[0.32em] ${subTxt}`}>
            <Timer size={12} weight="fill" /> {phaseLabel}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowOptions(s => !s)}
              className={`px-3 py-2 rounded-full ${hoverBg} ${subTxt} text-[11px] flex items-center gap-1.5`}
              data-testid="fullscreen-timer-options-btn">
              <GearSix size={13} /> Settings
            </button>
            <button onClick={() => setFullscreen(false)}
              className={`px-3 py-2 rounded-full ${hoverBg} ${subTxt} text-[11px] flex items-center gap-1.5`}
              data-testid="fullscreen-exit-btn">
              <ArrowsIn size={13} /> Exit fullscreen
            </button>
          </div>
        </div>

        <div className="relative flex-1 flex items-center justify-center px-4">
          <Face design={state.design} ms={ms} totalMs={totalMs} light={light} accent={state.accent} scale="huge" />
        </div>

        {state.mode === "pomodoro" && (
          <div className="relative flex items-center justify-center gap-3 pb-3">
            {[0, 1, 2, 3].map(i => {
              const filled = i < (state.cyclesCompleted % 4 || (state.cyclesCompleted > 0 && state.pomodoroPhase === "long-break" ? 4 : 0));
              return <div key={i} className="w-3 h-3 rounded-full" style={{ background: filled ? accentFg : (light ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.15)") }} />;
            })}
          </div>
        )}

        {state.mode !== "stopwatch" && state.design !== "ring" && (
          <div className={`relative h-1.5 ${light ? "bg-black/10" : "bg-white/10"}`}>
            <div className="h-full transition-[width] duration-200" style={{ width: `${Math.min(100, progress * 100)}%`, background: accentFg }} />
          </div>
        )}

        <div className="relative px-6 py-8 flex items-center justify-center gap-4">
          <button onClick={reset} className={`w-14 h-14 rounded-full border ${borderC} ${hoverBg} flex items-center justify-center ${subTxt}`} data-testid="fullscreen-reset-btn" aria-label="Reset">
            <ArrowClockwise size={20} />
          </button>
          {state.running ? (
            <button onClick={pause} className={`w-20 h-20 rounded-full ${activeBg} flex items-center justify-center hover:scale-105 transition-transform`}
              style={{ boxShadow: `0 20px 50px ${accentGlow}` }}
              data-testid="fullscreen-pause-btn" aria-label="Pause">
              <Pause size={28} weight="fill" />
            </button>
          ) : (
            <button onClick={start} className={`w-20 h-20 rounded-full ${activeBg} flex items-center justify-center hover:scale-105 transition-transform`}
              style={{ boxShadow: `0 20px 50px ${accentGlow}` }}
              data-testid="fullscreen-start-btn" aria-label="Start">
              <Play size={28} weight="fill" />
            </button>
          )}
          <div className={`text-[11px] uppercase tracking-[0.32em] ${subTxt} w-14 text-center`}>
            {state.mode === "pomodoro" ? `${state.cyclesCompleted}/4` : state.mode}
          </div>
        </div>

        {showOptions && (
          <SettingsPanel className={`absolute top-16 right-6 w-[300px] border ${borderC} ${bgClass} rounded-2xl p-4 space-y-3 text-[11px] shadow-2xl`}
            state={state}
            setMode={setMode} setDesign={setDesign} setDuration={setDuration}
            setTheme={setTheme} setAccent={setAccent} setSoundOn={setSoundOn}
            light={light} pillBg={pillBg} hoverBg={hoverBg} subTxt={subTxt} activeBg={activeBg}
          />
        )}
      </div>
    );
  }

  /* ---------- Minimised pill ---------- */
  if (minimised) {
    return (
      <div
        style={{ ...positionStyle, fontFamily: "Nunito, system-ui, sans-serif" }}
        className={`fixed z-[60] ${bgClass} rounded-full shadow-2xl px-3.5 py-2 flex items-center gap-2 select-none border ${borderC}`}
        data-testid="floating-timer-mini"
      >
        <button onClick={() => setMinimised(false)} className="flex items-center gap-2" data-testid="timer-mini-expand">
          <Timer size={14} weight="fill" style={{ color: accentFg }} />
          <span className="text-sm font-extrabold tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmtTime(ms)}</span>
          {state.running && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accentFg }} />}
        </button>
        <button onClick={() => { setMinimised(false); setFullscreen(true); }} className={`p-1 rounded-full ${hoverBg} ${subTxt}`} aria-label="Fullscreen" data-testid="timer-mini-fullscreen">
          <ArrowsOut size={11} />
        </button>
      </div>
    );
  }

  /* ---------- Floating card ---------- */
  return (
    <div
      ref={dragRef}
      style={{ ...positionStyle, fontFamily: "Nunito, system-ui, sans-serif" }}
      className={`fixed z-[60] w-[280px] max-w-[calc(100vw-1rem)] sm:max-w-none ${bgClass} rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.35)] overflow-hidden select-none border ${borderC}`}
      data-testid="floating-timer"
    >
      <div onMouseDown={startDrag} onTouchStart={startDrag}
        className={`px-3 py-2 flex items-center justify-between cursor-move ${light ? "bg-black/[0.03]" : "bg-white/[0.04]"}`}>
        <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] ${subTxt}`}>
          <Timer size={11} weight="fill" style={{ color: accentFg }} /> Focus timer
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setShowOptions(s => !s)} className={`p-1 rounded-md ${hoverBg} ${subTxt}`} aria-label="Options" data-testid="timer-options-btn">
            <GearSix size={13} />
          </button>
          <button onClick={() => setFullscreen(true)} className={`p-1 rounded-md ${hoverBg} ${subTxt}`} aria-label="Fullscreen" data-testid="timer-fullscreen-btn">
            <ArrowsOut size={13} />
          </button>
          <button onClick={() => setMinimised(true)} className={`p-1 rounded-md ${hoverBg} ${subTxt}`} aria-label="Minimise" data-testid="timer-minimise-btn">
            <Minus size={13} weight="bold" />
          </button>
          <button onClick={() => setOpen(false)} className={`p-1 rounded-md ${hoverBg} ${subTxt}`} aria-label="Close" data-testid="timer-close-btn">
            <X size={13} weight="bold" />
          </button>
        </div>
      </div>

      <div className="px-5 py-6 flex items-center justify-center">
        <Face design={state.design} ms={ms} totalMs={totalMs} light={light} accent={state.accent} scale="small" />
      </div>

      {state.mode === "pomodoro" && (
        <div className="flex items-center justify-center gap-1.5 pb-2">
          {[0, 1, 2, 3].map(i => {
            const filled = i < (state.cyclesCompleted % 4 || (state.cyclesCompleted > 0 && state.pomodoroPhase === "long-break" ? 4 : 0));
            return <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: filled ? accentFg : (light ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.2)") }} />;
          })}
        </div>
      )}

      {state.mode !== "stopwatch" && state.design !== "ring" && (
        <div className={`h-1 ${light ? "bg-black/10" : "bg-white/10"}`}>
          <div className="h-full transition-[width] duration-200" style={{ width: `${Math.min(100, progress * 100)}%`, background: accentFg }} />
        </div>
      )}

      <div className={`px-4 py-3 flex items-center justify-center gap-2 ${light ? "bg-black/[0.03]" : "bg-white/[0.04]"}`}>
        <button onClick={reset} className={`p-2 rounded-full ${hoverBg} ${subTxt}`} aria-label="Reset" data-testid="timer-reset-btn">
          <ArrowClockwise size={16} />
        </button>
        {state.running ? (
          <button onClick={pause} className={`w-11 h-11 rounded-full ${activeBg} flex items-center justify-center hover:scale-105 transition-transform`} data-testid="timer-pause-btn" aria-label="Pause">
            <Pause size={18} weight="fill" />
          </button>
        ) : (
          <button onClick={start} className={`w-11 h-11 rounded-full ${activeBg} flex items-center justify-center hover:scale-105 transition-transform`} data-testid="timer-start-btn" aria-label="Start">
            <Play size={18} weight="fill" />
          </button>
        )}
        <div className={`text-[10px] uppercase tracking-[0.22em] ${subTxt} ml-1`}>
          {state.mode === "pomodoro" ? `${state.cyclesCompleted}/4` : state.mode}
        </div>
      </div>

      {showOptions && (
        <SettingsPanel className={`px-4 py-3 border-t ${borderC} space-y-3 text-[11px] max-h-[50vh] overflow-y-auto`}
          state={state}
          setMode={setMode} setDesign={setDesign} setDuration={setDuration}
          setTheme={setTheme} setAccent={setAccent} setSoundOn={setSoundOn}
          light={light} pillBg={pillBg} hoverBg={hoverBg} subTxt={subTxt} activeBg={activeBg}
        />
      )}
    </div>
  );
}

/* ---------- Settings panel (shared) ---------- */
function SettingsPanel({ className, state, setMode, setDesign, setDuration, setTheme, setAccent, setSoundOn, light, pillBg, hoverBg, subTxt, activeBg }) {
  return (
    <div className={className} data-testid="timer-settings-panel">
      {/* Mode */}
      <div>
        <div className={`uppercase tracking-[0.22em] ${subTxt} mb-1.5`}>Mode</div>
        <div className="grid grid-cols-3 gap-1">
          {[
            { id: "countdown", label: "Countdown", icon: Hourglass },
            { id: "stopwatch", label: "Stopwatch", icon: Timer },
            { id: "pomodoro",  label: "Pomodoro",  icon: BatteryCharging },
          ].map(m => {
            const Icon = m.icon;
            const active = state.mode === m.id;
            return (
              <button key={m.id} onClick={() => setMode(m.id)} data-testid={`timer-mode-${m.id}`}
                className={`px-2 py-1.5 rounded-lg flex flex-col items-center gap-0.5 transition-colors ${active ? activeBg : `${pillBg} ${hoverBg}`}`}>
                <Icon size={12} />
                <span className="text-[10px] font-bold">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Design */}
      <div>
        <div className={`uppercase tracking-[0.22em] ${subTxt} mb-1.5`}>Design</div>
        <div className="grid grid-cols-3 gap-1">
          {DESIGNS.map(d => {
            const active = state.design === d;
            return (
              <button key={d} onClick={() => setDesign(d)} data-testid={`timer-design-${d}`}
                className={`px-2 py-1.5 rounded-lg capitalize text-[10px] font-bold transition-colors ${active ? activeBg : `${pillBg} ${hoverBg}`}`}>
                {d}
              </button>
            );
          })}
        </div>
      </div>

      {/* Length */}
      {state.mode !== "stopwatch" && (
        <div>
          <div className={`uppercase tracking-[0.22em] ${subTxt} mb-1.5`}>Length</div>
          <div className="grid grid-cols-5 gap-1">
            {PRESETS.map(p => {
              const active = state.durationSeconds === p.seconds;
              return (
                <button key={p.label} onClick={() => setDuration(p.seconds)} data-testid={`timer-preset-${p.label}`}
                  className={`px-1 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${active ? activeBg : `${pillBg} ${hoverBg}`}`}>
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Theme + sound */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className={`uppercase tracking-[0.22em] ${subTxt} mb-1.5`}>Theme</div>
          <div className="grid grid-cols-2 gap-1">
            {[{ id: "dark", icon: Moon }, { id: "light", icon: Sun }].map(t => {
              const Icon = t.icon;
              const active = state.theme === t.id;
              return (
                <button key={t.id} onClick={() => setTheme(t.id)} data-testid={`timer-theme-${t.id}`}
                  className={`px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors ${active ? activeBg : `${pillBg} ${hoverBg}`}`}>
                  <Icon size={11} weight={active ? "fill" : "regular"} />
                  <span className="text-[10px] capitalize font-bold">{t.id}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <div className={`uppercase tracking-[0.22em] ${subTxt} mb-1.5`}>Sound</div>
          <button onClick={() => setSoundOn(!state.soundOn)} data-testid="timer-sound-toggle"
            className={`w-full px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors ${state.soundOn ? activeBg : `${pillBg} ${hoverBg}`}`}>
            {state.soundOn ? <SpeakerHigh size={11} weight="fill" /> : <SpeakerSlash size={11} />}
            <span className="text-[10px] font-bold">{state.soundOn ? "Chime on" : "Muted"}</span>
          </button>
        </div>
      </div>

      {/* Accent */}
      <div>
        <div className={`uppercase tracking-[0.22em] ${subTxt} mb-1.5`}>Accent</div>
        <div className="flex items-center gap-1.5">
          {Object.entries(ACCENTS).map(([key, v]) => {
            const active = state.accent === key;
            return (
              <button key={key} onClick={() => setAccent(key)} data-testid={`timer-accent-${key}`}
                className={`w-6 h-6 rounded-full transition-transform ${active ? "scale-110 ring-2 ring-white/40 ring-offset-2 ring-offset-transparent" : ""}`}
                style={{ background: v.fg }}
                aria-label={key} />
            );
          })}
        </div>
      </div>
    </div>
  );
}
