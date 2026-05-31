create extension if not exists "pgcrypto";

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  grade text,
  memo text,
  created_at timestamptz not null default now()
);

create table if not exists public.pdf_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  file_name text not null,
  file_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.pdf_problems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pdf_source_id uuid not null references public.pdf_sources(id) on delete cascade,
  problem_number text not null,
  page text,
  raw_text text,
  latex jsonb not null default '[]'::jsonb,
  topic text,
  keywords jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.lesson_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid references public.students(id) on delete set null,
  lesson_date date not null,
  lesson_memo text,
  lesson_keywords text,
  homework text,
  extracted_content text,
  generated_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.problem_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_note_id uuid not null references public.lesson_notes(id) on delete cascade,
  page text,
  problem_number text,
  memo text,
  created_at timestamptz not null default now()
);

alter table public.students enable row level security;
alter table public.pdf_sources enable row level security;
alter table public.pdf_problems enable row level security;
alter table public.lesson_notes enable row level security;
alter table public.problem_comments enable row level security;

drop policy if exists "students owner access" on public.students;
create policy "students owner access" on public.students
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "pdf sources owner access" on public.pdf_sources;
create policy "pdf sources owner access" on public.pdf_sources
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "pdf problems owner access" on public.pdf_problems;
create policy "pdf problems owner access" on public.pdf_problems
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "lesson notes owner access" on public.lesson_notes;
create policy "lesson notes owner access" on public.lesson_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "problem comments owner access" on public.problem_comments;
create policy "problem comments owner access" on public.problem_comments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('pdf-sources', 'pdf-sources', false)
on conflict (id) do nothing;

drop policy if exists "pdf storage owner select" on storage.objects;
create policy "pdf storage owner select" on storage.objects
  for select using (bucket_id = 'pdf-sources' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "pdf storage owner insert" on storage.objects;
create policy "pdf storage owner insert" on storage.objects
  for insert with check (bucket_id = 'pdf-sources' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "pdf storage owner update" on storage.objects;
create policy "pdf storage owner update" on storage.objects
  for update using (bucket_id = 'pdf-sources' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "pdf storage owner delete" on storage.objects;
create policy "pdf storage owner delete" on storage.objects
  for delete using (bucket_id = 'pdf-sources' and auth.uid()::text = (storage.foldername(name))[1]);
