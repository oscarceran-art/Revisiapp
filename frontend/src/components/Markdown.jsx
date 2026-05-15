// Tiny markdown-ish renderer: handles headings, bold, italics, code, lists, line breaks.
// Avoids adding a heavy markdown dependency.
import React from "react";

function inline(text) {
  // Escape HTML
  let t = text
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
  const lines = text.split(/\n/);
  const blocks = [];
  let listBuf = [];
  let listType = null;

  const flushList = () => {
    if (!listBuf.length) return;
    const Tag = listType === "ol" ? "ol" : "ul";
    blocks.push(
      <Tag key={`list-${blocks.length}`}>
        {listBuf.map((item, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: inline(item) }} />
        ))}
      </Tag>
    );
    listBuf = [];
    listType = null;
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (/^\s*$/.test(line)) { flushList(); return; }
    let m;
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
      flushList();
      const level = m[1].length;
      const H = `h${level}`;
      blocks.push(React.createElement(H, { key: `h-${i}`, dangerouslySetInnerHTML: { __html: inline(m[2]) } }));
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
    blocks.push(<p key={`p-${i}`} dangerouslySetInnerHTML={{ __html: inline(line) }} />);
  });
  flushList();
  return <div className="prose-chat">{blocks}</div>;
}
