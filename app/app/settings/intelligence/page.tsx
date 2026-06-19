import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { loadIntelConfig } from "@/lib/intel/config";
import { Button } from "@/components/ui/button";
import {
  saveProfile,
  saveCompetitors,
  saveTopics,
  saveSources,
  saveSchedule,
  saveDisplay,
} from "./actions";

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const KNOWN_SECTIONS: { id: string; label: string }[] = [
  { id: "kpis", label: "KPI-kort" },
  { id: "net_position", label: "Net position" },
  { id: "actions", label: "Anbefalede handlinger" },
  { id: "risks", label: "Risici" },
  { id: "opportunities", label: "Muligheder" },
  { id: "immediate", label: "Immediate attention" },
];

const TABS = [
  ["profile", "Profil"],
  ["competitors", "Konkurrenter"],
  ["topics", "Topics"],
  ["sources", "Kilder & feeds"],
  ["schedule", "Skema & analyse"],
  ["display", "Visning"],
];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

function Card({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-4 rounded-2xl border border-border bg-card p-6">
      <h2 className="mb-4 font-display text-lg font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export default async function IntelSettingsPage({
  searchParams,
}: {
  searchParams: { saved?: string };
}) {
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .limit(1)
    .maybeSingle();
  const config = membership
    ? await loadIntelConfig(membership.workspace_id as string)
    : await loadIntelConfig("");

  const p = config.company_profile;
  const competitorsText = config.competitors
    .map((c) => [c.name, c.segment, c.country, c.priority, c.website].filter(Boolean).join(" | "))
    .join("\n");

  const orderedSections = KNOWN_SECTIONS.map((s) => {
    const idx = config.display.sections.findIndex((d) => d.id === s.id);
    const cfg = idx >= 0 ? config.display.sections[idx] : null;
    return { ...s, order: idx >= 0 ? idx : 99, visible: cfg ? cfg.visible : true };
  });
  const customBlocks = config.display.sections
    .filter((d) => d.id.startsWith("custom"))
    .map((d) => `${d.title ?? ""} :: ${d.body ?? ""}`)
    .join("\n");

  return (
    <div className="mx-auto max-w-3xl p-8">
      <Link href="/app/market" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Tilbage til Market Intelligence
      </Link>
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
        Intelligence-indstillinger
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Definér selv hele jeres market intelligence: profil, konkurrenter, topics, kilder &amp;
        feeds, skema og hvordan rapporten vises. Scannet læser disse værdier hver gang.
      </p>

      <div className="sticky top-0 z-10 -mx-8 mt-4 mb-2 border-b border-border bg-background/90 px-8 py-2 backdrop-blur">
        <nav className="flex flex-wrap gap-2 text-sm">
          {TABS.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="rounded-md px-2.5 py-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
              {label}
            </a>
          ))}
        </nav>
      </div>

      {searchParams.saved && (
        <p className="mb-4 rounded-md bg-secondary p-3 text-sm text-secondary-foreground">
          Indstillinger gemt.
        </p>
      )}

      <div className="space-y-6">
        {/* PROFIL */}
        <Card id="profile" title="Virksomhedsprofil (strategisk frame)">
          <form action={saveProfile} className="space-y-4">
            <Field label="Virksomhedsnavn">
              <input name="company_name" defaultValue={p.company_name} className={inputCls} />
            </Field>
            <Field label="Produkter" hint="Komma-separeret">
              <input name="product_names" defaultValue={p.product_names.join(", ")} className={inputCls} />
            </Field>
            <Field label="Value proposition">
              <textarea name="value_proposition" rows={2} defaultValue={p.value_proposition} className={inputCls} />
            </Field>
            <Field label="Differentiatorer" hint="Én pr. linje">
              <textarea name="differentiators" rows={3} defaultValue={p.differentiators.join("\n")} className={inputCls} />
            </Field>
            <Field label="Target-produkter (det I overvåger/vil erstatte)" hint="Komma-separeret">
              <input name="target_products" defaultValue={p.target_products.join(", ")} className={inputCls} />
            </Field>
            <Field label="ICP (ideal customer profile)">
              <input name="icp" defaultValue={p.icp} className={inputCls} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Gains" hint="Én pr. linje"><textarea name="gains" rows={3} defaultValue={p.gains.join("\n")} className={inputCls} /></Field>
              <Field label="Pains" hint="Én pr. linje"><textarea name="pains" rows={3} defaultValue={p.pains.join("\n")} className={inputCls} /></Field>
              <Field label="Threats" hint="Én pr. linje"><textarea name="threats" rows={3} defaultValue={p.threats.join("\n")} className={inputCls} /></Field>
              <Field label="Barriers" hint="Én pr. linje"><textarea name="barriers" rows={3} defaultValue={p.barriers.join("\n")} className={inputCls} /></Field>
            </div>
            <Button type="submit">Gem profil</Button>
          </form>
        </Card>

        {/* KONKURRENTER */}
        <Card id="competitors" title="Konkurrenter">
          <form action={saveCompetitors} className="space-y-4">
            <Field label="Konkurrent-univers" hint="Én pr. linje: Navn | segment | land | prioritet | website">
              <textarea name="competitors" rows={8} defaultValue={competitorsText} className={inputCls} />
            </Field>
            <Field label="Prioritets-sæt (dyb dækning)" hint="Komma-separerede navne">
              <input name="priority_set" defaultValue={config.priority_set.join(", ")} className={inputCls} />
            </Field>
            <Button type="submit">Gem konkurrenter</Button>
          </form>
        </Card>

        {/* TOPICS */}
        <Card id="topics" title="Topics (hvad der overvåges)">
          <form action={saveTopics} className="space-y-4">
            <input type="hidden" name="topic_ids" value={config.topics.map((t) => t.id).join(",")} />
            <div className="space-y-3">
              {config.topics.map((t) => (
                <div key={t.id} className="rounded-md border border-border p-3">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" name={`enabled_${t.id}`} defaultChecked={t.enabled} className="size-4" />
                    <input name={`label_${t.id}`} defaultValue={t.label} className="rounded border border-input bg-background px-2 py-1 text-sm" />
                  </label>
                  <input name={`kw_${t.id}`} defaultValue={t.keywords.join(", ")} placeholder="keywords, komma-separeret" className={`${inputCls} mt-2`} />
                </div>
              ))}
            </div>
            <Field label="Tilføj egne topics" hint="Én pr. linje: Label: kw1, kw2, kw3">
              <textarea name="custom_topics" rows={3} placeholder="ESG-eksponering: ESG, sustainability report, carbon" className={inputCls} />
            </Field>
            <Button type="submit">Gem topics</Button>
          </form>
        </Card>

        {/* KILDER & FEEDS */}
        <Card id="sources" title="Kilder & feeds">
          <form action={saveSources} className="space-y-4">
            <Field label="Key sources" hint="Domæner, komma/linje-separeret (press wires, LinkedIn, Crunchbase, patents…)">
              <textarea name="key_sources" rows={3} defaultValue={config.source_groups.key_sources.join("\n")} className={inputCls} />
            </Field>
            <Field label="Regulatory bodies" hint="Domæner (fda.gov, efsa.europa.eu, ec.europa.eu…)">
              <textarea name="regulatory_bodies" rows={2} defaultValue={config.source_groups.regulatory_bodies.join("\n")} className={inputCls} />
            </Field>
            <Field label="Industry news" hint="Domæner (foodnavigator.com, agfundernews.com…)">
              <textarea name="industry_news" rows={3} defaultValue={config.source_groups.industry_news.join("\n")} className={inputCls} />
            </Field>
            <Field label="RSS/Atom-feeds" hint="Én pr. linje: feed-url | navn | kategori">
              <textarea name="feeds" rows={4} defaultValue={config.feeds.map((f) => `${f.url} | ${f.name} | ${f.category}`).join("\n")} placeholder="https://www.foodnavigator.com/rss | FoodNavigator | industry" className={inputCls} />
            </Field>
            <Button type="submit">Gem kilder &amp; feeds</Button>
          </form>
        </Card>

        {/* SKEMA & ANALYSE */}
        <Card id="schedule" title="Skema & analyse">
          <form action={saveSchedule} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Kadence">
                <select name="cadence" defaultValue={config.schedule.cadence} className={inputCls}>
                  <option value="weekly">Ugentligt</option>
                  <option value="biweekly">Hver 14. dag</option>
                  <option value="monthly">Månedligt</option>
                </select>
              </Field>
              <Field label="Dag i måneden">
                <input type="number" name="day" min={1} max={28} defaultValue={config.schedule.day} className={inputCls} />
              </Field>
            </div>
            <Field label="Regioner" hint="Komma-separeret (US, EU, UK, APAC…)">
              <input name="regions" defaultValue={config.regions.join(", ")} className={inputCls} />
            </Field>
            <Field label="Ekstra instruktioner til analysen" hint="Frit prompt-tillæg til agenten">
              <textarea name="extra_instructions" rows={3} defaultValue={config.analysis.extra_instructions} className={inputCls} />
            </Field>
            <Button type="submit">Gem skema &amp; analyse</Button>
          </form>
        </Card>

        {/* VISNING */}
        <Card id="display" title="Visning (Executive summary)">
          <form action={saveDisplay} className="space-y-4">
            <input type="hidden" name="section_ids" value={KNOWN_SECTIONS.map((s) => s.id).join(",")} />
            <p className="text-xs text-muted-foreground">Vis/skjul hver sektion og sæt rækkefølge (lavt tal = øverst).</p>
            <div className="space-y-2">
              {orderedSections.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-md border border-border p-2.5">
                  <input type="checkbox" name={`vis_${s.id}`} defaultChecked={s.visible} className="size-4" />
                  <span className="flex-1 text-sm">{s.label}</span>
                  <label className="text-xs text-muted-foreground">Rækkefølge</label>
                  <input type="number" name={`ord_${s.id}`} defaultValue={s.order} min={0} max={20} className="w-16 rounded border border-input bg-background px-2 py-1 text-sm" />
                </div>
              ))}
            </div>
            <Field label="Egne tekst-blokke" hint="Én pr. linje: Titel :: brødtekst">
              <textarea name="custom_blocks" rows={3} defaultValue={customBlocks} placeholder="Vores note :: Fokusér på Mellemøsten denne måned." className={inputCls} />
            </Field>
            <Button type="submit">Gem visning</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
