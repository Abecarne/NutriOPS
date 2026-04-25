-- =====================================================================
-- NutriOps — schéma initial
-- =====================================================================
-- Tables : coaches, athletes, nutrition_plans, day_targets,
--          checkins, coach_notes
-- RLS    : chaque coach ne voit que ses données ; les check-ins
--          publics passent par des fonctions SECURITY DEFINER
-- Storage: bucket public "branding" pour les logos
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'athlete_status') then
    create type athlete_status as enum ('active', 'offseason', 'injured');
  end if;
  if not exists (select 1 from pg_type where typname = 'day_type') then
    create type day_type as enum ('intense', 'light', 'rest', 'competition');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- TABLE : coaches
-- ---------------------------------------------------------------------
create table if not exists public.coaches (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text unique not null,
  full_name     text not null,
  club_name     text,
  logo_url      text,
  primary_color text not null default '#1D9E75',
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- TABLE : athletes
-- ---------------------------------------------------------------------
create table if not exists public.athletes (
  id             uuid primary key default gen_random_uuid(),
  coach_id       uuid not null references public.coaches(id) on delete cascade,
  full_name      text not null,
  sport          text not null,
  birth_date     date,
  height_cm      int,
  goal           text,
  status         athlete_status not null default 'active',
  checkin_token  uuid not null unique default gen_random_uuid(),
  created_at     timestamptz not null default now()
);
create index if not exists athletes_coach_id_idx on public.athletes(coach_id);
create index if not exists athletes_checkin_token_idx on public.athletes(checkin_token);

-- ---------------------------------------------------------------------
-- TABLE : nutrition_plans
-- ---------------------------------------------------------------------
create table if not exists public.nutrition_plans (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.athletes(id) on delete cascade,
  week_start  date not null,
  name        text not null default '',
  created_at  timestamptz not null default now(),
  unique (athlete_id, week_start)
);
create index if not exists nutrition_plans_athlete_idx on public.nutrition_plans(athlete_id);

-- ---------------------------------------------------------------------
-- TABLE : day_targets
-- ---------------------------------------------------------------------
create table if not exists public.day_targets (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.nutrition_plans(id) on delete cascade,
  day_type    day_type not null,
  calories    int not null default 0,
  protein_g   int not null default 0,
  carbs_g     int not null default 0,
  fat_g       int not null default 0,
  notes       text,
  unique (plan_id, day_type)
);
create index if not exists day_targets_plan_idx on public.day_targets(plan_id);

-- ---------------------------------------------------------------------
-- TABLE : checkins
-- Suivi quotidien : un athlète peut soumettre ou mettre à jour
-- un check-in par date civile.
-- ---------------------------------------------------------------------
create table if not exists public.checkins (
  id            uuid primary key default gen_random_uuid(),
  athlete_id    uuid not null references public.athletes(id) on delete cascade,
  checkin_date  date not null default current_date,
  weight_kg     numeric(4,1) not null,
  energy_level  int not null check (energy_level between 1 and 5),
  sleep_quality int not null check (sleep_quality between 1 and 5),
  notes         text,
  submitted_at  timestamptz not null default now(),
  unique (athlete_id, checkin_date)
);

-- Compatibilité si ce fichier est rejoué sur une base créée avec
-- l'ancien modèle hebdomadaire (checkins.week_start).
alter table public.checkins
  add column if not exists checkin_date date;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
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

create index if not exists checkins_athlete_idx on public.checkins(athlete_id);
create index if not exists checkins_athlete_date_idx on public.checkins(athlete_id, checkin_date desc);
create index if not exists checkins_date_idx on public.checkins(checkin_date desc);

-- ---------------------------------------------------------------------
-- TABLE : coach_notes
-- ---------------------------------------------------------------------
create table if not exists public.coach_notes (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.athletes(id) on delete cascade,
  week_start  date not null,
  content     text not null default '',
  created_at  timestamptz not null default now(),
  unique (athlete_id, week_start)
);
create index if not exists coach_notes_athlete_idx on public.coach_notes(athlete_id);

-- ---------------------------------------------------------------------
-- Trigger : création automatique de la ligne coach à l'inscription
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.coaches (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.coaches         enable row level security;
alter table public.athletes        enable row level security;
alter table public.nutrition_plans enable row level security;
alter table public.day_targets     enable row level security;
alter table public.checkins        enable row level security;
alter table public.coach_notes     enable row level security;

-- coaches : accès uniquement à sa propre ligne
drop policy if exists "coach self read"   on public.coaches;
drop policy if exists "coach self update" on public.coaches;
drop policy if exists "coach self insert" on public.coaches;
create policy "coach self read"   on public.coaches for select using (auth.uid() = id);
create policy "coach self update" on public.coaches for update using (auth.uid() = id);
create policy "coach self insert" on public.coaches for insert with check (auth.uid() = id);

-- athletes : coach propriétaire
drop policy if exists "athletes coach rw" on public.athletes;
create policy "athletes coach rw" on public.athletes
  for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- nutrition_plans : via relation athletes
drop policy if exists "plans coach rw" on public.nutrition_plans;
create policy "plans coach rw" on public.nutrition_plans
  for all using (
    exists (select 1 from public.athletes a where a.id = athlete_id and a.coach_id = auth.uid())
  ) with check (
    exists (select 1 from public.athletes a where a.id = athlete_id and a.coach_id = auth.uid())
  );

-- day_targets : via relation nutrition_plans → athletes
drop policy if exists "day_targets coach rw" on public.day_targets;
create policy "day_targets coach rw" on public.day_targets
  for all using (
    exists (
      select 1 from public.nutrition_plans p
      join public.athletes a on a.id = p.athlete_id
      where p.id = plan_id and a.coach_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.nutrition_plans p
      join public.athletes a on a.id = p.athlete_id
      where p.id = plan_id and a.coach_id = auth.uid()
    )
  );

-- checkins : SELECT coach uniquement (INSERT public via RPC)
drop policy if exists "checkins coach select" on public.checkins;
create policy "checkins coach select" on public.checkins
  for select using (
    exists (select 1 from public.athletes a where a.id = athlete_id and a.coach_id = auth.uid())
  );

-- coach_notes : via relation athletes
drop policy if exists "coach_notes coach rw" on public.coach_notes;
create policy "coach_notes coach rw" on public.coach_notes
  for all using (
    exists (select 1 from public.athletes a where a.id = athlete_id and a.coach_id = auth.uid())
  ) with check (
    exists (select 1 from public.athletes a where a.id = athlete_id and a.coach_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- RPC publiques pour le flux de check-in anonyme (token)
-- ---------------------------------------------------------------------

-- Récupère les infos de l'athlète + branding coach pour l'écran de check-in
create or replace function public.get_athlete_by_token(p_token uuid)
returns table (
  athlete_id     uuid,
  full_name      text,
  sport          text,
  club_name      text,
  primary_color  text
)
language sql
security definer
set search_path = public
as $$
  select a.id, a.full_name, a.sport, c.club_name, c.primary_color
  from public.athletes a
  join public.coaches c on c.id = a.coach_id
  where a.checkin_token = p_token;
$$;

grant execute on function public.get_athlete_by_token(uuid) to anon, authenticated;

-- Récupère un check-in existant pour une date donnée (via token)
drop function if exists public.get_checkin_by_token(uuid, date);
create or replace function public.get_checkin_by_token(p_token uuid, p_checkin_date date)
returns table (
  id            uuid,
  checkin_date  date,
  weight_kg     numeric,
  energy_level  int,
  sleep_quality int,
  notes         text,
  submitted_at  timestamptz
)
language sql
security definer
set search_path = public
as $$
  select ci.id, ci.checkin_date, ci.weight_kg, ci.energy_level, ci.sleep_quality, ci.notes, ci.submitted_at
  from public.checkins ci
  join public.athletes a on a.id = ci.athlete_id
  where a.checkin_token = p_token and ci.checkin_date = p_checkin_date;
$$;

grant execute on function public.get_checkin_by_token(uuid, date) to anon, authenticated;

-- Soumission (upsert) d'un check-in quotidien par l'athlète via son token
drop function if exists public.submit_checkin(uuid, date, numeric, int, int, text);
create or replace function public.submit_checkin(
  p_token         uuid,
  p_checkin_date  date,
  p_weight_kg     numeric,
  p_energy_level  int,
  p_sleep_quality int,
  p_notes         text
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

  -- Range validation is enforced by the table CHECK constraints on
  -- energy_level / sleep_quality. We let the INSERT raise on its own.

  insert into public.checkins (
    athlete_id, checkin_date, weight_kg, energy_level, sleep_quality, notes, submitted_at
  ) values (
    v_athlete_id, p_checkin_date, p_weight_kg, p_energy_level, p_sleep_quality, p_notes, now()
  )
  on conflict (athlete_id, checkin_date) do update set
    weight_kg     = excluded.weight_kg,
    energy_level  = excluded.energy_level,
    sleep_quality = excluded.sleep_quality,
    notes         = excluded.notes,
    submitted_at  = now()
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.submit_checkin(uuid, date, numeric, int, int, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Storage : bucket "branding" (logos coachs)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

drop policy if exists "branding coach upload" on storage.objects;
create policy "branding coach upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'branding' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "branding coach update" on storage.objects;
create policy "branding coach update" on storage.objects
  for update to authenticated
  using (bucket_id = 'branding' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "branding coach delete" on storage.objects;
create policy "branding coach delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'branding' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "branding public read" on storage.objects;
create policy "branding public read" on storage.objects
  for select to public
  using (bucket_id = 'branding');
