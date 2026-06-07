const MODELS = {
  "gpt-5.4-nano": { label: "GPT-5.4 nano", desc: "Fastest and cheapest" },
  "gpt-5.4-mini": { label: "GPT-5.4 mini", desc: "Balanced" },
  "gpt-5.4": { label: "GPT-5.4", desc: "Best quality" },
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
        <option value="">Default (GPT-5.4 nano)</option>
        {Object.entries(MODELS).map(([key, m]) => (
          <option key={key} value={key}>{m.label} — {m.desc}</option>
        ))}
      </select>
    </div>
  );
}
