import { getMonthlyView } from "@/lib/intel/queries";
import {
  sortStorylines,
  changeLabel,
  impactChip,
  directionChip,
  periodLabel,
} from "@/lib/intel/format";
import { PrintTrigger } from "@/components/intel/print-trigger";

export default async function MonthlyPrintPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const view = await getMonthlyView(searchParams.period);
  if (!view) {
    return <div className="p-10 text-sm">Ingen rapport at eksportere.</div>;
  }

  const rows = sortStorylines(view.storylines);

  return (
    <div className="mx-auto max-w-3xl bg-white p-10 text-[#1B1418]">
      <PrintTrigger />

      <header className="mb-6 border-b border-[#E7D7D2] pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C8362C]">
          {view.companyName} · Monthly assessment
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold">
          Competitor &amp; Regulatory Radar — {periodLabel(view.period)}
        </h1>
      </header>

      <section className="mb-6">
        <h2 className="mb-1 font-display text-lg font-semibold">
          Net position: {view.verdict}
        </h2>
        <p className="text-sm leading-relaxed text-[#3a302e]">
          {view.netPosition}
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-display text-base font-semibold">
          In-window change log
        </h2>
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="border-b border-[#E7D7D2] text-[10px] uppercase tracking-wider text-[#6B5D5A]">
              <th className="py-1.5 pr-2">Storyline</th>
              <th className="py-1.5 pr-2">Entitet</th>
              <th className="py-1.5 pr-2">Ændring</th>
              <th className="py-1.5 pr-2">Impact</th>
              <th className="py-1.5">Retning</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.storyline_key} className="border-b border-[#f1e7e3] align-top">
                <td className="py-1.5 pr-2 font-medium">{s.headline}</td>
                <td className="py-1.5 pr-2 text-[#6B5D5A]">{s.entity}</td>
                <td className="py-1.5 pr-2">{changeLabel(s.change_status).label}</td>
                <td className="py-1.5 pr-2">{impactChip(s.impact).label}</td>
                <td className="py-1.5">{directionChip(s.direction, s.change_status).label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-display text-base font-semibold">Storylines</h2>
        <div className="space-y-3">
          {rows.map((s) => (
            <div key={s.storyline_key} className="break-inside-avoid">
              <p className="text-sm font-semibold">
                {s.headline}{" "}
                <span className="font-normal text-[#6B5D5A]">— {s.entity}</span>
              </p>
              <p className="text-[12.5px] text-[#3a302e]">{s.detail}</p>
              {s.source_url && (
                <p className="text-[11px] text-[#6B5D5A]">
                  Kilde: {s.source_name} · {s.source_url}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-8 border-t border-[#E7D7D2] pt-3 text-[11px] text-[#6B5D5A]">
        Genereret af {view.companyName} · Sales Intelligence Platform.
      </footer>
    </div>
  );
}
