import { createClient } from "@/lib/supabase/server";
import type {
  Competitor,
  CompetitorView,
  IntelSnapshotPayload,
  Kpi,
  RunOption,
  Storyline,
} from "./types";
import { deriveKpiCounts } from "./format";

export type MonthlyView = {
  workspaceId: string;
  companyName: string;
  runs: RunOption[];
  period: string;
  verdict: string;
  netPosition: string;
  kpis: Kpi[];
  storylines: Storyline[];
  competitors: CompetitorView[];
  immediateKeys: string[];
  risks: string[];
  opportunities: string[];
  recommendedActions: string[];
};

/** Attaches each competitor's source by matching its name to a storyline entity. */
function withSources(
  competitors: Competitor[],
  storylines: Storyline[],
): CompetitorView[] {
  return competitors.map((c) => {
    const match = storylines.find(
      (s) =>
        s.entity.toLowerCase().includes(c.name.toLowerCase()) ||
        c.name.toLowerCase().includes(s.entity.toLowerCase()),
    );
    return {
      ...c,
      source_name: match?.source_name ?? null,
      source_url: match?.source_url ?? null,
    };
  });
}

/**
 * Loads the Monthly assessment view for the logged-in user's workspace and the
 * selected period. Returns null if the user has no workspace or no intel runs.
 * Reads under RLS (the user is a workspace member).
 */
export async function getMonthlyView(
  selectedPeriod?: string,
): Promise<MonthlyView | null> {
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, workspaces(name)")
    .limit(1)
    .maybeSingle();
  if (!membership) return null;
  const workspaceId = membership.workspace_id as string;
  const companyName =
    (membership.workspaces as { name?: string } | null)?.name ??
    "Sales Intelligence";

  const { data: runRows } = await supabase
    .from("intel_runs")
    .select("period_month, summary")
    .eq("workspace_id", workspaceId)
    .order("period_month", { ascending: false });

  if (!runRows || runRows.length === 0) return null;

  const runs: RunOption[] = runRows.map((r) => ({
    period: r.period_month as string,
    verdict: (r.summary as string | null) ?? null,
  }));

  const period =
    selectedPeriod && runs.some((r) => r.period === selectedPeriod)
      ? selectedPeriod
      : runs[0].period;

  // Selected run (for net position prose + verdict fallback).
  const { data: run } = await supabase
    .from("intel_runs")
    .select("id, net_position, summary")
    .eq("workspace_id", workspaceId)
    .eq("period_month", period)
    .maybeSingle();

  const { data: storylineRows } = await supabase
    .from("intel_storylines")
    .select("*")
    .eq("run_id", run?.id ?? "")
    .order("created_at", { ascending: true });

  const storylines = (storylineRows ?? []) as unknown as Storyline[];

  const { data: competitorRows } = await supabase
    .from("intel_competitors")
    .select("*")
    .eq("workspace_id", workspaceId);

  const competitors = (competitorRows ?? []) as unknown as Competitor[];

  // Snapshot payload carries precomputed KPIs + immediate-attention keys.
  const { data: snap } = await supabase
    .from("intel_snapshots")
    .select("payload")
    .eq("workspace_id", workspaceId)
    .eq("period_month", period)
    .maybeSingle();

  const payload = snap?.payload as IntelSnapshotPayload | undefined;

  // KPIs: prefer the snapshot's precomputed cards; otherwise derive counts.
  let kpis: Kpi[];
  if (payload?.kpis?.length) {
    kpis = payload.kpis;
  } else {
    const c = deriveKpiCounts(storylines);
    kpis = [
      { label: "Net position", value: run?.summary ?? "—", caption: "vs. forrige måned", tone: "tail" },
      { label: "Trusler stigende", value: String(c.threatsRising), caption: c.threatsRisingEntities.slice(0, 2).join(" · "), tone: "head" },
      { label: "Medvind", value: String(c.tailwinds), caption: "tailwinds", tone: "tail" },
      { label: "High-impact events", value: String(c.highImpact), caption: "i dette vindue", tone: "neutral" },
    ];
  }

  return {
    workspaceId,
    companyName,
    runs,
    period,
    verdict: payload?.verdict ?? run?.summary ?? "—",
    netPosition: payload?.net_position ?? run?.net_position ?? "",
    kpis,
    storylines,
    competitors: withSources(competitors, storylines),
    immediateKeys: payload?.immediate_keys ?? [],
    risks: payload?.risks ?? [],
    opportunities: payload?.opportunities ?? [],
    recommendedActions: payload?.recommended_actions ?? [],
  };
}
