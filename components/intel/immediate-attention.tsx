import type { Storyline } from "@/lib/intel/types";

export function ImmediateAttention({
  items,
}: {
  items: Storyline[];
}) {
  if (items.length === 0) return null;
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor: "#f2cccc",
        background: "linear-gradient(135deg,#fdf1f1,#fdf6f4)",
      }}
    >
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#D33A3A]">
        <span aria-hidden>⚠</span> Immediate attention
      </div>
      <ul className="space-y-2.5">
        {items.map((s) => (
          <li key={s.storyline_key} className="flex gap-2.5 text-sm">
            <span className="mt-0.5 inline-flex h-fit shrink-0 items-center rounded-full bg-[#D33A3A] px-2 py-0.5 text-[11px] font-semibold text-white">
              High
            </span>
            <span className="text-[#1B1418]">
              <b>{s.entity}:</b> {s.detail}
              {s.source_url && (
                <a
                  href={s.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 whitespace-nowrap text-[12px] font-medium text-[#C8362C] hover:underline"
                >
                  ↗ {s.source_name ?? "kilde"}
                </a>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
