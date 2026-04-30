-- =====================================================================
-- NutriOps — premium coaching priority 2
-- =====================================================================
-- Structured training programs, exercises, nutrition targets and meal logs.
-- Existing daily training_sessions and daily_nutrition_targets remain intact.
-- =====================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'training_program_status') then
    create type training_program_status as enum ('active', 'archived', 'draft');
  end if;

  if not exists (select 1 from pg_type where typname = 'meal_log_type') then
    create type meal_log_type as enum ('breakfast', 'lunch', 'dinner', 'snack', 'other');
  end if;
end $$;

create table if not exists public.training_programs (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.athletes(id) on delete cascade,
  title       text not null,
  goal        text not null default '',
  start_date  date not null,
  end_date    date,
  status      training_program_status not null default 'draft',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists training_programs_athlete_idx on public.training_programs(athlete_id);
create index if not exists training_programs_active_idx on public.training_programs(athlete_id, status, start_date desc);

create table if not exists public.training_weeks (
  id           uuid primary key default gen_random_uuid(),
  program_id   uuid not null references public.training_programs(id) on delete cascade,
  week_number  int not null check (week_number between 1 and 104),
  focus        text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (program_id, week_number)
);
create index if not exists training_weeks_program_idx on public.training_weeks(program_id, week_number);

create table if not exists public.training_program_sessions (
  id                  uuid primary key default gen_random_uuid(),
  week_id              uuid not null references public.training_weeks(id) on delete cascade,
  title                text not null,
  scheduled_date       date,
  status               training_session_status not null default 'planned',
  session_type         training_session_type not null default 'strength',
  duration_minutes     int,
  notes                text,
  linked_session_id     uuid references public.training_sessions(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists training_program_sessions_week_idx on public.training_program_sessions(week_id);
create index if not exists training_program_sessions_date_idx on public.training_program_sessions(scheduled_date);

create table if not exists public.training_exercises (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.training_program_sessions(id) on delete cascade,
  exercise_name   text not null,
  sets            int not null default 1 check (sets between 1 and 100),
  reps            text not null default '',
  target_load_kg  numeric(6,1),
  actual_load_kg  numeric(6,1),
  tempo           text,
  rest_seconds    int,
  rpe             int check (rpe between 1 and 10),
  notes           text,
  video_url       text,
  position        int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists training_exercises_session_idx on public.training_exercises(session_id, position);

create table if not exists public.nutrition_targets (
  id                uuid primary key default gen_random_uuid(),
  athlete_id         uuid not null references public.athletes(id) on delete cascade,
  calories_target    int not null default 0,
  protein_target_g   int not null default 0,
  carbs_target_g     int not null default 0,
  fat_target_g       int not null default 0,
  water_target_l     numeric(3,1),
  notes              text,
  start_date         date not null,
  end_date           date,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists nutrition_targets_athlete_idx on public.nutrition_targets(athlete_id, start_date desc);

create table if not exists public.meal_logs (
  id                uuid primary key default gen_random_uuid(),
  athlete_id         uuid not null references public.athletes(id) on delete cascade,
  log_date           date not null,
  meal_type          meal_log_type not null default 'other',
  description        text not null,
  calories           int,
  protein_g          int,
  carbs_g            int,
  fat_g              int,
  photo_url          text,
  adherence_rating   int check (adherence_rating between 1 and 5),
  created_at         timestamptz not null default now()
);
create index if not exists meal_logs_athlete_date_idx on public.meal_logs(athlete_id, log_date desc);

drop trigger if exists training_programs_updated_at on public.training_programs;
create trigger training_programs_updated_at
  before update on public.training_programs
  for each row execute function public.set_updated_at();

drop trigger if exists training_weeks_updated_at on public.training_weeks;
create trigger training_weeks_updated_at
  before update on public.training_weeks
  for each row execute function public.set_updated_at();

drop trigger if exists training_program_sessions_updated_at on public.training_program_sessions;
create trigger training_program_sessions_updated_at
  before update on public.training_program_sessions
  for each row execute function public.set_updated_at();

drop trigger if exists training_exercises_updated_at on public.training_exercises;
create trigger training_exercises_updated_at
  before update on public.training_exercises
  for each row execute function public.set_updated_at();

drop trigger if exists nutrition_targets_updated_at on public.nutrition_targets;
create trigger nutrition_targets_updated_at
  before update on public.nutrition_targets
  for each row execute function public.set_updated_at();

alter table public.training_programs enable row level security;
alter table public.training_weeks enable row level security;
alter table public.training_program_sessions enable row level security;
alter table public.training_exercises enable row level security;
alter table public.nutrition_targets enable row level security;
alter table public.meal_logs enable row level security;

drop policy if exists "training_programs coach rw" on public.training_programs;
create policy "training_programs coach rw" on public.training_programs
  for all using (
    exists (select 1 from public.athletes a where a.id = athlete_id and a.coach_id = auth.uid())
  ) with check (
    exists (select 1 from public.athletes a where a.id = athlete_id and a.coach_id = auth.uid())
  );

drop policy if exists "training_weeks coach rw" on public.training_weeks;
create policy "training_weeks coach rw" on public.training_weeks
  for all using (
    exists (
      select 1 from public.training_programs p
      join public.athletes a on a.id = p.athlete_id
      where p.id = program_id and a.coach_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.training_programs p
      join public.athletes a on a.id = p.athlete_id
      where p.id = program_id and a.coach_id = auth.uid()
    )
  );

drop policy if exists "training_program_sessions coach rw" on public.training_program_sessions;
create policy "training_program_sessions coach rw" on public.training_program_sessions
  for all using (
    exists (
      select 1 from public.training_weeks w
      join public.training_programs p on p.id = w.program_id
      join public.athletes a on a.id = p.athlete_id
      where w.id = week_id and a.coach_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.training_weeks w
      join public.training_programs p on p.id = w.program_id
      join public.athletes a on a.id = p.athlete_id
      where w.id = week_id and a.coach_id = auth.uid()
    )
  );

drop policy if exists "training_exercises coach rw" on public.training_exercises;
create policy "training_exercises coach rw" on public.training_exercises
  for all using (
    exists (
      select 1 from public.training_program_sessions s
      join public.training_weeks w on w.id = s.week_id
      join public.training_programs p on p.id = w.program_id
      join public.athletes a on a.id = p.athlete_id
      where s.id = session_id and a.coach_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.training_program_sessions s
      join public.training_weeks w on w.id = s.week_id
      join public.training_programs p on p.id = w.program_id
      join public.athletes a on a.id = p.athlete_id
      where s.id = session_id and a.coach_id = auth.uid()
    )
  );

drop policy if exists "nutrition_targets coach rw" on public.nutrition_targets;
create policy "nutrition_targets coach rw" on public.nutrition_targets
  for all using (
    exists (select 1 from public.athletes a where a.id = athlete_id and a.coach_id = auth.uid())
  ) with check (
    exists (select 1 from public.athletes a where a.id = athlete_id and a.coach_id = auth.uid())
  );

drop policy if exists "meal_logs coach rw" on public.meal_logs;
create policy "meal_logs coach rw" on public.meal_logs
  for all using (
    exists (select 1 from public.athletes a where a.id = athlete_id and a.coach_id = auth.uid())
  ) with check (
    exists (select 1 from public.athletes a where a.id = athlete_id and a.coach_id = auth.uid())
  );
