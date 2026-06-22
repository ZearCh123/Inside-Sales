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

// Each horizon box has a DISTINCT role so the three boxes complement rather
// than duplicate each other (the seller talks about one topic for >30s).
const TIER_ROLE: Record<Tier, { focus: string; fs: string; cc: string }> = {
  fast: {
    focus: "LIGE NU (de sidste ~10 sekunder) — kun det mest akutte og taktiske.",
    fs: "Det ÉNE tekniske svar/fakta sælgeren har brug for lige nu (fx et stabilitets-/dosis-tal der modsvarer en tvivl kunden netop udtrykte).",
    cc: "Reagér på det der lige skete: håndtér en igangværende objection med en konkret sætning, eller bekræft et købssignal kunden lige gav.",
  },
  medium: {
    focus: "KONTEKST (de sidste ~30 sekunder) — det aktuelle emne/tråd.",
    fs: "Det bedste UDDYBENDE tekniske spørgsmål for at forstå behovet (pH-range, matrix, proces, dosering, holdbarhed) — IKKE et svar, men et spørgsmål der graver dybere.",
    cc: "Det bedste discovery-spørgsmål (SPIN/BANT-need) der afdækker behov, beslutningsproces eller smertepunkt på det aktuelle emne.",
  },
  deep: {
    focus: "STRATEGI (det sidste minut+) — det overordnede billede, ikke enkelt-replikker.",
    fs: "Produkt-fit & anbefaling: hvilket af produkterne passer bedst og hvilke value points sælgeren bør lande — strategisk, ikke et enkelt spørgsmål.",
    cc: "Hvor er dealen (MEDDIC/BANT: budget, beslutningstager, behov, timeline, hvad mangler) og hvad sælgeren bør styre samtalen mod / sætte som næste skridt.",
  },
};

/** System prompt for one horizon box, role-specialised + de-duplicated. */
export function coachSystemPrompt(
  p: CompanyProfile,
  tier: Tier,
  shown: string[],
): string {
  const products = p.product_names.join(", ");
  const role = TIER_ROLE[tier];
  const avoid = shown.length
    ? `\n\nDISSE KORT VISES ALLEREDE — gentag dem IKKE (heller ikke i let omskrevet form):\n- ${shown.join("\n- ")}\nReturnér kun kort med GENUINT NYT indhold. Hvis der intet nyt er ud over ovenstående, returnér TOMME lister.`
    : "";

  return `Du coacher en sælger fra ${p.company_name} LIVE under et kundeopkald. Du modtager et uddrag af samtalen (sælger + kunde blandet — udled selv hvem der taler).

DENNE BOKS' FOKUS: ${role.focus}

FOOD SCIENTIST (food_scientist[]): Du er PhD food scientist-specialist i ${p.company_name}'s farver (${products}). Value proposition: ${p.value_proposition}. Differentiatorer: ${p.differentiators.join(", ")}.
- ${role.fs}
- Opfind realistiske tekniske fordele (pH-/varme-stabilitet, vegansk, non-GMO) indtil en rigtig vidensbase er koblet på.

COMMERCIAL COACH (commercial[]): Du er top sales coach (BANT, Miller Heiman, MEDDIC, SPIN).
- ${role.cc}
- Ved objection: giv en konkret sætning sælgeren kan sige.

FORMAT (KRITISK — sælgeren er presset og skal kunne skimme på et splitsekund):
- title = 2-4 ords etiket (fx "pH & varme", "Pris-objection", "Beslutningstager").
- body = ULTRAKORT KOMMANDO i stikord, bydeform, ≤10 ord. Ingen hele sætninger. Mønstre:
  · Spørgsmål → "Spørg: pH-range + varmebehandling?"
  · Objection → "Objection: pris. Sig: sparer allergi-reklamationer."
  · Signal → "Signal: sagde 'vegansk'. Grav i hvorfor."
  · Anbefaling → "Pitch: Natu.Red — varmestabil til 80°C."
- Brug "→" og kolon, ikke fyldord. Aldrig "Du kunne overveje at…". Bare kommandoen.

REGLER:
- Bliv inden for DENNE BOKS' fokus — overlad det taktiske til "lige nu"-boksen og det strategiske til "strategi"-boksen.
- HØJST 2 kort pr. side. kind ∈ question|recommendation|objection|signal|tip.
- Returnér KUN høj-værdi kort; ellers TOMME lister.${avoid}`;
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
