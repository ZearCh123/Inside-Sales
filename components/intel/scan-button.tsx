"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ScanButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runScan() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/intel-scan", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan fejlede");
      router.push(`/app/monthly?period=${data.period}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan fejlede");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={runScan} disabled={loading}>
        {loading ? "Scanner…" : "Kør månedlig scan →"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
