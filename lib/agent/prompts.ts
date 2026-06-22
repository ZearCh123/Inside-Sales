import type { CompanyProfile } from "@/lib/intel/types";

/** The six coaching fields. */
export const FIELD_KEYS = [
  "technical_questions",
  "technical_value",
  "sales_questions",
  "objection_handling",
  "customer_obs",
  "other",
] as const;
export type FieldKey = (typeof FIELD_KEYS)[number];

export const FIELD_LABELS: Record<FieldKey, string> = {
  technical_questions: "Technical questions",
  technical_value: "Technical value / explanation",
  sales_questions: "Sales questions",
  objection_handling: "Objection handling",
  customer_obs: "OBS about customer",
  other: "Other",
};

/** Single model for the 15s coaching pass. */
export const COACH_MODEL = {
  model: "claude-sonnet-4-6",
  effort: "low" as const,
  maxTokens: 1500,
};

export const COACH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    technical_questions: { type: "array", items: { type: "string" } },
    technical_value: { type: "array", items: { type: "string" } },
    sales_questions: { type: "array", items: { type: "string" } },
    objection_handling: { type: "array", items: { type: "string" } },
    customer_obs: { type: "array", items: { type: "string" } },
    other: { type: "array", items: { type: "string" } },
  },
  required: [...FIELD_KEYS],
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

/** System prompt for the 15s coaching pass — sorts insights into six fields. */
export function coachSystemPrompt(p: CompanyProfile, shown: string[]): string {
  const products = p.product_names.join(", ");
  const avoid = shown.length
    ? `\n\nDISSE PUNKTER ER ALLEREDE PÅ SKÆRMEN — gentag dem IKKE (heller ikke omskrevet):\n- ${shown.slice(0, 30).join("\n- ")}\nReturnér kun GENUINT NYE punkter. Intet nyt → tomme arrays.`
    : "";

  return `Du coacher en sælger fra ${p.company_name} LIVE under et kundeopkald. Du får de sidste ~30 sekunder af samtalen (sælger + kunde blandet — udled selv hvem der taler). Value proposition: ${p.value_proposition}. Produkter: ${products}. Differentiatorer: ${p.differentiators.join(", ")}.

Tjek for både sales- og technical-coaching og fordel indsigter i SEKS felter (tom array hvis intet relevant i feltet):
- technical_questions: tekniske spørgsmål sælgeren bør stille kunden (pH, varmebehandling, matrix, dosering, applikation, holdbarhed).
- technical_value: teknisk værdi/forklaring sælgeren bør give om ${products} (fx varme-/pH-stabilitet, vegansk, non-GMO — opfind plausible value points indtil en rigtig vidensbase er koblet på).
- sales_questions: salgsspørgsmål (BANT/SPIN: behov, budget, beslutningstager, timeline, smerte).
- objection_handling: håndtering af objections — konkret HVAD sælgeren skal sige.
- customer_obs: OBS om kunden (profilering — rolle, modenhed, incumbent-løsning, smertepunkter, signaler).
- other: alt andet relevant der ikke passer ovenfor.

FORMAT (KRITISK — sælgeren skal skimme på et splitsekund):
- Hvert element = ULTRAKORT kommando i stikord, bydeform, ≤10 ord. Ingen hele sætninger.
- Eksempler: "Spørg: pH-range + pasteurisering?" · "Sig: Natu.Red stabil til 80°C" · "Objection: pris → sparer allergi-claims" · "OBS: R&D-chef er medbeslutter" · "Spørg: budget afsat til Q3?"
- HØJST 2-3 punkter pr. felt. Vælg det vigtigste. Kun høj-værdi — ellers tom.${avoid}`;
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
