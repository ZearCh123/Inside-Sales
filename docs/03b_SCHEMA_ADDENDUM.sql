-- =====================================================================
-- Chromologics Platform — SQL ADDENDUM
-- Customization/settings (per workspace) + platform ops (jobs, budgets,
-- monitoring, RAG-grounding). Run AFTER 03_SUPABASE_SCHEMA.sql.
-- =====================================================================

-- ---------- New enums ----------
do $$ begin
  create type agent_type      as enum ('technical','commercial');
  create type job_status       as enum ('queued','running','done','failed','cancelled');
  create type alert_severity   as enum ('info','warning','critical');
  create type alert_status      as enum ('open','acknowledged','resolved');
  create type budget_period    as enum ('daily','monthly');
  create type contribution_type as enum ('upload','review','interview','correction');
  create type contribution_status as enum ('requested','in_progress','submitted','approved','rejected');
exception when duplicate_object then null; end $$;

-- =====================================================================
-- A. PER-WORKSPACE CUSTOMIZATION & SETTINGS
-- =====================================================================

-- A1. General settings + branding / white-label (one row per workspace)
create table if not exists workspace_settings (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  company_name text,
  locale text default 'da-DK',
  timezone text default 'Europe/Copenhagen',
  -- branding (drives whole app + intelligence report header)
  logo_url text,
  brand_colors jsonb default '{}'::jsonb,        -- {primary, accent, ink, paper, ...}
  report_header jsonb default '{}'::jsonb,        -- {title, subtitle, footer, contact}
  product_name text default 'Natu.Red®',
  features jsonb default '{}'::jsonb,             -- feature flags per workspace
  updated_at timestamptz
);
create trigger trg_ws_settings_updated before update on workspace_settings for each row execute function set_updated_at();

-- A2. Market Intelligence configuration (what to scan + how)
create table if not exists intel_config (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  competitors jsonb default '[]'::jsonb,          -- [{name, segment, country, priority}]
  priority_set jsonb default '[]'::jsonb,         -- names for deep coverage
  categories text[] default '{competitor,market,regulatory,ip}',
  target_products text[] default '{carmine,Red 3,Red 40,betanin}',
  regions text[] default '{}',
  cadence text default 'monthly',
  sources jsonb default '[]'::jsonb,              -- preferred source domains
  prompt_overrides text,                          -- workspace-specific instructions
  report_template text default 'default',
  updated_at timestamptz
);
create trigger trg_intel_config_updated before update on intel_config for each row execute function set_updated_at();

-- A3. Leads Radar — ideal customer profiles (multiple per workspace)
create table if not exists radar_icps (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  account_kinds account_kind[] default '{}',
  industries text[] default '{}',                 -- NACE codes / sectors
  territories text[] default '{}',
  maturity maturity_t[] default '{}',
  signal_types text[] default '{}',               -- funding|reformulation|launch|...
  keywords text[] default '{}',
  exclude_keywords text[] default '{}',
  min_fit_score int default 70,
  scoring_weights jsonb default '{}'::jsonb,       -- how fit-score is computed
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz
);
create index if not exists idx_icps_ws on radar_icps(workspace_id) where active;
create trigger trg_icps_updated before update on radar_icps for each row execute function set_updated_at();

-- A4. Sales Coach parameters (per workspace)
create table if not exists coach_config (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  metrics jsonb default '[]'::jsonb,   -- [{key,label,target,direction,weight,enabled}]
  scoring_weights jsonb default '{}'::jsonb,
  language text default 'da',
  updated_at timestamptz
);
create trigger trg_coach_config_updated before update on coach_config for each row execute function set_updated_at();

-- A5. Sales Agent customization (technical + commercial)
create table if not exists agent_configs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  agent_type agent_type not null,
  display_name text,
  persona text,                                   -- e.g. "PhD food scientist"
  system_prompt text,
  tone text default 'concise',
  routing_keywords jsonb default '[]'::jsonb,     -- helps classify into this agent
  enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz,
  unique (workspace_id, agent_type)
);
create trigger trg_agent_configs_updated before update on agent_configs for each row execute function set_updated_at();

-- A6. Project templates (customizable project structure per workspace)
create table if not exists project_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  account_kind_scope account_kind,               -- optional: template per customer type
  phase_config jsonb default '{}'::jsonb,         -- per-phase required artifacts/checklist
  custom_fields jsonb default '[]'::jsonb,        -- [{key,label,type,required,options}]
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz
);
create trigger trg_proj_templates_updated before update on project_templates for each row execute function set_updated_at();

-- Add custom field values + template link to projects (created in 03)
alter table projects add column if not exists template_id uuid references project_templates(id);
alter table projects add column if not exists custom jsonb default '{}'::jsonb;

-- A7. Generic attachments (projects, accounts, contacts, activities, calls)
create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  owner_id uuid references profiles(id),
  entity text not null,                           -- project|account|contact|activity|call
  entity_id uuid not null,
  file_url text not null,                         -- Supabase Storage path
  file_name text, mime_type text, size_bytes bigint,
  uploaded_by uuid references profiles(id),
  index_to_rag boolean default false,            -- optionally feed into knowledge base
  created_at timestamptz default now()
);
create index if not exists idx_attach_entity on attachments(entity, entity_id);

-- A8. Knowledge contributions (food scientists / PhD curate & improve RAG)
create table if not exists knowledge_contributions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  document_id uuid references documents(id) on delete set null,
  contributor_id uuid references profiles(id),    -- the SME (food scientist/PhD)
  requested_by uuid references profiles(id),
  type contribution_type not null,
  status contribution_status default 'requested',
  interview_link text,                            -- link sent to employee to record/answer
  prompt text,                                    -- what we asked them to contribute/clarify
  response_text text,
  due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz
);
create index if not exists idx_contrib_ws on knowledge_contributions(workspace_id, status);
create trigger trg_contrib_updated before update on knowledge_contributions for each row execute function set_updated_at();

-- A9. Competitor / incumbent intelligence captured from emails & calls
create table if not exists competitor_mentions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  owner_id uuid references profiles(id),
  source text not null,                           -- email|call|web|manual
  source_id uuid,                                 -- email_id / call_id / ...
  competitor_name text,
  incumbent_solution text,                        -- e.g. "carmine", "Oterra blend"
  context text,
  project_id uuid references projects(id) on delete set null,
  account_id uuid references accounts(id) on delete set null,
  promoted_to_intel boolean default false,        -- surfaced into Monthly assessment
  created_at timestamptz default now()
);
create index if not exists idx_compmention_ws on competitor_mentions(workspace_id);

-- =====================================================================
-- B. PLATFORM OPS
-- =====================================================================

-- B1. Background job queue
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  type text not null,                             -- intel_scan|radar_scan|embed|email_sync|...
  status job_status default 'queued',
  priority int default 5,
  payload jsonb default '{}'::jsonb,
  result jsonb,
  attempts int default 0,
  max_attempts int default 3,
  scheduled_at timestamptz default now(),
  started_at timestamptz, finished_at timestamptz,
  error text,
  created_at timestamptz default now()
);
create index if not exists idx_jobs_due on jobs(status, scheduled_at) where status = 'queued';
create index if not exists idx_jobs_ws on jobs(workspace_id);

-- B2. AI budget caps (admin-controlled, per workspace, per provider/period)
create table if not exists ai_budgets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  provider text not null default 'all',           -- all|openai|anthropic|tavily|deepgram
  period budget_period not null default 'monthly',
  limit_usd numeric not null,
  hard_stop boolean default true,                 -- block calls when exceeded
  alert_threshold_pct int default 80,
  created_at timestamptz default now(),
  updated_at timestamptz,
  unique (workspace_id, provider, period)
);
create trigger trg_budgets_updated before update on ai_budgets for each row execute function set_updated_at();

-- B3. AI usage events (cost tracking, feeds budget enforcement)
create table if not exists ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  owner_id uuid references profiles(id),
  provider text not null,
  model text,
  operation text,                                 -- embed|chat|search|transcribe
  tokens_in int default 0, tokens_out int default 0,
  units numeric default 0,                        -- e.g. search calls / audio minutes
  cost_usd numeric default 0,
  ref_entity text, ref_id uuid,
  created_at timestamptz default now()
);
create index if not exists idx_usage_ws_time on ai_usage_events(workspace_id, created_at);

-- helper: current spend in active period (used by budget enforcement)
create or replace function ai_spend_usd(p_workspace uuid, p_provider text, p_period budget_period)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(cost_usd),0) from ai_usage_events e
  where e.workspace_id = p_workspace
    and (p_provider = 'all' or e.provider = p_provider)
    and e.created_at >= case when p_period = 'daily' then date_trunc('day', now())
                             else date_trunc('month', now()) end;
$$;

-- B4. Alerts / monitoring
create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  kind text not null,                             -- job_failed|budget_exceeded|integration_down|...
  severity alert_severity default 'warning',
  status alert_status default 'open',
  title text, detail text,
  ref_entity text, ref_id uuid,
  acknowledged_by uuid references profiles(id),
  created_at timestamptz default now(),
  resolved_at timestamptz
);
create index if not exists idx_alerts_open on alerts(workspace_id, status) where status = 'open';

create table if not exists alert_channels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  channel text not null,                          -- email|slack|webhook
  config jsonb default '{}'::jsonb,
  min_severity alert_severity default 'warning',
  enabled boolean default true,
  created_at timestamptz default now()
);

-- =====================================================================
-- C. RAG GROUNDING / "KNOWS WHEN IT DOESN'T KNOW"
-- =====================================================================

-- C1. Log every RAG query (top similarity + whether we answered)
create table if not exists rag_queries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  owner_id uuid references profiles(id),
  query text,
  route rag_route,
  top_similarity numeric,
  threshold numeric,
  answered boolean,                               -- false = "no confident answer"
  fallback_reason text,                           -- low_similarity|no_chunks|off_topic
  chunk_ids jsonb,
  latency_ms int,
  call_id uuid references calls(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists idx_ragq_ws on rag_queries(workspace_id, created_at);

-- C2. Eval set to measure retrieval quality over time
create table if not exists rag_eval_cases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  question text not null,
  expected text,
  route rag_route,
  expected_doc_id uuid references documents(id) on delete set null,
  created_at timestamptz default now()
);

-- C3. Feedback on answers (thumbs up/down feeds improvement loop)
create table if not exists rag_feedback (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  owner_id uuid references profiles(id),
  query_id uuid references rag_queries(id) on delete cascade,
  rating int,                                     -- -1 | 0 | 1
  note text,
  created_at timestamptz default now()
);

-- Per-workspace RAG threshold lives in workspace_settings.features, e.g.
--   features = { "rag_min_similarity": 0.78 }

-- =====================================================================
-- D. ROW LEVEL SECURITY for addendum tables
-- =====================================================================
alter table workspace_settings     enable row level security;
alter table intel_config           enable row level security;
alter table radar_icps             enable row level security;
alter table coach_config           enable row level security;
alter table agent_configs          enable row level security;
alter table project_templates      enable row level security;
alter table attachments            enable row level security;
alter table knowledge_contributions enable row level security;
alter table competitor_mentions    enable row level security;
alter table jobs                   enable row level security;
alter table ai_budgets             enable row level security;
alter table ai_usage_events        enable row level security;
alter table alerts                 enable row level security;
alter table alert_channels         enable row level security;
alter table rag_queries            enable row level security;
alter table rag_eval_cases         enable row level security;
alter table rag_feedback           enable row level security;

-- Config tables: members read, admins write (these are settings)
create policy wss_sel on workspace_settings for select using (is_workspace_member(workspace_id));
create policy wss_wr  on workspace_settings for all using (is_workspace_admin(workspace_id)) with check (is_workspace_admin(workspace_id));
create policy icfg_sel on intel_config for select using (is_workspace_member(workspace_id));
create policy icfg_wr  on intel_config for all using (is_workspace_admin(workspace_id)) with check (is_workspace_admin(workspace_id));
create policy icp_sel on radar_icps for select using (is_workspace_member(workspace_id));
create policy icp_wr  on radar_icps for all using (is_workspace_admin(workspace_id)) with check (is_workspace_member(workspace_id));
create policy ccfg_sel on coach_config for select using (is_workspace_member(workspace_id));
create policy ccfg_wr  on coach_config for all using (is_workspace_admin(workspace_id)) with check (is_workspace_admin(workspace_id));
create policy acfg_sel on agent_configs for select using (is_workspace_member(workspace_id));
create policy acfg_wr  on agent_configs for all using (is_workspace_admin(workspace_id)) with check (is_workspace_admin(workspace_id));
create policy ptpl_sel on project_templates for select using (is_workspace_member(workspace_id));
create policy ptpl_wr  on project_templates for all using (is_workspace_admin(workspace_id)) with check (is_workspace_member(workspace_id));

-- Attachments: visibility follows owner/manager (like activities)
create policy attach_all on attachments for all
  using (can_read_owned(workspace_id, owner_id, 'attachment', id))
  with check (is_workspace_member(workspace_id));

-- Knowledge contributions & competitor mentions: workspace members
create policy contrib_all on knowledge_contributions for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
create policy compm_all on competitor_mentions for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

-- Jobs / usage: members read, admins manage (service role bypasses RLS for workers)
create policy jobs_sel on jobs for select using (workspace_id is null or is_workspace_member(workspace_id));
create policy jobs_wr  on jobs for all using (is_workspace_admin(workspace_id)) with check (is_workspace_member(workspace_id));
create policy usage_sel on ai_usage_events for select using (is_workspace_member(workspace_id));
create policy budget_sel on ai_budgets for select using (is_workspace_member(workspace_id));
create policy budget_wr  on ai_budgets for all using (is_workspace_admin(workspace_id)) with check (is_workspace_admin(workspace_id));

-- Alerts: members read, admins manage
create policy alerts_sel on alerts for select using (workspace_id is null or is_workspace_member(workspace_id));
create policy alerts_wr  on alerts for all using (is_workspace_admin(workspace_id)) with check (is_workspace_member(workspace_id));
create policy alertch_wr on alert_channels for all using (is_workspace_admin(workspace_id)) with check (is_workspace_admin(workspace_id));

-- RAG ops: query log + feedback private to owner; eval cases shared
create policy ragq_priv on rag_queries for all using (owner_id = auth.uid() or can_see_workspace_data(workspace_id)) with check (is_workspace_member(workspace_id));
create policy rageval_all on rag_eval_cases for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
create policy ragfb_priv on rag_feedback for all using (owner_id = auth.uid() or can_see_workspace_data(workspace_id)) with check (is_workspace_member(workspace_id));

-- =====================================================================
-- NOTES
-- * Workers (service role) bypass RLS — always set workspace_id/owner_id.
-- * Budget enforcement: before any paid AI call, server checks
--   ai_spend_usd(ws, provider, period) vs ai_budgets.limit_usd; if a
--   hard_stop budget is exceeded, the call is blocked and an alert raised.
-- * RAG grounding: if top_similarity < threshold (workspace_settings.features
--   .rag_min_similarity, default 0.78), answer = "no confident answer" and
--   the query is logged with fallback_reason. Never fabricate.
-- =====================================================================
