import { redirect } from "next/navigation";
import { getMonthlyView } from "@/lib/intel/queries";
import { ReportHeader } from "@/components/intel/report-header";
import { ChangeLogTable } from "@/components/intel/change-log-table";

export default async function MarketRegulatoryPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const view = await getMonthlyView(searchParams.period);
  if (!view) redirect("/app/market");

  const rows = view.storylines.filter((s) =>
    ["market", "regulatory", "ip"].includes(s.category),
  );

  return (
    <div className="p-8">
      <ReportHeader
        runs={view.runs}
        period={view.period}
        title="Market trends & regulatory"
        subtitle="Markedssignaler, regulatorisk udvikling og IP/patenter"
      />
      <ChangeLogTable storylines={rows} />
    </div>
  );
}
