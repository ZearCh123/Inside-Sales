import type { Storyline } from "@/lib/intel/types";
import {
  changeLabel,
  directionChip,
  impactChip,
  sortStorylines,
} from "@/lib/intel/format";
import { Chip } from "./chips";

export function ChangeLogTable({
  storylines,
  windowLabel,
}: {
  storylines: Storyline[];
  windowLabel?: string;
}) {
  const rows = sortStorylines(storylines);
  return (
    <div className="rounded-2xl border border-[#E7D7D2] bg-white p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="font-display text-base font-semibold text-[#1B1418]">
          In-window change log
        </h3>
        {windowLabel && (
          <span className="text-[11px] text-[#6B5D5A]">{windowLabel}</span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b-2 border-[#E7D7D2]">
              {["Storyline", "Entitet", "Ændring", "Impact", "Retning for Chromologics"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-2 py-2 text-[11px] font-bold uppercase tracking-wider text-[#6B5D5A]"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const ch = changeLabel(s.change_status);
              const imp = impactChip(s.impact);
              const dir = directionChip(s.direction, s.change_status);
              return (
                <tr
                  key={s.storyline_key}
                  className="border-b border-[#f1e7e3] align-top hover:bg-[#fcf6f4]"
                >
                  <td className="px-2 py-3 text-sm font-medium text-[#1B1418]">
                    {s.headline}
                    {s.source_url && (
                      <a
                        href={s.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 block text-[11px] font-normal text-[#C8362C] hover:underline"
                      >
                        ↗ {s.source_name ?? "Kilde"}
                      </a>
                    )}
                  </td>
                  <td className="px-2 py-3 text-sm text-[#6B5D5A]">
                    {s.entity}
                  </td>
                  <td className="px-2 py-3 text-sm text-[#1B1418]">
                    <span aria-hidden>{ch.emoji}</span> {ch.label}
                  </td>
                  <td className="px-2 py-3">
                    <Chip variant={imp.cls}>{imp.label}</Chip>
                  </td>
                  <td className="px-2 py-3">
                    <Chip variant={dir.cls}>{dir.label}</Chip>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
