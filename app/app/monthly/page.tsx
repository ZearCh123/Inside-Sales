import { getMonthlyView } from "@/lib/intel/queries";
import { seedJuneData } from "./actions";
import { Button } from "@/components/ui/button";
import { KpiCards } from "@/components/intel/kpi-cards";
import { ImmediateAttention } from "@/components/intel/immediate-attention";
import { ChangeLogTable } from "@/components/intel/change-log-table";
import { NetPosition } from "@/components/intel/net-position";
import { ThreatDossiers } from "@/components/intel/threat-dossiers";
import { MonthSelector } from "@/components/intel/month-selector";
import { ScanButton } from "@/components/intel/scan-button";
import { ExportPdfButton } from "@/components/intel/export-pdf-button";

export default async function MonthlyPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const view = await getMonthlyView(searchParams.period);

  // Empty state — no intel runs yet.
  if (!view) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-8">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="font-display text-xl font-bold text-foreground">
            Monthly assessment
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Der er endnu ingen intelligence-rapport. Importér juni-2026-rapporten
            for at komme i gang, eller kør en ny scan.
          </p>
          <form action={seedJuneData} className="mt-6">
            <Button type="submit" className="w-full">
              Importér juni-2026-data
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const immediate = view.storylines.filter((s) =>
    view.immediateKeys.includes(s.storyline_key),
  );

  return (
    <div className="p-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C8362C]">
            Monthly assessment
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
            Competitor &amp; Regulatory Radar
          </h1>
          <p className="text-sm text-muted-foreground">
            Hvad ændrede sig denne måned — og i hvis favør
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthSelector runs={view.runs} current={view.period} />
          <ExportPdfButton period={view.period} />
          <ScanButton />
        </div>
      </header>

      <div className="mb-6">
        <KpiCards kpis={view.kpis} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-5">
          <ImmediateAttention items={immediate} />
          <ChangeLogTable storylines={view.storylines} />
        </div>
        <div className="space-y-5">
          <NetPosition verdict={view.verdict} text={view.netPosition} />
          <ThreatDossiers competitors={view.competitors} />
        </div>
      </div>
    </div>
  );
}
