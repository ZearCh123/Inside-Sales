# 04 — Build-køreplan (Fase 0–6)

Datostyret plan som Claude Code eksekverer **sekventielt**. Hver fase har: mål, leverancer, hvilke sub-agenter der bruges, en **copy-paste prompt** til Claude Code, **acceptkriterier** (porten der skal være grøn før næste fase), og deploy.

> Arbejdsgang: Kør én fase → `qa-reviewer` tjekker mod acceptkriterier → du verificerer i browseren → sig "fortsæt til Fase X". Commit + push efter hver delopgave, så Vercel auto-deployer.

**Tidslinje**

| Fase | Indhold | Periode | Milepæl |
|---|---|---|---|
| 0 | Infrastruktur & skelet | On 17/6 – to 18/6 | repo + db + deploy live |
| **1** | **Market Intelligence** | to 18/6 – man 22/6 | **DEMO tirsdag 23/6** |
| 2 | Platform, CRM, projekter, dashboard | 24/6 – 29/6 | login + pipeline |
| 3 | RAG + Sales Agent + Sales Coach | 30/6 – 8/7 | viden + coach virker |
| 4 | Leads Radar + Outreach flows | 9/7 – 16/7 | auto-leads + sekvenser |
| 5 | Inbox (Gmail) + Calendar | 17/7 – 25/7 | email/kalender koblet |
| 6 | Live voice + polering + hærdning | 26/7 – 31/7 | **FULDT PRODUKT 1/8** |

---

## FASE 0 — Infrastruktur & skelet  (onsdag 17/6 – torsdag 18/6 morgen)

**Mål:** Tomt men deploybart Next.js-skelet forbundet til GitHub + Supabase + Vercel, med hele databasen oprettet og base-auth.

**Forudsætninger (du gør dette manuelt — se også `../Chromologics_RAG_Setup_Guide.md`):**
1. Opret privat GitHub-repo `chromologics-platform`.
2. Opret Supabase-projekt (region **Frankfurt / eu-central-1**). Gem nøgler.
3. Opret Vercel-konto (login via GitHub).
4. Skaf API-nøgler: Anthropic, OpenAI, Tavily, Google OAuth (client id/secret), (Deepgram til fase 6).

**Sub-agenter:** `db-architect`, `backend-engineer`.

**Copy-paste prompt til Claude Code:**
> "Læs `docs/00_START_HER.md`, `docs/01_ARCHITECTURE.md` og `docs/02_DATA_MODEL.md` for kontekst. Udfør Fase 0 fra `docs/04_BUILD_ROADMAP.md`:
> 1. Scaffold Next.js 14 (App Router, TypeScript, Tailwind, shadcn/ui) i dette repo.
> 2. Tilføj `.gitignore` (udeluk `.env.local`, `node_modules`).
> 3. Installer Supabase-klient (`@supabase/supabase-js`, `@supabase/ssr`). Opret server- og browser-klienter og en middleware til auth-session.
> 4. Kør hele `docs/03_SUPABASE_SCHEMA.sql` mod Supabase (giv mig kommandoen/instruktionen hvis du ikke kan køre den selv), og bekræft at alle tabeller + RLS er oprettet.
> 5. Byg en simpel login-side (Supabase Auth, magic link) og en tom autentificeret `/app`-shell med venstre-navigation til de 9 moduler (kun pladsholdere endnu).
> 6. Opret en `seed`-funktion der opretter ét workspace 'Chromologics' og gør den indloggede bruger til `owner`.
> 7. Commit og push. Vejled mig gennem Vercel-import + env-variabler.
> Forklar kort hvad du gjorde, og hvad jeg skal teste. Kør `qa-reviewer` til sidst."

**Acceptkriterier (port):**
- [ ] Appen er live på en Vercel-URL.
- [ ] Jeg kan logge ind og se den tomme app-shell med de 9 modul-pladsholdere.
- [ ] Alle 34 tabeller findes i Supabase, RLS er slået til på alle.
- [ ] `.env.local` er IKKE i Git; nøgler ligger i Vercel.

---

## FASE 1 — MARKET INTELLIGENCE  (torsdag 18/6 – mandag 22/6) · DEMO tirsdag 23/6

**Mål:** Et fuldt fungerende, demobart Monthly assessment-modul. Det skal kunne (a) vise juni-2026-rapporten flot (matcher prototypen `../Chromologics_Platform_Design_v2.html` → "Monthly assessment"), og (b) køre en ny månedlig scan automatisk med month-over-month delta.

**Hvorfor først og isoleret:** Det er demoen tirsdag. Det afhænger ikke af CRM, email eller voice — kun af intel-tabellerne og en scan-agent. Byg det som et selvstændigt, robust modul.

**Sub-agenter:** `db-architect` (intel-tabeller findes allerede i schema), `backend-engineer` (scan-agent + Tavily), `frontend-engineer` (UI fra prototypen), `qa-reviewer`.

**Delopgaver:**
1. **Seed juni-data:** Importér indholdet fra den eksisterende rapport (`../Chromologics_Intelligence_Report_June_2026.html`) ind i `intel_runs` + `intel_storylines` + `intel_competitors` for `period_month = 2026-06-01`. Gem også et `intel_snapshots`-payload for juni (så juli kan beregne delta).
2. **Scan-agent (Edge Function `intel-scan`):** Tager `period_month`. Bruger den eksisterende master-prompt (`../Chromologics_Monthly_Intelligence_Cowork_Prompt.md`) + Tavily web-research + Claude til at: scanne competitor-universet, klassificere (impact/threat/confidence), beregne delta mod forrige `intel_snapshots`, skrive net position, og gemme alt i intel-tabellerne + nyt snapshot.
3. **UI:** Byg `/app/monthly` præcist efter prototypens "Monthly assessment"-skærm: KPI-kort, Immediate attention, change log-tabel, net position-read, trussels-dossierer. Måneds-vælger der læser fra `intel_runs`.
4. **PDF-eksport:** Knappen "Eksportér PDF" genererer rapporten som PDF (server-side, fx via en print-route).
5. **Cron:** Vercel Cron der kalder `intel-scan` 1. hverdag i måneden.

**Copy-paste prompt til Claude Code:**
> "Udfør Fase 1 (Market Intelligence) fra `docs/04_BUILD_ROADMAP.md`. Kontekst-filer i repoet: brug designet fra `docs/design/Chromologics_Platform_Design_v2.html` (Monthly assessment-skærmen), master-prompten i `docs/intel/Chromologics_Monthly_Intelligence_Cowork_Prompt.md`, og juni-data i `docs/intel/Chromologics_Intelligence_Report_June_2026.html`. Lever delopgave 1–5. Brug `frontend-engineer` til UI (match prototypen pixel-tæt), `backend-engineer` til scan-agenten med Tavily+Claude, og `db-architect` hvis schema skal justeres. Afslut med `qa-reviewer`. Forklar hvad jeg skal teste."

> 📁 Læg disse filer i `docs/`-mappen i repoet, så Claude Code kan læse dem: `Chromologics_Platform_Design_v2.html`, `Chromologics_Monthly_Intelligence_Cowork_Prompt.md`, `Chromologics_Intelligence_Report_June_2026.html`, `Chromologics-logo-raleway-.png`.

**Acceptkriterier (port — skal være grøn senest mandag 22/6):**
- [ ] `/app/monthly` viser juni-2026-rapporten flot og korrekt (matcher prototypen).
- [ ] Måneds-vælgeren virker; data kommer fra databasen, ikke hardcoded.
- [ ] "Kør månedlig scan" trigger `intel-scan` og opretter en ny `intel_run` med storylines + delta-tags.
- [ ] PDF-eksport virker.
- [ ] Modulet kan vises selvstændigt (kræver kun login).

**🎯 Tirsdag 23/6: demo Market Intelligence hos Chromologics.**

---

## FASE 2 — Platform, CRM & projekter  (24/6 – 29/6)

**Mål:** Auth/roller, accounts (med kunde-typologi), contacts, projekter med 4 faser + won/lost, og Overview-dashboardet. Plus den fulde sikkerhedstest.

**Sub-agenter:** `db-architect` (RLS-test), `backend-engineer`, `frontend-engineer`, `qa-reviewer`.

**Delopgaver:**
1. **Workspace & roller:** invitér brugere, sæt rolle (owner/admin/manager/rep), `team_visibility`-flag.
2. **Accounts + Contacts:** CRUD med kunde-typologi (kind/maturity/geo_scope/territory, parent_account_id). Liste + filtre + detaljeside med tidslinje (`activities`).
3. **Projects:** pipeline-board med de 4 faser som kolonner + Won/Lost. Drag mellem faser logger `project_phase_events`. Gate-markering ud fra `project_artifacts`. Påkrævet `won_lost_reason` ved luk. Auto-opret `won_case`-dokument-kladde ved Won.
4. **Tasks:** CRUD, knyttet til projekt/konto, prioritet/forfald.
5. **Overview-dashboard:** byg efter prototypens "Overview" — dagens program (placeholders indtil kalender i fase 5), opgaver, leads at kontakte, pipeline denne uge, heads-up der trækker fra `intel_storylines` (+ senere coach).
6. **Sikkerhed:** implementér audit-log på følsomme handlinger.

**Copy-paste prompt til Claude Code:**
> "Udfør Fase 2 fra køreplanen. Byg Overview, Accounts, Contacts, Projects (4-fase-board + won/lost gates) og Tasks efter designet i `docs/design/...v2.html`. Håndhæv kunde-typologien fra `docs/02_DATA_MODEL.md`. Til sidst: skriv en RLS-isolationstest (delopgave nedenfor) og kør `qa-reviewer`."

**Acceptkriterier (port) — sikkerhed er obligatorisk:**
- [ ] Pipeline-board med 4 faser + Won/Lost; faseskift logges; gates vises.
- [ ] Accounts understøtter distributør/producent + modenhed + territorium + moder/datter.
- [ ] **Isolationstest grøn:** to reps i samme workspace kan IKKE se hinandens accounts/projekter/tasks; en manager med `team_visibility=true` KAN; en bruger i et andet workspace ser INTET. (Automatiseret test med to test-brugere.)
- [ ] Overview viser rigtige data fra databasen.

---

## FASE 3 — RAG + Sales Agent (tekst) + Sales Coach  (30/6 – 8/7)

**Mål:** Den fælles vidensbase + tekst-baseret Sales Agent med routing + Sales Coach på transskriptioner.

**Sub-agenter:** `rag-engineer`, `backend-engineer`, `frontend-engineer`, `qa-reviewer`.

**Delopgaver:**
1. **Ingestion:** upload/indsæt dokument → chunking → OpenAI-embeddings → `document_chunks` (med route + workspace_id). Embeddings-kø som Edge Function. Upload-UI med doc_type + route.
2. **Retrieval + routing:** `match_chunks` + hurtig teknisk/commercial-klassifikation + Claude-svar med kilder. Test latenstid (<300 ms til kilder vises).
3. **Sales Agent (tekst-MVP):** skærm efter prototypen — skriv/indsæt et spørgsmål, få auto-routet svar fra teknisk/commercial coach med kilder; gem som `call` + `call_retrievals`; udtræk actions → `tasks`.
4. **Sales Coach:** upload transskription → Claude beregner metrics (talk-ratio, åbne spørgsmål, indvendings-håndtering, monolog-længde, næste skridt) → `calls` + `coach_tips`; visualisér efter prototypens "Sales Coach" (score, bars, trend, mønstre). Nat-rollup → `coach_metrics_daily`.

**Acceptkriterier (port):**
- [ ] Jeg kan uploade et dokument og se det indekseret.
- [ ] Et teknisk spørgsmål returnerer korrekt svar + kilder fra MIN viden; et kommercielt routes til commercial.
- [ ] RAG-opslag lækker aldrig på tværs af workspaces (test).
- [ ] Coach beregner metrics fra en transskription og viser dem visuelt.

---

## FASE 4 — Leads Radar + Outreach flows  (9/7 – 16/7)

**Mål:** Auto-opdagelse af leads + automatiserede outreach-sekvenser.

**Sub-agenter:** `integrations-engineer` (Tavily/CVR), `backend-engineer`, `frontend-engineer`, `qa-reviewer`.

**Delopgaver:**
1. **Lead-discovery (Edge Function `radar-scan`, dagligt cron):** Tavily-søgning på signaler (reformulering, lanceringer, funding, regulatorisk) → CVR-berigelse (dansk CVR-API) for danske firmaer → fit-score (Claude vurderer mod Natu.Red-profil) → `lead_signals` + opret/match `accounts`. Foreslå pitch + link til relevant RAG-dokument.
2. **Radar-UI:** efter prototypen — lead-kort med profilering, CVR, kontakt, fit, pitch, signal-kilde, filtre. Knapper "Udkast outreach" / "Tilføj til pipeline".
3. **Outreach-motor:** `outreach_flows` + `outreach_steps` (email/task/wait). Enrollment + scheduler (cron hver 15. min sender forfaldne trin). AI-personalisering via RAG. "No reply"-triggers. Svar (fra fase 5 inbox) stopper sekvensen.

**Acceptkriterier (port):**
- [ ] Daglig scan opretter nye `lead_signals` med fit-score + pitch.
- [ ] Jeg kan bygge en 3-trins outreach-flow og tilmelde en kontakt; trin afsendes på skema (mock-afsendelse indtil Gmail i fase 5).
- [ ] Leads kan konverteres til et projekt (Fase 1 Discovery) med ét klik.

---

## FASE 5 — Inbox (Gmail) + Calendar (Google)  (17/7 – 25/7)

**Mål:** Google Workspace-integration: email i appen med AI-hjælp, kalender på dashboard, og insight-opsamling tilbage til RAG/intel.

**Sub-agenter:** `integrations-engineer` (Google OAuth/Graph), `backend-engineer`, `frontend-engineer`, `qa-reviewer`.

**Delopgaver:**
1. **Google OAuth:** forbind Gmail + Calendar pr. bruger; tokens i Supabase Vault (`email_accounts.vault_secret_id`).
2. **Email-sync:** Gmail API (push + polling) → `email_threads` + `emails` (privat for ejer). AI-resumé + `extracted` insights pr. mail.
3. **Inbox-UI:** tråde, læs/skriv, "skriv med RAG-hjælp" (udkast genereret fra vidensbasen), kobl mail til konto/projekt. Outbound-mails kan afsendes via Gmail (også fra outreach-motoren).
4. **Insight-flywheel:** produkttest-resultater i mails → `documents` (food_trial); competitor/market-omtaler → forslag til `intel_storylines`/`documents`. Altid med menneskelig godkendelse.
5. **Calendar-sync:** events → `calendar_events`; vis på Overview "Dagens program"; kobl til projekter.

**Acceptkriterier (port):**
- [ ] Jeg kan forbinde min Google-konto; mine mails/kalender vises KUN for mig.
- [ ] Jeg kan skrive en kunde-mail med RAG-hjælp og sende den.
- [ ] Et produkttest-resultat i en mail kan med ét klik blive et RAG-dokument.
- [ ] Dagens møder vises på Overview.

---

## FASE 6 — Live voice + polering + hærdning  (26/7 – 31/7) · DEMO 1/8

**Mål:** Sales Agent lytter live via browser-mikrofon; hele appen poleres og hærdes til demo.

**Sub-agenter:** `integrations-engineer` (Deepgram), `backend-engineer`, `frontend-engineer`, `qa-reviewer`.

**Delopgaver:**
1. **Live tale-til-tekst:** browser-mikrofon/system-lyd → Deepgram streaming → løbende transskription. Genbruger fase 3's routing + retrieval (samme hjerne, ny indgang).
2. **Live coach-feed:** realtids-retrieval på opfangede spørgsmål/indvendinger; vis svar + kilder med latenstid (som prototypen).
3. **Polering:** tomme tilstande, fejlhåndtering, loading, responsivt, notifikationer, onboarding.
4. **Hærdning:** gennemgå alle RLS-politikker igen; rate-limits; logging; backup; en sidste fuld isolationstest på tværs af alle moduler.

**Acceptkriterier (port):**
- [ ] Live-mikrofon trigger korrekt teknisk/commercial retrieval under et opkald.
- [ ] Alle moduler fungerer ende-til-ende.
- [ ] Fuld sikkerhedsgennemgang grøn (ingen bruger ser andres data).

**🎯 1. august: hele produktet klar til intern demo og bug-jagt.**

---

## Generelle regler for alle faser

- **Sekventielt:** afslut og verificér en fase før den næste. Brug `qa-reviewer` som port.
- **Migrationer:** al DB-ændring som en SQL-migration i `supabase/migrations/` — aldrig manuelle ad-hoc-ændringer.
- **Sikkerhed er en blokerende port** i Fase 2, 3, 5 og 6.
- **Commit ofte**, små commits, beskrivende beskeder. Vercel deployer automatisk.
- **Test-brugere:** opret to reps + en manager + en bruger i et andet workspace tidligt, og genbrug dem til isolationstests.
- Hvis en fase ikke kan nås til tiden: Market Intelligence (fase 1) og dermed 23/6-demoen har altid forrang.
