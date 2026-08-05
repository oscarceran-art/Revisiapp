import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getGamificationState, claimQuest, getLeaderboard, listFocusSessions, listExams,
} from "@/lib/api";
import { toast } from "sonner";
import {
  Trophy, Flame, Star, Sparkle, Target, Crown, Lock, Check, Gift, Timer, TrendUp, Medal,
} from "@phosphor-icons/react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

const dayLabel = (iso) => {
  try { return new Date(iso).toLocaleDateString(undefined, { weekday: "short" }); }
  catch { return iso; }
};

function fmtDuration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

export default function ArenaPage() {
  const navigate = useNavigate();
  const [state, setState] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [s, lb, sess, ex] = await Promise.all([
        getGamificationState(),
        getLeaderboard().catch(() => []),
        listFocusSessions().catch(() => []),
        listExams().catch(() => []),
      ]);
      setState(s);
      setLeaderboard(lb);
      setSessions(sess);
      setExams(ex);
    } catch (e) {
      toast.error("Couldn't load your arena");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleClaim = async (questId) => {
    setClaiming(questId);
    try {
      const res = await claimQuest(questId);
      const g = res?.gamification;
      toast.success(`+${res.xp_awarded} XP · Quest complete!`, {
        description: g?.leveled_up ? `🎉 Level up — now Level ${g.state.level} ${g.state.level_title}` : undefined,
      });
      await refresh();
    } catch (e) {
      toast.error("Couldn't claim quest");
    } finally {
      setClaiming(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-14 px-4 sm:px-6 lg:px-10 pb-20 flex items-center justify-center">
        <div className="text-black/40 animate-pulse">Loading your arena…</div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen pt-14 px-4 sm:px-6 lg:px-10 pb-20 flex items-center justify-center">
        <div className="text-black/50">No progress data yet — study something to earn XP!</div>
      </div>
    );
  }

  const pct = Math.round((state.level_progress || 0) * 100);
  const chartData = (state.week_series || []).map((d) => ({ day: dayLabel(d.date), xp: d.xp }));
  const myLevel = state.level;

  return (
    <div className="min-h-screen pt-14 px-4 sm:px-6 lg:px-10 pb-20" data-testid="arena-page">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-up">
          <div className="text-[11px] uppercase tracking-[0.22em] text-black/45 flex items-center gap-2">
            <Trophy size={12} weight="fill" /> gamification
          </div>
          <h1 className="display text-4xl md:text-5xl mt-1.5 flex items-center gap-3">
            Study Arena
          </h1>
          <p className="text-black/55 mt-2">Earn XP, build streaks, unlock badges and boss exams.</p>
        </div>

        {/* Top stats: level + ring */}
        <div className="grid lg:grid-cols-3 gap-4 mb-6">
          {/* Level card */}
          <div className="lg:col-span-2 rounded-3xl bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 text-white p-6 shadow-sm relative overflow-hidden">
            <div className="absolute -right-6 -top-6 opacity-20"><Crown size={120} weight="fill" /></div>
            <div className="relative flex items-center gap-6 flex-wrap">
              <div className="relative w-28 h-28 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="8" />
                  <circle cx="50" cy="50" r="44" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 44}
                    strokeDashoffset={2 * Math.PI * 44 * (1 - (state.level_progress || 0))}
                    style={{ transition: "stroke-dashoffset 0.6s ease" }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] uppercase tracking-widest opacity-80">Level</span>
                  <span className="text-3xl font-extrabold leading-none">{state.level}</span>
                </div>
              </div>
              <div className="flex-1 min-w-[160px]">
                <div className="text-sm uppercase tracking-widest opacity-80">Rank</div>
                <div className="text-2xl font-bold">{state.level_title}</div>
                <div className="mt-2 text-sm opacity-90">
                  {state.total_xp.toLocaleString()} XP total · {state.xp_to_next.toLocaleString()} XP to Level {state.level + 1}
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/25 overflow-hidden">
                  <div className="h-full bg-white" style={{ width: `${pct}%`, transition: "width 0.6s ease" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Streak + today */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
            <div className="rounded-3xl bg-white border border-black/10 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-500 flex items-center justify-center shrink-0">
                <Flame size={26} weight="fill" />
              </div>
              <div>
                <div className="text-3xl font-extrabold leading-none">{state.streak}</div>
                <div className="text-xs text-black/45 uppercase tracking-widest mt-1">day streak</div>
                <div className="text-[11px] text-black/40 mt-0.5">best {state.longest_streak} · {state.streak_freezes} freeze{state.streak_freezes === 1 ? "" : "s"}</div>
              </div>
            </div>
            <div className="rounded-3xl bg-white border border-black/10 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-pink-100 text-pink-500 flex items-center justify-center shrink-0">
                <Sparkle size={24} weight="fill" />
              </div>
              <div>
                <div className="text-3xl font-extrabold leading-none">{state.today_xp}</div>
                <div className="text-xs text-black/45 uppercase tracking-widest mt-1">XP today</div>
              </div>
            </div>
          </div>
        </div>

        {/* Daily quests */}
        <div className="rounded-3xl bg-white border border-black/10 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Target size={18} weight="fill" className="text-pink-500" />
            <h2 className="text-lg font-bold">Daily quests</h2>
            <span className="text-xs text-black/40 ml-auto">resets daily</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {(state.daily_quests || []).map((q) => {
              const pctq = Math.min(100, Math.round((q.current / q.target) * 100));
              return (
                <div key={q.id} className="rounded-2xl border border-black/10 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm">{q.label}</span>
                    <span className="text-xs font-bold text-pink-500 flex items-center gap-1"><Gift size={13} weight="fill" /> {q.xp} XP</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-black/[0.06] overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-pink-500 to-blue-500" style={{ width: `${pctq}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-black/45">{q.current}/{q.target}</span>
                    {q.claimed ? (
                      <span className="text-xs text-black/40 flex items-center gap-1"><Check size={13} weight="bold" /> claimed</span>
                    ) : q.completed ? (
                      <button onClick={() => handleClaim(q.id)} disabled={claiming === q.id}
                        className="text-xs font-bold px-3 py-1 rounded-full bg-black text-white hover:opacity-90 disabled:opacity-50">
                        {claiming === q.id ? "Claiming…" : "Claim"}
                      </button>
                    ) : (
                      <span className="text-xs text-black/30">in progress</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* XP chart + Badges */}
        <div className="grid lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2 rounded-3xl bg-white border border-black/10 p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendUp size={18} weight="bold" className="text-blue-500" />
              <h2 className="text-lg font-bold">XP this week</h2>
            </div>
            <div style={{ width: "100%", height: 200 }}>
              <ResponsiveContainer>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="xpFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ec4899" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "rgba(0,0,0,0.45)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "rgba(0,0,0,0.45)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid rgba(0,0,0,0.1)", fontSize: 12 }} />
                  <Area type="monotone" dataKey="xp" stroke="#3b82f6" strokeWidth={2} fill="url(#xpFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-black/10 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Medal size={18} weight="fill" className="text-amber-500" />
              <h2 className="text-lg font-bold">Badges</h2>
              <span className="text-xs text-black/40 ml-auto">{state.badge_count}/{state.total_badges}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(state.badges || []).map((b) => (
                <div key={b.id} className="flex flex-col items-center text-center" title={b.desc}>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-2xl">{b.icon}</div>
                  <div className="text-[10px] font-semibold mt-1 leading-tight">{b.label}</div>
                </div>
              ))}
              {state.badges?.length === 0 && (
                <div className="col-span-3 text-sm text-black/40 py-6">No badges yet — keep studying!</div>
              )}
            </div>
          </div>
        </div>

        {/* Boss exams + Leaderboard */}
        <div className="grid lg:grid-cols-2 gap-4 mb-6">
          <div className="rounded-3xl bg-white border border-black/10 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lock size={18} weight="fill" className="text-purple-500" />
              <h2 className="text-lg font-bold">Boss exams</h2>
              <span className="text-xs text-black/40 ml-auto">unlock at the level shown</span>
            </div>
            <div className="space-y-3">
              {exams.filter(e => e.unlock_level > 0).length === 0 && (
                <div className="text-sm text-black/40 py-4">
                  No boss exams set. Tag an exam with an unlock level in your exams list to gate it behind your level.
                </div>
              )}
              {exams.filter(e => e.unlock_level > 0).map((e) => {
                const locked = myLevel < e.unlock_level;
                return (
                  <button key={e.id} onClick={() => locked ? null : navigate(`/exams/${e.id}/plan`)}
                    className={`w-full text-left rounded-2xl border p-4 flex items-center gap-3 transition-colors ${locked ? "border-black/5 bg-black/[0.02] opacity-70" : "border-black/10 hover:bg-black/[0.03]"}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${locked ? "bg-black/5 text-black/40" : "bg-purple-100 text-purple-500"}`}>
                      {locked ? <Lock size={18} weight="fill" /> : <Crown size={18} weight="fill" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{e.name}</div>
                      <div className="text-xs text-black/45">{new Date(e.exam_date).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-black/40">Lvl {e.unlock_level}</div>
                      {locked ? (
                        <div className="text-xs font-bold text-black/40">Locked</div>
                      ) : (
                        <div className="text-xs font-bold text-purple-500">Unlocked</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-black/10 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={18} weight="fill" className="text-amber-500" />
              <h2 className="text-lg font-bold">Leaderboard</h2>
            </div>
            <div className="space-y-2">
              {leaderboard.length === 0 && <div className="text-sm text-black/40 py-4">No rankings yet.</div>}
              {leaderboard.map((p, i) => (
                <div key={p.user_id || i} className="flex items-center gap-3 py-1.5">
                  <div className={`w-7 text-center font-bold ${i === 0 ? "text-amber-500" : i === 1 ? "text-black/60" : i === 2 ? "text-amber-700/70" : "text-black/30"}`}>
                    {i + 1}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-blue-500 text-white text-xs font-bold flex items-center justify-center">
                    {(p.username || "S").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{p.username || "Scholar"}</div>
                    <div className="text-[11px] text-black/45">Lvl {p.level} · {p.level_title}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{p.total_xp.toLocaleString()}</div>
                    <div className="text-[11px] text-black/45 flex items-center justify-end gap-1"><Flame size={11} weight="fill" className="text-orange-400" />{p.streak}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent focus sessions */}
        <div className="rounded-3xl bg-white border border-black/10 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Timer size={18} weight="fill" className="text-blue-500" />
            <h2 className="text-lg font-bold">Recent focus sessions</h2>
          </div>
          {sessions.length === 0 ? (
            <div className="text-sm text-black/40 py-4">
              No sessions logged yet. Start the focus timer and reset it when you finish a study block to earn XP.
            </div>
          ) : (
            <div className="divide-y divide-black/5">
              {sessions.slice(0, 8).map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center"><Timer size={16} weight="fill" /></div>
                    <div>
                      <div className="font-semibold text-sm">{fmtDuration(s.duration_ms)} focused</div>
                      <div className="text-[11px] text-black/45">{new Date(s.ended_at).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-pink-500">+{Math.max(1, Math.round(s.duration_ms / 60000))} XP</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
