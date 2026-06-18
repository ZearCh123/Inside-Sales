// Shared types for the Market Intelligence (Monthly assessment) module.
// Enums mirror the Postgres enums in docs/03_SUPABASE_SCHEMA.sql.

export type IntelChange =
  | "new"
  | "escalating"
  | "ongoing"
  | "cooling"
  | "resolved";
export type IntelImpact = "high" | "medium" | "low";
export type IntelDirection = "tailwind" | "headwind" | "neutral" | "mixed";
export type ThreatTrajectory = "rising" | "stable" | "receding";
export type IntelCategory = "competitor" | "market" | "regulatory" | "ip";
export type IntelConfidence = "confirmed" | "likely" | "unverified";

/** One storyline (row in intel_storylines, minus the db-generated/relational fields). */
export type Storyline = {
  storyline_key: string;
  entity: string;
  category: IntelCategory;
  change_status: IntelChange;
  impact: IntelImpact;
  threat: IntelImpact | null;
  confidence: IntelConfidence;
  direction: IntelDirection;
  trajectory: ThreatTrajectory | null;
  /** Short label used in the change-log "Storyline" column. */
  headline: string;
  /** Longer prose used in immediate-attention, dossiers and the print view. */
  detail: string;
  source_name: string | null;
  source_url: string | null;
};

/** One competitor (row in intel_competitors, minus db-generated fields). */
export type Competitor = {
  name: string;
  segment: string | null;
  country: string | null;
  relevance: string | null;
  threat_trajectory: ThreatTrajectory | null;
  notes: string | null;
};

/** A competitor enriched with the source of its matching storyline (for the UI). */
export type CompetitorView = Competitor & {
  source_name: string | null;
  source_url: string | null;
};

/** Per-workspace scan configuration (row in intel_config). */
export type IntelConfig = {
  competitors: { name: string; segment?: string; country?: string; priority?: string }[];
  priority_set: string[];
  categories: string[];
  target_products: string[];
  regions: string[];
  sources: string[];
  prompt_overrides: string | null;
};

export type KpiTone = "tail" | "head" | "med" | "neutral";

/** A single KPI card, precomputed at seed/scan time and stored in the snapshot. */
export type Kpi = {
  label: string;
  value: string;
  caption: string;
  /** strip + caption colour */
  tone: KpiTone;
};

/** One selectable run in the month picker. */
export type RunOption = { period: string; verdict: string | null };

/** Machine-readable run record stored in intel_snapshots.payload (jsonb). */
export type IntelSnapshotPayload = {
  period: string; // YYYY-MM-DD (first of month)
  verdict: string; // e.g. "Styrket"
  net_position: string; // one-paragraph read
  kpis: Kpi[];
  /** storyline_keys to surface in the Immediate attention box. */
  immediate_keys: string[];
  storylines: Storyline[];
  competitors: Competitor[];
  /** Executive-summary fields (page 1 of the report). */
  risks?: string[];
  opportunities?: string[];
  recommended_actions?: string[];
};
