import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runScanStep } from "@/lib/intel/scan-job";

export const maxDuration = 60;

/** Runs one step of a scan job. The client calls this repeatedly until done. */
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
    .select("workspace_id")
    .limit(1)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "Intet workspace" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { jobId?: string };
  if (!body.jobId) {
    return NextResponse.json({ error: "Mangler jobId" }, { status: 400 });
  }

  try {
    const result = await runScanStep(body.jobId, membership.workspace_id as string);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Trin fejlede";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
