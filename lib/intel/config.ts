import type { IntelConfig } from "./types";

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
  sources: [],
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

/**
 * Builds the web-research queries from the config. Capped at 5 so the scan fits
 * the serverless time budget.
 */
export function buildScanQueries(config: IntelConfig): string[] {
  const products = config.target_products.slice(0, 4).join(" ");
  const regions = config.regions.join(" ");
  const names =
    config.priority_set.length > 0
      ? config.priority_set
      : config.competitors.map((c) => c.name);

  const queries = names
    .slice(0, 3)
    .map((n) => `${n} natural red food color ${products} news 2026`);

  if (config.categories.includes("market")) {
    queries.push(
      `natural color market ${products} replacement fermentation ${regions} 2026`,
    );
  }
  if (config.categories.includes("regulatory") || config.categories.includes("ip")) {
    queries.push(`FDA EFSA ${products} phase-out reformulation regulatory 2026`);
  }
  return queries.slice(0, 5);
}
