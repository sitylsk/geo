-- Mobilethon Hub — Supabase schema
-- Run this in the Supabase SQL editor (Dashboard > SQL Editor > New query).

-- 1) Submissions table -------------------------------------------------------
create table if not exists public.submissions (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  mode         text not null check (mode in ('solo', 'team')),
  name         text not null,
  email        text not null,
  team_name    text,
  teammates    jsonb,
  project_name text not null,
  tagline      text not null,
  github_url   text not null,
  screenshots  text[] not null default '{}'
);

create index if not exists submissions_created_at_idx
  on public.submissions (created_at desc);

-- Row Level Security: the app talks to Supabase with the SERVICE ROLE key,
-- which bypasses RLS. Enabling RLS with no permissive policies keeps the table
-- locked down to everyone else (anon/authenticated) by default.
alter table public.submissions enable row level security;

-- 2) Public storage bucket for screenshots -----------------------------------
insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', true)
on conflict (id) do update set public = true;

-- Allow anyone to read screenshot objects (bucket is public); uploads happen
-- via the service role key from the server, so no insert policy is needed.
drop policy if exists "Public read screenshots" on storage.objects;
create policy "Public read screenshots"
  on storage.objects for select
  using (bucket_id = 'screenshots');
