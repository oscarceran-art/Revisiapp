import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { adminListUsers, adminUpdateUser, adminDeleteUser, adminCreateUser, adminResetTokens } from "@/lib/api";
import { toast } from "sonner";
import { Users, Trash, Plus, ArrowLeft, ArrowClockwise, ToggleLeft, ToggleRight, ShieldCheck, PencilSimple, Check, X } from "@phosphor-icons/react";

function TokenBar({ used, limit }) {
  if (!limit) return <span className="text-[12px] text-black/40">Unlimited</span>;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const colour = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-400" : "bg-black";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-black/10 rounded-full overflow-hidden" style={{ minWidth: 60 }}>
        <div className={`h-full rounded-full ${colour}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-black/50 tabular-nums whitespace-nowrap">
        {(used || 0).toLocaleString()} / {limit.toLocaleString()}
      </span>
    </div>
  );
}

function EditCell({ value, onSave, type = "number" }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  if (!editing) return (
    <span className="flex items-center gap-1 group/cell cursor-pointer" onClick={() => { setVal(value); setEditing(true); }}>
      <span className="text-[13px] tabular-nums">{value === 0 ? "∞" : (value || 0).toLocaleString()}</span>
      <PencilSimple size={11} className="opacity-0 group-hover/cell:opacity-40 transition-opacity" />
    </span>
  );
  return (
    <span className="flex items-center gap-1">
      <input
        autoFocus type={type} value={val}
        onChange={e => setVal(e.target.value)}
        className="w-24 text-[13px] px-2 py-0.5 rounded-lg border border-black/20 outline-none"
      />
      <button onClick={() => { onSave(Number(val)); setEditing(false); }} className="p-1 hover:bg-black/[0.06] rounded-lg">
        <Check size={13} weight="bold" className="text-green-600" />
      </button>
      <button onClick={() => setEditing(false)} className="p-1 hover:bg-black/[0.06] rounded-lg">
        <X size={13} weight="bold" className="text-red-500" />
      </button>
    </span>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "" });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await adminListUsers();
      setUsers(data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = async (id, fields) => {
    try {
      const updated = await adminUpdateUser(id, fields);
      setUsers(u => u.map(x => x.id === id ? updated : x));
      toast.success("Updated");
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };

  const remove = async (u) => {
    if (!window.confirm(`Delete account "${u.username}"? This cannot be undone.`)) return;
    try {
      await adminDeleteUser(u.id);
      setUsers(us => us.filter(x => x.id !== u.id));
      toast.success("Account deleted");
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };

  const resetTokens = async (u) => {
    try {
      await adminResetTokens(u.id);
      setUsers(us => us.map(x => x.id === u.id ? { ...x, tokens_used_today: 0, tokens_used_week: 0 } : x));
      toast.success(`Reset tokens for ${u.username}`);
    } catch { toast.error("Failed"); }
  };

  const handleCreate = async () => {
    if (!newUser.username.trim() || !newUser.password.trim()) { toast.error("Fill in both fields"); return; }
    setCreating(true);
    try {
      const created = await adminCreateUser(newUser);
      setUsers(u => [...u, created]);
      setNewUser({ username: "", password: "" });
      setShowCreate(false);
      toast.success(`Account "${created.username}" created`);
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
    finally { setCreating(false); }
  };

  const formatDate = (iso) => {
    if (!iso) return "Never";
    try { return new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
    catch { return iso; }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 page-fade">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate("/")} className="p-2 rounded-2xl hover:bg-black/[0.06] transition-colors">
          <ArrowLeft size={18} weight="bold" />
        </button>
        <div className="w-9 h-9 bg-black rounded-2xl flex items-center justify-center">
          <ShieldCheck size={18} color="white" weight="fill" />
        </div>
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight">Admin</h1>
          <p className="text-[13px] text-black/45">Manage accounts & usage limits</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-black/15 text-[13px] font-semibold hover:bg-black/[0.04] transition-colors">
            <ArrowClockwise size={14} weight="bold" /> Refresh
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-gradient-to-r from-pink-400 to-blue-500 text-white text-[13px] font-semibold hover:opacity-90 transition-opacity">
            <Plus size={14} weight="bold" /> Add user
          </button>
        </div>
      </div>

      {/* Create user panel */}
      {showCreate && (
        <div className="bg-white border border-black/10 rounded-3xl p-6 mb-6">
          <h2 className="text-[16px] font-bold mb-4">New account</h2>
          <div className="flex gap-3 flex-wrap">
            <input
              placeholder="Username"
              value={newUser.username}
              onChange={e => setNewUser(n => ({ ...n, username: e.target.value }))}
              className="px-4 py-2.5 rounded-2xl text-[14px] border border-black/15 outline-none focus:border-black/40 bg-[#FAF8F5]"
            />
            <input
              placeholder="Password"
              type="password"
              value={newUser.password}
              onChange={e => setNewUser(n => ({ ...n, password: e.target.value }))}
              className="px-4 py-2.5 rounded-2xl text-[14px] border border-black/15 outline-none focus:border-black/40 bg-[#FAF8F5]"
            />
            <button onClick={handleCreate} disabled={creating} className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-pink-400 to-blue-500 text-white text-[14px] font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
              {creating ? "Creating…" : "Create"}
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2.5 rounded-2xl border border-black/15 text-[14px] font-semibold hover:bg-black/[0.04]">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total accounts", value: users.length },
          { label: "Active now", value: users.filter(u => u.is_active).length },
          { label: "Logged in today", value: users.filter(u => u.last_login && (Date.now() - new Date(u.last_login)) < 86400000).length },
        ].map(s => (
          <div key={s.label} className="bg-white border border-black/10 rounded-3xl px-5 py-4">
            <div className="text-[26px] font-extrabold tabular-nums">{s.value}</div>
            <div className="text-[12px] text-black/45 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="bg-white border border-black/10 rounded-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-black/10 flex items-center gap-2">
          <Users size={16} weight="regular" className="text-black/50" />
          <span className="text-[14px] font-bold">{users.length} account{users.length !== 1 ? "s" : ""}</span>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-[14px] text-black/40">Loading…</div>
        ) : users.length === 0 ? (
          <div className="px-6 py-12 text-center text-[14px] text-black/40">No accounts yet</div>
        ) : (
          <div className="divide-y divide-black/[0.06]">
            {users.map(u => (
              <div key={u.id} className="px-6 py-4 flex items-start gap-4 flex-wrap">
                {/* Name + badges */}
                <div className="w-36 shrink-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[14px] font-bold">{u.username}</span>
                    {u.is_admin && <span className="text-[10px] bg-black text-white rounded-full px-1.5 py-0.5 font-bold">Admin</span>}
                    {!u.is_active && <span className="text-[10px] bg-red-100 text-red-600 rounded-full px-1.5 py-0.5 font-bold">Disabled</span>}
                  </div>
                  <div className="text-[11px] text-black/40 mt-0.5">Last login: {formatDate(u.last_login)}</div>
                </div>

                {/* Token usage */}
                <div className="flex-1 min-w-[180px]">
                  <div className="text-[11px] uppercase tracking-[0.15em] text-black/40 mb-1">Daily</div>
                  <TokenBar used={u.tokens_used_today} limit={u.token_limit_daily} />
                  <div className="text-[11px] uppercase tracking-[0.15em] text-black/40 mt-2 mb-1">Weekly</div>
                  <TokenBar used={u.tokens_used_week} limit={u.token_limit_weekly} />
                </div>

                {/* Limits editor */}
                <div className="min-w-[160px]">
                  <div className="text-[11px] uppercase tracking-[0.15em] text-black/40 mb-1">Daily limit</div>
                  <EditCell value={u.token_limit_daily} onSave={v => update(u.id, { token_limit_daily: v })} />
                  <div className="text-[11px] uppercase tracking-[0.15em] text-black/40 mt-2 mb-1">Weekly limit</div>
                  <EditCell value={u.token_limit_weekly} onSave={v => update(u.id, { token_limit_weekly: v })} />
                  <div className="text-[11px] text-black/35 mt-1">0 = unlimited</div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => update(u.id, { is_active: !u.is_active })}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[12px] font-semibold border border-black/15 hover:bg-black/[0.04] transition-colors"
                  >
                    {u.is_active
                      ? <><ToggleRight size={14} weight="fill" className="text-green-600" /> Disable</>
                      : <><ToggleLeft size={14} className="text-black/40" /> Enable</>}
                  </button>
                  <button
                    onClick={() => resetTokens(u)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[12px] font-semibold border border-black/15 hover:bg-black/[0.04] transition-colors"
                  >
                    <ArrowClockwise size={13} weight="bold" /> Reset usage
                  </button>
                  {u.username !== user?.username && (
                    <button
                      onClick={() => remove(u)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[12px] font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
                    >
                      <Trash size={13} weight="regular" /> Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
