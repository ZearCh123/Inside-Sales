import { createAdminClient } from "@/lib/supabase/admin";
import { createAnthropic, INTEL_MODEL } from "@/lib/anthropic";
import { tavilySearch, type TavilyResult } from "@/lib/tavily";
import type {
  Competitor,
  IntelConfig,
  IntelSnapshotPayload,
  Kpi,
  Storyline,
} from "./types";
import { deriveKpiCounts } from "./format";
import { buildScanQueries, loadIntelConfig, allDomains } from "./config";

type ScanInput = {
  workspaceId: string;
  periodMonth: string; // YYYY-MM-DD (first of month)
  createdBy: string | null;
};

// LLM output shape — uses "none" sentinels instead of null so the JSON schema
// stays simple; mapped back to null before insertion.
type ScanStoryline = {
  storyline_key: string;
  entity: string;
  category: "competitor" | "market" | "regulatory" | "ip";
  change_status: "new" | "escalating" | "ongoing" | "cooling" | "resolved";
  impact: "high" | "medium" | "low";
  threat: "high" | "medium" | "low" | "none";
  confidence: "confirmed" | "likely" | "unverified";
  direction: "tailwind" | "headwind" | "neutral" | "mixed";
  trajectory: "rising" | "stable" | "receding" | "none";
  headline: string;
  detail: string;
  source_name: string;
  source_url: string;
};

export type ScanResult = {
  verdict: string;
  net_position: string;
  storylines: ScanStoryline[];
  immediate_keys: string[];
  risks: string[];
  opportunities: string[];
  recommended_actions: string[];
};

const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdict: { type: "string", enum: ["Styrket", "Holdt", "Eroderet"] },
    net_position: { type: "string" },
    immediate_keys: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    opportunities: { type: "array", items: { type: "string" } },
    recommended_actions: { type: "array", items: { type: "string" } },
    storylines: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          storyline_key: { type: "string" },
          entity: { type: "string" },
          category: {
            type: "string",
            enum: ["competitor", "market", "regulatory", "ip"],
          },
          change_status: {
            type: "string",
            enum: ["new", "escalating", "ongoing", "cooling", "resolved"],
          },
          impact: { type: "string", enum: ["high", "medium", "low"] },
          threat: { type: "string", enum: ["high", "medium", "low", "none"] },
          confidence: {
            type: "string",
            enum: ["confirmed", "likely", "unverified"],
          },
          direction: {
            type: "string",
            enum: ["tailwind", "headwind", "neutral", "mixed"],
          },
          trajectory: {
            type: "string",
            enum: ["rising", "stable", "receding", "none"],
          },
          headline: { type: "string" },
          detail: { type: "string" },
          source_name: { type: "string" },
          source_url: { type: "string" },
        },
        required: [
          "storyline_key",
          "entity",
          "category",
          "change_status",
          "impact",
          "threat",
          "confidence",
          "direction",
          "trajectory",
          "headline",
          "detail",
          "source_name",
          "source_url",
        ],
      },
    },
  },
  required: [
    "verdict",
    "net_position",
    "immediate_keys",
    "risks",
    "opportunities",
    "recommended_actions",
    "storylines",
  ],
} as const;

const SYSTEM_PROMPT = `Du er en månedlig market-intelligence-analytiker for en virksomhed, der overvåger sine konkurrenter og vil erstatte/udkonkurrere bestemte target-produkter (angives nedenfor).

Dæk disse fire emner systematisk ud fra web-research-uddragene:
1. COMPANY UPDATES (konkurrenter): funding-runder, nye investorer, ledelses-skift, hiring, nye kontorer/produktionssites, partnerskaber, M&A.
2. PRODUCT & TECHNOLOGY: nye farve-lanceringer, nye pigment-platforme, claims (varme-/pH-stabilitet, vegansk, naturlighed, bæredygtighed, skalerbarhed), target-applikationer (mejeri, konfekture, drikkevarer, kød, plantebaseret, kosmetik, tekstil).
3. REGULATORY & IP: FDA/EFSA/EU/UK/LATAM/APAC farve-regulering, Red 3/Red 40-udvikling, restriktioner på syntetiske farver, godkendelser/indsigelser for fermenterede farver, patent-ansøgninger/grants/assignments/licensering, COSMOS-certificering.
4. MARKET SIGNALS: brand-reformuleringer væk fra syntetiske farver, retailer-bans/clean-label-politikker, kunde-efterspørgsel (vegansk/halal/kosher/carmine-fri/insekt-fri), pris- og supply-signaler (carmine, betanin, anthocyaniner, syntetiske røde).

Syntetisér til strukturerede storylines. Regler:
- Klassificér hver storyline: category (competitor/market/regulatory/ip), impact (high/medium/low), threat mod virksomheden (high/medium/low, eller "none" for ikke-konkurrent), confidence (confirmed/likely/unverified), direction for virksomheden (tailwind/headwind/neutral/mixed), trajectory for konkurrenter (rising/stable/receding, ellers "none").
- STABIL storyline_key (kebab-case). Genbrug nøgler fra forrige snapshot ved samme historie; sæt change_status ud fra forrige snapshot (fandtes før → escalating/ongoing/cooling; ny → new; afsluttet → resolved).
- headline = kort dansk label (3-6 ord). detail = 1-2 paraphrasede danske sætninger (citér aldrig). Angiv ALTID source_name + source_url — prioritér troværdige, sporbare kilder.

Producér også executive summary (3-siders rapport):
- net_position = ét dansk afsnit: styrkede/holdt/eroderede virksomhedens position, og hvorfor. verdict = ét ord (Styrket/Holdt/Eroderet).
- risks = 2-4 vigtigste risici. opportunities = 2-4 vigtigste muligheder. recommended_actions = 2-4 konkrete, handlingsorienterede anbefalinger.
- immediate_keys = storyline_keys for de 2-4 mest hastende high-impact-trusler/åbninger.

Vær konkret og beslutnings-orienteret (læseren er CEO/commercial lead). Undlad at opdigte; hvis research er tynd for et emne, så sig det og medtag færre storylines.`;

/** Builds the analyst system prompt framed entirely around the workspace's company profile. */
function buildSystemPrompt(config: IntelConfig): string {
  const p = config.company_profile;
  const list = (label: string, items: string[]) =>
    items.length ? `\n- ${label}: ${items.join("; ")}.` : "";
  const topics = config.topics
    .filter((t) => t.enabled)
    .map((t) => `${t.label} (${t.keywords.slice(0, 8).join(", ")})`)
    .join("\n- ");

  return (
    `Du er market-intelligence-analytiker for ${p.company_name}.` +
    `\nVirksomheden: ${p.value_proposition}` +
    list("Produkter", p.product_names) +
    list("Differentiatorer", p.differentiators) +
    list("Target-produkter de overvåger/vil erstatte", p.target_products) +
    (p.icp ? `\n- ICP: ${p.icp}.` : "") +
    list("Gains (det de vinder på)", p.gains) +
    list("Pains (det der gør ondt)", p.pains) +
    list("Threats (trusler)", p.threats) +
    list("Barriers (barrierer)", p.barriers) +
    `\n\nDæk disse emner systematisk ud fra web-research-uddragene:\n- ${topics}\n\n` +
    SYSTEM_PROMPT +
    `\n\nVURDÉR ALT FRA ${p.company_name.toUpperCase()}'S SYNSVINKEL: direction = medvind (godt for ${p.company_name}) / modvind (skidt) ud fra deres gains/pains/threats/barriers. verdict, net_position, risks, opportunities og recommended_actions skal rammes ind om netop ${p.company_name}'s situation — ikke en generisk vurdering.` +
    (config.analysis.extra_instructions
      ? `\n\nWorkspace-specifikke instruktioner fra admin:\n${config.analysis.extra_instructions}`
      : "")
  );
}

/** Loads the most recent prior snapshot's storylines for delta context. */
export async function loadPriorStorylines(
  workspaceId: string,
  periodMonth: string,
): Promise<Storyline[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("intel_snapshots")
    .select("payload")
    .eq("workspace_id", workspaceId)
    .lt("period_month", periodMonth)
    .order("period_month", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.payload as IntelSnapshotPayload | undefined)?.storylines ?? [];
}

/** Calls Claude to synthesise research + prior storylines into a structured report. */
export async function synthesizeScan(args: {
  config: IntelConfig;
  period: string;
  priorStorylines: Storyline[];
  research: TavilyResult[];
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<ScanResult> {
  const { config, period, priorStorylines, research } = args;
  const anthropic = createAnthropic();

  const priorContext = priorStorylines.length
    ? priorStorylines
        .map((s) => `- ${s.storyline_key} [${s.change_status}/${s.impact}] ${s.headline}`)
        .join("\n")
    : "(ingen tidligere snapshot — alt er nyt)";

  const researchContext = research
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.content}`)
    .join("\n\n");

  const userMsg = `Periode: ${period}\n\nForrige måneds storylines (til delta):\n${priorContext}\n\nWeb-research-uddrag:\n${researchContext}`;

  const stream = anthropic.messages.stream({
    model: INTEL_MODEL,
    max_tokens: args.maxTokens ?? 6000,
    thinking: { type: "adaptive" },
    system: buildSystemPrompt(config),
    output_config: {
      effort: args.effort ?? "low",
      format: { type: "json_schema", schema: RESULT_SCHEMA },
    },
    messages: [{ role: "user", content: userMsg }],
  } as Parameters<typeof anthropic.messages.stream>[0]);

  const message = await stream.finalMessage();
  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Scan-agenten returnerede intet svar.");
  }
  return JSON.parse(textBlock.text) as ScanResult;
}

/** Persists a synthesised result as a new run + storylines + competitors + snapshot. */
export async function persistScanResult(args: {
  workspaceId: string;
  period: string;
  createdBy: string | null;
  result: ScanResult;
}): Promise<{ runId: string; storylineCount: number }> {
  const { workspaceId, period, createdBy, result } = args;
  const admin = createAdminClient();

  const storylines: Storyline[] = result.storylines.map((s) => ({
    storyline_key: s.storyline_key,
    entity: s.entity,
    category: s.category,
    change_status: s.change_status,
    impact: s.impact,
    threat: s.threat === "none" ? null : s.threat,
    confidence: s.confidence,
    direction: s.direction,
    trajectory: s.trajectory === "none" ? null : s.trajectory,
    headline: s.headline,
    detail: s.detail,
    source_name: s.source_name,
    source_url: s.source_url,
  }));

  const competitorMap = new Map<string, Competitor>();
  for (const s of storylines) {
    if (s.category !== "competitor" || competitorMap.has(s.entity)) continue;
    competitorMap.set(s.entity, {
      name: s.entity,
      segment: null,
      country: null,
      relevance: s.threat ? `Trussel: ${s.threat}` : null,
      threat_trajectory: s.trajectory,
      notes: s.detail,
    });
  }
  const competitors = Array.from(competitorMap.values());

  const counts = deriveKpiCounts(storylines);
  const tailwindLabel =
    storylines.find((s) => s.direction === "tailwind" && s.impact === "high")
      ?.headline ?? "regulatorisk medvind";
  const kpis: Kpi[] = [
    {
      label: "Net position",
      value: result.verdict,
      caption:
        result.verdict === "Styrket"
          ? "↑ men stigende konkurrence"
          : "vs. forrige måned",
      tone: result.verdict === "Eroderet" ? "head" : "tail",
    },
    {
      label: "Trusler stigende",
      value: String(counts.threatsRising),
      caption: counts.threatsRisingEntities.length
        ? `↑ ${counts.threatsRisingEntities.slice(0, 2).join(" · ")}`
        : "ingen nye",
      tone: "head",
    },
    {
      label: "Medvind",
      value: String(counts.tailwinds),
      caption: `↑ ${tailwindLabel}`,
      tone: "tail",
    },
    {
      label: "High-impact events",
      value: String(counts.highImpact),
      caption: "i dette vindue",
      tone: "neutral",
    },
  ];

  const snapshot: IntelSnapshotPayload = {
    period,
    verdict: result.verdict,
    net_position: result.net_position,
    kpis,
    immediate_keys: result.immediate_keys,
    storylines,
    competitors,
    risks: result.risks,
    opportunities: result.opportunities,
    recommended_actions: result.recommended_actions,
  };

  await admin
    .from("intel_runs")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("period_month", period);
  await admin
    .from("intel_snapshots")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("period_month", period);

  const { data: run, error: runErr } = await admin
    .from("intel_runs")
    .insert({
      workspace_id: workspaceId,
      period_month: period,
      status: "complete",
      net_position: result.net_position,
      summary: result.verdict,
      model: INTEL_MODEL,
      created_by: createdBy || null,
    })
    .select("id")
    .single();
  if (runErr) throw runErr;

  if (storylines.length) {
    const { error: storyErr } = await admin.from("intel_storylines").insert(
      storylines.map((s) => ({ workspace_id: workspaceId, run_id: run.id, ...s })),
    );
    if (storyErr) throw storyErr;
  }

  for (const c of competitors) {
    const { data: existing } = await admin
      .from("intel_competitors")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("name", c.name)
      .maybeSingle();
    if (existing) {
      await admin
        .from("intel_competitors")
        .update({ ...c, last_seen_run: run.id })
        .eq("id", existing.id);
    } else {
      await admin
        .from("intel_competitors")
        .insert({ workspace_id: workspaceId, last_seen_run: run.id, ...c });
    }
  }

  await admin.from("intel_snapshots").insert({
    workspace_id: workspaceId,
    period_month: period,
    payload: snapshot,
  });

  return { runId: run.id, storylineCount: storylines.length };
}

/**
 * Synchronous monthly scan (used by the cron path). Light: parallel basic
 * searches + low-effort synthesis, sized to fit the serverless time budget.
 * The manual UI uses the deeper, stepwise background job (see scan-job.ts).
 */
export async function runIntelScan({
  workspaceId,
  periodMonth,
  createdBy,
}: ScanInput): Promise<{ runId: string; storylineCount: number }> {
  const config = await loadIntelConfig(workspaceId);
  const priorStorylines = await loadPriorStorylines(workspaceId, periodMonth);
  const queries = buildScanQueries(config);
  const domains = allDomains(config);
  const research = (
    await Promise.all(queries.map((q) => tavilySearch(q, 4, "basic", domains)))
  ).flat();
  const result = await synthesizeScan({
    config,
    period: periodMonth,
    priorStorylines,
    research,
  });
  return persistScanResult({ workspaceId, period: periodMonth, createdBy, result });
}

/** Returns the first day of the month after the given YYYY-MM-DD date. */
export function nextMonthPeriod(period: string): string {
  const d = new Date(period + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + 1, 1);
  return d.toISOString().slice(0, 10);
}
