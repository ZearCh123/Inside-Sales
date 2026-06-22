import type { CompanyProfile } from "@/lib/intel/types";

export type Tier = "fast" | "medium" | "deep";

/** Model + reasoning per horizon box (10s reactive → 1min+ considered). */
export const TIER_CONFIG: Record<
  Tier,
  { model: string; effort?: "low" | "medium" | "high"; thinking?: boolean; maxTokens: number }
> = {
  // Haiku does NOT accept the effort parameter — omit it.
  fast: { model: "claude-haiku-4-5", maxTokens: 900 },
  medium: { model: "claude-sonnet-4-6", effort: "low", maxTokens: 1200 },
  deep: { model: "claude-sonnet-4-6", effort: "high", thinking: true, maxTokens: 1800 },
};

const CARD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    body: { type: "string" },
    kind: {
      type: "string",
      enum: ["question", "recommendation", "objection", "signal", "tip"],
    },
  },
  required: ["title", "body", "kind"],
} as const;

export const COACH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    food_scientist: { type: "array", items: CARD_SCHEMA },
    commercial: { type: "array", items: CARD_SCHEMA },
  },
  required: ["food_scientist", "commercial"],
} as const;

export const SUMMARY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    improvements: { type: "array", items: { type: "string" } },
    praise: { type: "array", items: { type: "string" } },
    action_points: { type: "array", items: { type: "string" } },
    headline: { type: "string" },
  },
  required: ["improvements", "praise", "action_points", "headline"],
} as const;

/** System prompt for the live coach (food scientist + commercial coach). */
export function coachSystemPrompt(p: CompanyProfile): string {
  const products = p.product_names.join(", ");
  return `Du coacher en sælger fra ${p.company_name} LIVE under et kundeopkald. Du modtager et nyligt uddrag af samtalen (sælger + kunde blandet i én transskription — udled selv hvem der taler).

Returnér to slags kort:

FOOD SCIENTIST (food_scientist[]): Du er PhD food scientist-specialist i ${p.company_name}'s farver (${products}). Value proposition: ${p.value_proposition}. Differentiatorer: ${p.differentiators.join(", ")}.
- Foreslå skarpe tekniske afklaringsspørgsmål sælgeren bør stille kunden (pH, varmebehandling, applikation, dosering, matrix, holdbarhed).
- Giv produkt-anbefalinger med konkrete, plausible value points for ${products} (opfind realistiske tekniske fordele — fx pH-/varme-stabilitet, vegansk, non-GMO — indtil en rigtig vidensbase er koblet på).

COMMERCIAL COACH (commercial[]): Du er en top sales coach (BANT, Miller Heiman, MEDDIC, SPIN).
- Ved en OBJECTION: giv en konkret håndtering i body — fx "Anerkend → omfram → stil et spørgsmål", med en sætning sælgeren faktisk kan sige.
- Påpeg også købssignaler kunden gav, og hvor sælgeren bør grave dybere.

REGLER:
- Returnér KUN høj-værdi kort. Hvis der intet nyt og relevant er i dette uddrag, returnér TOMME lister.
- HØJST 2 kort pr. side — vælg det vigtigste. title = kort (≤6 ord). body = 1-2 konkrete danske sætninger sælgeren kan handle på MED DET SAMME. kind ∈ question|recommendation|objection|signal|tip.
- Sælgeren læser dette midt i en samtale — vær skarp og konkret, ikke generisk.`;
}

/** System prompt for the end-of-call summary. */
export function summarySystemPrompt(p: CompanyProfile): string {
  return `Du er sales coach for ${p.company_name}. Du får hele transskriptionen af et afsluttet kundeopkald (sælger + kunde i én tekst). Lav en kort, ærlig efter-opkald-evaluering på dansk:
- headline: ét ord/kort frase om hvordan opkaldet gik.
- praise: 2-4 ting sælgeren gjorde godt.
- improvements: 2-4 konkrete forbedringspunkter.
- action_points: 2-4 konkrete næste skridt over for KUNDEN (opfølgning, materiale, spørgsmål).
Vær konkret og henvis til hvad der faktisk blev sagt.`;
}
