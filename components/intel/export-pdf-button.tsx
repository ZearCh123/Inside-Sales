"use client";

import { Button } from "@/components/ui/button";

export function ExportPdfButton({ period }: { period: string }) {
  return (
    <Button
      variant="outline"
      onClick={() => window.open(`/app/monthly/print?period=${period}`, "_blank")}
    >
      Eksportér PDF
    </Button>
  );
}
