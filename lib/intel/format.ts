import type {
  IntelChange,
  IntelDirection,
  IntelImpact,
  KpiTone,
  Storyline,
  ThreatTrajectory,
} from "./types";

/** Badge palette from the design prototype (Monthly assessment screen). */
export const CHIP: Record<
  "hi" | "med" | "head" | "tail" | "neu" | "blue",
  { bg: string; fg: string }
> = {
  hi: { bg: "#D33A3A", fg: "#ffffff" },
  med: { bg: "#f6ead4", fg: "#8a5a14" },
  head: { bg: "#fbe6e3", fg: "#C0392B" },
  tail: { bg: "#e4f0e8", fg: "#3E8E5E" },
  neu: { bg: "#eee9e7", fg: "#6B5D5A" },
  blue: { bg: "#e6edf5", fg: "#3a5b86" },
};

export const KPI_STRIP: Record<KpiTone, string> = {
  tail: "#3E8E5E",
  head: "#C0392B",
  med: "#C9882F",
  neutral: "#9a9591",
};

export const KPI_CAPTION_COLOR: Record<KpiTone, string> = {
  tail: "#3E8E5E",
  head: "#C0392B",
  med: "#C9882F",
  neutral: "#9a9591",
};

/** Formats a YYYY-MM-DD period as a Danish "Måned ÅÅÅÅ" label. */
export function periodLabel(period: string): string {
  const months = [
    "Januar", "Februar", "Marts", "April", "Maj", "Juni",
    "Juli", "August", "September", "Oktober", "November", "December",
  ];
  const [y, m] = period.split("-");
  return `${months[Number(m) - 1]} ${y}`;
}

/** Change-status → emoji + Danish label for the change-log "Ændring" column. */
export function changeLabel(c: IntelChange): { emoji: string; label: string } {
  switch (c) {
    case "new":
      return { emoji: "🆕", label: "Ny" };
    case "escalating":
      return { emoji: "⬆", label: "Eskalerer" };
    case "ongoing":
      return { emoji: "➡", label: "Ongoing" };
    case "cooling":
      return { emoji: "⬇", label: "Køler af" };
    case "resolved":
      return { emoji: "✅", label: "Afsluttet" };
  }
}

export function impactChip(i: IntelImpact): { cls: keyof typeof CHIP; label: string } {
  if (i === "high") return { cls: "hi", label: "High" };
  if (i === "medium") return { cls: "med", label: "Med" };
  return { cls: "neu", label: "Low" };
}

const TREND_ARROW: Record<IntelChange, string> = {
  new: "↑",
  escalating: "↑",
  ongoing: "→",
  cooling: "↓",
  resolved: "→",
};

/** Direction → chip for the "Retning for CHR" column. */
export function directionChip(
  d: IntelDirection,
  change: IntelChange,
): { cls: keyof typeof CHIP; label: string } {
  const arrow = TREND_ARROW[change];
  switch (d) {
    case "tailwind":
      return { cls: "tail", label: `Medvind ${arrow}` };
    case "headwind":
      return { cls: "head", label: `Modvind ${arrow}` };
    case "mixed":
      return { cls: "neu", label: `Blandet ${arrow}` };
    case "neutral":
      return { cls: "neu", label: `Neutral ${arrow}` };
  }
}

/** Competitor threat trajectory → dossier badge. */
export function trajectoryChip(
  t: ThreatTrajectory | null,
): { cls: keyof typeof CHIP; label: string } {
  switch (t) {
    case "rising":
      return { cls: "head", label: "↑ Stigende" };
    case "receding":
      return { cls: "tail", label: "↓ Aftagende" };
    case "stable":
    default:
      return { cls: "neu", label: "→ Stabil" };
  }
}

const IMPACT_RANK: Record<IntelImpact, number> = { high: 3, medium: 2, low: 1 };
const CHANGE_RANK: Record<IntelChange, number> = {
  new: 5,
  escalating: 4,
  ongoing: 3,
  cooling: 2,
  resolved: 1,
};

/** Orders storylines for the change-log: biggest impact + freshest change first. */
export function sortStorylines(rows: Storyline[]): Storyline[] {
  return [...rows].sort(
    (a, b) =>
      IMPACT_RANK[b.impact] - IMPACT_RANK[a.impact] ||
      CHANGE_RANK[b.change_status] - CHANGE_RANK[a.change_status],
  );
}

/**
 * Derives the 4 KPI counts from storylines, used as a fallback when a stored
 * snapshot payload has no precomputed `kpis`.
 */
export function deriveKpiCounts(rows: Storyline[]) {
  const threatsRising = rows.filter(
    (r) =>
      r.category === "competitor" &&
      (r.change_status === "new" || r.change_status === "escalating") &&
      r.impact === "high",
  );
  const tailwinds = rows.filter((r) => r.direction === "tailwind");
  const highImpact = rows.filter((r) => r.impact === "high");
  return {
    threatsRising: threatsRising.length,
    threatsRisingEntities: threatsRising.map((r) => r.entity),
    tailwinds: tailwinds.length,
    highImpact: highImpact.length,
  };
}
