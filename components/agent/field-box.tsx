"use client";

import { Check } from "lucide-react";

export type FieldItem = { id: string; text: string; done: boolean };

export function FieldBox({
  label,
  accent,
  items,
  active,
  onToggle,
}: {
  label: string;
  accent: string;
  items: FieldItem[];
  active: boolean;
  onToggle: (id: string) => void;
}) {
  const sorted = [...items].sort((a, b) => Number(a.done) - Number(b.done));
  const remaining = items.filter((i) => !i.done).length;
  return (
    <div className="flex min-h-0 flex-col rounded-2xl border border-border bg-card">
      <div
        className="flex items-center justify-between gap-2 rounded-t-2xl border-b border-border px-3 py-2"
        style={{ borderLeft: `3px solid ${accent}` }}
      >
        <h3 className="text-[13px] font-semibold text-foreground">{label}</h3>
        {items.length > 0 && (
          <span className="text-[10px] text-muted-foreground">{remaining} tilbage</span>
        )}
      </div>
      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-3 text-center">
          <p className="text-[11px] text-muted-foreground">{active ? "—" : ""}</p>
        </div>
      ) : (
        <ul className="flex-1 divide-y divide-[#f1e7e3] overflow-y-auto">
          {sorted.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onToggle(item.id)}
                className="flex w-full items-start gap-2 px-3 py-1.5 text-left hover:bg-[#fcf6f4]"
              >
                <span
                  className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border ${item.done ? "border-[#3E8E5E] bg-[#3E8E5E] text-white" : "border-[#cbbdb8] bg-white"}`}
                >
                  {item.done && <Check className="size-3" />}
                </span>
                <span
                  className={`text-[13px] leading-snug ${item.done ? "text-[#9a9591] line-through" : "font-medium text-[#1B1418]"}`}
                >
                  {item.text}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
