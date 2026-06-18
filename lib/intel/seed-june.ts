import { createAdminClient } from "@/lib/supabase/admin";
import {
  JUNE_2026_COMPETITORS,
  JUNE_2026_MODEL,
  JUNE_2026_NET_POSITION,
  JUNE_2026_PERIOD,
  JUNE_2026_SNAPSHOT,
  JUNE_2026_STORYLINES,
  JUNE_2026_VERDICT,
} from "./june-2026-data";

/**
 * Seeds the June 2026 Monthly assessment into intel_runs + intel_storylines +
 * intel_competitors + intel_snapshots for the given workspace.
 *
 * Uses the service-role client because the intel write policies require
 * is_workspace_admin (see docs/03_SUPABASE_SCHEMA.sql). Idempotent: an existing
 * June run/snapshot for the workspace is replaced.
 */
export async function seedJuneIntel(workspaceId: string, createdBy: string) {
  const admin = createAdminClient();

  // 1. Clear any previous June run (cascades to its storylines) + snapshot.
  await admin
    .from("intel_runs")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("period_month", JUNE_2026_PERIOD);
  await admin
    .from("intel_snapshots")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("period_month", JUNE_2026_PERIOD);

  // 2. Insert the run.
  const { data: run, error: runErr } = await admin
    .from("intel_runs")
    .insert({
      workspace_id: workspaceId,
      period_month: JUNE_2026_PERIOD,
      status: "complete",
      net_position: JUNE_2026_NET_POSITION,
      summary: JUNE_2026_VERDICT,
      model: JUNE_2026_MODEL,
      created_by: createdBy,
    })
    .select("id")
    .single();
  if (runErr) throw runErr;

  // 3. Insert storylines for the run.
  const { error: storyErr } = await admin.from("intel_storylines").insert(
    JUNE_2026_STORYLINES.map((s) => ({
      workspace_id: workspaceId,
      run_id: run.id,
      ...s,
    })),
  );
  if (storyErr) throw storyErr;

  // 4. Upsert competitors (last_seen_run points at this run).
  for (const c of JUNE_2026_COMPETITORS) {
    const { data: existing } = await admin
      .from("intel_competitors")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("name", c.name)
      .maybeSingle();
    if (existing) {
      await admin
        .from("intel_competitors")
        .update({ ...c, last_seen_run: run.id })
        .eq("id", existing.id);
    } else {
      await admin
        .from("intel_competitors")
        .insert({ workspace_id: workspaceId, last_seen_run: run.id, ...c });
    }
  }

  // 5. Insert the snapshot payload (used for month-over-month delta + rendering).
  const { error: snapErr } = await admin.from("intel_snapshots").insert({
    workspace_id: workspaceId,
    period_month: JUNE_2026_PERIOD,
    payload: JUNE_2026_SNAPSHOT,
  });
  if (snapErr) throw snapErr;

  return { runId: run.id, period: JUNE_2026_PERIOD };
}
