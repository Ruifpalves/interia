-- Row Level Security policies for Studio.ai
-- Every tenant table is protected by workspace_id matching the JWT user's workspace.

-- Helper: get the workspace of the current authenticated user
create or replace function current_workspace_id()
returns uuid language sql stable security definer set search_path = public as $$
  select workspace_id from public.profiles where id = auth.uid()
$$;

-- Helper: is current user owner of their workspace?
create or replace function is_workspace_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'owner' from public.profiles where id = auth.uid()), false)
$$;

alter table workspaces enable row level security;
alter table profiles enable row level security;
alter table clients enable row level security;
alter table projects enable row level security;
alter table project_versions enable row level security;
alter table assets enable row level security;
alter table renders enable row level security;
alter table technical_views enable row level security;
alter table slides enable row level security;
alter table comments enable row level security;
alter table notifications enable row level security;
alter table templates enable row level security;
alter table events enable row level security;
alter table invites enable row level security;

-- Workspaces: only members can read; only owner can update.
create policy workspaces_select on workspaces for select
  using (id = current_workspace_id());
create policy workspaces_update on workspaces for update
  using (id = current_workspace_id() and is_workspace_owner());
create policy workspaces_insert on workspaces for insert
  with check (true); -- handled via signup flow server-side

-- Profiles: user sees their workspace mates
create policy profiles_select on profiles for select
  using (id = auth.uid() or workspace_id = current_workspace_id());
create policy profiles_update on profiles for update
  using (id = auth.uid() or (workspace_id = current_workspace_id() and is_workspace_owner()));
create policy profiles_insert on profiles for insert
  with check (id = auth.uid());
create policy profiles_delete on profiles for delete
  using (workspace_id = current_workspace_id() and is_workspace_owner());

-- Clients
create policy clients_all on clients for all
  using (workspace_id = current_workspace_id())
  with check (workspace_id = current_workspace_id());

-- Projects
create policy projects_all on projects for all
  using (workspace_id = current_workspace_id())
  with check (workspace_id = current_workspace_id());

-- Project versions
create policy project_versions_all on project_versions for all
  using (exists (select 1 from projects p where p.id = project_versions.project_id and p.workspace_id = current_workspace_id()))
  with check (exists (select 1 from projects p where p.id = project_versions.project_id and p.workspace_id = current_workspace_id()));

-- Assets
create policy assets_all on assets for all
  using (workspace_id = current_workspace_id())
  with check (workspace_id = current_workspace_id());

-- Renders
create policy renders_all on renders for all
  using (workspace_id = current_workspace_id())
  with check (workspace_id = current_workspace_id());

-- Technical views
create policy technical_views_all on technical_views for all
  using (workspace_id = current_workspace_id())
  with check (workspace_id = current_workspace_id());

-- Slides
create policy slides_all on slides for all
  using (workspace_id = current_workspace_id())
  with check (workspace_id = current_workspace_id());

-- Comments: workspace members can read their projects' comments;
-- inserts from external clients use the service role via the API.
create policy comments_select on comments for select
  using (exists (select 1 from projects p where p.id = comments.project_id and p.workspace_id = current_workspace_id()));
create policy comments_delete on comments for delete
  using (exists (select 1 from projects p where p.id = comments.project_id and p.workspace_id = current_workspace_id()));

-- Notifications
create policy notifications_select on notifications for select
  using (user_id = auth.uid());
create policy notifications_update on notifications for update
  using (user_id = auth.uid());

-- Templates
create policy templates_all on templates for all
  using (workspace_id = current_workspace_id())
  with check (workspace_id = current_workspace_id());

-- Events
create policy events_select on events for select
  using (workspace_id = current_workspace_id());
create policy events_insert on events for insert
  with check (workspace_id = current_workspace_id());

-- Invites: owners can manage
create policy invites_select on invites for select
  using (workspace_id = current_workspace_id());
create policy invites_insert on invites for insert
  with check (workspace_id = current_workspace_id() and is_workspace_owner());
create policy invites_delete on invites for delete
  using (workspace_id = current_workspace_id() and is_workspace_owner());
