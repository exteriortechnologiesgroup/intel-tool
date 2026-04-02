-- ============================================================
-- ETG Project Intelligence — Supabase Schema
-- Safe to run multiple times (uses IF NOT EXISTS / OR REPLACE)
-- ============================================================

-- Projects table
create table if not exists projects (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  location       text,
  value          text,
  value_numeric  bigint,
  sector         text check (sector in ('medical','school','other')),
  stage          text check (stage in ('planning','bidding','tender','awarded')),
  description    text,
  bid_deadline   text,
  contract_type  text,
  project_number text,
  architect      text,
  keywords       text[]  default '{}',
  contacts       jsonb   default '[]',
  source         text,
  source_url     text,
  below_threshold boolean default false,
  notes          text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- Research runs log
create table if not exists research_runs (
  id             uuid primary key default gen_random_uuid(),
  ran_at         timestamptz default now(),
  source         text,
  projects_found int default 0,
  summary        text
);

-- Auto-update updated_at function (OR REPLACE = safe to re-run)
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

-- Drop trigger first so re-running this file never errors
drop trigger if exists projects_updated_at on projects;
create trigger projects_updated_at
  before update on projects
  for each row execute function update_updated_at();

-- RLS
alter table projects enable row level security;
alter table research_runs enable row level security;

-- Drop policies before recreating so re-runs don't error
drop policy if exists "allow all" on projects;
drop policy if exists "allow all" on research_runs;
create policy "allow all" on projects for all using (true) with check (true);
create policy "allow all" on research_runs for all using (true) with check (true);

-- Indexes
create index if not exists idx_projects_stage    on projects(stage);
create index if not exists idx_projects_sector   on projects(sector);
create index if not exists idx_projects_created  on projects(created_at desc);
create index if not exists idx_projects_keywords on projects using gin(keywords);

-- Add materials column if upgrading from earlier version
alter table projects add column if not exists materials text[] default '{}';
