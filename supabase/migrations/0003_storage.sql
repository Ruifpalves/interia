-- Storage buckets per PRD section 8.3

insert into storage.buckets (id, name, public) values
  ('uploads', 'uploads', false),
  ('renders', 'renders', false),
  ('references', 'references', false),
  ('logos', 'logos', true),
  ('pdfs', 'pdfs', false),
  ('dxf', 'dxf', false)
on conflict (id) do nothing;

-- Per-bucket policies: workspace members can read/write within their workspace folder
-- Folder convention: {bucket}/{workspace_id}/{project_id?}/{filename}

create policy "members read own workspace files" on storage.objects
  for select using (
    bucket_id in ('uploads','renders','references','pdfs','dxf')
    and (storage.foldername(name))[1] = current_workspace_id()::text
  );

create policy "members write own workspace files" on storage.objects
  for insert with check (
    bucket_id in ('uploads','renders','references','pdfs','dxf')
    and (storage.foldername(name))[1] = current_workspace_id()::text
  );

create policy "members update own workspace files" on storage.objects
  for update using (
    bucket_id in ('uploads','renders','references','pdfs','dxf')
    and (storage.foldername(name))[1] = current_workspace_id()::text
  );

create policy "members delete own workspace files" on storage.objects
  for delete using (
    bucket_id in ('uploads','renders','references','pdfs','dxf')
    and (storage.foldername(name))[1] = current_workspace_id()::text
  );

create policy "logos public read" on storage.objects
  for select using (bucket_id = 'logos');

create policy "logos members write" on storage.objects
  for insert with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = current_workspace_id()::text
  );
