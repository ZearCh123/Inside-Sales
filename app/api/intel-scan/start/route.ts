import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { nextMonthPeriod } from "@/lib/intel/scan";
import { startScanJob } from "@/lib/intel/scan-job";

export const maxDuration = 60;

function firstOfThisMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Starts a deep, stepwise background scan. Returns immediately with a jobId;
 * the client drives the steps via /api/intel-scan/step. Requires owner/admin.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .in("role", ["owner", "admin"])
    .limit(1)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json(
      { error: "Kræver owner/admin-rolle" },
      { status: 403 },
    );
  }
  const workspaceId = membership.workspace_id as string;

  const body = (await request.json().catch(() => ({}))) as { period?: string };
  let period = body.period;
  if (!period) {
    const admin = createAdminClient();
    const { data: latest } = await admin
      .from("intel_runs")
      .select("period_month")
      .eq("workspace_id", workspaceId)
      .order("period_month", { ascending: false })
      .limit(1)
      .maybeSingle();
    period = latest?.period_month
      ? nextMonthPeriod(latest.period_month)
      : firstOfThisMonth();
  }

  try {
    const { jobId, totalSteps } = await startScanJob(
      workspaceId,
      user.id,
      period,
    );
    return NextResponse.json({ ok: true, jobId, totalSteps, period });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke starte scan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
