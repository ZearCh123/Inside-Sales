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

// ---------- White-label Market Intelligence configuration ----------
// Stored per-workspace as JSON under workspaces.settings.intel. Every field is
// customer-defined so the whole module can be sold white-label.

/** Strategic frame — the analysis is rendered from THIS company's viewpoint. */
export type CompanyProfile = {
  company_name: string;
  product_names: string[];
  value_proposition: string;
  differentiators: string[];
  target_products: string[]; // what they monitor / want to replace
  icp: string; // ideal customer profile
  pains: string[];
  gains: string[];
  threats: string[];
  barriers: string[];
};

export type CompetitorConfig = {
  name: string;
  segment?: string;
  country?: string;
  priority?: string;
  website?: string;
  notes?: string;
};

export type TopicConfig = {
  id: string;
  label: string;
  enabled: boolean;
  keywords: string[];
};

export type SourceGroups = {
  key_sources: string[];
  regulatory_bodies: string[];
  industry_news: string[];
};

export type FeedConfig = { url: string; name: string; category: string };

export type ScheduleConfig = {
  cadence: "weekly" | "biweekly" | "monthly";
  day: number;
};

/** One configurable section of the executive summary report. */
export type DisplaySection = {
  id: string; // kpis | net_position | risks | opportunities | actions | immediate | custom:<n>
  visible: boolean;
  title?: string; // custom blocks
  body?: string; // custom blocks
};

export type DisplayConfig = { sections: DisplaySection[] };

export type IntelConfig = {
  company_profile: CompanyProfile;
  competitors: CompetitorConfig[];
  priority_set: string[];
  topics: TopicConfig[];
  source_groups: SourceGroups;
  feeds: FeedConfig[];
  regions: string[];
  schedule: ScheduleConfig;
  display: DisplayConfig;
  analysis: { extra_instructions: string };
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
