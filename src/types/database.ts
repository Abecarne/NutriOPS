export type AthleteStatus = 'active' | 'offseason' | 'injured';
export type ClientGoalType = 'fat_loss' | 'muscle_gain' | 'strength' | 'performance' | 'health' | 'recomposition';
export type ClientExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type DayType = 'intense' | 'light' | 'rest' | 'competition';
export type NutritionAdherence = 'low' | 'medium' | 'high';
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_training' | 'post_training';
export type TrainingSessionType = 'strength' | 'endurance' | 'technical' | 'recovery' | 'competition' | 'mobility' | 'other';
export type TrainingSessionStatus = 'planned' | 'completed' | 'modified' | 'missed';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertCategory = 'recovery' | 'nutrition' | 'training' | 'adherence' | 'weight';
export type CoachFeedbackRelatedType = 'checkin' | 'session' | 'nutrition' | 'general';
export type CoachFeedbackVisibility = 'client_visible' | 'private';

export const DAY_TYPES: DayType[] = ['intense', 'light', 'rest', 'competition'];
export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack', 'pre_training', 'post_training'];
export const TRAINING_SESSION_TYPES: TrainingSessionType[] = ['strength', 'endurance', 'technical', 'recovery', 'competition', 'mobility', 'other'];
export const TRAINING_SESSION_STATUSES: TrainingSessionStatus[] = ['planned', 'completed', 'modified', 'missed'];
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

export interface AthleteRosterRow extends Athlete {
  last_checkin: Pick<Checkin, 'weight_kg' | 'submitted_at' | 'checkin_date'> | null;
  last_weekly_checkin?: Pick<WeeklyCheckIn, 'week_start_date' | 'weight_kg' | 'training_adherence_percent' | 'nutrition_adherence_percent' | 'energy_level' | 'soreness_level' | 'created_at'> | null;
}
