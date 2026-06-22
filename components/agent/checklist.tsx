"use client";

import { Check } from "lucide-react";

export type ChecklistItem = {
  id: string;
  text: string;
  kind: string;
  source: "food" | "commercial";
  done: boolean;
};

const KIND_LABEL: Record<string, string> = {
  question: "Spørg",
  recommendation: "Pitch",
  objection: "Objection",
  signal: "Signal",
  tip: "Tip",
};

export function Checklist({
  items,
  onToggle,
}: {
  items: ChecklistItem[];
  onToggle: (id: string) => void;
}) {
  const sorted = [...items].sort((a, b) => Number(a.done) - Number(b.done));
  return (
    <div className="flex h-full flex-col rounded-2xl border border-[#E7D7D2] bg-white">
      <div className="border-b border-[#E7D7D2] px-4 py-2">
        <h3 className="text-sm font-semibold text-foreground">
          Tjekliste{" "}
          <span className="text-xs font-normal text-muted-foreground">
            ({items.filter((i) => !i.done).length} tilbage)
          </span>
        </h3>
      </div>
      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-xs text-muted-foreground">
            Spørgsmål, objections og signaler samles her — kryds af efterhånden som du adresserer dem.
          </p>
        </div>
      ) : (
        <ul className="flex-1 divide-y divide-[#f1e7e3] overflow-y-auto">
          {sorted.map((item) => {
            const accent = item.source === "food" ? "#3E8E5E" : "#C8362C";
            return (
              <li key={item.id}>
                <button
                  onClick={() => onToggle(item.id)}
                  className="flex w-full items-start gap-2.5 px-4 py-2 text-left hover:bg-[#fcf6f4]"
                >
                  <span
                    className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border ${item.done ? "border-[#3E8E5E] bg-[#3E8E5E] text-white" : "border-[#cbbdb8] bg-white"}`}
                  >
                    {item.done && <Check className="size-3" />}
                  </span>
                  <span className="min-w-0">
                    <span
                      className="mr-1.5 rounded px-1 py-0.5 text-[9px] font-bold uppercase"
                      style={{ backgroundColor: `${accent}1a`, color: accent }}
                    >
                      {KIND_LABEL[item.kind] ?? item.kind}
                    </span>
                    <span
                      className={`text-[13px] ${item.done ? "text-[#9a9591] line-through" : "font-medium text-[#1B1418]"}`}
                    >
                      {item.text}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
