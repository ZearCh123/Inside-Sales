import type { Competitor } from "@/lib/intel/types";
import { CHIP, trajectoryChip } from "@/lib/intel/format";
import { Chip } from "./chips";

const TRAJECTORY_RANK: Record<string, number> = {
  rising: 0,
  stable: 1,
  receding: 2,
};

export function ThreatDossiers({
  competitors,
}: {
  competitors: Competitor[];
}) {
  const ordered = [...competitors].sort(
    (a, b) =>
      (TRAJECTORY_RANK[a.threat_trajectory ?? "stable"] ?? 1) -
      (TRAJECTORY_RANK[b.threat_trajectory ?? "stable"] ?? 1),
  );

  return (
    <div className="rounded-2xl border border-[#E7D7D2] bg-white p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="font-display text-base font-semibold text-[#1B1418]">
          Trussels-dossierer
        </h3>
        <span className="text-[11px] text-[#6B5D5A]">vs. sidste måned</span>
      </div>
      <div className="space-y-3">
        {ordered.map((c) => {
          const tj = trajectoryChip(c.threat_trajectory);
          const borderColor =
            c.threat_trajectory === "rising" ? CHIP.hi.bg : CHIP.med.bg;
          return (
            <div
              key={c.name}
              className="relative overflow-hidden rounded-xl border border-[#E7D7D2] bg-white p-3.5 pl-4"
            >
              <span
                className="absolute inset-y-0 left-0 w-1"
                style={{ backgroundColor: borderColor }}
              />
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-display text-[15px] font-semibold text-[#1B1418]">
                  {c.name}
                </span>
                {(c.country || c.segment) && (
                  <span className="text-[11px] text-[#6B5D5A]">
                    {[c.country, c.segment].filter(Boolean).join(" · ")}
                  </span>
                )}
                <span className="ml-auto">
                  <Chip variant={tj.cls}>{tj.label}</Chip>
                </span>
              </div>
              {c.notes && (
                <p className="mt-1.5 text-[12.5px] text-[#6B5D5A]">{c.notes}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
