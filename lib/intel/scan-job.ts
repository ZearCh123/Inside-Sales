import { createAdminClient } from "@/lib/supabase/admin";
import { tavilySearch, type TavilyResult } from "@/lib/tavily";
import {
  loadIntelConfig,
  loadPriorStorylines,
  persistScanResult,
  synthesizeScan,
  type ScanResult,
} from "./scan";
import { buildDeepQueries } from "./config";
import type { IntelConfig } from "./types";

type Task =
  | { kind: "search"; query: string }
  | { kind: "synthesize" }
  | { kind: "persist" };

type JobPayload = {
  period: string;
  createdBy: string | null;
  config: IntelConfig;
  tasks: Task[];
  cursor: number;
  research: TavilyResult[];
  result?: ScanResult;
};

export type StepResult = {
  done: boolean;
  status: "running" | "done" | "failed";
  progress: number;
  total: number;
  label: string;
  period: string;
  error?: string;
};

function labelFor(payload: JobPayload): string {
  const total = payload.tasks.length;
  const task = payload.tasks[payload.cursor];
  if (!task) return "Færdig";
  if (task.kind === "search")
    return `Søger på nettet (${payload.cursor + 1}/${total - 2})…`;
  if (task.kind === "synthesize") return "Syntetiserer rapport…";
  return "Gemmer rapport…";
}

/** Creates an intel_scan job and returns its id + total step count. */
export async function startScanJob(
  workspaceId: string,
  createdBy: string | null,
  period: string,
): Promise<{ jobId: string; totalSteps: number }> {
  const admin = createAdminClient();
  const config = await loadIntelConfig(workspaceId);
  const tasks: Task[] = [
    ...buildDeepQueries(config).map((query) => ({ kind: "search" as const, query })),
    { kind: "synthesize" as const },
    { kind: "persist" as const },
  ];
  const payload: JobPayload = {
    period,
    createdBy,
    config,
    tasks,
    cursor: 0,
    research: [],
  };
  const { data, error } = await admin
    .from("jobs")
    .insert({
      workspace_id: workspaceId,
      type: "intel_scan",
      status: "running",
      payload,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  return { jobId: data.id, totalSteps: tasks.length };
}

/**
 * Executes one step of a job and persists the advanced state. Each call is a
 * short request, so the whole scan can run for minutes across many calls
 * without hitting any single-request time limit.
 */
export async function runScanStep(
  jobId: string,
  workspaceId: string,
): Promise<StepResult> {
  const admin = createAdminClient();
  const { data: job } = await admin
    .from("jobs")
    .select("payload, status, error")
    .eq("id", jobId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!job) {
    return {
      done: true,
      status: "failed",
      progress: 0,
      total: 0,
      label: "Job ikke fundet",
      period: "",
      error: "Job ikke fundet",
    };
  }

  const payload = job.payload as JobPayload;
  const total = payload.tasks.length;

  if (job.status === "done" || job.status === "failed") {
    return {
      done: true,
      status: job.status,
      progress: total,
      total,
      label: job.status === "done" ? "Færdig" : "Fejlede",
      period: payload.period,
      error: job.error ?? undefined,
    };
  }

  const task = payload.tasks[payload.cursor];
  const label = labelFor(payload);

  try {
    if (task.kind === "search") {
      const results = await tavilySearch(
        task.query,
        5,
        "advanced",
        payload.config.sources,
      );
      payload.research.push(...results);
    } else if (task.kind === "synthesize") {
      const prior = await loadPriorStorylines(workspaceId, payload.period);
      payload.result = await synthesizeScan({
        config: payload.config,
        period: payload.period,
        priorStorylines: prior,
        research: payload.research,
        effort: "medium",
        maxTokens: 12000,
      });
    } else {
      if (!payload.result) throw new Error("Mangler syntese-resultat.");
      await persistScanResult({
        workspaceId,
        period: payload.period,
        createdBy: payload.createdBy,
        result: payload.result,
      });
    }

    payload.cursor += 1;
    const done = payload.cursor >= total;
    await admin
      .from("jobs")
      .update({
        payload,
        status: done ? "done" : "running",
        finished_at: done ? new Date().toISOString() : null,
      })
      .eq("id", jobId);

    return {
      done,
      status: done ? "done" : "running",
      progress: payload.cursor,
      total,
      label: done ? "Færdig" : labelFor(payload),
      period: payload.period,
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Trin fejlede";
    await admin
      .from("jobs")
      .update({ status: "failed", error })
      .eq("id", jobId);
    return {
      done: true,
      status: "failed",
      progress: payload.cursor,
      total,
      label: "Fejlede",
      period: payload.period,
      error,
    };
  }
}
