# Chromologics Sales Intelligence Platform — Build-dokumentation

**Formål:** Dette dokumentsæt er den komplette specifikation og køreplan, som Claude Code eksekverer sekventielt for at bygge hele platformen — fra tomt repo til færdigt produkt. Du (Henrik) flytter denne mappe ind i dit repo og lader Claude Code arbejde fase for fase.

---

## Læs dokumenterne i denne rækkefølge

| Fil | Hvad det er | Hvem bruger det |
|---|---|---|
| `00_START_HER.md` | Dette dokument — overblik, deadlines, arbejdsgang | Dig |
| `01_ARCHITECTURE.md` | Hele systemets opbygning, moduler, datastrømme, sikkerhed | Dig + Claude Code |
| `02_DATA_MODEL.md` | Alle tabeller, felter, enums, relationer (læsbar form) | Dig + Claude Code |
| `03_SUPABASE_SCHEMA.sql` | Kørbar SQL — kerne-tabeller, pgvector, RLS, funktioner | Claude Code → Supabase |
| `03b_SCHEMA_ADDENDUM.sql` | Kørbar SQL — customization, settings, jobkø, budget, overvågning, RAG-grounding (kør EFTER 03) | Claude Code → Supabase |
| `04_BUILD_ROADMAP.md` | Fase 0–6 med datoer, acceptkriterier og copy-paste prompts | Claude Code |
| `05_SUBAGENTS_OG_CLAUDE_MD.md` | Sub-agent-definitioner + projekt-CLAUDE.md | Claude Code |
| `06_REVIEW_OG_TOP20.md` | Review af hele sættet + prioriteret Top 20 forbedringer | Dig |
| `07_CUSTOMIZATION_OG_SETTINGS.md` | Hvordan hver virksomhed selv sætter intel/radar/coach/agenter/branding/projekter op | Dig + Claude Code |
| `08_PLATFORM_OPS.md` | Jobkø, AI-budgetlofter pr. kunde, overvågning/alarmer, RAG-grounding | Dig + Claude Code |

---

## De to deadlines styrer alt

```
I DAG ──────────── TIRSDAG 23. JUN ──────────────────────── 1. AUGUST
 17. jun            ▲                                          ▲
                    │                                          │
            MARKET INTELLIGENCE                        HELE PRODUKTET
            klar til visning hos                       klar til demo +
            Chromologics                               bug-jagt
```

- **Tirsdag 23. juni:** Market Intelligence-modulet skal stå færdigt og deploybart — som en selvstændig, demobar del af appen. Derfor er **Fase 1 = Market Intelligence** og bygges først og isoleret, så den kan vises uafhængigt af resten.
- **1. august:** Hele produktet (alle moduler) klar til intern demo og fejlfinding.

Køreplanen i `04_BUILD_ROADMAP.md` er datostyret efter netop disse to mål.

---

## Sådan kører du det i Claude Code (arbejdsgangen)

1. **Forbered infrastruktur** (Fase 0): opret GitHub-repo, Supabase-projekt og Vercel — se `04_BUILD_ROADMAP.md` → Fase 0. (Den korte konto-opsætning står også i `../Chromologics_RAG_Setup_Guide.md`.)
2. **Læg denne mappe ind i repoet** som `/docs`, og læg `CLAUDE.md` + `.claude/agents/` (fra dokument 05) i repo-roden.
3. **Start Claude Code i repo-mappen** og giv den denne instruktion:

   > "Læs `docs/04_BUILD_ROADMAP.md`. Udfør **Fase 0** fuldstændigt. Stop ved fasens acceptkriterier, kør `qa-reviewer`-agenten, og bed mig verificere før du fortsætter til næste fase."

4. **Én fase ad gangen.** Efter hver fase: Claude Code committer, pusher (Vercel auto-deployer), og du verificerer mod acceptkriterierne. Så siger du "fortsæt til Fase X".
5. **Sub-agenter** (dokument 05) bruges af hovedsessionen til at parallelisere arbejdet inden for en fase (database, backend, frontend, RAG, integrationer) med en `qa-reviewer` som port før hver fase lukkes.

> 💡 Gylden regel for dig som nybegynder: lad Claude Code køre **én fase**, verificér, og gå så videre. Bed altid om "forklar hvad du lavede og hvad jeg skal teste".

---

## Hvad platformen indeholder (moduler)

1. **Overview / Dashboard** — sælgerens dag: møder, opgaver, leads, pipeline, heads-up-signaler.
2. **Monthly assessment** — competitor/regulatory intelligence med month-over-month delta. *(Fase 1 — demo 23/6)*
3. **Leads Radar** — auto-fundne leads/kunder, profilering, CVR, fit-score, pitch-match.
4. **Projects** — deal-pipeline i 4 faser (Discovery → Sampling/lab → Technical trials → Negotiation) + Closed Won/Lost.
5. **Sales Agent** — live call coach: teknisk + commercial coach med RAG, auto-routing.
6. **Sales Coach** — samtale-metrics visualiseret, udvikling over tid.
7. **Inbox** — Gmail-integration, AI-hjælp fra RAG, automatisk insight-opsamling.
8. **Calendar** — Google Calendar-integration, koblet til projekter.
9. **Outreach flows** — automatiserede sekvenser (email + opgaver + ventetrin).
10. **Knowledge base (RAG)** — den fælles hjerne der fodrer Sales Agent, outreach og inbox.

---

## To centrale beslutninger (afklaret med dig)

- **Multi-tenant fra start:** Alle tabeller har `workspace_id`. Klar til at sælge som SaaS til flere firmaer senere, men starter med Chromologics.
- **Streng datasikkerhed:** Ingen bruger kan se en andens data. Håndhæves med Row Level Security (RLS) på *både* workspace-niveau og rækkeniveau (ejer + eksplicit deling + lederroller). Email og opkald er altid privat for ejeren. Se sikkerhedsafsnittet i `01_ARCHITECTURE.md` og politikkerne i `03_SUPABASE_SCHEMA.sql`.
- **Kunde-typologi:** Konti klassificeres som distributør / ingrediensproducent / brand-producent, med modenhed (startup → lokal → regional → etableret → global) og geografisk territorium (fx "Brenntag — Mellemøsten", "Pigment — Polen", "Oterra — globalt"). Understøtter også moder/datter-relationer for distributørnetværk.

---

## Stack (kort)

Next.js 14 (App Router, TypeScript) · Tailwind + shadcn/ui · Supabase (Postgres + pgvector + Auth + Storage + Realtime + Edge Functions + pg_cron) · Vercel · Anthropic Claude (agenter/generering) · OpenAI text-embedding-3-small (embeddings) · Google Workspace API (Gmail + Calendar) · Tavily (web-research) · dansk CVR-API · Deepgram (tale-til-tekst, sidste fase).

Detaljer i `01_ARCHITECTURE.md`.
