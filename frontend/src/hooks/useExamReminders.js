import { useEffect, useRef } from "react";
import { useSidebarData } from "@/context/SidebarContext";
import { getMorningBrief } from "@/lib/api";

const NOTIFY_BEFORE_MINUTES = 240; // 4 hours before exam
const STORAGE_KEY = "examNotified.v1";

function loadFired() {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); } catch { return new Set(); }
}
function persistFired(set) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
}

async function fireNotification(exam) {
  try {
    const brief = await getMorningBrief(exam.id).catch(() => null);
    const headline = brief?.headline || `${exam.name} — you've got this`;
    const topics = brief?.key_topics?.length ? `Final glance: ${brief.key_topics.slice(0, 3).join(" · ")}` : "";
    const motivation = brief?.motivation || "Trust your prep — focus on the question in front of you.";
    const body = [topics, motivation].filter(Boolean).join("\n");
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(headline, { body, tag: `exam-${exam.id}`, requireInteraction: true });
    }
  } catch (e) {
    // swallow — best effort
  }
}

/** Mounted once at app root. Schedules a browser notification ~4h before each upcoming exam. */
export default function useExamReminders() {
  const { exams } = useSidebarData();
  const timersRef = useRef([]);

  useEffect(() => {
    // Clear any prior timers
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];

    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    if (!exams || exams.length === 0) return;

    const fired = loadFired();
    const now = Date.now();

    exams.forEach(e => {
      if (!e.exam_date) return;
      const ts = Date.parse(e.exam_date);
      if (!ts || ts < now) return;
      const fireAt = ts - NOTIFY_BEFORE_MINUTES * 60 * 1000;
      const delay = fireAt - now;
      const key = `${e.id}-${ts}`;
      if (fired.has(key)) return;

      if (delay <= 0) {
        // Already past the window. If exam itself hasn't started, fire now once.
        fireNotification(e).then(() => { fired.add(key); persistFired(fired); });
      } else if (delay < 24 * 60 * 60 * 1000 * 2) {
        // Within ~2 days; safe to setTimeout (browser will keep tab timers alive while open)
        const t = setTimeout(() => {
          fireNotification(e);
          const f2 = loadFired();
          f2.add(key);
          persistFired(f2);
        }, delay);
        timersRef.current.push(t);
      }
    });

    return () => { timersRef.current.forEach(t => clearTimeout(t)); };
  }, [exams]);
}
