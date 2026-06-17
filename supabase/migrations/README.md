# Supabase migrations

These files are the source-of-truth record of the database schema. The schema
was **already applied** to the Supabase project via the Supabase SQL Editor
(from `docs/03_SUPABASE_SCHEMA.sql` and `docs/03b_SCHEMA_ADDENDUM.sql`).

- `0001_core_schema.sql` — copy of `docs/03_SUPABASE_SCHEMA.sql` (core tables,
  enums, pgvector, RLS, helper functions, `match_chunks`).
- `0002_schema_addendum.sql` — copy of `docs/03b_SCHEMA_ADDENDUM.sql`
  (customization/settings, job queue, AI budgets, monitoring, RAG grounding).

> ⚠️ Do NOT re-run these against the live database — they have already been
> applied. They are kept here for traceability and for spinning up a fresh
> environment. From Phase 1 onward, every schema change is a NEW timestamped
> migration file here (never an ad-hoc change).
