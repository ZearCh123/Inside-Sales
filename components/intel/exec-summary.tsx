function List({
  title,
  items,
  marker,
}: {
  title: string;
  items: string[];
  marker: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#6B5D5A]">
        {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2 text-sm text-[#1B1418]">
            <span aria-hidden className="shrink-0 text-[#C8362C]">
              {marker}
            </span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Executive-summary block: recommended actions, risks and opportunities. */
export function ExecSummary({
  risks,
  opportunities,
  recommendedActions,
}: {
  risks: string[];
  opportunities: string[];
  recommendedActions: string[];
}) {
  if (
    risks.length === 0 &&
    opportunities.length === 0 &&
    recommendedActions.length === 0
  ) {
    return null;
  }
  return (
    <div className="rounded-2xl border border-[#E7D7D2] bg-white p-5">
      <h3 className="mb-3 font-display text-base font-semibold text-[#1B1418]">
        Executive summary
      </h3>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <List title="Anbefalede handlinger" items={recommendedActions} marker="→" />
        <List title="Risici" items={risks} marker="▲" />
        <List title="Muligheder" items={opportunities} marker="◆" />
      </div>
    </div>
  );
}
