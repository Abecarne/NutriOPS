-- =====================================================================
-- NutriOps — suivi quotidien, séances et alertes coach
-- =====================================================================
-- Migration idempotente pour les bases ayant déjà appliqué 001.
-- =====================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'nutrition_adherence') then
    create type nutrition_adherence as enum ('low', 'medium', 'high');
  end if;
  if not exists (select 1 from pg_type where typname = 'training_session_type') then
    create type training_session_type as enum ('strength', 'endurance', 'technical', 'recovery', 'competition', 'mobility', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'training_session_status') then
    create type training_session_status as enum ('planned', 'completed', 'modified', 'missed');
  end if;
  if not exists (select 1 from pg_type where typname = 'alert_severity') then
    create type alert_severity as enum ('info', 'warning', 'critical');
  end if;
  if not exists (select 1 from pg_type where typname = 'alert_category') then
    create type alert_category as enum ('recovery', 'nutrition', 'training', 'adherence', 'weight');
  end if;
end $$;

alter table public.checkins
  add column if not exists checkin_date date,
  add column if not exists soreness_level int check (soreness_level between 1 and 5),
  add column if not exists stress_level int check (stress_level between 1 and 5),
  add column if not exists motivation_level int check (motivation_level between 1 and 5),
  add column if not exists hunger_level int check (hunger_level between 1 and 5),
  add column if not exists digestion_quality int check (digestion_quality between 1 and 5),
  add column if not exists nutrition_adherence nutrition_adherence;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'checkins'
      and column_name = 'week_start'
  ) then
    execute 'update public.checkins set checkin_date = week_start where checkin_date is null';
  end if;
end $$;

update public.checkins
set checkin_date = current_date
where checkin_date is null;

alter table public.checkins
  alter column checkin_date set default current_date,
  alter column checkin_date set not null;

alter table public.checkins
  drop constraint if exists checkins_athlete_id_week_start_key,
  drop constraint if exists checkins_athlete_id_checkin_date_key;

alter table public.checkins
  add constraint checkins_athlete_id_checkin_date_key unique (athlete_id, checkin_date);

alter table public.checkins
  drop column if exists week_start;

create index if not exists checkins_athlete_date_idx on public.checkins(athlete_id, checkin_date desc);
create index if not exists checkins_date_idx on public.checkins(checkin_date desc);

create table if not exists public.daily_nutrition_targets (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.athletes(id) on delete cascade,
  target_date date not null,
  day_type    day_type not null default 'rest',
  calories    int not null default 0,
  protein_g   int not null default 0,
  carbs_g     int not null default 0,
  fat_g       int not null default 0,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (athlete_id, target_date)
);
create index if not exists daily_nutrition_targets_athlete_idx on public.daily_nutrition_targets(athlete_id);
create index if not exists daily_nutrition_targets_date_idx on public.daily_nutrition_targets(target_date desc);

create table if not exists public.training_sessions (
  id                  uuid primary key default gen_random_uuid(),
  athlete_id          uuid not null references public.athletes(id) on delete cascade,
  session_date        date not null,
  title               text not null,
  session_type        training_session_type not null default 'other',
  planned_duration_min int,
  planned_intensity   int check (planned_intensity between 1 and 10),
  description         text,
  status              training_session_status not null default 'planned',
  actual_duration_min int,
  rpe                 int check (rpe between 1 and 10),
  internal_load       int generated always as (
    case
      when actual_duration_min is null or rpe is null then null
      else actual_duration_min * rpe
    end
  ) stored,
  athlete_notes       text,
  coach_notes         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists training_sessions_athlete_idx on public.training_sessions(athlete_id);
create index if not exists training_sessions_athlete_date_idx on public.training_sessions(athlete_id, session_date);
create index if not exists training_sessions_date_idx on public.training_sessions(session_date desc);

create table if not exists public.athlete_alerts (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.athletes(id) on delete cascade,
  alert_date  date not null default current_date,
  severity    alert_severity not null default 'warning',
  category    alert_category not null,
  title       text not null,
  description text not null,
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists athlete_alerts_athlete_idx on public.athlete_alerts(athlete_id);
create index if not exists athlete_alerts_open_idx on public.athlete_alerts(athlete_id, resolved, alert_date desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists daily_nutrition_targets_updated_at on public.daily_nutrition_targets;
create trigger daily_nutrition_targets_updated_at
  before update on public.daily_nutrition_targets
  for each row execute function public.set_updated_at();

drop trigger if exists training_sessions_updated_at on public.training_sessions;
create trigger training_sessions_updated_at
  before update on public.training_sessions
  for each row execute function public.set_updated_at();

alter table public.daily_nutrition_targets enable row level security;
alter table public.training_sessions enable row level security;
alter table public.athlete_alerts enable row level security;

drop policy if exists "daily_nutrition_targets coach rw" on public.daily_nutrition_targets;
create policy "daily_nutrition_targets coach rw" on public.daily_nutrition_targets
  for all using (
    exists (select 1 from public.athletes a where a.id = athlete_id and a.coach_id = auth.uid())
  ) with check (
    exists (select 1 from public.athletes a where a.id = athlete_id and a.coach_id = auth.uid())
  );

drop policy if exists "training_sessions coach rw" on public.training_sessions;
create policy "training_sessions coach rw" on public.training_sessions
  for all using (
    exists (select 1 from public.athletes a where a.id = athlete_id and a.coach_id = auth.uid())
  ) with check (
    exists (select 1 from public.athletes a where a.id = athlete_id and a.coach_id = auth.uid())
  );

drop policy if exists "athlete_alerts coach rw" on public.athlete_alerts;
create policy "athlete_alerts coach rw" on public.athlete_alerts
  for all using (
    exists (select 1 from public.athletes a where a.id = athlete_id and a.coach_id = auth.uid())
  ) with check (
    exists (select 1 from public.athletes a where a.id = athlete_id and a.coach_id = auth.uid())
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

drop function if exists public.submit_daily_checkin(uuid, date, numeric, int, int, int, int, int, int, int, nutrition_adherence, text);
create or replace function public.submit_daily_checkin(
  p_token               uuid,
  p_checkin_date        date,
  p_weight_kg           numeric,
  p_energy_level        int,
  p_sleep_quality       int,
  p_soreness_level      int,
  p_stress_level        int,
  p_motivation_level    int,
  p_hunger_level        int,
  p_digestion_quality   int,
  p_nutrition_adherence nutrition_adherence,
  p_notes               text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_athlete_id uuid;
  v_id         uuid;
begin
  select id into v_athlete_id from public.athletes where checkin_token = p_token;
  if v_athlete_id is null then
    raise exception 'Invalid check-in token';
  end if;

  insert into public.checkins (
    athlete_id,
    checkin_date,
    weight_kg,
    energy_level,
    sleep_quality,
    soreness_level,
    stress_level,
    motivation_level,
    hunger_level,
    digestion_quality,
    nutrition_adherence,
    notes,
    submitted_at
  ) values (
    v_athlete_id,
    p_checkin_date,
    p_weight_kg,
    p_energy_level,
    p_sleep_quality,
    p_soreness_level,
    p_stress_level,
    p_motivation_level,
    p_hunger_level,
    p_digestion_quality,
    p_nutrition_adherence,
    p_notes,
    now()
  )
  on conflict (athlete_id, checkin_date) do update set
    weight_kg           = excluded.weight_kg,
    energy_level        = excluded.energy_level,
    sleep_quality       = excluded.sleep_quality,
    soreness_level      = excluded.soreness_level,
    stress_level        = excluded.stress_level,
    motivation_level    = excluded.motivation_level,
    hunger_level        = excluded.hunger_level,
    digestion_quality   = excluded.digestion_quality,
    nutrition_adherence = excluded.nutrition_adherence,
    notes               = excluded.notes,
    submitted_at        = now()
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.submit_daily_checkin(uuid, date, numeric, int, int, int, int, int, int, int, nutrition_adherence, text) to anon, authenticated;

drop function if exists public.submit_training_feedback(uuid, uuid, training_session_status, int, int, text);
create or replace function public.submit_training_feedback(
  p_token               uuid,
  p_session_id          uuid,
  p_status              training_session_status,
  p_actual_duration_min int,
  p_rpe                 int,
  p_athlete_notes       text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
begin
  select ts.id into v_session_id
  from public.training_sessions ts
  join public.athletes a on a.id = ts.athlete_id
  where ts.id = p_session_id and a.checkin_token = p_token;

  if v_session_id is null then
    raise exception 'Invalid training session';
  end if;

  update public.training_sessions
  set
    status = p_status,
    actual_duration_min = p_actual_duration_min,
    rpe = p_rpe,
    athlete_notes = p_athlete_notes,
    updated_at = now()
  where id = v_session_id
  returning id into v_session_id;

  return v_session_id;
end;
$$;

grant execute on function public.submit_training_feedback(uuid, uuid, training_session_status, int, int, text) to anon, authenticated;
