import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { mergeIntelConfig } from "@/lib/intel/config";
import { Button } from "@/components/ui/button";
import { saveIntelConfig } from "./actions";

const CATEGORIES = [
  { id: "competitor", label: "Konkurrenter" },
  { id: "market", label: "Marked" },
  { id: "regulatory", label: "Regulatorisk" },
  { id: "ip", label: "IP / patenter" },
];

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function IntelSettingsPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string };
}) {
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .limit(1)
    .maybeSingle();

  const { data: row } = membership
    ? await supabase
        .from("intel_config")
        .select("*")
        .eq("workspace_id", membership.workspace_id)
        .maybeSingle()
    : { data: null };

  const config = mergeIntelConfig(row);
  const competitorsText = config.competitors
    .map((c) => [c.name, c.segment, c.country, c.priority].filter(Boolean).join(" | "))
    .join("\n");

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link
        href="/app/monthly"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Tilbage til Monthly assessment
      </Link>

      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
        Intelligence-indstillinger
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Styr hvad den månedlige scan søger efter. Scannet læser disse værdier hver
        gang det kører.
      </p>

      {searchParams.saved && (
        <p className="mt-4 rounded-md bg-secondary p-3 text-sm text-secondary-foreground">
          Indstillinger gemt.
        </p>
      )}
      {searchParams.error && (
        <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {searchParams.error}
        </p>
      )}

      <form action={saveIntelConfig} className="mt-6 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="competitors">
            Konkurrent-univers
          </label>
          <p className="text-xs text-muted-foreground">
            Én pr. linje, format: <code>Navn | segment | land | prioritet</code>
          </p>
          <textarea
            id="competitors"
            name="competitors"
            rows={8}
            defaultValue={competitorsText}
            className={inputCls}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="priority_set">
            Prioritets-sæt (dyb dækning)
          </label>
          <p className="text-xs text-muted-foreground">
            Komma-separerede navne der altid får dyb dækning; resten roterer.
          </p>
          <input
            id="priority_set"
            name="priority_set"
            defaultValue={config.priority_set.join(", ")}
            className={inputCls}
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">Emner der scannes</legend>
          <p className="text-xs text-muted-foreground">
            Konkurrenter dækker company-updates (funding, ledelse, partnerskaber,
            M&amp;A) + produkt/teknologi (lanceringer, claims, applikationer). Marked
            dækker reformulering, retailer-policies, efterspørgsel og pris/supply.
            Regulatorisk dækker FDA/EFSA/EU/UK m.fl., Red 3/Red 40 og godkendelser.
            IP dækker patenter og licensering.
          </p>
          <div className="flex flex-wrap gap-4">
            {CATEGORIES.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="categories"
                  value={c.id}
                  defaultChecked={config.categories.includes(c.id)}
                  className="size-4"
                />
                {c.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="target_products">
            Target-produkter at overvåge
          </label>
          <p className="text-xs text-muted-foreground">
            Hvad I vil erstatte/overvåge — komma-separeret.
          </p>
          <input
            id="target_products"
            name="target_products"
            defaultValue={config.target_products.join(", ")}
            className={inputCls}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="regions">
            Regioner
          </label>
          <input
            id="regions"
            name="regions"
            defaultValue={config.regions.join(", ")}
            className={inputCls}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="sources">
            Foretrukne kilder (domæner)
          </label>
          <p className="text-xs text-muted-foreground">
            Søgningen begrænses til disse troværdige domæner. Én pr. linje (fx{" "}
            <code>fda.gov</code>, <code>foodnavigator.com</code>). Tom = søg overalt.
          </p>
          <textarea
            id="sources"
            name="sources"
            rows={6}
            defaultValue={config.sources.join("\n")}
            className={inputCls}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="prompt_overrides">
            Ekstra instruktioner til scan-agenten (valgfrit)
          </label>
          <textarea
            id="prompt_overrides"
            name="prompt_overrides"
            rows={4}
            defaultValue={config.prompt_overrides ?? ""}
            placeholder="Fx: Vægt regulatoriske ændringer i Mellemøsten højere."
            className={inputCls}
          />
        </div>

        <Button type="submit">Gem indstillinger</Button>
      </form>
    </div>
  );
}
