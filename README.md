# Chromologics Sales Intelligence Platform

Intern multi-tenant sales-intelligence-platform for Chromologics (Natu.Red®).
Bygges fase for fase efter `docs/04_BUILD_ROADMAP.md`. Se `CLAUDE.md` for regler.

## Stack
Next.js 14 (App Router, TypeScript) · Tailwind + shadcn/ui · Supabase (Postgres +
pgvector + Auth) · Vercel · Anthropic Claude · OpenAI embeddings · Tavily.

## Kom i gang lokalt

```bash
npm install
cp .env.example .env.local   # udfyld værdierne (se nedenfor)
npm run dev                  # http://localhost:3000
```

### Miljøvariabler (`.env.local`, aldrig committet)

| Variabel | Hvor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (hemmelig — kun server) |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `OPENAI_API_KEY` | platform.openai.com |
| `TAVILY_API_KEY` | tavily.com |

De samme nøgler lægges i Vercel → Project → Settings → Environment Variables.

## Database

Skemaet er allerede oprettet i Supabase (Frankfurt / eu-central-1) fra
`docs/03_SUPABASE_SCHEMA.sql` + `docs/03b_SCHEMA_ADDENDUM.sql`. De ligger som
migrationsfiler i `supabase/migrations/` for sporbarhed — **kør dem ikke igen**.

## Scripts
`npm run dev` · `npm run build` · `npm run start` · `npm run lint` · `npm run typecheck`

## Status
**Fase 0 — Infrastruktur & skelet:** Next.js-skelet, Supabase-klienter + auth-middleware,
magic-link-login, autentificeret `/app`-shell med 9 modul-pladsholdere, og en seed-funktion
der opretter 'Chromologics'-workspacet. Næste: Fase 1 (Market Intelligence).
