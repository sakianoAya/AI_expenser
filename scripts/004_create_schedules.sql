-- Create schedules table
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz,
  is_all_day boolean default false,
  reminder_minutes int,
  color text default '#3b82f6',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.schedules enable row level security;

create policy "schedules_select_own" on public.schedules for select using (auth.uid() = user_id);
create policy "schedules_insert_own" on public.schedules for insert with check (auth.uid() = user_id);
create policy "schedules_update_own" on public.schedules for update using (auth.uid() = user_id);
create policy "schedules_delete_own" on public.schedules for delete using (auth.uid() = user_id);

create index if not exists idx_schedules_user_time on public.schedules(user_id, start_time);
