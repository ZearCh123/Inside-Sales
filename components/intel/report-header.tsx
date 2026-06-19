import Link from "next/link";
import { Settings } from "lucide-react";
import type { RunOption } from "@/lib/intel/types";
import { Button } from "@/components/ui/button";
import { MonthSelector } from "./month-selector";
import { ExportPdfButton } from "./export-pdf-button";
import { ScanButton } from "./scan-button";

/** Shared header for the Market Intelligence report tabs (month selector + actions). */
export function ReportHeader({
  runs,
  period,
  title,
  subtitle,
}: {
  runs: RunOption[];
  period: string;
  title: string;
  subtitle: string;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C8362C]">
          Market Intelligence
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <MonthSelector runs={runs} current={period} />
        <Button asChild variant="outline">
          <Link href="/app/settings/intelligence">
            <Settings className="size-4" /> Indstillinger
          </Link>
        </Button>
        <ExportPdfButton period={period} />
        <ScanButton />
      </div>
    </header>
  );
}
