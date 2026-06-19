import { type LucideIcon } from "lucide-react";

export function ModulePlaceholder({
  title,
  icon: Icon,
  phase,
  subtitle,
}: {
  title: string;
  icon: LucideIcon;
  phase?: number;
  subtitle?: string;
}) {
  const sub =
    subtitle ?? (phase ? `Bygges i Fase ${phase} af køreplanen.` : "Bygges senere.");
  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">{sub}</p>
      </header>

      <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 text-center">
        <Icon className="mb-4 size-10 text-muted-foreground/60" />
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Dette modul er endnu ikke bygget.
        </p>
      </div>
    </div>
  );
}
