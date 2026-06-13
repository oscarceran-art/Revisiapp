import React from "react";
import katex from "katex";

function inline(text) {
  let t = text;
  // If this text came from block math processing, keep it as-is
  // Escape HTML first
  t = t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // Code
  t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Bold
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Italics
  t = t.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return t;
}

export default function Markdown({ text }) {
  if (!text) return null;

  // First render all math to safe placeholders
  const mathBlocks = [];
  let processed = text;

  // Block math $$...$$ and \[...\]
  processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_, expr) => {
    const idx = mathBlocks.length;
    try {
      const html = katex.renderToString(expr.trim(), { displayMode: true, throwOnError: false });
      mathBlocks.push(html);
    } catch {
      mathBlocks.push(`<div class="text-red-500 text-xs">[Math error: ${expr.trim()}]</div>`);
    }
    return `\nMATHBLOCK${idx}\n`;
  });

  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_, expr) => {
    const idx = mathBlocks.length;
    try {
      const html = katex.renderToString(expr.trim(), { displayMode: true, throwOnError: false });
      mathBlocks.push(html);
    } catch {
      mathBlocks.push(`<div class="text-red-500 text-xs">[Math error: ${expr.trim()}]</div>`);
    }
    return `\nMATHBLOCK${idx}\n`;
  });

  // Inline math $...$ and \(...\)
  processed = processed.replace(/\$([^\s$][^$]*?[^\s$])\$/g, (_, expr) => {
    const idx = mathBlocks.length;
    try {
      const html = katex.renderToString(expr.trim(), { displayMode: false, throwOnError: false });
      mathBlocks.push(html);
    } catch {
      mathBlocks.push(`<span class="text-red-500 text-xs">[Math error: ${expr.trim()}]</span>`);
    }
    return `MATHINLINE${idx}`;
  });

  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_, expr) => {
    const idx = mathBlocks.length;
    try {
      const html = katex.renderToString(expr.trim(), { displayMode: false, throwOnError: false });
      mathBlocks.push(html);
    } catch {
      mathBlocks.push(`<span class="text-red-500 text-xs">[Math error: ${expr.trim()}]</span>`);
    }
    return `MATHINLINE${idx}`;
  });

  const lines = processed.split(/\n/);
  const blocks = [];
  let listBuf = [];
  let listType = null;

  const flushList = () => {
    if (!listBuf.length) return;
    const Tag = listType === "ol" ? "ol" : "ul";
    blocks.push(
      <Tag key={`list-${blocks.length}`}>
        {listBuf.map((item, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: restoreMath(inline(item), mathBlocks) }} />
        ))}
      </Tag>
    );
    listBuf = [];
    listType = null;
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();

    // Restore block math lines
    const trimmed = line.trim();
    const bm = trimmed.match(/^MATHBLOCK(\d+)$/);
    if (bm) {
      flushList();
      blocks.push(<div key={`m-${i}`} dangerouslySetInnerHTML={{ __html: mathBlocks[parseInt(bm[1])] }} />);
      return;
    }

    if (/^\s*$/.test(line)) { flushList(); return; }
    let m;
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
      flushList();
      const level = m[1].length;
      const H = `h${level}`;
      blocks.push(React.createElement(H, { key: `h-${i}`, dangerouslySetInnerHTML: { __html: restoreMath(inline(m[2]), mathBlocks) } }));
      return;
    }
    if ((m = line.match(/^\s*[-*]\s+(.*)$/))) {
      if (listType !== "ul") flushList();
      listType = "ul";
      listBuf.push(m[1]);
      return;
    }
    if ((m = line.match(/^\s*\d+\.\s+(.*)$/))) {
      if (listType !== "ol") flushList();
      listType = "ol";
      listBuf.push(m[1]);
      return;
    }
    flushList();
    blocks.push(<p key={`p-${i}`} dangerouslySetInnerHTML={{ __html: restoreMath(inline(line), mathBlocks) }} />);
  });
  flushList();
  return <div className="prose-chat">{blocks}</div>;
}

function restoreMath(html, mathBlocks) {
  // Replace MATHINLINE0, MATHINLINE1 etc. with rendered math
  return html.replace(/MATHINLINE(\d+)/g, (_, idx) => mathBlocks[parseInt(idx)] || "");
}
