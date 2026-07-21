-- DailyApp v2 legacy migration
-- Run only after 010_single_user_v2_schema.sql.
-- Idempotent: legacy IDs are unique, so rerunning does not duplicate rows.

begin;

create schema if not exists migration_backup;

do $$
begin
  if to_regclass('public.profiles') is not null then
    execute 'create table if not exists migration_backup.profiles_20260722 as table public.profiles';
  end if;
  if to_regclass('public.categories') is not null then
    execute 'create table if not exists migration_backup.categories_20260722 as table public.categories';
  end if;
  if to_regclass('public.expenses') is not null then
    execute 'create table if not exists migration_backup.expenses_20260722 as table public.expenses';
  end if;
  if to_regclass('public.schedules') is not null then
    execute 'create table if not exists migration_backup.schedules_20260722 as table public.schedules';
  end if;
  if to_regclass('public.ai_advice') is not null then
    execute 'create table if not exists migration_backup.ai_advice_20260722 as table public.ai_advice';
  end if;
end $$;

do $$
begin
  if to_regclass('public.profiles') is not null then
    execute $sql$
      update public.app_settings_v2 target
      set display_name = coalesce(source.display_name, target.display_name),
          preferred_currency = case when source.preferred_currency in ('TWD','JPY','USD','EUR') then source.preferred_currency else target.preferred_currency end,
          preferred_locale = case when source.preferred_locale in ('zh-TW','en') then source.preferred_locale else target.preferred_locale end,
          monthly_budget = greatest(coalesce(source.monthly_budget, 0), 0),
          updated_at = now()
      from (select * from public.profiles order by updated_at desc nulls last limit 1) source
      where target.singleton_id = 1
    $sql$;
  end if;
end $$;

do $$
begin
  if to_regclass('public.expenses') is not null then
    execute $sql$
      insert into public.expenses_v2 (
        legacy_expense_id, category_key, amount, currency, description, receipt_url,
        expense_date, legacy_category, migration_status, created_at, updated_at
      )
      select
        e.id,
        case
          when c.name_en = 'Food' or c.name_zh in ('飲食','外食') then 'food_dining'
          when c.name_en = 'Groceries' or c.name_zh = '食材' then 'food_grocery'
          when c.name_en = 'Transport' or c.name_zh = '交通' then 'transport_public'
          when c.name_en = 'Daily' or c.name_zh = '日用品' then 'living_daily'
          when c.name_en = 'Shopping' or c.name_zh = '購物' then 'living_shopping'
          when c.name_en = 'Entertainment' or c.name_zh = '娛樂' then 'entertainment'
          when c.name_en = 'Rent' or c.name_zh = '房租' then 'home_rent'
          when c.name_en = 'Utilities' or c.name_zh = '水電' then 'home_utilities'
          when c.name_en = 'Insurance' or c.name_zh = '保險' then 'finance_insurance'
          when c.name_en = 'Subscription' or c.name_zh = '訂閱' then 'finance_subscription'
          else 'other'
        end,
        e.amount,
        case when e.currency in ('TWD','JPY','USD','EUR') then e.currency else 'TWD' end,
        e.description,
        e.receipt_url,
        e.expense_date,
        coalesce(c.name_zh, c.name_en, '未分類'),
        case when c.name_en = 'Dating' or c.name_zh = '約會' or c.id is null then 'needs_review' else 'mapped' end,
        coalesce(e.created_at, now()),
        coalesce(e.updated_at, e.created_at, now())
      from public.expenses e
      left join public.categories c on c.id = e.category_id
      where e.amount > 0
      on conflict (legacy_expense_id) do nothing
    $sql$;

    execute $sql$
      insert into public.expense_tags_v2 (expense_id, tag_id)
      select migrated.id, tag.id
      from public.expenses_v2 migrated
      join public.expenses legacy on legacy.id = migrated.legacy_expense_id
      left join public.categories category on category.id = legacy.category_id
      cross join public.tags_v2 tag
      where tag.key = 'dating' and (category.name_en = 'Dating' or category.name_zh = '約會')
      on conflict do nothing
    $sql$;
  end if;
end $$;

do $$
begin
  if to_regclass('public.schedules') is not null then
    execute $sql$
      insert into public.reminders_v2 (
        legacy_schedule_id, title, description, starts_at, ends_at, is_all_day,
        reminder_minutes, reminder_type, color, created_at, updated_at
      )
      select id, title, description, start_time, end_time, coalesce(is_all_day, false),
        reminder_minutes, 'general', coalesce(color, '#3f765f'), coalesce(created_at, now()), coalesce(updated_at, created_at, now())
      from public.schedules
      on conflict (legacy_schedule_id) do nothing
    $sql$;
  end if;
end $$;

do $$
begin
  if to_regclass('public.ai_advice') is not null then
    execute $sql$
      insert into public.ai_advice_v2 (legacy_advice_id, advice_type, prompt, content, context, model, created_at)
      select id, advice_type, prompt, content, coalesce(context, '{}'::jsonb), 'gemini-2.5-flash', coalesce(created_at, now())
      from public.ai_advice
      on conflict (legacy_advice_id) do nothing
    $sql$;
  end if;
end $$;

commit;

-- Review ambiguous records before switching the application to v2.
select id, expense_date, amount, description, legacy_category, category_key
from public.expenses_v2
where migration_status = 'needs_review'
order by expense_date desc;
