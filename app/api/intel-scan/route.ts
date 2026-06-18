import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runIntelScan, nextMonthPeriod } from "@/lib/intel/scan";

// The scan calls Tavily + Claude and may run for a while.
export const maxDuration = 300;

function firstOfThisMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/** Resolves the target period: explicit, else month-after-latest-run, else this month. */
async function resolvePeriod(
  workspaceId: string,
  explicit?: string,
): Promise<string> {
  if (explicit) return explicit;
  const admin = createAdminClient();
  const { data: latest } = await admin
    .from("intel_runs")
    .select("period_month")
    .eq("workspace_id", workspaceId)
    .order("period_month", { ascending: false })
    .limit(1)
    .maybeSingle();
  return latest?.period_month
    ? nextMonthPeriod(latest.period_month)
    : firstOfThisMonth();
}

async function executeScan(
  workspaceId: string,
  createdBy: string | null,
  explicitPeriod?: string,
) {
  const period = await resolvePeriod(workspaceId, explicitPeriod);
  try {
    const { runId, storylineCount } = await runIntelScan({
      workspaceId,
      periodMonth: period,
      createdBy,
    });
    return NextResponse.json({ ok: true, runId, period, storylineCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scan fejlede";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function isCron(request: NextRequest): boolean {
  return (
    !!process.env.CRON_SECRET &&
    request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`
  );
}

/** Resolves the Chromologics workspace id (single-tenant cron target). */
async function chromologicsWorkspaceId(): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("workspaces")
    .select("id")
    .eq("slug", "chromologics")
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Vercel Cron hits this with GET + `Authorization: Bearer ${CRON_SECRET}`.
 * Targets the Chromologics workspace and the next un-scanned month.
 */
export async function GET(request: NextRequest) {
  if (!isCron(request)) {
    return NextResponse.json({ error: "Uautoriseret" }, { status: 401 });
  }
  const workspaceId = await chromologicsWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Intet workspace" }, { status: 400 });
  }
  return executeScan(workspaceId, null);
}

/**
 * Manual trigger from the UI. Requires a logged-in owner/admin. Optional body
 * `{ period: "YYYY-MM-DD" }`; otherwise targets the next un-scanned month.
 */
export async function POST(request: NextRequest) {
  // Allow cron to POST too, for flexibility.
  if (isCron(request)) {
    const workspaceId = await chromologicsWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "Intet workspace" }, { status: 400 });
    }
    return executeScan(workspaceId, null);
  }

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

  const body = (await request.json().catch(() => ({}))) as { period?: string };
  return executeScan(membership.workspace_id as string, user.id, body.period);
}
