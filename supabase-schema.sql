-- OPTIONAL: run this in Supabase SQL Editor if you want cloud persistence later.
create table if not exists public.assignments (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  title text not null,
  due date not null,
  points integer not null default 10 check (points > 0),
  score numeric check (score is null or score >= 0),
  module text,
  notes text,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.assignments enable row level security;

create policy "Users can read own assignments"
on public.assignments for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own assignments"
on public.assignments for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own assignments"
on public.assignments for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own assignments"
on public.assignments for delete
to authenticated
using ((select auth.uid()) = user_id);
