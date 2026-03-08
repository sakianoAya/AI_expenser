-- Create categories table
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name_zh text not null,
  name_en text not null,
  icon text not null,
  color text not null,
  group_name text not null,
  is_default boolean default false,
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table public.categories enable row level security;

create policy "categories_select_own" on public.categories for select using (auth.uid() = user_id);
create policy "categories_insert_own" on public.categories for insert with check (auth.uid() = user_id);
create policy "categories_update_own" on public.categories for update using (auth.uid() = user_id);
create policy "categories_delete_own" on public.categories for delete using (auth.uid() = user_id);

-- Function to seed default categories for a new user
create or replace function public.seed_default_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (user_id, name_zh, name_en, icon, color, group_name, is_default, sort_order) values
    -- Living
    (new.id, '飲食', 'Food', 'utensils', '#ef4444', 'living', true, 1),
    (new.id, '交通', 'Transport', 'car', '#f97316', 'living', true, 2),
    (new.id, '住宿', 'Housing', 'home', '#eab308', 'living', true, 3),
    (new.id, '日用品', 'Daily', 'shopping-bag', '#84cc16', 'living', true, 4),
    -- Entertainment
    (new.id, '娛樂', 'Entertainment', 'gamepad-2', '#06b6d4', 'entertainment', true, 5),
    (new.id, '旅遊', 'Travel', 'plane', '#3b82f6', 'entertainment', true, 6),
    (new.id, '購物', 'Shopping', 'shopping-cart', '#8b5cf6', 'entertainment', true, 7),
    (new.id, '社交', 'Social', 'users', '#ec4899', 'entertainment', true, 8),
    -- Fixed
    (new.id, '房租', 'Rent', 'building', '#64748b', 'fixed', true, 9),
    (new.id, '保險', 'Insurance', 'shield', '#0d9488', 'fixed', true, 10),
    (new.id, '訂閱', 'Subscription', 'repeat', '#7c3aed', 'fixed', true, 11),
    (new.id, '學費', 'Tuition', 'graduation-cap', '#b45309', 'fixed', true, 12);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_categories on auth.users;

create trigger on_auth_user_created_categories
  after insert on auth.users
  for each row
  execute function public.seed_default_categories();
