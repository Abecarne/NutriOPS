-- =====================================================================
-- NutriOps — items repas/collations par journée nutrition
-- =====================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'meal_slot') then
    create type meal_slot as enum ('breakfast', 'lunch', 'dinner', 'snack', 'pre_training', 'post_training');
  end if;
end $$;

create table if not exists public.nutrition_meal_items (
  id          uuid primary key default gen_random_uuid(),
  target_id   uuid not null references public.daily_nutrition_targets(id) on delete cascade,
  meal_slot   meal_slot not null default 'snack',
  name        text not null,
  quantity    text,
  calories    int not null default 0,
  protein_g   int not null default 0,
  carbs_g     int not null default 0,
  fat_g       int not null default 0,
  notes       text,
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists nutrition_meal_items_target_idx on public.nutrition_meal_items(target_id, position);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists nutrition_meal_items_updated_at on public.nutrition_meal_items;
create trigger nutrition_meal_items_updated_at
  before update on public.nutrition_meal_items
  for each row execute function public.set_updated_at();

alter table public.nutrition_meal_items enable row level security;

drop policy if exists "nutrition_meal_items coach rw" on public.nutrition_meal_items;
create policy "nutrition_meal_items coach rw" on public.nutrition_meal_items
  for all using (
    exists (
      select 1
      from public.daily_nutrition_targets nt
      join public.athletes a on a.id = nt.athlete_id
      where nt.id = target_id and a.coach_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.daily_nutrition_targets nt
      join public.athletes a on a.id = nt.athlete_id
      where nt.id = target_id and a.coach_id = auth.uid()
    )
  );

drop function if exists public.get_daily_checkin_context_by_token(uuid, date);
create or replace function public.get_daily_checkin_context_by_token(p_token uuid, p_checkin_date date)
returns table (
  athlete_id        uuid,
  full_name         text,
  sport             text,
  club_name         text,
  primary_color     text,
  checkin           jsonb,
  nutrition_target  jsonb,
  nutrition_meal_items jsonb,
  training_sessions jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    a.id,
    a.full_name,
    a.sport,
    c.club_name,
    c.primary_color,
    (select to_jsonb(ci) from public.checkins ci where ci.athlete_id = a.id and ci.checkin_date = p_checkin_date limit 1),
    (select to_jsonb(nt) from public.daily_nutrition_targets nt where nt.athlete_id = a.id and nt.target_date = p_checkin_date limit 1),
    coalesce(
      (
        select jsonb_agg(to_jsonb(mi) order by mi.position, mi.created_at)
        from public.daily_nutrition_targets nt
        join public.nutrition_meal_items mi on mi.target_id = nt.id
        where nt.athlete_id = a.id and nt.target_date = p_checkin_date
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(to_jsonb(ts) order by ts.created_at)
        from public.training_sessions ts
        where ts.athlete_id = a.id and ts.session_date = p_checkin_date
      ),
      '[]'::jsonb
    )
  from public.athletes a
  join public.coaches c on c.id = a.coach_id
  where a.checkin_token = p_token;
$$;

grant execute on function public.get_daily_checkin_context_by_token(uuid, date) to anon, authenticated;
