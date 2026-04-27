-- =====================================================================
-- NutriOps — premium coaching priority 1
-- =====================================================================
-- Adds rich client profile fields, weekly check-ins, and structured
-- coach feedback while keeping the existing athletes/checkins model.
-- =====================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'client_goal_type') then
    create type client_goal_type as enum (
      'fat_loss',
      'muscle_gain',
      'strength',
      'performance',
      'health',
      'recomposition'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'client_experience_level') then
    create type client_experience_level as enum ('beginner', 'intermediate', 'advanced');
  end if;

  if not exists (select 1 from pg_type where typname = 'coach_feedback_related_type') then
    create type coach_feedback_related_type as enum ('checkin', 'session', 'nutrition', 'general');
  end if;

  if not exists (select 1 from pg_type where typname = 'coach_feedback_visibility') then
    create type coach_feedback_visibility as enum ('client_visible', 'private');
  end if;
end $$;

alter table public.athletes
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists gender text,
  add column if not exists current_weight_kg numeric(5,1),
  add column if not exists target_weight_kg numeric(5,1),
  add column if not exists goal_type client_goal_type,
  add column if not exists experience_level client_experience_level not null default 'beginner',
  add column if not exists training_frequency_per_week int not null default 3 check (training_frequency_per_week between 0 and 14),
  add column if not exists available_equipment text[] not null default '{}',
  add column if not exists injuries text[] not null default '{}',
  add column if not exists medical_notes text,
  add column if not exists food_preferences text[] not null default '{}',
  add column if not exists dietary_restrictions text[] not null default '{}',
  add column if not exists lifestyle_notes text,
  add column if not exists work_schedule text,
  add column if not exists sleep_average_hours numeric(3,1),
  add column if not exists stress_level int not null default 3 check (stress_level between 1 and 5),
  add column if not exists motivation_level int not null default 3 check (motivation_level between 1 and 5),
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update public.athletes
set
  first_name = coalesce(first_name, nullif(split_part(full_name, ' ', 1), '')),
  last_name = coalesce(
    last_name,
    nullif(trim(substr(full_name, length(split_part(full_name, ' ', 1)) + 1)), '')
  ),
  goal_type = coalesce(goal_type, 'performance'::client_goal_type)
where first_name is null
   or last_name is null
   or goal_type is null;

create index if not exists athletes_coach_status_idx on public.athletes(coach_id, status);
create index if not exists athletes_email_idx on public.athletes(email);

drop trigger if exists athletes_updated_at on public.athletes;
create trigger athletes_updated_at
  before update on public.athletes
  for each row execute function public.set_updated_at();

create table if not exists public.weekly_checkins (
  id                           uuid primary key default gen_random_uuid(),
  athlete_id                   uuid not null references public.athletes(id) on delete cascade,
  week_start_date              date not null,
  weight_kg                    numeric(5,1) not null,
  waist_cm                     numeric(5,1),
  sleep_quality                int not null check (sleep_quality between 1 and 5),
  average_sleep_hours          numeric(3,1),
  energy_level                 int not null check (energy_level between 1 and 5),
  stress_level                 int not null check (stress_level between 1 and 5),
  hunger_level                 int not null check (hunger_level between 1 and 5),
  soreness_level               int not null check (soreness_level between 1 and 5),
  motivation_level             int not null check (motivation_level between 1 and 5),
  training_adherence_percent   int not null check (training_adherence_percent between 0 and 100),
  nutrition_adherence_percent  int not null check (nutrition_adherence_percent between 0 and 100),
  steps_average                int,
  pain_notes                   text,
  wins                         text,
  difficulties                 text,
  client_comment               text,
  coach_feedback               text,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now(),
  unique (athlete_id, week_start_date)
);

create index if not exists weekly_checkins_athlete_idx on public.weekly_checkins(athlete_id);
create index if not exists weekly_checkins_athlete_week_idx on public.weekly_checkins(athlete_id, week_start_date desc);

drop trigger if exists weekly_checkins_updated_at on public.weekly_checkins;
create trigger weekly_checkins_updated_at
  before update on public.weekly_checkins
  for each row execute function public.set_updated_at();

create table if not exists public.coach_feedback (
  id            uuid primary key default gen_random_uuid(),
  athlete_id    uuid not null references public.athletes(id) on delete cascade,
  related_type  coach_feedback_related_type not null default 'general',
  related_id    uuid,
  message       text not null,
  visibility    coach_feedback_visibility not null default 'client_visible',
  created_at    timestamptz not null default now()
);

create index if not exists coach_feedback_athlete_idx on public.coach_feedback(athlete_id, created_at desc);
create index if not exists coach_feedback_related_idx on public.coach_feedback(related_type, related_id);

alter table public.weekly_checkins enable row level security;
alter table public.coach_feedback enable row level security;

drop policy if exists "weekly_checkins coach select" on public.weekly_checkins;
create policy "weekly_checkins coach select" on public.weekly_checkins
  for select using (
    exists (select 1 from public.athletes a where a.id = athlete_id and a.coach_id = auth.uid())
  );

drop policy if exists "weekly_checkins coach update" on public.weekly_checkins;
create policy "weekly_checkins coach update" on public.weekly_checkins
  for update using (
    exists (select 1 from public.athletes a where a.id = athlete_id and a.coach_id = auth.uid())
  ) with check (
    exists (select 1 from public.athletes a where a.id = athlete_id and a.coach_id = auth.uid())
  );

drop policy if exists "coach_feedback coach rw" on public.coach_feedback;
create policy "coach_feedback coach rw" on public.coach_feedback
  for all using (
    exists (select 1 from public.athletes a where a.id = athlete_id and a.coach_id = auth.uid())
  ) with check (
    exists (select 1 from public.athletes a where a.id = athlete_id and a.coach_id = auth.uid())
  );

drop function if exists public.get_weekly_checkin_context_by_token(uuid, date);
create or replace function public.get_weekly_checkin_context_by_token(p_token uuid, p_week_start_date date)
returns table (
  athlete_id       uuid,
  full_name        text,
  sport            text,
  club_name        text,
  primary_color    text,
  weekly_checkin   jsonb
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
    (
      select to_jsonb(wc)
      from public.weekly_checkins wc
      where wc.athlete_id = a.id and wc.week_start_date = p_week_start_date
      limit 1
    ) as weekly_checkin
  from public.athletes a
  join public.coaches c on c.id = a.coach_id
  where a.checkin_token = p_token;
$$;

grant execute on function public.get_weekly_checkin_context_by_token(uuid, date) to anon, authenticated;

drop function if exists public.submit_weekly_checkin(uuid, date, numeric, numeric, int, numeric, int, int, int, int, int, int, int, int, text, text, text, text, text);
create or replace function public.submit_weekly_checkin(
  p_token                         uuid,
  p_week_start_date               date,
  p_weight_kg                     numeric,
  p_waist_cm                      numeric,
  p_sleep_quality                 int,
  p_average_sleep_hours           numeric,
  p_energy_level                  int,
  p_stress_level                  int,
  p_hunger_level                  int,
  p_soreness_level                int,
  p_motivation_level              int,
  p_training_adherence_percent    int,
  p_nutrition_adherence_percent   int,
  p_steps_average                 int,
  p_pain_notes                    text,
  p_wins                          text,
  p_difficulties                  text,
  p_client_comment                text,
  p_coach_feedback                text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_athlete_id uuid;
  v_id uuid;
begin
  select id into v_athlete_id from public.athletes where checkin_token = p_token;
  if v_athlete_id is null then
    raise exception 'Invalid check-in token';
  end if;

  insert into public.weekly_checkins (
    athlete_id,
    week_start_date,
    weight_kg,
    waist_cm,
    sleep_quality,
    average_sleep_hours,
    energy_level,
    stress_level,
    hunger_level,
    soreness_level,
    motivation_level,
    training_adherence_percent,
    nutrition_adherence_percent,
    steps_average,
    pain_notes,
    wins,
    difficulties,
    client_comment,
    coach_feedback
  ) values (
    v_athlete_id,
    p_week_start_date,
    p_weight_kg,
    p_waist_cm,
    p_sleep_quality,
    p_average_sleep_hours,
    p_energy_level,
    p_stress_level,
    p_hunger_level,
    p_soreness_level,
    p_motivation_level,
    p_training_adherence_percent,
    p_nutrition_adherence_percent,
    p_steps_average,
    p_pain_notes,
    p_wins,
    p_difficulties,
    p_client_comment,
    p_coach_feedback
  )
  on conflict (athlete_id, week_start_date) do update set
    weight_kg = excluded.weight_kg,
    waist_cm = excluded.waist_cm,
    sleep_quality = excluded.sleep_quality,
    average_sleep_hours = excluded.average_sleep_hours,
    energy_level = excluded.energy_level,
    stress_level = excluded.stress_level,
    hunger_level = excluded.hunger_level,
    soreness_level = excluded.soreness_level,
    motivation_level = excluded.motivation_level,
    training_adherence_percent = excluded.training_adherence_percent,
    nutrition_adherence_percent = excluded.nutrition_adherence_percent,
    steps_average = excluded.steps_average,
    pain_notes = excluded.pain_notes,
    wins = excluded.wins,
    difficulties = excluded.difficulties,
    client_comment = excluded.client_comment,
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.submit_weekly_checkin(uuid, date, numeric, numeric, int, numeric, int, int, int, int, int, int, int, int, text, text, text, text, text) to anon, authenticated;
