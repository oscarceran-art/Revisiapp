import { avatarUrl } from "@/lib/api";

export default function Avatar({ persona, size = 32, className = "" }) {
  const seed = persona?.avatar_seed || persona?.id || persona?.name || "anon";
  const name = persona?.name || "AI";
  return (
    <div
      className={`shrink-0 rounded-full overflow-hidden bg-[#FAF8F5] border border-black/10 ${className}`}
      style={{ width: size, height: size }}
      title={name}
    >
      <img
        src={avatarUrl(seed)}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        style={{ display: "block" }}
      />
    </div>
  );
}
