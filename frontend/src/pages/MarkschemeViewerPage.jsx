import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "@phosphor-icons/react";
import { getWorksheet } from "@/lib/api";

export default function MarkschemeViewerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ws, setWs] = useState(null);

  useEffect(() => { getWorksheet(id).then(setWs).catch(() => navigate("/")); }, [id, navigate]);

  if (!ws) return <div className="min-h-screen flex items-center justify-center text-black/40">Loadingâ€¦</div>;

  return (
    <div className="min-h-screen pt-14 md:pt-12 px-4 sm:px-6 md:px-14 pb-16" data-testid="markscheme-page">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <button onClick={() => navigate(`/worksheets/${id}`)} className="text-sm text-black/55 hover:text-black flex items-center gap-1.5 font-semibold">
            <ArrowLeft size={14} weight="bold" /> Back to paper
          </button>
        </div>

        <div className="bg-white border border-black/10 rounded-3xl shadow-[0_4px_40px_rgba(0,0,0,0.04)] overflow-hidden">
          {/* Markscheme header â€” looks like an exam board markscheme */}
          <div className="bg-black text-white px-4 sm:px-6 md:px-10 lg:px-14 py-6 md:py-10">
            <div className="text-[11px] uppercase tracking-[0.32em] text-white/60">Mark scheme</div>
            <h1 className="display text-4xl md:text-5xl mt-2 text-white">{ws.title}</h1>
            <div className="grid grid-cols-3 gap-6 mt-6 text-sm">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/50">Subject</div>
                <div className="font-bold mt-1">{ws.subject_name || "General"}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/50">Total marks</div>
                <div className="font-bold mt-1">{ws.total_marks}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/50">Difficulty</div>
                <div className="font-bold mt-1 capitalize">{ws.difficulty}</div>
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-6 md:px-10 lg:px-14 py-6 md:py-10">
            <div className="text-[11px] uppercase tracking-[0.22em] text-black/45 mb-2">Guidance for markers</div>
            <p className="text-[15px] leading-relaxed text-black/75 italic mb-10">
              Award marks for any answer that demonstrates the required understanding. Accept equivalent wording.
              Partial credit may be awarded where indicated. Do not penalise minor spelling or grammar issues unless
              they obscure meaning.
            </p>

            <div className="overflow-x-auto -mx-4 sm:-mx-6 md:-mx-10 lg:-mx-14 px-4 sm:px-6 md:px-10 lg:px-14">
            <div className="min-w-[400px]">
            <div className="grid grid-cols-[60px_1fr_60px] gap-x-4 pb-3 border-b-2 border-black mb-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-black/60 font-bold">Q</div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-black/60 font-bold">Indicative answer & marking guidance</div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-black/60 font-bold text-right">Marks</div>
            </div>

            <div className="space-y-7">
              {ws.questions.map(q => (
                <div key={q.number} className="grid grid-cols-[60px_1fr_60px] gap-x-4 pb-5 border-b border-dashed border-black/15" data-testid={`ms-q-${q.number}`}>
                  <div className="display text-2xl text-black/85 tabular-nums">{q.number}</div>
                  <div>
                    <div className="text-[13px] uppercase tracking-[0.15em] text-black/45 mb-1">Question</div>
                    <div className="text-[15px] text-black/85 mb-4 leading-relaxed">{q.question}</div>

                    <div className="text-[13px] uppercase tracking-[0.15em] text-black/45 mb-1">Indicative answer</div>
                    <div className="text-[15px] font-bold text-black mb-4 leading-relaxed">{q.answer}</div>

                    {q.options && q.options.length > 0 && (
                      <div className="mb-4">
                        <div className="text-[13px] uppercase tracking-[0.15em] text-black/45 mb-1">Options</div>
                        <ul className="text-[14px] text-black/70 space-y-0.5">
                          {q.options.map((o, i) => <li key={i}>{o}</li>)}
                        </ul>
                      </div>
                    )}

                    {q.explanation && (
                      <>
                        <div className="text-[13px] uppercase tracking-[0.15em] text-black/45 mb-1">Marking notes</div>
                        <div className="text-[14px] text-black/70 leading-relaxed italic">{q.explanation}</div>
                      </>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-black text-white text-sm font-bold rounded-full px-3 py-1 tabular-nums">
                      {q.marks}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            </div>
            </div>

            <div className="mt-10 pt-6 border-t-2 border-black flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-[0.22em] text-black/60 font-bold">Total</div>
              <div className="display text-3xl">{ws.total_marks} marks</div>
            </div>

            <div className="text-center text-black/35 text-sm italic mt-10">â€” End of mark scheme â€”</div>
          </div>
        </div>
      </div>
    </div>
  );
}
