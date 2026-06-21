export type CoachCard = { title: string; body: string; kind: string };

const KIND_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  question: { bg: "#e6edf5", fg: "#3a5b86", label: "Spørgsmål" },
  recommendation: { bg: "#e4f0e8", fg: "#3E8E5E", label: "Anbefaling" },
  objection: { bg: "#fbe6e3", fg: "#C0392B", label: "Objection" },
  signal: { bg: "#f6ead4", fg: "#8a5a14", label: "Signal" },
  tip: { bg: "#eee9e7", fg: "#6B5D5A", label: "Tip" },
};

export function CoachPane({
  title,
  accent,
  cards,
  active,
}: {
  title: string;
  accent: string;
  cards: CoachCard[];
  active: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-2">
        <span className="size-2.5 rounded-full" style={{ backgroundColor: accent }} />
        <h2 className="font-display text-sm font-semibold text-foreground">{title}</h2>
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-border text-center">
          <p className="px-6 text-xs text-muted-foreground">
            {active ? "Lytter… kort dukker op når der er noget at arbejde med." : "Ikke aktiv."}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 overflow-y-auto">
          {cards.map((c, i) => {
            const s = KIND_STYLE[c.kind] ?? KIND_STYLE.tip;
            return (
              <div
                key={`${c.title}-${i}`}
                className="animate-in fade-in slide-in-from-bottom-2 rounded-xl border border-[#E7D7D2] bg-white p-3 shadow-sm duration-200"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#1B1418]">{c.title}</p>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: s.bg, color: s.fg }}
                  >
                    {s.label}
                  </span>
                </div>
                <p className="text-[13px] text-[#3a302e]">{c.body}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
