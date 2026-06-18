import { createClient } from "@/lib/supabase/server";
import type { IntelChange, IntelImpact, IntelCategory } from "./types";

export type TrackerCell = {
  change_status: IntelChange;
  impact: IntelImpact;
};

export type TrackerRow = {
  storyline_key: string;
  entity: string;
  headline: string;
  category: IntelCategory;
  source_name: string | null;
  source_url: string | null;
  /** period (YYYY-MM-DD) → cell, for months where this finding appeared */
  byPeriod: Record<string, TrackerCell>;
  /** number of months the finding has been tracked */
  monthsTracked: number;
};

export type FindingsTracker = {
  months: string[]; // chronological periods
  rows: TrackerRow[];
};

const IMPACT_RANK: Record<IntelImpact, number> = { high: 3, medium: 2, low: 1 };

/**
 * Builds a month-over-month tracker: every finding (by stable storyline_key)
 * with the status/impact it had in each month it appeared. Lets a finding's
 * progression be followed across runs. Reads under RLS (workspace member).
 */
export async function getFindingsTracker(): Promise<FindingsTracker | null> {
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .limit(1)
    .maybeSingle();
  if (!membership) return null;
  const workspaceId = membership.workspace_id as string;

  const { data: runs } = await supabase
    .from("intel_runs")
    .select("id, period_month")
    .eq("workspace_id", workspaceId)
    .order("period_month", { ascending: true });
  if (!runs || runs.length === 0) return null;

  const periodByRun = new Map<string, string>();
  for (const r of runs) periodByRun.set(r.id as string, r.period_month as string);
  const months = runs.map((r) => r.period_month as string);

  const { data: storylines } = await supabase
    .from("intel_storylines")
    .select(
      "run_id, storyline_key, entity, headline, category, change_status, impact, threat, source_name, source_url, created_at",
    )
    .in(
      "run_id",
      runs.map((r) => r.id),
    );

  const rowMap = new Map<string, TrackerRow>();
  for (const s of storylines ?? []) {
    const period = periodByRun.get(s.run_id as string);
    if (!period) continue;
    const key = s.storyline_key as string;
    let row = rowMap.get(key);
    if (!row) {
      row = {
        storyline_key: key,
        entity: s.entity as string,
        headline: s.headline as string,
        category: s.category as IntelCategory,
        source_name: (s.source_name as string | null) ?? null,
        source_url: (s.source_url as string | null) ?? null,
        byPeriod: {},
        monthsTracked: 0,
      };
      rowMap.set(key, row);
    }
    // Keep the most recent month's label/source as the row's headline.
    if (period >= (months.find((m) => row!.byPeriod[m]) ?? "0000")) {
      row.entity = s.entity as string;
      row.headline = s.headline as string;
      row.source_name = (s.source_name as string | null) ?? row.source_name;
      row.source_url = (s.source_url as string | null) ?? row.source_url;
    }
    row.byPeriod[period] = {
      change_status: s.change_status as IntelChange,
      impact: s.impact as IntelImpact,
    };
  }

  const rows = Array.from(rowMap.values());
  for (const r of rows) r.monthsTracked = Object.keys(r.byPeriod).length;

  // Sort: most recent month's impact first, then longest-tracked.
  const latest = months[months.length - 1];
  rows.sort((a, b) => {
    const ai = a.byPeriod[latest] ? IMPACT_RANK[a.byPeriod[latest].impact] : 0;
    const bi = b.byPeriod[latest] ? IMPACT_RANK[b.byPeriod[latest].impact] : 0;
    return bi - ai || b.monthsTracked - a.monthsTracked;
  });

  return { months, rows };
}
