-- Read-only validation queries. Run after 011_migrate_legacy_data_to_v2.sql.

select 'settings' as entity, count(*) as v2_rows from public.app_settings_v2
union all select 'categories', count(*) from public.categories_v2
union all select 'tags', count(*) from public.tags_v2
union all select 'expenses', count(*) from public.expenses_v2
union all select 'reminders', count(*) from public.reminders_v2
union all select 'ai_advice', count(*) from public.ai_advice_v2;

select
  (select count(*) from public.expenses) as legacy_expenses,
  (select count(*) from public.expenses_v2 where legacy_expense_id is not null) as migrated_expenses,
  (select count(*) from public.expenses_v2 where migration_status = 'needs_review') as needs_review;

select legacy_category, category_key, migration_status, count(*) as records, sum(amount) as total_amount
from public.expenses_v2
group by legacy_category, category_key, migration_status
order by migration_status desc, records desc;

select legacy_expense_id, count(*)
from public.expenses_v2
where legacy_expense_id is not null
group by legacy_expense_id
having count(*) > 1;

select id, expense_date, amount, currency, description, legacy_category, category_key
from public.expenses_v2
where migration_status = 'needs_review'
order by expense_date desc;

-- Security verification: these should show RLS enabled and no anon/authenticated grants.
select relname, relrowsecurity
from pg_class
where relname in ('app_settings_v2','categories_v2','tags_v2','expenses_v2','expense_tags_v2','reminders_v2','ai_advice_v2')
order by relname;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name like '%\_v2' escape '\'
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
