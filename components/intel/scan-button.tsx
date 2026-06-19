"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

type StepResult = {
  done: boolean;
  status: "running" | "done" | "failed";
  progress: number;
  total: number;
  label: string;
  period: string;
  error?: string;
};

export function ScanButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ label: string; pct: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function post(url: string, body?: object): Promise<unknown> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        res.status === 504 || res.status === 502
          ? "Et trin tog for lang tid (timeout). Prøv igen."
          : `Scan fejlede (status ${res.status}).`,
      );
    }
    if (!res.ok) {
      throw new Error((data as { error?: string })?.error ?? "Scan fejlede");
    }
    return data;
  }

  async function runScan() {
    setRunning(true);
    setError(null);
    setProgress({ label: "Starter scan…", pct: 2 });
    try {
      const start = (await post("/api/intel-scan/start")) as {
        jobId: string;
        totalSteps: number;
        period: string;
      };

      // Drive the steps until the job finishes.
      for (let i = 0; i < start.totalSteps + 5; i++) {
        const step = (await post("/api/intel-scan/step", {
          jobId: start.jobId,
        })) as StepResult;
        setProgress({
          label: step.label,
          pct: Math.max(2, Math.round((step.progress / step.total) * 100)),
        });
        if (step.status === "failed") {
          throw new Error(step.error ?? "Scan fejlede");
        }
        if (step.done) {
          router.push(`${pathname}?period=${step.period}`);
          router.refresh();
          return;
        }
      }
      throw new Error("Scan blev ikke færdig.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan fejlede");
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={runScan} disabled={running}>
        {running ? "Scanner…" : "Kør månedlig scan →"}
      </Button>
      {progress && (
        <div className="w-48">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E7D7D2]">
            <div
              className="h-full bg-[#C8362C] transition-all"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
          <p className="mt-1 text-right text-[11px] text-[#6B5D5A]">
            {progress.label}
          </p>
        </div>
      )}
      {error && <span className="max-w-xs text-right text-xs text-destructive">{error}</span>}
    </div>
  );
}
