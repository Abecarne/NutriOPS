-- =====================================================================
-- NutriOps — flexible premium onboarding
-- =====================================================================
-- Stores the long premium questionnaire without adding dozens of columns.
-- Core profile fields remain on athletes; detailed answers live in JSONB.
-- =====================================================================

alter table public.athletes
  add column if not exists onboarding_data jsonb not null default '{}'::jsonb,
  add column if not exists onboarding_skipped_steps text[] not null default '{}',
  add column if not exists onboarding_completed_steps text[] not null default '{}',
  add column if not exists onboarding_last_step text;
