-- =====================================================================
-- NutriOps — health integrations MVP (WHOOP first)
-- =====================================================================
-- Stores connection metadata, protected provider tokens, normalized daily
-- metrics and workouts. Apple Health and Health Connect are planned later.
-- =====================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'health_provider') then
    create type health_provider as enum ('whoop', 'apple_health', 'health_connect');
  end if;

  if not exists (select 1 from pg_type where typname = 'health_connection_status') then
    create type health_connection_status as enum ('connected', 'disconnected', 'error', 'syncing');
  end if;
end $$;

create table if not exists public.health_connections (
  id                 uuid primary key default gen_random_uuid(),
  athlete_id          uuid not null references public.athletes(id) on delete cascade,
  provider            health_provider not null,
  status              health_connection_status not null default 'connected',
  external_user_id    text,
  external_email      text,
  scopes              text[] not null default '{}',
  connected_at        timestamptz not null default now(),
  last_sync_at        timestamptz,
  sync_cursor         jsonb not null default '{}'::jsonb,
  error_message       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (athlete_id, provider)
);
create index if not exists health_connections_athlete_idx on public.health_connections(athlete_id);

create table if not exists public.health_provider_tokens (
  connection_id       uuid primary key references public.health_connections(id) on delete cascade,
  access_token        text not null,
  refresh_token       text,
  expires_at          timestamptz,
  token_type          text,
  updated_at          timestamptz not null default now()
);

create table if not exists public.health_daily_metrics (
  id                         uuid primary key default gen_random_uuid(),
  athlete_id                  uuid not null references public.athletes(id) on delete cascade,
  provider                    health_provider not null,
  metric_date                 date not null,
  steps                       int,
  active_calories             numeric(10,2),
  total_calories              numeric(10,2),
  distance_meters             numeric(10,2),
  sleep_minutes               int,
  sleep_efficiency_percent    numeric(5,2),
  sleep_performance_percent   numeric(5,2),
  resting_heart_rate          int,
  hrv_rmssd_ms                numeric(8,2),
  respiratory_rate            numeric(6,2),
  spo2_percent                numeric(5,2),
  skin_temp_celsius           numeric(5,2),
  strain                      numeric(6,2),
  recovery_score              int,
  weight_kg                   numeric(5,1),
  raw_payload                 jsonb not null default '{}'::jsonb,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  unique (athlete_id, provider, metric_date)
);
create index if not exists health_daily_metrics_athlete_date_idx on public.health_daily_metrics(athlete_id, metric_date desc);

create table if not exists public.health_workouts (
  id                  uuid primary key default gen_random_uuid(),
  athlete_id           uuid not null references public.athletes(id) on delete cascade,
  provider             health_provider not null,
  external_id          text not null,
  sport                text,
  start_at             timestamptz not null,
  end_at               timestamptz,
  timezone_offset      text,
  duration_seconds     int,
  calories             numeric(10,2),
  distance_meters      numeric(10,2),
  average_heart_rate   int,
  max_heart_rate       int,
  strain               numeric(6,2),
  raw_payload          jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (athlete_id, provider, external_id)
);
create index if not exists health_workouts_athlete_start_idx on public.health_workouts(athlete_id, start_at desc);

drop trigger if exists health_connections_updated_at on public.health_connections;
create trigger health_connections_updated_at
  before update on public.health_connections
  for each row execute function public.set_updated_at();

drop trigger if exists health_provider_tokens_updated_at on public.health_provider_tokens;
create trigger health_provider_tokens_updated_at
  before update on public.health_provider_tokens
  for each row execute function public.set_updated_at();

drop trigger if exists health_daily_metrics_updated_at on public.health_daily_metrics;
create trigger health_daily_metrics_updated_at
  before update on public.health_daily_metrics
  for each row execute function public.set_updated_at();

drop trigger if exists health_workouts_updated_at on public.health_workouts;
create trigger health_workouts_updated_at
  before update on public.health_workouts
  for each row execute function public.set_updated_at();

alter table public.health_connections enable row level security;
alter table public.health_provider_tokens enable row level security;
alter table public.health_daily_metrics enable row level security;
alter table public.health_workouts enable row level security;

drop policy if exists "health_connections coach read" on public.health_connections;
create policy "health_connections coach read" on public.health_connections
  for select using (
    exists (select 1 from public.athletes a where a.id = health_connections.athlete_id and a.coach_id = auth.uid())
  );

drop policy if exists "health_connections coach update" on public.health_connections;
create policy "health_connections coach update" on public.health_connections
  for update using (
    exists (select 1 from public.athletes a where a.id = health_connections.athlete_id and a.coach_id = auth.uid())
  ) with check (
    exists (select 1 from public.athletes a where a.id = health_connections.athlete_id and a.coach_id = auth.uid())
  );

drop policy if exists "health_daily_metrics coach read" on public.health_daily_metrics;
create policy "health_daily_metrics coach read" on public.health_daily_metrics
  for select using (
    exists (select 1 from public.athletes a where a.id = health_daily_metrics.athlete_id and a.coach_id = auth.uid())
  );

drop policy if exists "health_workouts coach read" on public.health_workouts;
create policy "health_workouts coach read" on public.health_workouts
  for select using (
    exists (select 1 from public.athletes a where a.id = health_workouts.athlete_id and a.coach_id = auth.uid())
  );

-- No user-facing policy on health_provider_tokens by design. Edge Functions
-- access it with service role only, keeping OAuth tokens out of the browser.
