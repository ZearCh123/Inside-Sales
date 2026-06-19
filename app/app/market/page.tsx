import { getMonthlyView } from "@/lib/intel/queries";
import { seedJuneData } from "./actions";
import { Button } from "@/components/ui/button";
import { ReportHeader } from "@/components/intel/report-header";
import { KpiCards } from "@/components/intel/kpi-cards";
import { ExecSummary } from "@/components/intel/exec-summary";
import { NetPosition } from "@/components/intel/net-position";
import { ImmediateAttention } from "@/components/intel/immediate-attention";

export default async function ExecutiveSummaryPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const view = await getMonthlyView(searchParams.period);

  if (!view) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-8">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="font-display text-xl font-bold text-foreground">
            Market Intelligence
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Der er endnu ingen rapport. Importér juni-2026-rapporten for at komme i
            gang, eller kør en ny scan.
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
      <ReportHeader
        runs={view.runs}
        period={view.period}
        title="Executive summary"
        subtitle="Net position, risici, muligheder og anbefalede handlinger"
      />

      <div className="space-y-5">
        <KpiCards kpis={view.kpis} />
        <ExecSummary
          risks={view.risks}
          opportunities={view.opportunities}
          recommendedActions={view.recommendedActions}
        />
        <NetPosition verdict={view.verdict} text={view.netPosition} />
        <ImmediateAttention items={immediate} />
      </div>
    </div>
  );
}
