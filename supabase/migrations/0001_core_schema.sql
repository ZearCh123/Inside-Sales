-- =====================================================================
-- Chromologics Sales Intelligence Platform — Supabase schema
-- Postgres 15 (Supabase). Multi-tenant + Row Level Security.
-- Run in Supabase SQL Editor (or via `supabase db push` as a migration).
-- Idempotent where practical. Apply in this order.
-- =====================================================================

-- ---------- 0. EXTENSIONS ----------
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists vector;        -- pgvector (RAG)

-- ---------- 1. ENUMS ----------
do $$ begin
  create type workspace_role    as enum ('owner','admin','manager','rep');
  create type account_kind      as enum ('distributor','ingredient_producer','brand_manufacturer','other');
  create type account_type      as enum ('lead','prospect','customer','partner','competitor');
  create type account_status    as enum ('active','dormant','disqualified');
  create type maturity_t        as enum ('startup','local','regional','established','global');
  create type geo_scope_t       as enum ('single_country','multi_country_region','global');
  create type project_phase     as enum ('discovery','sampling_lab','technical_trials','negotiation');
  create type project_status    as enum ('open','won','lost','on_hold');
  create type activity_type     as enum ('note','call','email','meeting','task','system');
  create type task_priority     as enum ('low','medium','high','urgent');
  create type task_status       as enum ('open','in_progress','done','cancelled');
  create type email_direction   as enum ('inbound','outbound');
  create type flow_status       as enum ('draft','active','paused','archived');
  create type enrollment_status as enum ('active','completed','paused','exited','bounced');
  create type doc_type          as enum ('food_trial','won_case','product_spec','product_info','commercial','market_insight','competitor_insight','regulatory','other');
  create type rag_route         as enum ('technical','commercial');
  create type intel_change      as enum ('new','escalating','ongoing','cooling','resolved');
  create type intel_impact      as enum ('high','medium','low');
  create type intel_direction   as enum ('tailwind','headwind','neutral','mixed');
  create type threat_trajectory as enum ('rising','stable','receding');
exception when duplicate_object then null; end $$;

-- ---------- 2. updated_at trigger ----------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- =====================================================================
-- 3. TENANCY & IDENTITY
-- =====================================================================
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  plan text default 'standard',
  settings jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  title text,
  phone text,
  default_workspace_id uuid references workspaces(id),
  created_at timestamptz default now()
);

create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role workspace_role not null default 'rep',
  team_visibility boolean not null default false,
  created_at timestamptz default now(),
  unique (workspace_id, user_id)
);

create table if not exists record_shares (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  entity text not null,                       -- 'project' | 'account' | ...
  entity_id uuid not null,
  shared_with uuid not null references profiles(id) on delete cascade,
  permission text not null default 'read',    -- 'read' | 'write'
  shared_by uuid references profiles(id),
  created_at timestamptz default now(),
  unique (entity, entity_id, shared_with)
);
create index if not exists idx_shares_lookup on record_shares(entity, entity_id, shared_with);

-- =====================================================================
-- 4. SECURITY HELPER FUNCTIONS  (SECURITY DEFINER, stable)
-- =====================================================================
create or replace function is_workspace_member(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from workspace_members m
                 where m.workspace_id = ws and m.user_id = auth.uid());
$$;

-- manager/admin/owner with team visibility (managers must be granted team_visibility)
create or replace function can_see_workspace_data(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from workspace_members m
                 where m.workspace_id = ws and m.user_id = auth.uid()
                   and (m.role in ('admin','owner')
                        or (m.role = 'manager' and m.team_visibility = true)));
$$;

create or replace function is_workspace_admin(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from workspace_members m
                 where m.workspace_id = ws and m.user_id = auth.uid()
                   and m.role in ('admin','owner'));
$$;

create or replace function is_shared(p_entity text, p_entity_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from record_shares s
                 where s.entity = p_entity and s.entity_id = p_entity_id
                   and s.shared_with = auth.uid());
$$;

-- standard read rule for owner-scoped tables (with manager override + sharing)
create or replace function can_read_owned(ws uuid, owner uuid, p_entity text, p_entity_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_workspace_member(ws) and (
            owner = auth.uid()
         or can_see_workspace_data(ws)
         or is_shared(p_entity, p_entity_id));
$$;

-- =====================================================================
-- 5. CRM: accounts, contacts, projects
-- =====================================================================
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  owner_id uuid references profiles(id),
  name text not null,
  account_kind account_kind default 'brand_manufacturer',
  maturity maturity_t,
  geo_scope geo_scope_t,
  territory text[] default '{}',
  type account_type default 'lead',
  status account_status default 'active',
  parent_account_id uuid references accounts(id),
  cvr text,
  reg_no text,
  country text,
  sector_nace text,
  website text,
  description text,
  fit_score int,
  source text,
  enrichment jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz
);
create index if not exists idx_accounts_ws on accounts(workspace_id);
create index if not exists idx_accounts_owner on accounts(owner_id);
create trigger trg_accounts_updated before update on accounts for each row execute function set_updated_at();

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  owner_id uuid references profiles(id),
  account_id uuid references accounts(id) on delete cascade,
  full_name text not null,
  title text, email text, phone text, linkedin_url text,
  is_primary boolean default false,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz
);
create index if not exists idx_contacts_ws on contacts(workspace_id);
create index if not exists idx_contacts_account on contacts(account_id);
create trigger trg_contacts_updated before update on contacts for each row execute function set_updated_at();

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  owner_id uuid references profiles(id),
  account_id uuid references accounts(id) on delete cascade,
  name text not null,
  application text,
  product text default 'Natu.Red®',
  phase project_phase not null default 'discovery',
  status project_status not null default 'open',
  value_eur numeric,
  currency text default 'EUR',
  probability int,
  pitch_angle text,
  expected_close_date date,
  won_lost_reason text,
  closed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz
);
create index if not exists idx_projects_ws on projects(workspace_id);
create index if not exists idx_projects_owner on projects(owner_id);
create index if not exists idx_projects_phase on projects(phase);
create trigger trg_projects_updated before update on projects for each row execute function set_updated_at();

create table if not exists project_phase_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  from_phase project_phase,
  to_phase project_phase,
  changed_by uuid references profiles(id),
  note text,
  created_at timestamptz default now()
);
create index if not exists idx_phaseevents_project on project_phase_events(project_id);

create table if not exists project_artifacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  phase project_phase not null,
  kind text not null,                 -- need_brief|sample_sent|lab_result|trial_report|quote|contract_draft
  document_id uuid,
  status text default 'pending',      -- pending|complete
  created_at timestamptz default now()
);
create index if not exists idx_artifacts_project on project_artifacts(project_id);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  owner_id uuid references profiles(id),
  project_id uuid references projects(id) on delete cascade,
  account_id uuid references accounts(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  type activity_type not null,
  title text, body text,
  occurred_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_activities_project on activities(project_id);
create index if not exists idx_activities_ws on activities(workspace_id);

-- =====================================================================
-- 6. TASKS & CALENDAR
-- =====================================================================
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  owner_id uuid references profiles(id),       -- assignee
  title text not null,
  description text,
  project_id uuid references projects(id) on delete cascade,
  account_id uuid references accounts(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  due_date date,
  priority task_priority default 'medium',
  status task_status default 'open',
  source text default 'manual',                -- manual|agent|flow
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz
);
create index if not exists idx_tasks_owner on tasks(owner_id);
create index if not exists idx_tasks_due on tasks(due_date);
create trigger trg_tasks_updated before update on tasks for each row execute function set_updated_at();

create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  owner_id uuid references profiles(id),
  external_id text,
  provider text default 'google',
  project_id uuid references projects(id) on delete set null,
  account_id uuid references accounts(id) on delete set null,
  title text, description text, location text,
  start_at timestamptz, end_at timestamptz,
  attendees jsonb default '[]'::jsonb,
  meeting_type text,
  created_at timestamptz default now(),
  updated_at timestamptz,
  unique (provider, external_id, owner_id)
);
create index if not exists idx_cal_owner on calendar_events(owner_id);
create trigger trg_cal_updated before update on calendar_events for each row execute function set_updated_at();

-- =====================================================================
-- 7. INBOX (email) — PRIVATE (owner only)
-- =====================================================================
create table if not exists email_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  provider text default 'google',
  email_address text not null,
  history_id text,
  status text default 'connected',
  vault_secret_id uuid,                         -- token in Supabase Vault
  created_at timestamptz default now()
);

create table if not exists email_threads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete cascade,
  account_id uuid references accounts(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  subject text,
  participants jsonb default '[]'::jsonb,
  last_message_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_threads_owner on email_threads(owner_id);

create table if not exists emails (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete cascade,
  thread_id uuid references email_threads(id) on delete cascade,
  external_id text,
  direction email_direction,
  from_addr text, to_addrs text[], cc text[],
  subject text, snippet text, body_text text, body_html text,
  sent_at timestamptz,
  contact_id uuid references contacts(id) on delete set null,
  account_id uuid references accounts(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  ai_summary text,
  extracted jsonb default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz default now(),
  unique (owner_id, external_id)
);
create index if not exists idx_emails_owner on emails(owner_id);
create index if not exists idx_emails_thread on emails(thread_id);

-- =====================================================================
-- 8. OUTREACH FLOWS
-- =====================================================================
create table if not exists outreach_flows (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  owner_id uuid references profiles(id),
  name text not null, description text,
  trigger_type text not null default 'manual',  -- manual|lead_created|phase_change|no_reply|signal
  trigger_config jsonb default '{}'::jsonb,
  status flow_status default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz
);
create trigger trg_flows_updated before update on outreach_flows for each row execute function set_updated_at();

create table if not exists outreach_steps (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  flow_id uuid not null references outreach_flows(id) on delete cascade,
  step_no int not null,
  channel text not null default 'email',         -- email|task|wait
  delay_hours int default 0,
  template_subject text, template_body text,
  ai_personalize boolean default true,
  conditions jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_steps_flow on outreach_steps(flow_id);

create table if not exists outreach_enrollments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  owner_id uuid references profiles(id),
  flow_id uuid not null references outreach_flows(id) on delete cascade,
  account_id uuid references accounts(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  current_step int default 0,
  status enrollment_status default 'active',
  next_action_at timestamptz,
  enrolled_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz
);
create index if not exists idx_enroll_next on outreach_enrollments(next_action_at) where status = 'active';
create trigger trg_enroll_updated before update on outreach_enrollments for each row execute function set_updated_at();

create table if not exists outreach_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  enrollment_id uuid not null references outreach_enrollments(id) on delete cascade,
  step_id uuid references outreach_steps(id) on delete set null,
  email_id uuid references emails(id) on delete set null,
  status text default 'scheduled',               -- scheduled|sent|skipped|replied|failed
  scheduled_at timestamptz, sent_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_msgs_enroll on outreach_messages(enrollment_id);

-- =====================================================================
-- 9. KNOWLEDGE BASE (RAG)
-- =====================================================================
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  owner_id uuid references profiles(id),
  title text not null,
  doc_type doc_type not null default 'other',
  route rag_route,
  source text,
  raw_text text,
  file_url text,
  account_id uuid references accounts(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  metadata jsonb default '{}'::jsonb,
  status text default 'pending',                  -- pending|indexed|failed
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz
);
create index if not exists idx_documents_ws on documents(workspace_id);
create trigger trg_documents_updated before update on documents for each row execute function set_updated_at();

create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  chunk_no int,
  content text not null,
  route rag_route,
  embedding vector(1536),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_chunks_doc on document_chunks(document_id);
create index if not exists idx_chunks_ws on document_chunks(workspace_id);
-- HNSW index for fast cosine ANN search
create index if not exists idx_chunks_embedding on document_chunks
  using hnsw (embedding vector_cosine_ops);

-- RAG retrieval: always filtered by workspace + optional route
create or replace function match_chunks (
  p_workspace uuid,
  query_embedding vector(1536),
  match_route rag_route default null,
  match_count int default 6
)
returns table (id uuid, document_id uuid, content text, route rag_route, similarity float)
language sql stable as $$
  select c.id, c.document_id, c.content, c.route,
         1 - (c.embedding <=> query_embedding) as similarity
  from document_chunks c
  where c.workspace_id = p_workspace
    and (match_route is null or c.route = match_route)
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- =====================================================================
-- 10. SALES AGENT & COACH — PRIVATE (owner only)
-- =====================================================================
create table if not exists calls (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  account_id uuid references accounts(id) on delete set null,
  started_at timestamptz, ended_at timestamptz,
  duration_sec int, channel text,
  recording_url text, transcript_url text,
  talk_ratio numeric, questions_count int,
  objection_handle_rate numeric, longest_monologue_sec int,
  next_step_set boolean, sentiment numeric, coach_score int,
  summary text,
  created_at timestamptz default now()
);
create index if not exists idx_calls_owner on calls(owner_id);

create table if not exists call_segments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  call_id uuid not null references calls(id) on delete cascade,
  speaker text,                                   -- rep|customer
  ts_start int, ts_end int,
  text text,
  intent text,                                    -- question|objection|statement
  route rag_route,
  created_at timestamptz default now()
);
create index if not exists idx_segments_call on call_segments(call_id);

create table if not exists call_retrievals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  call_id uuid not null references calls(id) on delete cascade,
  segment_id uuid references call_segments(id) on delete set null,
  route rag_route, query text,
  chunk_ids jsonb, latency_ms int, answer text,
  created_at timestamptz default now()
);

create table if not exists coach_tips (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete cascade,
  call_id uuid references calls(id) on delete cascade,
  category text, tip text,
  created_at timestamptz default now()
);

create table if not exists coach_metrics_daily (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  calls_count int default 0,
  avg_talk_ratio numeric, avg_questions numeric,
  avg_objection_rate numeric, avg_coach_score numeric, next_step_rate numeric,
  unique (owner_id, date)
);

-- =====================================================================
-- 11. MARKET INTELLIGENCE
-- =====================================================================
create table if not exists intel_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  period_month date not null,
  run_at timestamptz default now(),
  status text default 'complete',
  net_position text,
  summary text,
  model text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
create index if not exists idx_intelruns_ws on intel_runs(workspace_id, period_month);

create table if not exists intel_storylines (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  run_id uuid not null references intel_runs(id) on delete cascade,
  storyline_key text not null,
  entity text, category text,                     -- competitor|market|regulatory|ip
  change_status intel_change,
  impact intel_impact, threat intel_impact,
  confidence text,                                -- confirmed|likely|unverified
  direction intel_direction,
  trajectory threat_trajectory,
  headline text, detail text,
  source_name text, source_url text,
  related_account_id uuid references accounts(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists idx_storylines_run on intel_storylines(run_id);

create table if not exists intel_competitors (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null, segment text, country text,
  relevance text, threat_trajectory threat_trajectory,
  last_seen_run uuid references intel_runs(id) on delete set null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz
);
create trigger trg_competitors_updated before update on intel_competitors for each row execute function set_updated_at();

create table if not exists intel_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  period_month date not null,
  payload jsonb not null,
  created_at timestamptz default now(),
  unique (workspace_id, period_month)
);

-- =====================================================================
-- 12. LEADS RADAR
-- =====================================================================
create table if not exists lead_signals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  account_id uuid references accounts(id) on delete set null,
  signal_type text,                               -- funding|reformulation|launch|hiring|regulatory|expansion
  title text, detail text,
  source_url text, source_name text,
  detected_at timestamptz default now(),
  fit_score int,
  suggested_pitch text,
  related_doc_id uuid references documents(id) on delete set null,
  status text default 'new',                      -- new|reviewed|converted|dismissed
  created_at timestamptz default now()
);
create index if not exists idx_signals_ws on lead_signals(workspace_id, status);

-- =====================================================================
-- 13. SYSTEM
-- =====================================================================
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  kind text, title text, body text, link text,
  read_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_notif_user on notifications(user_id) where read_at is null;

create table if not exists integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind text not null,                             -- google|tavily|cvr|anthropic|openai|deepgram
  config jsonb default '{}'::jsonb,
  status text default 'inactive',
  created_at timestamptz default now(),
  updated_at timestamptz
);
create trigger trg_integrations_updated before update on integrations for each row execute function set_updated_at();

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  actor_id uuid references profiles(id),
  action text, entity text, entity_id uuid,
  diff jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_audit_ws on audit_log(workspace_id, created_at);

-- =====================================================================
-- 14. ROW LEVEL SECURITY
-- Enable on every business table, then add policies.
-- =====================================================================
alter table workspaces            enable row level security;
alter table profiles              enable row level security;
alter table workspace_members     enable row level security;
alter table record_shares         enable row level security;
alter table accounts              enable row level security;
alter table contacts              enable row level security;
alter table projects              enable row level security;
alter table project_phase_events  enable row level security;
alter table project_artifacts     enable row level security;
alter table activities            enable row level security;
alter table tasks                 enable row level security;
alter table calendar_events       enable row level security;
alter table email_accounts        enable row level security;
alter table email_threads         enable row level security;
alter table emails                enable row level security;
alter table outreach_flows        enable row level security;
alter table outreach_steps        enable row level security;
alter table outreach_enrollments  enable row level security;
alter table outreach_messages     enable row level security;
alter table documents             enable row level security;
alter table document_chunks       enable row level security;
alter table calls                 enable row level security;
alter table call_segments         enable row level security;
alter table call_retrievals       enable row level security;
alter table coach_tips            enable row level security;
alter table coach_metrics_daily   enable row level security;
alter table intel_runs            enable row level security;
alter table intel_storylines      enable row level security;
alter table intel_competitors     enable row level security;
alter table intel_snapshots       enable row level security;
alter table lead_signals          enable row level security;
alter table notifications         enable row level security;
alter table integrations          enable row level security;
alter table audit_log             enable row level security;

-- ---------- Tenancy/identity policies ----------
create policy ws_select on workspaces for select using (is_workspace_member(id));
create policy ws_update on workspaces for update using (is_workspace_admin(id));

create policy prof_select on profiles for select using (
  id = auth.uid()
  or exists (select 1 from workspace_members m1
             join workspace_members m2 on m1.workspace_id = m2.workspace_id
             where m1.user_id = auth.uid() and m2.user_id = profiles.id));
create policy prof_upsert on profiles for insert with check (id = auth.uid());
create policy prof_update on profiles for update using (id = auth.uid());

create policy wm_select on workspace_members for select using (is_workspace_member(workspace_id));
create policy wm_admin  on workspace_members for all using (is_workspace_admin(workspace_id))
  with check (is_workspace_admin(workspace_id));

create policy shares_select on record_shares for select using (
  is_workspace_member(workspace_id) and (shared_with = auth.uid() or shared_by = auth.uid() or can_see_workspace_data(workspace_id)));
create policy shares_write on record_shares for all using (
  is_workspace_member(workspace_id) and (shared_by = auth.uid() or is_workspace_admin(workspace_id)))
  with check (is_workspace_member(workspace_id));

-- ---------- Owner-scoped tables (owner + manager-visibility + sharing) ----------
-- accounts
create policy acc_select on accounts for select using (can_read_owned(workspace_id, owner_id, 'account', id));
create policy acc_ins on accounts for insert with check (is_workspace_member(workspace_id));
create policy acc_upd on accounts for update using (can_read_owned(workspace_id, owner_id, 'account', id)) with check (is_workspace_member(workspace_id));
create policy acc_del on accounts for delete using (owner_id = auth.uid() or is_workspace_admin(workspace_id));

-- contacts
create policy con_select on contacts for select using (can_read_owned(workspace_id, owner_id, 'contact', id));
create policy con_ins on contacts for insert with check (is_workspace_member(workspace_id));
create policy con_upd on contacts for update using (can_read_owned(workspace_id, owner_id, 'contact', id)) with check (is_workspace_member(workspace_id));
create policy con_del on contacts for delete using (owner_id = auth.uid() or is_workspace_admin(workspace_id));

-- projects
create policy prj_select on projects for select using (can_read_owned(workspace_id, owner_id, 'project', id));
create policy prj_ins on projects for insert with check (is_workspace_member(workspace_id));
create policy prj_upd on projects for update using (can_read_owned(workspace_id, owner_id, 'project', id)) with check (is_workspace_member(workspace_id));
create policy prj_del on projects for delete using (owner_id = auth.uid() or is_workspace_admin(workspace_id));

-- child tables of project: visibility follows the parent project
create policy pevents_all on project_phase_events for all
  using (exists (select 1 from projects p where p.id = project_id and can_read_owned(p.workspace_id, p.owner_id, 'project', p.id)))
  with check (is_workspace_member(workspace_id));
create policy partifacts_all on project_artifacts for all
  using (exists (select 1 from projects p where p.id = project_id and can_read_owned(p.workspace_id, p.owner_id, 'project', p.id)))
  with check (is_workspace_member(workspace_id));
create policy activities_all on activities for all
  using (can_read_owned(workspace_id, owner_id, 'activity', id))
  with check (is_workspace_member(workspace_id));

-- tasks
create policy task_select on tasks for select using (can_read_owned(workspace_id, owner_id, 'task', id) or created_by = auth.uid());
create policy task_ins on tasks for insert with check (is_workspace_member(workspace_id));
create policy task_upd on tasks for update using (can_read_owned(workspace_id, owner_id, 'task', id) or created_by = auth.uid()) with check (is_workspace_member(workspace_id));
create policy task_del on tasks for delete using (owner_id = auth.uid() or created_by = auth.uid() or is_workspace_admin(workspace_id));

-- calendar
create policy cal_select on calendar_events for select using (can_read_owned(workspace_id, owner_id, 'calendar', id));
create policy cal_write on calendar_events for all using (owner_id = auth.uid()) with check (is_workspace_member(workspace_id) and owner_id = auth.uid());

-- ---------- Knowledge base (shared within workspace, read for all members) ----------
create policy doc_select on documents for select using (is_workspace_member(workspace_id));
create policy doc_write on documents for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
create policy chunk_select on document_chunks for select using (is_workspace_member(workspace_id));
create policy chunk_write on document_chunks for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

-- ---------- Outreach (owner-scoped) ----------
create policy flow_all on outreach_flows for all using (can_read_owned(workspace_id, owner_id, 'flow', id)) with check (is_workspace_member(workspace_id));
create policy step_all on outreach_steps for all
  using (exists (select 1 from outreach_flows f where f.id = flow_id and can_read_owned(f.workspace_id, f.owner_id, 'flow', f.id)))
  with check (is_workspace_member(workspace_id));
create policy enroll_all on outreach_enrollments for all using (can_read_owned(workspace_id, owner_id, 'enrollment', id)) with check (is_workspace_member(workspace_id));
create policy msg_all on outreach_messages for all
  using (exists (select 1 from outreach_enrollments e where e.id = enrollment_id and can_read_owned(e.workspace_id, e.owner_id, 'enrollment', e.id)))
  with check (is_workspace_member(workspace_id));

-- ---------- PRIVATE tables: owner only, NO manager override ----------
create policy ea_priv  on email_accounts      for all using (user_id = auth.uid())  with check (user_id = auth.uid());
create policy et_priv  on email_threads       for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy em_priv  on emails              for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy call_priv on calls              for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy seg_priv on call_segments for all
  using (exists (select 1 from calls c where c.id = call_id and c.owner_id = auth.uid()))
  with check (is_workspace_member(workspace_id));
create policy ret_priv on call_retrievals for all
  using (exists (select 1 from calls c where c.id = call_id and c.owner_id = auth.uid()))
  with check (is_workspace_member(workspace_id));
create policy tip_priv  on coach_tips         for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy cmd_priv  on coach_metrics_daily for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---------- Market intelligence (shared read within workspace) ----------
create policy ir_select on intel_runs for select using (is_workspace_member(workspace_id));
create policy ir_write  on intel_runs for all using (is_workspace_admin(workspace_id)) with check (is_workspace_member(workspace_id));
create policy is_select on intel_storylines for select using (is_workspace_member(workspace_id));
create policy is_write  on intel_storylines for all using (is_workspace_admin(workspace_id)) with check (is_workspace_member(workspace_id));
create policy ic_select on intel_competitors for select using (is_workspace_member(workspace_id));
create policy ic_write  on intel_competitors for all using (is_workspace_admin(workspace_id)) with check (is_workspace_member(workspace_id));
create policy isnap_all on intel_snapshots for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

-- ---------- Leads radar (shared read within workspace) ----------
create policy ls_select on lead_signals for select using (is_workspace_member(workspace_id));
create policy ls_write  on lead_signals for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

-- ---------- System ----------
create policy notif_own on notifications for all using (user_id = auth.uid()) with check (is_workspace_member(workspace_id));
create policy intg_all  on integrations for all using (is_workspace_admin(workspace_id)) with check (is_workspace_admin(workspace_id));
create policy audit_sel on audit_log for select using (is_workspace_admin(workspace_id));

-- =====================================================================
-- 15. NOTES
-- * Background jobs use the service role key, which BYPASSES RLS.
--   Such code MUST always set workspace_id and owner_id explicitly.
-- * OAuth tokens (Google) are stored in Supabase Vault, referenced by
--   email_accounts.vault_secret_id — never store raw tokens in a column.
-- * To test isolation: create two users in two workspaces (and two reps
--   in the same workspace) and verify no cross-visibility. (Phase 2 AC.)
-- =====================================================================
