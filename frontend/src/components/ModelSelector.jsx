const MODELS = {
  "gpt-5.6-luna": { label: "Luna", desc: "Fast and cost-effective" },
  "gpt-5.6-terra": { label: "Terra", desc: "More capable" },
};

export default function ModelSelector({ value, onChange }) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 block mb-2">AI model</label>
      <select
        value={value || ""}
        onChange={e => onChange(e.target.value || null)}
        className="w-full border border-black/15 rounded-2xl px-4 py-3 bg-white focus:outline-none focus:border-black"
      >
        <option value="">Default (Luna)</option>
        {Object.entries(MODELS).map(([key, m]) => (
          <option key={key} value={key}>{m.label} — {m.desc}</option>
        ))}
      </select>
    </div>
  );
}
