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

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Building your cheat sheet…</div>;
  if (!cs) return null;

  return (
    <div className="min-h-screen pt-20 md:pt-12 px-4 sm:px-6 md:px-10 pb-16" data-testid="cheat-sheet-page">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate(`/worksheets/${id}`)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 mb-6">
          <ArrowLeft size={14} weight="bold" /> Back to paper
        </button>

        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="bg-foreground text-primary-foreground px-6 sm:px-10 py-8 sm:py-10">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-primary-foreground/60">
              <Target size={11} weight="fill" /> focus session
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl mt-2 font-extrabold text-primary-foreground">{cs.title}</h1>
            {cs.intro && <p className="text-primary-foreground/75 mt-4 text-sm sm:text-base leading-relaxed">{cs.intro}</p>}
          </div>

          <div className="px-6 sm:px-10 py-8 sm:py-10 space-y-8">
            {cs.sections.map((s, i) => (
              <div key={i} data-testid={`cs-section-${i}`}>
                <h2 className="text-xl sm:text-2xl font-extrabold mb-3">{s.heading}</h2>
                <ul className="space-y-2.5 list-disc pl-6 text-[15px] sm:text-base leading-relaxed text-foreground/85">
                  {s.bullets.map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              </div>
            ))}

            {cs.tips && cs.tips.length > 0 && (
              <div className="glass-card rounded-2xl p-5 sm:p-6">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
                  <Lightbulb size={12} weight="fill" /> Quick tips
                </div>
                <ul className="space-y-2 text-[15px] leading-relaxed">
                  {cs.tips.map((t, i) => (
                    <li key={i} className="flex gap-2.5"><span className="text-muted-foreground">→</span><span>{t}</span></li>
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
