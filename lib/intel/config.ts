import type { IntelConfig } from "./types";

/**
 * Default preferred sources (credible, traceable). Tavily restricts results to
 * these domains. A workspace can edit or clear them (cleared = unrestricted).
 */
export const DEFAULT_SOURCES = [
  "fda.gov",
  "efsa.europa.eu",
  "ec.europa.eu",
  "foodnavigator.com",
  "foodnavigator-usa.com",
  "foodingredientsfirst.com",
  "agfundernews.com",
  "nutraingredients.com",
  "nutraingredients-usa.com",
  "cosmeticsdesign.com",
  "cosmeticsdesign-europe.com",
  "eu-startups.com",
  "techcrunch.com",
  "crunchbase.com",
  "pitchbook.com",
  "patents.google.com",
  "prnewswire.com",
  "businesswire.com",
  "globenewswire.com",
  "linkedin.com",
  "fooddive.com",
  "bevnet.com",
];

/**
 * Default Chromologics scan configuration. Used when a workspace has no
 * intel_config row yet — it is seed data, never hardcoded into the agent.
 */
export const DEFAULT_INTEL_CONFIG: IntelConfig = {
  competitors: [
    { name: "Phytolon", segment: "fermentation red", country: "IL", priority: "high" },
    { name: "Michroma", segment: "fungal fermentation red", country: "AR/US", priority: "high" },
    { name: "Debut Biotechnology", segment: "precision fermentation", country: "US", priority: "high" },
    { name: "Oterra", segment: "natural color leader", country: "DK", priority: "high" },
    { name: "Sensient", segment: "natural color incumbent", country: "US", priority: "medium" },
    { name: "Fermentalg", segment: "algae biotech color", country: "FR", priority: "low" },
    { name: "Octarine Bio", segment: "precision fermentation", country: "DK", priority: "medium" },
    { name: "GNT / Exberry", segment: "plant-based color", country: "NL", priority: "medium" },
  ],
  priority_set: ["Phytolon", "Michroma", "Debut Biotechnology", "Oterra"],
  categories: ["competitor", "market", "regulatory", "ip"],
  target_products: ["carmine", "Red 3", "Red 40", "betanin"],
  regions: ["US", "EU"],
  sources: DEFAULT_SOURCES,
  prompt_overrides: null,
};

/** Merges a partial DB row with the defaults so every field is populated. */
export function mergeIntelConfig(
  row: Partial<IntelConfig> | null | undefined,
): IntelConfig {
  if (!row) return DEFAULT_INTEL_CONFIG;
  return {
    competitors: row.competitors?.length
      ? row.competitors
      : DEFAULT_INTEL_CONFIG.competitors,
    priority_set: row.priority_set?.length
      ? row.priority_set
      : DEFAULT_INTEL_CONFIG.priority_set,
    categories: row.categories?.length
      ? row.categories
      : DEFAULT_INTEL_CONFIG.categories,
    target_products: row.target_products?.length
      ? row.target_products
      : DEFAULT_INTEL_CONFIG.target_products,
    regions: row.regions ?? DEFAULT_INTEL_CONFIG.regions,
    sources: row.sources ?? DEFAULT_INTEL_CONFIG.sources,
    prompt_overrides: row.prompt_overrides ?? null,
  };
}

/** One rich per-competitor query covering company + product/technology aspects. */
function competitorQuery(name: string, products: string): string {
  return `${name} ${products} natural color: funding investment leadership partnership acquisition hiring expansion OR new color launch pigment platform heat pH stability vegan scalability application 2026`;
}

/**
 * Topic-area queries gated by the configured categories — Regulatory & IP, and
 * Market signals — covering the sub-aspects of the monitoring spec.
 */
function topicQueries(config: IntelConfig): string[] {
  const products = config.target_products.slice(0, 4).join(" ");
  const regions = config.regions.join(" ");
  const out: string[] = [];
  if (config.categories.includes("regulatory")) {
    out.push(
      `FDA EFSA EU UK LATAM APAC food color regulation ${products} Red 3 Red 40 phase-out fermentation-derived color approval objection ${regions} 2026`,
    );
  }
  if (config.categories.includes("ip")) {
    out.push(
      `${products} natural color fermentation synthetic biology pigment patent application grant assignment licensing IP filing 2026`,
    );
  }
  if (config.categories.includes("market")) {
    out.push(
      `brand reformulation away from synthetic dyes retailer clean-label ban natural color demand vegan halal kosher carmine-free insect-free 2026`,
    );
    out.push(
      `carmine betanin anthocyanin synthetic red natural color pricing supply chain ${regions} 2026`,
    );
  }
  return out;
}

/**
 * Light query set for the synchronous cron scan — capped at 5 to fit the time
 * budget: top priority competitors + the topic-area sweeps.
 */
export function buildScanQueries(config: IntelConfig): string[] {
  const products = config.target_products.slice(0, 4).join(" ");
  const names =
    config.priority_set.length > 0
      ? config.priority_set
      : config.competitors.map((c) => c.name);
  const queries = names
    .slice(0, 3)
    .map((n) => competitorQuery(n, products));
  queries.push(...topicQueries(config));
  return queries.slice(0, 5);
}

/**
 * Deep query set for the stepwise background job — one query per competitor
 * (company + product/tech) plus the full topic-area sweeps. No cap: each query
 * is its own step/request.
 */
export function buildDeepQueries(config: IntelConfig): string[] {
  const products = config.target_products.slice(0, 4).join(" ");
  const includeCompetitors = config.categories.includes("competitor");
  const competitorQs = includeCompetitors
    ? config.competitors.map((c) => competitorQuery(c.name, products))
    : [];
  return [...competitorQs, ...topicQueries(config)];
}
