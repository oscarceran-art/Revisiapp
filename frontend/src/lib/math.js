import katex from "katex";

export function renderMath(text) {
  if (!text) return text;

  let result = text;

  // Block math $$...$$
  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_, expr) => {
    try {
      return katex.renderToString(expr.trim(), { displayMode: true, throwOnError: false });
    } catch {
      return `<div class="text-red-500 text-xs">[Math error: ${expr.trim()}]</div>`;
    }
  });

  // Inline math $...$
  result = result.replace(/\$([^\s$][^$]*?[^\s$])\$/g, (_, expr) => {
    try {
      return katex.renderToString(expr.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return `<span class="text-red-500 text-xs">[Math error: ${expr.trim()}]</span>`;
    }
  });

  return result;
}
