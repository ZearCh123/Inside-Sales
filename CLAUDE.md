# Chromologics Sales Intelligence Platform

Intern (multi-tenant) sales-platform for Chromologics (Natu.Red®, fermenteret naturlig rød
fødevarefarve; erstatter carmine/Red 3/Red 40). Hjælper sælgere med live coaching, viden (RAG),
lead-discovery, pipeline og market intelligence.

## Hvordan dette projekt bygges
- Specifikation og køreplan ligger i `docs/`. Læs `docs/00_START_HER.md` først.
- Byg SEKVENTIELT fase for fase efter `docs/04_BUILD_ROADMAP.md`. Stop ved hver fases
  acceptkriterier og kør `qa-reviewer` før du fortsætter.
- Datamodel: `docs/02_DATA_MODEL.md`. SQL: `docs/03_SUPABASE_SCHEMA.sql`.
- Arkitektur + sikkerhed: `docs/01_ARCHITECTURE.md`.

## Stack
Next.js 14 (App Router, TS) · Tailwind + shadcn/ui · Supabase (Postgres + pgvector + Auth +
Storage + Edge Functions) · Vercel · Anthropic Claude · OpenAI embeddings · Google Workspace ·
Tavily · CVR-API · Deepgram (fase 6).

## Ufravigelige regler
1. MULTI-TENANT: hver forretningstabel har workspace_id. RLS på ALLE tabeller.
2. SIKKERHED: ingen bruger ser en andens data. emails/calls/coach er KUN ejer (ingen
   leder-override). Service-role-kode sætter altid workspace_id + owner_id.
3. Hemmelige nøgler kun på server. OAuth-tokens i Supabase Vault. `.env.local` aldrig i Git.
4. Al DB-ændring som migration i `supabase/migrations/`.
5. UI matcher `docs/design/Chromologics_Platform_Design_v2.html`.
6. Region: Supabase Frankfurt (eu-central-1).

## Projektstruktur (Fase 0)
- `app/` — App Router. `app/login` (magic link), `app/auth/confirm` (callback),
  `app/app/*` (autentificeret shell + 9 modul-pladsholdere).
- `lib/supabase/` — `client.ts` (browser), `server.ts` (RLS-bunden), `admin.ts` (service-role,
  server-only), `middleware.ts` (session-refresh + /app-guard).
- `lib/seed.ts` — opretter 'Chromologics'-workspace og gør brugeren til owner.
- `components/ui/` — shadcn/ui-komponenter.
- `supabase/migrations/` — skemaet som migrationsfiler (allerede kørt i Supabase; kør IKKE igen).

## Sub-agenter
db-architect · backend-engineer · frontend-engineer · rag-engineer · integrations-engineer ·
qa-reviewer (port). Se `.claude/agents/`.

## Prioritet
Market Intelligence (Fase 1) skal være demobar tirsdag 23/6. Hele produktet klar 1/8.
