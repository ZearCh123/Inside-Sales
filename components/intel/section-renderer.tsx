import type { MonthlyView } from "@/lib/intel/queries";
import type { DisplaySection } from "@/lib/intel/types";
import { KpiCards } from "./kpi-cards";
import { NetPosition } from "./net-position";
import { ImmediateAttention } from "./immediate-attention";

function BulletCard({
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
    <div className="rounded-2xl border border-[#E7D7D2] bg-white p-5">
      <h3 className="mb-3 font-display text-base font-semibold text-[#1B1418]">
        {title}
      </h3>
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

/** Renders one configurable executive-summary section by id. */
export function SectionRenderer({
  section,
  view,
}: {
  section: DisplaySection;
  view: MonthlyView;
}) {
  if (!section.visible) return null;

  switch (section.id) {
    case "kpis":
      return <KpiCards kpis={view.kpis} />;
    case "net_position":
      return <NetPosition verdict={view.verdict} text={view.netPosition} />;
    case "immediate":
      return (
        <ImmediateAttention
          items={view.storylines.filter((s) =>
            view.immediateKeys.includes(s.storyline_key),
          )}
        />
      );
    case "risks":
      return <BulletCard title="Risici" items={view.risks} marker="▲" />;
    case "opportunities":
      return (
        <BulletCard title="Muligheder" items={view.opportunities} marker="◆" />
      );
    case "actions":
      return (
        <BulletCard
          title="Anbefalede handlinger"
          items={view.recommendedActions}
          marker="→"
        />
      );
    default:
      // custom text block
      if (!section.title && !section.body) return null;
      return (
        <div className="rounded-2xl border border-[#E7D7D2] bg-white p-5">
          {section.title && (
            <h3 className="mb-2 font-display text-base font-semibold text-[#1B1418]">
              {section.title}
            </h3>
          )}
          {section.body && (
            <p className="whitespace-pre-wrap text-sm text-[#3a302e]">
              {section.body}
            </p>
          )}
        </div>
      );
  }
}
