import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Lightbulb, Target } from "@phosphor-icons/react";
import { generateCheatSheet, getCheatSheet } from "@/lib/api";

export default function CheatSheetPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cs, setCs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        let data;
        try { data = await getCheatSheet(id); }
        catch { data = await generateCheatSheet(id); }
        setCs(data);
      } catch (e) {
        toast.error(e?.response?.data?.detail || "Couldn't load cheat sheet");
        navigate(`/worksheets/${id}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-black/40">Building your cheat sheet…</div>;
  if (!cs) return null;

  return (
    <div className="min-h-screen pt-20 md:pt-12 px-4 sm:px-6 md:px-10 pb-16" data-testid="cheat-sheet-page">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate(`/worksheets/${id}`)} className="text-sm text-black/55 hover:text-black flex items-center gap-1.5 mb-6">
          <ArrowLeft size={14} weight="bold" /> Back to paper
        </button>

        <div className="bg-white border border-black/10 rounded-3xl overflow-hidden">
          <div className="bg-black text-white px-6 sm:px-10 py-8 sm:py-10">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-white/60">
              <Target size={11} weight="fill" /> focus session
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl mt-2 font-extrabold text-white">{cs.title}</h1>
            {cs.intro && <p className="text-white/75 mt-4 text-sm sm:text-base leading-relaxed">{cs.intro}</p>}
          </div>

          <div className="px-6 sm:px-10 py-8 sm:py-10 space-y-8">
            {cs.sections.map((s, i) => (
              <div key={i} data-testid={`cs-section-${i}`}>
                <h2 className="text-xl sm:text-2xl font-extrabold mb-3">{s.heading}</h2>
                <ul className="space-y-2.5 list-disc pl-6 text-[15px] sm:text-base leading-relaxed text-black/85">
                  {s.bullets.map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              </div>
            ))}

            {cs.tips && cs.tips.length > 0 && (
              <div className="bg-[#FAF8F5] rounded-2xl p-5 sm:p-6 border border-black/10">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-black/55 mb-3">
                  <Lightbulb size={12} weight="fill" /> Quick tips
                </div>
                <ul className="space-y-2 text-[15px] leading-relaxed">
                  {cs.tips.map((t, i) => (
                    <li key={i} className="flex gap-2.5"><span className="text-black/40">→</span><span>{t}</span></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
