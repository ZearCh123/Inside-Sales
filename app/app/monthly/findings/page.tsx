import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getFindingsTracker } from "@/lib/intel/tracker";
import { periodLabel, changeLabel, impactChip, CHIP } from "@/lib/intel/format";

const CATEGORY_LABEL: Record<string, string> = {
  competitor: "Konkurrent",
  market: "Marked",
  regulatory: "Regulatorisk",
  ip: "IP",
};

function shortPeriod(period: string): string {
  return periodLabel(period).replace(/(\w{3})\w*\s(\d{2})(\d{2})/, "$1 '$3");
}

export default async function FindingsTrackerPage() {
  const tracker = await getFindingsTracker();

  if (!tracker) {
    return (
      <div className="p-8">
        <Link
          href="/app/monthly"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Tilbage
        </Link>
        <p className="text-sm text-muted-foreground">
          Ingen findings endnu. Kør et scan eller importér juni-data.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <Link
        href="/app/monthly"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Tilbage til rapporten
      </Link>

      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Findings-tracker
        </h1>
        <p className="text-sm text-muted-foreground">
          Alle findings analysen refererer til — og hvordan hver enkelt udvikler sig
          måned for måned (delta). {tracker.rows.length} findings over{" "}
          {tracker.months.length} måned(er).
        </p>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-[#E7D7D2] bg-white">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-[#E7D7D2]">
              <th className="sticky left-0 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#6B5D5A]">
                Finding
              </th>
              <th className="px-2 py-2 text-[11px] font-bold uppercase tracking-wider text-[#6B5D5A]">
                Emne
              </th>
              {tracker.months.map((m) => (
                <th
                  key={m}
                  className="px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-[#6B5D5A]"
                >
                  {shortPeriod(m)}
                </th>
              ))}
              <th className="px-2 py-2 text-[11px] font-bold uppercase tracking-wider text-[#6B5D5A]">
                Kilde
              </th>
            </tr>
          </thead>
          <tbody>
            {tracker.rows.map((row) => (
              <tr
                key={row.storyline_key}
                className="border-b border-[#f1e7e3] align-top hover:bg-[#fcf6f4]"
              >
                <td className="sticky left-0 bg-white px-3 py-2.5">
                  <p className="text-sm font-medium text-[#1B1418]">
                    {row.headline}
                  </p>
                  <p className="text-[11px] text-[#6B5D5A]">{row.entity}</p>
                </td>
                <td className="px-2 py-2.5 text-xs text-[#6B5D5A]">
                  {CATEGORY_LABEL[row.category] ?? row.category}
                </td>
                {tracker.months.map((m) => {
                  const cell = row.byPeriod[m];
                  if (!cell) {
                    return (
                      <td key={m} className="px-2 py-2.5 text-center text-[#cbbdb8]">
                        ·
                      </td>
                    );
                  }
                  const ch = changeLabel(cell.change_status);
                  const imp = impactChip(cell.impact);
                  const c = CHIP[imp.cls];
                  return (
                    <td key={m} className="px-2 py-2.5 text-center">
                      <span
                        title={`${ch.label} · impact ${imp.label}`}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{ backgroundColor: c.bg, color: c.fg }}
                      >
                        <span aria-hidden>{ch.emoji}</span>
                        {imp.label}
                      </span>
                    </td>
                  );
                })}
                <td className="px-2 py-2.5">
                  {row.source_url ? (
                    <a
                      href={row.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-medium text-[#C8362C] hover:underline"
                    >
                      ↗ {row.source_name ?? "Kilde"}
                    </a>
                  ) : (
                    <span className="text-[11px] text-[#cbbdb8]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Hver celle viser findingens status den måned (🆕 Ny · ⬆ Eskalerer · ➡ Ongoing
        · ⬇ Køler af · ✅ Afsluttet) farvet efter impact. Tom (·) = ikke nævnt den måned.
      </p>
    </div>
  );
}
