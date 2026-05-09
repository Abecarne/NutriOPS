export type AthleteStatus = 'active' | 'offseason' | 'injured';
export type ClientGoalType = 'fat_loss' | 'muscle_gain' | 'strength' | 'performance' | 'health' | 'recomposition';
export type ClientExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type DayType = 'intense' | 'light' | 'rest' | 'competition';
export type NutritionAdherence = 'low' | 'medium' | 'high';
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_training' | 'post_training';
export type TrainingSessionType = 'strength' | 'endurance' | 'technical' | 'recovery' | 'competition' | 'mobility' | 'other';
export type TrainingSessionStatus = 'planned' | 'completed' | 'modified' | 'missed';
export type TrainingProgramStatus = 'active' | 'archived' | 'draft';
export type MealLogType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertCategory = 'recovery' | 'nutrition' | 'training' | 'adherence' | 'weight';
export type CoachFeedbackRelatedType = 'checkin' | 'session' | 'nutrition' | 'general';
export type CoachFeedbackVisibility = 'client_visible' | 'private';
export type HealthProvider = 'whoop' | 'apple_health' | 'health_connect';
export type HealthConnectionStatus = 'connected' | 'disconnected' | 'error' | 'syncing';

export const DAY_TYPES: DayType[] = ['intense', 'light', 'rest', 'competition'];
export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack', 'pre_training', 'post_training'];
export const TRAINING_SESSION_TYPES: TrainingSessionType[] = ['strength', 'endurance', 'technical', 'recovery', 'competition', 'mobility', 'other'];
export const TRAINING_SESSION_STATUSES: TrainingSessionStatus[] = ['planned', 'completed', 'modified', 'missed'];
export const TRAINING_PROGRAM_STATUSES: TrainingProgramStatus[] = ['active', 'archived', 'draft'];
export const MEAL_LOG_TYPES: MealLogType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
export const CLIENT_GOAL_TYPES = ['fat_loss', 'muscle_gain', 'strength', 'performance', 'health', 'recomposition'] as const satisfies readonly ClientGoalType[];
export const CLIENT_EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const satisfies readonly ClientExperienceLevel[];

export const DAY_TYPE_LABELS: Record<DayType, string> = {
  intense: 'Journée intense',
  light: 'Journée légère',
  rest: 'Jour de repos',
  competition: 'Compétition',
};

export const STATUS_LABELS: Record<AthleteStatus, string> = {
  active: 'Actif',
  offseason: 'Intersaison',
  injured: 'Blessé',
};

export const CLIENT_GOAL_TYPE_LABELS: Record<ClientGoalType, string> = {
  fat_loss: 'Perte de gras',
  muscle_gain: 'Prise de muscle',
  strength: 'Force',
  performance: 'Performance',
  health: 'Santé',
  recomposition: 'Recomposition',
};

export const CLIENT_EXPERIENCE_LEVEL_LABELS: Record<ClientExperienceLevel, string> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
};

export const NUTRITION_ADHERENCE_LABELS: Record<NutritionAdherence, string> = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Bonne',
};

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'Collation',
  pre_training: 'Pré-séance',
  post_training: 'Post-séance',
};

export const TRAINING_SESSION_TYPE_LABELS: Record<TrainingSessionType, string> = {
  strength: 'Force',
  endurance: 'Endurance',
  technical: 'Technique',
  recovery: 'Récupération',
  competition: 'Compétition',
  mobility: 'Mobilité',
  other: 'Autre',
};

export const TRAINING_SESSION_STATUS_LABELS: Record<TrainingSessionStatus, string> = {
  planned: 'Prévue',
  completed: 'Réalisée',
  modified: 'Modifiée',
  missed: 'Manquée',
};

export const TRAINING_PROGRAM_STATUS_LABELS: Record<TrainingProgramStatus, string> = {
  active: 'Actif',
  archived: 'Archivé',
  draft: 'Brouillon',
};

export const MEAL_LOG_TYPE_LABELS: Record<MealLogType, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'Collation',
  other: 'Autre',
};

export interface Coach {
  id: string;
  email: string;
  full_name: string;
  club_name: string | null;
  logo_url: string | null;
  primary_color: string;
  created_at: string;
}

export interface Athlete {
  id: string;
  coach_id: string;
  full_name: string;
  sport: string;
  birth_date: string | null;
  height_cm: number | null;
  goal: string | null;
  status: AthleteStatus;
  checkin_token: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  gender: string | null;
  current_weight_kg: number | null;
  target_weight_kg: number | null;
  goal_type: ClientGoalType | null;
  experience_level: ClientExperienceLevel;
  training_frequency_per_week: number;
  available_equipment: string[];
  injuries: string[];
  medical_notes: string | null;
  food_preferences: string[];
  dietary_restrictions: string[];
  lifestyle_notes: string | null;
  work_schedule: string | null;
  sleep_average_hours: number | null;
  stress_level: number;
  motivation_level: number;
  onboarding_completed_at: string | null;
  onboarding_data: Record<string, unknown>;
  onboarding_skipped_steps: string[];
  onboarding_completed_steps: string[];
  onboarding_last_step: string | null;
  updated_at: string;
}

export interface NutritionPlan {
  id: string;
  athlete_id: string;
  week_start: string;
  name: string;
  created_at: string;
}

export interface DayTarget {
  id: string;
  plan_id: string;
  day_type: DayType;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  notes: string | null;
}

export interface Checkin {
  id: string;
  athlete_id: string;
  checkin_date: string;
  weight_kg: number;
  energy_level: number;
  sleep_quality: number;
  soreness_level: number | null;
  stress_level: number | null;
  motivation_level: number | null;
  hunger_level: number | null;
  digestion_quality: number | null;
  nutrition_adherence: NutritionAdherence | null;
  notes: string | null;
  submitted_at: string;
}

export interface WeeklyCheckIn {
  id: string;
  athlete_id: string;
  week_start_date: string;
  weight_kg: number;
  waist_cm: number | null;
  sleep_quality: number;
  average_sleep_hours: number | null;
  energy_level: number;
  stress_level: number;
  hunger_level: number;
  soreness_level: number;
  motivation_level: number;
  training_adherence_percent: number;
  nutrition_adherence_percent: number;
  steps_average: number | null;
  pain_notes: string | null;
  wins: string | null;
  difficulties: string | null;
  client_comment: string | null;
  coach_feedback: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyNutritionTarget {
  id: string;
  athlete_id: string;
  target_date: string;
  day_type: DayType;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface NutritionMealItem {
  id: string;
  target_id: string;
  meal_slot: MealSlot;
  name: string;
  quantity: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  notes: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface TrainingSession {
  id: string;
  athlete_id: string;
  session_date: string;
  title: string;
  session_type: TrainingSessionType;
  planned_duration_min: number | null;
  planned_intensity: number | null;
  description: string | null;
  status: TrainingSessionStatus;
  actual_duration_min: number | null;
  rpe: number | null;
  internal_load: number | null;
  athlete_notes: string | null;
  coach_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingProgram {
  id: string;
  athlete_id: string;
  title: string;
  goal: string;
  start_date: string;
  end_date: string | null;
  status: TrainingProgramStatus;
  created_at: string;
  updated_at: string;
}

export interface TrainingWeek {
  id: string;
  program_id: string;
  week_number: number;
  focus: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingProgramSession {
  id: string;
  week_id: string;
  title: string;
  scheduled_date: string | null;
  status: TrainingSessionStatus;
  session_type: TrainingSessionType;
  duration_minutes: number | null;
  notes: string | null;
  linked_session_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingExercise {
  id: string;
  session_id: string;
  exercise_name: string;
  sets: number;
  reps: string;
  target_load_kg: number | null;
  actual_load_kg: number | null;
  tempo: string | null;
  rest_seconds: number | null;
  rpe: number | null;
  notes: string | null;
  video_url: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface NutritionTarget {
  id: string;
  athlete_id: string;
  calories_target: number;
  protein_target_g: number;
  carbs_target_g: number;
  fat_target_g: number;
  water_target_l: number | null;
  notes: string | null;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface MealLog {
  id: string;
  athlete_id: string;
  log_date: string;
  meal_type: MealLogType;
  description: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  photo_url: string | null;
  adherence_rating: number | null;
  created_at: string;
}

export interface AthleteAlert {
  id: string;
  athlete_id: string;
  alert_date: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  description: string;
  resolved: boolean;
  created_at: string;
}

export interface CoachNote {
  id: string;
  athlete_id: string;
  week_start: string;
  content: string;
  created_at: string;
}

export interface CoachFeedback {
  id: string;
  athlete_id: string;
  related_type: CoachFeedbackRelatedType;
  related_id: string | null;
  message: string;
  visibility: CoachFeedbackVisibility;
  created_at: string;
}

export interface HealthConnection {
  id: string;
  athlete_id: string;
  provider: HealthProvider;
  status: HealthConnectionStatus;
  external_user_id: string | null;
  external_email: string | null;
  scopes: string[];
  connected_at: string;
  last_sync_at: string | null;
  sync_cursor: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface HealthDailyMetric {
  id: string;
  athlete_id: string;
  provider: HealthProvider;
  metric_date: string;
  steps: number | null;
  active_calories: number | null;
  total_calories: number | null;
  distance_meters: number | null;
  sleep_minutes: number | null;
  sleep_efficiency_percent: number | null;
  sleep_performance_percent: number | null;
  resting_heart_rate: number | null;
  hrv_rmssd_ms: number | null;
  respiratory_rate: number | null;
  spo2_percent: number | null;
  skin_temp_celsius: number | null;
  strain: number | null;
  recovery_score: number | null;
  weight_kg: number | null;
  raw_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface HealthWorkout {
  id: string;
  athlete_id: string;
  provider: HealthProvider;
  external_id: string;
  sport: string | null;
  start_at: string;
  end_at: string | null;
  timezone_offset: string | null;
  duration_seconds: number | null;
  calories: number | null;
  distance_meters: number | null;
  average_heart_rate: number | null;
  max_heart_rate: number | null;
  strain: number | null;
  raw_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AthleteRosterRow extends Athlete {
  last_checkin: Pick<Checkin, 'weight_kg' | 'submitted_at' | 'checkin_date'> | null;
  last_weekly_checkin?: Pick<WeeklyCheckIn, 'week_start_date' | 'weight_kg' | 'training_adherence_percent' | 'nutrition_adherence_percent' | 'energy_level' | 'soreness_level' | 'created_at'> | null;
}
