import { useState, useRef, useEffect, useCallback } from "react";
import {
  Pencil, Eraser, Square, Circle, TextT, Sticker, Hand,
  MagnifyingGlassMinus, MagnifyingGlassPlus, ArrowClockwise,
} from "@phosphor-icons/react";

const TOOLS = [
  { id: "select", icon: Hand, label: "Select" },
  { id: "pen", icon: Pencil, label: "Pen" },
  { id: "highlighter", icon: Pencil, label: "Highlighter" },
  { id: "eraser", icon: Eraser, label: "Eraser" },
  { id: "rect", icon: Square, label: "Rectangle" },
  { id: "circle", icon: Circle, label: "Circle" },
  { id: "line", icon: Pencil, label: "Line" },
  { id: "text", icon: TextT, label: "Text" },
  { id: "sticky", icon: Sticker, label: "Sticky note" },
];

const COLORS = ["#000000", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#ffffff"];

export default function WhiteboardCanvas({ onCanvasRef }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Canvas state
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(2);

  // Transform
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const [zoom, setZoom] = useState(1);

  // Drawing state
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef(null);
  const shapeStartRef = useRef(null);
  const [stickyNotes, setStickyNotes] = useState([]);
  const [textBoxes, setTextBoxes] = useState([]);
  const [activeTextId, setActiveTextId] = useState(null);
  const [textInput, setTextInput] = useState("");
  const textInputPosRef = useRef({ x: 0, y: 0 });

  const getCanvasPos = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const t = transformRef.current;
    return {
      x: (clientX - rect.left - t.x) / t.scale,
      y: (clientY - rect.top - t.y) / t.scale,
    };
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const t = transformRef.current;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.scale(t.scale, t.scale);

    // Grid
    const gridSize = 40;
    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    ctx.lineWidth = 1 / t.scale;
    const startX = -t.x / t.scale;
    const startY = -t.y / t.scale;
    const endX = startX + w / t.scale;
    const endY = startY + h / t.scale;
    for (let x = Math.floor(startX / gridSize) * gridSize; x < endX + gridSize; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY - 100);
      ctx.lineTo(x, endY + 100);
      ctx.stroke();
    }
    for (let y = Math.floor(startY / gridSize) * gridSize; y < endY + gridSize; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX - 100, y);
      ctx.lineTo(endX + 100, y);
      ctx.stroke();
    }

    // Sticky notes
    stickyNotes.forEach(sn => {
      ctx.fillStyle = sn.color || "#fef08a";
      ctx.shadowColor = "rgba(0,0,0,0.1)";
      ctx.shadowBlur = 8;
      ctx.fillRect(sn.x, sn.y, sn.w, sn.h);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#1a1a1a";
      ctx.font = "14px Nunito, sans-serif";
      const lines = (sn.text || "").split("\n");
      lines.forEach((line, i) => {
        ctx.fillText(line, sn.x + 8, sn.y + 20 + i * 18);
      });
    });

    // Text boxes
    textBoxes.forEach(tb => {
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.lineWidth = 1;
      ctx.strokeRect(tb.x, tb.y, tb.w, tb.h);
      ctx.fillStyle = "#1a1a1a";
      ctx.font = "14px Nunito, sans-serif";
      const lines = (tb.text || "").split("\n");
      lines.forEach((line, i) => {
        ctx.fillText(line, tb.x + 4, tb.y + 16 + i * 18);
      });
    });

    ctx.restore();
  }, [stickyNotes, textBoxes]);

  // Resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      redraw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [redraw]);

  // Expose canvas ref
  useEffect(() => {
    if (onCanvasRef) onCanvasRef(canvasRef);
  }, [onCanvasRef]);

  // Pan
  const panningRef = useRef(false);
  const panStartRef = useRef(null);

  const onMouseDown = useCallback((e) => {
    const pos = getCanvasPos(e);
    if (tool === "select") {
      panningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY, ...transformRef.current };
      return;
    }
    if (tool === "text") {
      const id = Date.now().toString();
      textInputPosRef.current = pos;
      setActiveTextId(id);
      setTextInput("");
      return;
    }
    if (tool === "sticky") {
      setStickyNotes(prev => [...prev, {
        id: Date.now().toString(),
        x: pos.x, y: pos.y, w: 160, h: 80,
        text: "Type here...",
        color: "#fef08a",
      }]);
      return;
    }
    isDrawingRef.current = true;
    lastPosRef.current = pos;
    if (["rect", "circle", "line"].includes(tool)) {
      shapeStartRef.current = pos;
    }
  }, [tool, getCanvasPos]);

  const onMouseMove = useCallback((e) => {
    if (panningRef.current && tool === "select") {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      transformRef.current = {
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
        scale: panStartRef.current.scale,
      };
      setZoom(transformRef.current.scale);
      redraw();
      return;
    }
    if (!isDrawingRef.current || !lastPosRef.current) return;
    const pos = getCanvasPos(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const t = transformRef.current;

    if (["rect", "circle", "line"].includes(tool)) {
      redraw();
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.scale(t.scale, t.scale);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.fillStyle = color + "20";
      const sx = shapeStartRef.current.x;
      const sy = shapeStartRef.current.y;
      if (tool === "rect") {
        ctx.fillRect(sx, sy, pos.x - sx, pos.y - sy);
        ctx.strokeRect(sx, sy, pos.x - sx, pos.y - sy);
      } else if (tool === "circle") {
        const rx = Math.abs(pos.x - sx) / 2;
        const ry = Math.abs(pos.y - sy) / 2;
        const cx = sx + (pos.x - sx) / 2;
        const cy = sy + (pos.y - sy) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (tool === "line") {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.scale(t.scale, t.scale);
    ctx.lineWidth = tool === "highlighter" ? 12 : tool === "eraser" ? 20 : lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : tool === "highlighter" ? color + "60" : color;
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.restore();
    lastPosRef.current = pos;
  }, [tool, color, lineWidth, getCanvasPos, redraw]);

  const onMouseUp = useCallback(() => {
    if (panningRef.current) panningRef.current = false;
    isDrawingRef.current = false;
    shapeStartRef.current = null;
    lastPosRef.current = null;
  }, []);

  // Touch support
  const onTouchStart = useCallback((e) => {
    e.preventDefault();
    const touch = e.touches[0];
    onMouseDown({ clientX: touch.clientX, clientY: touch.clientY, touches: e.touches });
  }, [onMouseDown]);

  const onTouchMove = useCallback((e) => {
    e.preventDefault();
    const touch = e.touches[0];
    onMouseMove({ clientX: touch.clientX, clientY: touch.clientY, touches: e.touches });
  }, [onMouseMove]);

  const onTouchEnd = useCallback((e) => {
    e.preventDefault();
    onMouseUp();
  }, [onMouseUp]);

  // Keyboard for text input
  useEffect(() => {
    if (!activeTextId) return;
    const handler = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        setTextBoxes(prev => [...prev, {
          id: activeTextId,
          x: textInputPosRef.current.x,
          y: textInputPosRef.current.y,
          w: 200, h: 60,
          text: textInput,
        }]);
        setActiveTextId(null);
        setTextInput("");
        redraw();
      } else if (e.key === "Escape") {
        setActiveTextId(null);
        setTextInput("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeTextId, textInput, redraw]);

  // Zoom
  const handleZoomIn = () => {
    const t = transformRef.current;
    const newScale = Math.min(5, t.scale * 1.2);
    transformRef.current = { ...t, scale: newScale };
    setZoom(newScale);
    redraw();
  };
  const handleZoomOut = () => {
    const t = transformRef.current;
    const newScale = Math.max(0.2, t.scale / 1.2);
    transformRef.current = { ...t, scale: newScale };
    setZoom(newScale);
    redraw();
  };
  const handleReset = () => {
    transformRef.current = { x: 0, y: 0, scale: 1 };
    setZoom(1);
    redraw();
  };

  // Wheel zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const t = transformRef.current;
      const newScale = Math.max(0.2, Math.min(5, t.scale * delta));
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      transformRef.current = {
        x: mx - (mx - t.x) * (newScale / t.scale),
        y: my - (my - t.y) * (newScale / t.scale),
        scale: newScale,
      };
      setZoom(newScale);
      redraw();
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [redraw]);

  // Redraw on state changes
  useEffect(() => { redraw(); }, [stickyNotes, textBoxes, redraw]);

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      {/* Toolbar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-white/90 backdrop-blur-sm border border-black/10 rounded-2xl px-2 py-1.5 flex items-center gap-0.5 shadow-lg">
        {TOOLS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={t.label}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${tool === t.id ? "bg-black text-white" : "hover:bg-black/[0.05] text-black/60"}`}
            >
              <Icon size={16} weight={tool === t.id ? "fill" : "regular"} />
            </button>
          );
        })}
        <div className="w-px h-6 bg-black/10 mx-1" />
        {COLORS.map(c => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-5 h-5 rounded-full border-2 transition-transform ${color === c ? "scale-125 border-black" : "border-transparent"}`}
            style={{ background: c }}
          />
        ))}
        <div className="w-px h-6 bg-black/10 mx-1" />
        <input
          type="range"
          min={1}
          max={10}
          value={lineWidth}
          onChange={e => setLineWidth(Number(e.target.value))}
          className="w-16 accent-black"
          title="Line width"
        />
        <div className="w-px h-6 bg-black/10 mx-1" />
        <button onClick={handleZoomOut} className="w-7 h-7 rounded-lg hover:bg-black/[0.05] flex items-center justify-center text-black/60" title="Zoom out">
          <MagnifyingGlassMinus size={14} />
        </button>
        <span className="text-[11px] font-bold text-black/60 w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
        <button onClick={handleZoomIn} className="w-7 h-7 rounded-lg hover:bg-black/[0.05] flex items-center justify-center text-black/60" title="Zoom in">
          <MagnifyingGlassPlus size={14} />
        </button>
        <button onClick={handleReset} className="w-7 h-7 rounded-lg hover:bg-black/[0.05] flex items-center justify-center text-black/60" title="Reset view">
          <ArrowClockwise size={14} />
        </button>
      </div>

      {/* Text input popup */}
      {activeTextId && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-white border border-black/20 rounded-2xl p-4 shadow-2xl">
          <div className="text-[11px] uppercase tracking-[0.22em] text-black/50 mb-2">Enter text</div>
          <input
            autoFocus
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) {
              setTextBoxes(prev => [...prev, {
                id: activeTextId,
                x: textInputPosRef.current.x,
                y: textInputPosRef.current.y,
                w: 200, h: 60,
                text: textInput,
              }]);
              setActiveTextId(null);
              setTextInput("");
              redraw();
            }}}
            placeholder="Type and press Enter"
            className="border border-black/15 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-black w-64"
          />
          <div className="text-[10px] text-black/40 mt-1.5">Press Enter to place · Escape to cancel</div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="w-full h-full bg-white cursor-crosshair"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      />
    </div>
  );
}
