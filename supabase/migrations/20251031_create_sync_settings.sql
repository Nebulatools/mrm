create table if not exists public.sync_settings (
  singleton boolean primary key default true,
  frequency text not null default 'weekly' check (frequency in ('manual', 'daily', 'weekly', 'monthly')),
  day_of_week text default 'monday',
  run_time time without time zone default '02:00',
  last_run timestamptz,
  next_run timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_sync_settings_updated_at()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sync_settings_set_updated_at on public.sync_settings;
create trigger sync_settings_set_updated_at
before update on public.sync_settings
for each row
execute function public.set_sync_settings_updated_at();

insert into public.sync_settings (singleton, frequency, day_of_week, run_time)
values (true, 'weekly', 'monday', '02:00')
on conflict (singleton) do nothing;
