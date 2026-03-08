-- Create AI advice history table
create table if not exists public.ai_advice (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  advice_type text not null,
  prompt text,
  content text not null,
  context jsonb,
  created_at timestamptz default now()
);

alter table public.ai_advice enable row level security;

create policy "ai_advice_select_own" on public.ai_advice for select using (auth.uid() = user_id);
create policy "ai_advice_insert_own" on public.ai_advice for insert with check (auth.uid() = user_id);
create policy "ai_advice_delete_own" on public.ai_advice for delete using (auth.uid() = user_id);

create index if not exists idx_ai_advice_user_date on public.ai_advice(user_id, created_at desc);
