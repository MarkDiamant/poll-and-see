-- Run this in Supabase SQL Editor again.

create table if not exists public.subscribers (
  id bigint generated always as identity primary key,
  email text unique not null,
  category_preferences text[] null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now()
);

alter table public.subscribers
  add column if not exists category_preferences text[] null;

alter table public.subscribers
  add column if not exists is_active boolean not null default true;

alter table public.subscribers
  add column if not exists created_at timestamp with time zone not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'subscribers'
      and column_name = 'category_preference'
  ) then
    update public.subscribers
    set category_preferences = array[category_preference]
    where category_preference is not null
      and category_preference <> ''
      and (category_preferences is null or cardinality(category_preferences) = 0);
  end if;
end $$;

create index if not exists idx_subscribers_active
on public.subscribers(is_active);

create index if not exists idx_subscribers_category_preferences
on public.subscribers using gin(category_preferences);