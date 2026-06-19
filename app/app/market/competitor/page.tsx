import { redirect } from "next/navigation";
import { getMonthlyView } from "@/lib/intel/queries";
import { ReportHeader } from "@/components/intel/report-header";
import { ChangeLogTable } from "@/components/intel/change-log-table";
import { ThreatDossiers } from "@/components/intel/threat-dossiers";

export default async function CompetitorPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const view = await getMonthlyView(searchParams.period);
  if (!view) redirect("/app/market");

  const competitorStorylines = view.storylines.filter(
    (s) => s.category === "competitor",
  );

  return (
    <div className="p-8">
      <ReportHeader
        runs={view.runs}
        period={view.period}
        title="Competitor"
        subtitle="Company-, produkt- og teknologi-updates fra konkurrent-universet"
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_1fr]">
        <ChangeLogTable storylines={competitorStorylines} />
        <ThreatDossiers competitors={view.competitors} />
      </div>
    </div>
  );
}
