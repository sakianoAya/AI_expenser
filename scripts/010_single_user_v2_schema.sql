-- DailyApp v2: single-user, server-only schema
-- REVIEW ONLY. Run manually in Supabase SQL Editor after taking a project backup.
-- The public anon/authenticated roles intentionally receive no table access.

begin;

create extension if not exists pgcrypto;

create table if not exists public.app_settings_v2 (
  singleton_id smallint primary key default 1 check (singleton_id = 1),
  display_name text not null default 'Me',
  preferred_currency text not null default 'TWD' check (preferred_currency in ('TWD', 'JPY', 'USD', 'EUR')),
  preferred_locale text not null default 'zh-TW' check (preferred_locale in ('zh-TW', 'en')),
  monthly_budget numeric(14,2) not null default 0 check (monthly_budget >= 0),
  push_subscription jsonb,
  notification_time time not null default '20:00',
  notification_message text not null default '記得記錄今天的花費喔！',
  schema_version integer not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories_v2 (
  key text primary key,
  group_key text not null check (group_key in ('food', 'transport', 'home', 'living', 'entertainment', 'health', 'finance', 'other')),
  name_zh text not null,
  name_en text not null,
  icon text not null,
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  legacy_names text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tags_v2 (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name_zh text not null,
  name_en text not null,
  color text not null default '#64748b',
  created_at timestamptz not null default now()
);

create table if not exists public.expenses_v2 (
  id uuid primary key default gen_random_uuid(),
  legacy_expense_id uuid unique,
  category_key text not null default 'other' references public.categories_v2(key) on update cascade,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'TWD' check (currency in ('TWD', 'JPY', 'USD', 'EUR')),
  description text,
  receipt_url text,
  expense_date date not null default current_date,
  legacy_category text,
  migration_status text not null default 'native' check (migration_status in ('native', 'mapped', 'needs_review', 'reviewed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expense_tags_v2 (
  expense_id uuid not null references public.expenses_v2(id) on delete cascade,
  tag_id uuid not null references public.tags_v2(id) on delete cascade,
  primary key (expense_id, tag_id)
);

create table if not exists public.reminders_v2 (
  id uuid primary key default gen_random_uuid(),
  legacy_schedule_id uuid unique,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  is_all_day boolean not null default false,
  reminder_minutes integer check (reminder_minutes is null or reminder_minutes >= 0),
  reminder_type text not null default 'general' check (reminder_type in ('general', 'bill', 'subscription')),
  expected_amount numeric(14,2) check (expected_amount is null or expected_amount > 0),
  category_key text references public.categories_v2(key) on update cascade,
  color text not null default '#3f765f',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_advice_v2 (
  id uuid primary key default gen_random_uuid(),
  legacy_advice_id uuid unique,
  advice_type text not null,
  prompt text,
  content text not null,
  context jsonb not null default '{}',
  model text,
  created_at timestamptz not null default now()
);

create index if not exists expenses_v2_date_idx on public.expenses_v2(expense_date desc);
create index if not exists expenses_v2_category_date_idx on public.expenses_v2(category_key, expense_date desc);
create index if not exists expenses_v2_review_idx on public.expenses_v2(migration_status) where migration_status = 'needs_review';
create index if not exists reminders_v2_start_idx on public.reminders_v2(starts_at);
create index if not exists ai_advice_v2_created_idx on public.ai_advice_v2(created_at desc);

insert into public.app_settings_v2 (singleton_id) values (1) on conflict (singleton_id) do nothing;

insert into public.categories_v2 (key, group_key, name_zh, name_en, icon, color, sort_order, legacy_names) values
  ('food_dining', 'food', '外食', 'Dining out', 'utensils', '#c66a4a', 10, array['Food', '飲食', '外食']),
  ('food_grocery', 'food', '食材', 'Groceries', 'carrot', '#6f8f5f', 20, array['Groceries', '食材']),
  ('food_coffee', 'food', '咖啡飲品', 'Coffee & drinks', 'coffee', '#9a7651', 30, array['Coffee', '飲料']),
  ('transport_public', 'transport', '大眾運輸', 'Public transit', 'train', '#557c8d', 40, array['Transport', '交通']),
  ('transport_car', 'transport', '汽車與計程車', 'Car & taxi', 'car', '#4f7188', 50, array['Taxi', 'Car']),
  ('home_rent', 'home', '房租', 'Rent', 'building', '#6d7484', 60, array['Rent', '房租']),
  ('home_utilities', 'home', '水電網路', 'Utilities', 'zap', '#c2943f', 70, array['Utilities', '水電']),
  ('living_daily', 'living', '日用品', 'Daily essentials', 'shopping-bag', '#648c7a', 80, array['Daily', '日用品']),
  ('living_shopping', 'living', '購物', 'Shopping', 'shopping-cart', '#9b6d85', 90, array['Shopping', '購物']),
  ('entertainment', 'entertainment', '娛樂', 'Entertainment', 'gamepad-2', '#71699b', 100, array['Entertainment', '娛樂']),
  ('health', 'health', '健康醫療', 'Health', 'heart-pulse', '#a75f63', 110, array['Health', '醫療', '運動']),
  ('finance_insurance', 'finance', '保險', 'Insurance', 'shield', '#527f75', 120, array['Insurance', '保險']),
  ('finance_subscription', 'finance', '訂閱', 'Subscription', 'repeat', '#75659b', 130, array['Subscription', '訂閱']),
  ('other', 'other', '其他', 'Other', 'more-horizontal', '#7d858c', 999, array['Other', '其他', 'Dating', '約會'])
on conflict (key) do update set
  group_key = excluded.group_key,
  name_zh = excluded.name_zh,
  name_en = excluded.name_en,
  icon = excluded.icon,
  color = excluded.color,
  sort_order = excluded.sort_order,
  legacy_names = excluded.legacy_names,
  updated_at = now();

insert into public.tags_v2 (key, name_zh, name_en, color) values
  ('dating', '約會', 'Dating', '#b96878'),
  ('work', '工作', 'Work', '#5e7f9a'),
  ('travel', '旅行', 'Travel', '#9a7b51')
on conflict (key) do update set name_zh = excluded.name_zh, name_en = excluded.name_en, color = excluded.color;

-- No browser role may read/write these tables. The Next.js server will use a server-only service role key.
alter table public.app_settings_v2 enable row level security;
alter table public.categories_v2 enable row level security;
alter table public.tags_v2 enable row level security;
alter table public.expenses_v2 enable row level security;
alter table public.expense_tags_v2 enable row level security;
alter table public.reminders_v2 enable row level security;
alter table public.ai_advice_v2 enable row level security;

revoke all on public.app_settings_v2, public.categories_v2, public.tags_v2, public.expenses_v2,
  public.expense_tags_v2, public.reminders_v2, public.ai_advice_v2 from anon, authenticated;

commit;
