import type { Kpi } from "@/lib/intel/types";
import { KPI_STRIP, KPI_CAPTION_COLOR } from "@/lib/intel/format";

export function KpiCards({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((k) => (
        <div
          key={k.label}
          className="relative overflow-hidden rounded-2xl border border-[#E7D7D2] bg-white p-4 pl-5"
        >
          <span
            className="absolute inset-y-0 left-0 w-1"
            style={{ backgroundColor: KPI_STRIP[k.tone] }}
          />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B5D5A]">
            {k.label}
          </p>
          <p className="mt-1.5 font-display text-2xl font-bold text-[#1B1418]">
            {k.value}
          </p>
          <p
            className="mt-1 text-xs font-semibold"
            style={{ color: KPI_CAPTION_COLOR[k.tone] }}
          >
            {k.caption}
          </p>
        </div>
      ))}
    </div>
  );
}
