import { createAdminClient } from "@/lib/supabase/admin";
import type {
  CompanyProfile,
  CompetitorConfig,
  DisplaySection,
  IntelConfig,
  SourceGroups,
  TopicConfig,
} from "./types";

// ---------- Defaults ----------
// The Chromologics setup is the seed default so nothing breaks, but every field
// is overridable per workspace (white-label).

export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  company_name: "Chromologics",
  product_names: ["Natu.Red®", "Sustainly.Red®"],
  value_proposition:
    "Fermenteret, naturlig rød fødevarefarve der erstatter carmine, Red 3 og Red 40 — non-GMO, stabil og vegansk.",
  differentiators: ["non-GMO", "varme-/pH-stabil", "vegansk", "fermenteret"],
  target_products: ["carmine", "Red 3", "Red 40", "betanin"],
  icp: "Food/beverage-producenter og distributører der reformulerer væk fra syntetiske og insekt-baserede røde farver.",
  pains: [
    "Få stabile naturlige røde alternativer på markedet",
    "Carmine er insekt-baseret og prisvolatil",
  ],
  gains: [
    "Regulatorisk medvind fra udfasning af syntetiske farver",
    "Stigende efterspørgsel på vegansk/clean-label rød",
  ],
  threats: [
    "Konkurrenter når US-skala først",
    "Markedsledere går ind i fermenteret rød",
  ],
  barriers: ["EFSA/FDA-godkendelse mangler", "Skalering / CMO-kapacitet"],
};

export const DEFAULT_TOPICS: TopicConfig[] = [
  {
    id: "company-updates",
    label: "Company updates",
    enabled: true,
    keywords: [
      "funding",
      "investors",
      "leadership",
      "hiring",
      "production site",
      "partnership",
      "acquisition",
      "M&A",
    ],
  },
  {
    id: "product-tech",
    label: "Product & technology",
    enabled: true,
    keywords: [
      "color launch",
      "pigment platform",
      "heat stability",
      "pH stability",
      "vegan",
      "naturality",
      "scalability",
      "application",
    ],
  },
  {
    id: "regulatory-ip",
    label: "Regulatory & IP",
    enabled: true,
    keywords: [
      "FDA",
      "EFSA",
      "regulation",
      "Red 3",
      "Red 40",
      "phase-out",
      "approval",
      "patent",
      "COSMOS",
    ],
  },
  {
    id: "market",
    label: "Market signals",
    enabled: true,
    keywords: [
      "reformulation",
      "retailer ban",
      "clean-label",
      "vegan",
      "halal",
      "kosher",
      "carmine-free",
      "pricing",
      "supply",
    ],
  },
];

export const DEFAULT_SOURCE_GROUPS: SourceGroups = {
  key_sources: [
    "prnewswire.com",
    "businesswire.com",
    "globenewswire.com",
    "linkedin.com",
    "crunchbase.com",
    "pitchbook.com",
    "patents.google.com",
  ],
  regulatory_bodies: ["fda.gov", "efsa.europa.eu", "ec.europa.eu"],
  industry_news: [
    "foodnavigator.com",
    "foodnavigator-usa.com",
    "foodingredientsfirst.com",
    "agfundernews.com",
    "nutraingredients.com",
    "cosmeticsdesign.com",
    "eu-startups.com",
    "techcrunch.com",
    "fooddive.com",
    "bevnet.com",
  ],
};

const DEFAULT_COMPETITORS: CompetitorConfig[] = [
  { name: "Phytolon", segment: "fermentation red", country: "IL", priority: "high" },
  { name: "Michroma", segment: "fungal fermentation red", country: "AR/US", priority: "high" },
  { name: "Debut Biotechnology", segment: "precision fermentation", country: "US", priority: "high" },
  { name: "Oterra", segment: "natural color leader", country: "DK", priority: "high" },
  { name: "Sensient", segment: "natural color incumbent", country: "US", priority: "medium" },
  { name: "Fermentalg", segment: "algae biotech color", country: "FR", priority: "low" },
  { name: "Octarine Bio", segment: "precision fermentation", country: "DK", priority: "medium" },
  { name: "GNT / Exberry", segment: "plant-based color", country: "NL", priority: "medium" },
];

/** Default executive-summary layout (order + visibility). */
export const DEFAULT_DISPLAY_SECTIONS: DisplaySection[] = [
  { id: "kpis", visible: true },
  { id: "net_position", visible: true },
  { id: "actions", visible: true },
  { id: "risks", visible: true },
  { id: "opportunities", visible: true },
  { id: "immediate", visible: true },
];

export const DEFAULT_INTEL_CONFIG: IntelConfig = {
  company_profile: DEFAULT_COMPANY_PROFILE,
  competitors: DEFAULT_COMPETITORS,
  priority_set: ["Phytolon", "Michroma", "Debut Biotechnology", "Oterra"],
  topics: DEFAULT_TOPICS,
  source_groups: DEFAULT_SOURCE_GROUPS,
  feeds: [],
  regions: ["US", "EU"],
  schedule: { cadence: "monthly", day: 1 },
  display: { sections: DEFAULT_DISPLAY_SECTIONS },
  analysis: { extra_instructions: "" },
};

// ---------- Merge ----------

/** Fills a partial stored config with defaults so every field is populated. */
export function mergeIntelConfig(
  row: Partial<IntelConfig> | null | undefined,
): IntelConfig {
  const d = DEFAULT_INTEL_CONFIG;
  if (!row) return d;
  return {
    company_profile: { ...d.company_profile, ...(row.company_profile ?? {}) },
    competitors: row.competitors?.length ? row.competitors : d.competitors,
    priority_set: row.priority_set ?? d.priority_set,
    topics: row.topics?.length ? row.topics : d.topics,
    source_groups: { ...d.source_groups, ...(row.source_groups ?? {}) },
    feeds: row.feeds ?? d.feeds,
    regions: row.regions ?? d.regions,
    schedule: { ...d.schedule, ...(row.schedule ?? {}) },
    display: row.display?.sections?.length ? row.display : d.display,
    analysis: { ...d.analysis, ...(row.analysis ?? {}) },
  };
}

// ---------- Storage (workspaces.settings.intel) ----------

/** Loads a workspace's white-label intel config (merged with defaults). */
export async function loadIntelConfig(workspaceId: string): Promise<IntelConfig> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("workspaces")
    .select("settings")
    .eq("id", workspaceId)
    .maybeSingle();
  const stored = (data?.settings as { intel?: Partial<IntelConfig> } | null)
    ?.intel;
  return mergeIntelConfig(stored);
}

/** Merges a partial update into the stored config and saves it. */
export async function saveIntelConfig(
  workspaceId: string,
  patch: Partial<IntelConfig>,
): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("workspaces")
    .select("settings")
    .eq("id", workspaceId)
    .maybeSingle();
  const settings = (data?.settings as Record<string, unknown> | null) ?? {};
  const current = (settings.intel as Partial<IntelConfig> | undefined) ?? {};
  settings.intel = { ...current, ...patch };
  await admin.from("workspaces").update({ settings }).eq("id", workspaceId);
}

// ---------- Query building ----------

/** Union of all preferred-source domains (used as Tavily include_domains). */
export function allDomains(config: IntelConfig): string[] {
  const { key_sources, regulatory_bodies, industry_news } = config.source_groups;
  return Array.from(
    new Set([...key_sources, ...regulatory_bodies, ...industry_news]),
  );
}

function enabledKeywords(config: IntelConfig, topicIds: string[]): string {
  return config.topics
    .filter((t) => t.enabled && topicIds.includes(t.id))
    .flatMap((t) => t.keywords)
    .slice(0, 8)
    .join(" ");
}

function competitorQuery(name: string, config: IntelConfig): string {
  const products = config.company_profile.target_products.slice(0, 4).join(" ");
  const kw = enabledKeywords(config, ["company-updates", "product-tech"]);
  return `${name} ${products} ${kw} 2026`;
}

function topicSweeps(config: IntelConfig): string[] {
  const products = config.company_profile.target_products.slice(0, 4).join(" ");
  const regions = config.regions.join(" ");
  const out: string[] = [];
  const enabled = (id: string) =>
    config.topics.some((t) => t.id === id && t.enabled);
  if (enabled("regulatory-ip")) {
    out.push(
      `${products} ${enabledKeywords(config, ["regulatory-ip"])} ${regions} 2026`,
    );
  }
  if (enabled("market")) {
    out.push(
      `${products} ${enabledKeywords(config, ["market"])} ${regions} 2026`,
    );
  }
  // Custom topics (anything beyond the four defaults) get their own sweep.
  for (const t of config.topics) {
    if (
      t.enabled &&
      !["company-updates", "product-tech", "regulatory-ip", "market"].includes(t.id)
    ) {
      out.push(`${products} ${t.keywords.slice(0, 8).join(" ")} 2026`);
    }
  }
  return out;
}

/** Light query set for the synchronous cron scan (capped at 5). */
export function buildScanQueries(config: IntelConfig): string[] {
  const names =
    config.priority_set.length > 0
      ? config.priority_set
      : config.competitors.map((c) => c.name);
  const queries = names.slice(0, 3).map((n) => competitorQuery(n, config));
  queries.push(...topicSweeps(config));
  return queries.slice(0, 5);
}

/** Deep query set for the stepwise background job (one per competitor + sweeps). */
export function buildDeepQueries(config: IntelConfig): string[] {
  const includeCompetitors = config.topics.some(
    (t) => (t.id === "company-updates" || t.id === "product-tech") && t.enabled,
  );
  const competitorQs = includeCompetitors
    ? config.competitors.map((c) => competitorQuery(c.name, config))
    : [];
  return [...competitorQs, ...topicSweeps(config)];
}
