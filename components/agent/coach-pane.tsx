export type CoachCard = { title: string; body: string; kind: string };
export type CoachDebug = {
  model: string;
  system: string;
  user: string;
  response?: string;
};

const KIND_LABEL: Record<string, string> = {
  question: "Spørgsmål",
  recommendation: "Anbefaling",
  objection: "Objection",
  signal: "Signal",
  tip: "Tip",
};

function Card({
  card,
  source,
}: {
  card: CoachCard;
  source: "food" | "commercial";
}) {
  const accent = source === "food" ? "#3E8E5E" : "#C8362C";
  const sourceLabel = source === "food" ? "Tech" : "Sales";
  return (
    <div
      className="rounded-lg border border-[#E7D7D2] bg-white p-2.5 shadow-sm"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <span
          className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
          style={{ backgroundColor: `${accent}1a`, color: accent }}
        >
          {sourceLabel}
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-wide text-[#9a9591]">
          {KIND_LABEL[card.kind] ?? card.kind}
        </span>
      </div>
      <p className="text-[13px] font-semibold leading-snug text-[#1B1418]">
        {card.body}
      </p>
    </div>
  );
}

function ago(updatedAt: number | null): string {
  if (!updatedAt) return "venter…";
  const s = Math.round((Date.now() - updatedAt) / 1000);
  if (s < 5) return "netop nu";
  if (s < 60) return `${s}s siden`;
  return `${Math.round(s / 60)} min siden`;
}

/** One time-horizon box (e.g. 10s / 30s / 1min+) holding the latest coach cards. */
export function HorizonBox({
  label,
  sublabel,
  food,
  commercial,
  updatedAt,
  active,
  showDebug,
  debug,
}: {
  label: string;
  sublabel: string;
  food: CoachCard[];
  commercial: CoachCard[];
  updatedAt: number | null;
  active: boolean;
  showDebug: boolean;
  debug: CoachDebug | null;
}) {
  const empty = food.length === 0 && commercial.length === 0;
  return (
    <div className="flex min-h-0 flex-col rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h2 className="font-display text-sm font-semibold text-foreground">{label}</h2>
          <p className="text-[11px] text-muted-foreground">{sublabel}</p>
        </div>
        <span className="text-[10px] text-muted-foreground">{ago(updatedAt)}</span>
      </div>

      {empty ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border text-center">
          <p className="px-4 text-xs text-muted-foreground">
            {active ? "Lytter…" : "Ikke aktiv."}
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-2.5 overflow-y-auto">
          {food.map((c, i) => (
            <Card key={`f-${c.title}-${i}`} card={c} source="food" />
          ))}
          {commercial.map((c, i) => (
            <Card key={`c-${c.title}-${i}`} card={c} source="commercial" />
          ))}
        </div>
      )}

      {showDebug && debug && (
        <details className="mt-3 rounded-md border border-border bg-secondary/40 p-2 text-[11px]">
          <summary className="cursor-pointer text-muted-foreground">
            Sendt til AI ({debug.model})
          </summary>
          <p className="mt-1 font-semibold text-foreground">System:</p>
          <pre className="whitespace-pre-wrap break-words text-[10px] text-[#3a302e]">{debug.system}</pre>
          <p className="mt-1 font-semibold text-foreground">User:</p>
          <pre className="whitespace-pre-wrap break-words text-[10px] text-[#3a302e]">{debug.user}</pre>
          {debug.response && (
            <>
              <p className="mt-1 font-semibold text-foreground">Svar:</p>
              <pre className="whitespace-pre-wrap break-words text-[10px] text-[#3a302e]">{debug.response}</pre>
            </>
          )}
        </details>
      )}
    </div>
  );
}
