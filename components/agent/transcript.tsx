"use client";

import { useEffect, useRef } from "react";

export function Transcript({
  segments,
  partial,
}: {
  segments: string[];
  partial: string;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [segments, partial]);

  const empty = segments.length === 0 && !partial;

  return (
    <div className="h-full overflow-y-auto rounded-2xl border border-[#E7D7D2] bg-white p-4">
      {empty ? (
        <p className="text-sm text-muted-foreground">
          Transskriptionen vises her, mens samtalen kører…
        </p>
      ) : (
        <div className="space-y-1.5 text-sm leading-relaxed text-[#1B1418]">
          {segments.map((s, i) => (
            <p key={i}>{s}</p>
          ))}
          {partial && <p className="text-[#6B5D5A]">{partial}</p>}
          <div ref={endRef} />
        </div>
      )}
    </div>
  );
}
