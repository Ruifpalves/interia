-- Studio.ai initial schema
-- Multi-tenant by workspace_id, enforced via Row Level Security.
-- Reference: PRD v2 sections 8.1, 8.2, 8.3

create extension if not exists "pgcrypto";

create type plan_tier as enum ('trial','solo','studio','pro');
create type user_role as enum ('owner','designer','viewer');
create type project_type as enum ('furniture','space');
create type project_status as enum ('draft','in_progress','pending_approval','approved','archived');
create type slide_type as enum ('cover','separator','plan','photo_grid','reference_grid','render','technical','contact','custom');
create type notification_type as enum ('comment','approval','render_complete','share_opened','invite');

-- Workspaces (estúdios)
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  logo_url text,
  accent_color text default '#2A2A2A',
  font text default 'Inter',
  address text,
  phone text,
  vat text,
  default_template_id uuid,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  plan plan_tier default 'trial',
  seats_paid int default 1,
  trial_ends_at timestamptz default (now() + interval '14 days'),
  renders_used_this_month int default 0,
  projects_used_this_month int default 0,
  usage_period_start timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Profiles (mirror of auth.users with workspace + role)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  workspace_id uuid references workspaces(id) on delete set null,
  email text not null,
  full_name text,
  avatar_url text,
  role user_role default 'designer',
  invited_by uuid references profiles(id),
  invited_at timestamptz,
  joined_at timestamptz default now(),
  created_at timestamptz default now()
);

create index profiles_workspace_id_idx on profiles(workspace_id);

-- Clientes finais
create table clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  vat text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index clients_workspace_id_idx on clients(workspace_id);

-- Projetos
create table projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  designer_id uuid references profiles(id) on delete set null,
  name text not null,
  type project_type not null,
  subtype text,
  status project_status default 'draft',
  location text,
  briefing_text text,
  briefing_json jsonb,
  style_json jsonb,
  plan_json jsonb,
  measurements_json jsonb,
  share_slug text unique,
  share_password_hash text,
  share_allow_comments boolean default true,
  share_require_approval boolean default false,
  share_opened_at timestamptz,
  approved_at timestamptz,
  approved_by_email text,
  pdf_url text,
  pdf_generated_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index projects_workspace_id_idx on projects(workspace_id);
create index projects_share_slug_idx on projects(share_slug) where share_slug is not null;
create index projects_status_idx on projects(workspace_id, status);

-- Versões de projeto
create table project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  snapshot_json jsonb not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create index project_versions_project_id_idx on project_versions(project_id, created_at desc);

-- Fotos do espaço, referências, plantas a mão
create type asset_kind as enum ('photo','reference','floorplan_input');

create table assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind asset_kind not null,
  storage_path text not null,
  url text,
  thumbnail_url text,
  is_cover boolean default false,
  tag text,
  width int,
  height int,
  size_bytes int,
  created_at timestamptz default now()
);

create index assets_project_id_idx on assets(project_id, kind);

-- Renders gerados pela IA
create type render_status as enum ('queued','generating','ready','failed');

create table renders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  prompt_pt text,
  prompt_en text,
  image_url text,
  storage_path text,
  status render_status default 'queued',
  is_favorite boolean default false,
  parent_render_id uuid references renders(id) on delete set null,
  generation_time_ms int,
  cost_eur numeric(8,4),
  error_message text,
  created_at timestamptz default now()
);

create index renders_project_id_idx on renders(project_id, created_at desc);
create index renders_workspace_id_idx on renders(workspace_id);

-- Vistas técnicas (SVG procedural)
create table technical_views (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  view_type text not null, -- 'front_closed','front_open_lateral','lateral'
  svg text not null,
  dimensions_json jsonb,
  annotations_json jsonb,
  created_at timestamptz default now()
);

create index technical_views_project_id_idx on technical_views(project_id);

-- Slides do dossiê
create table slides (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  position int not null,
  type slide_type not null,
  content_json jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index slides_project_id_position_idx on slides(project_id, position);

-- Comentários do cliente externo (sem auth)
create table comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  slide_id uuid references slides(id) on delete set null,
  author_name text not null,
  author_email text,
  text text not null,
  created_at timestamptz default now()
);

create index comments_project_id_idx on comments(project_id, created_at desc);

-- Notificações para os designers do workspace
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  type notification_type not null,
  payload_json jsonb,
  read_at timestamptz,
  created_at timestamptz default now()
);

create index notifications_user_id_idx on notifications(user_id, read_at, created_at desc);

-- Templates de dossiê por workspace
create table templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  is_default boolean default false,
  structure_json jsonb not null,
  created_at timestamptz default now()
);

create index templates_workspace_id_idx on templates(workspace_id);

-- Eventos analíticos (espelho do PostHog)
create table events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  event_name text not null,
  payload_json jsonb,
  created_at timestamptz default now()
);

create index events_workspace_id_idx on events(workspace_id, created_at desc);

-- Convites pendentes
create table invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email text not null,
  role user_role default 'designer',
  token text unique not null,
  invited_by uuid references profiles(id),
  expires_at timestamptz default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz default now()
);

create index invites_token_idx on invites(token);
create index invites_workspace_id_idx on invites(workspace_id);

-- Updated_at trigger helper
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_workspaces_updated before update on workspaces for each row execute function set_updated_at();
create trigger trg_clients_updated before update on clients for each row execute function set_updated_at();
create trigger trg_projects_updated before update on projects for each row execute function set_updated_at();
create trigger trg_slides_updated before update on slides for each row execute function set_updated_at();

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
