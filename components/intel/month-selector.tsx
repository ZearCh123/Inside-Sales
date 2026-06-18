"use client";

import { useRouter } from "next/navigation";
import type { RunOption } from "@/lib/intel/types";
import { periodLabel } from "@/lib/intel/format";

export function MonthSelector({
  runs,
  current,
}: {
  runs: RunOption[];
  current: string;
}) {
  const router = useRouter();
  return (
    <select
      value={current}
      onChange={(e) => router.push(`/app/monthly?period=${e.target.value}`)}
      className="h-10 rounded-lg border border-[#E7D7D2] bg-white px-3 text-sm font-medium text-[#1B1418]"
      aria-label="Vælg måned"
    >
      {runs.map((r) => (
        <option key={r.period} value={r.period}>
          {periodLabel(r.period)}
        </option>
      ))}
    </select>
  );
}
