import type {
  Athlete,
  ClientExperienceLevel,
  ClientGoalType,
  WeeklyCheckIn,
} from '@/types/database';

export interface ClientProfile {
  id: string;
  coachId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  birthDate: string | null;
  gender: string | null;
  heightCm: number | null;
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  goalType: ClientGoalType | null;
  experienceLevel: ClientExperienceLevel;
  trainingFrequencyPerWeek: number;
  availableEquipment: string[];
  injuries: string[];
  medicalNotes: string | null;
  foodPreferences: string[];
  dietaryRestrictions: string[];
  lifestyleNotes: string | null;
  workSchedule: string | null;
  sleepAverageHours: number | null;
  stressLevel: number;
  motivationLevel: number;
  createdAt: string;
  updatedAt: string;
}

export function athleteToClientProfile(athlete: Athlete): ClientProfile {
  const fallbackParts = athlete.full_name.trim().split(/\s+/);
  const fallbackFirst = fallbackParts[0] ?? athlete.full_name;
  const fallbackLast = fallbackParts.slice(1).join(' ');

  return {
    id: athlete.id,
    coachId: athlete.coach_id,
    firstName: athlete.first_name || fallbackFirst,
    lastName: athlete.last_name || fallbackLast,
    email: athlete.email,
    phone: athlete.phone,
    birthDate: athlete.birth_date,
    gender: athlete.gender,
    heightCm: athlete.height_cm,
    currentWeightKg: athlete.current_weight_kg,
    targetWeightKg: athlete.target_weight_kg,
    goalType: athlete.goal_type,
    experienceLevel: athlete.experience_level,
    trainingFrequencyPerWeek: athlete.training_frequency_per_week,
    availableEquipment: athlete.available_equipment ?? [],
    injuries: athlete.injuries ?? [],
    medicalNotes: athlete.medical_notes,
    foodPreferences: athlete.food_preferences ?? [],
    dietaryRestrictions: athlete.dietary_restrictions ?? [],
    lifestyleNotes: athlete.lifestyle_notes,
    workSchedule: athlete.work_schedule,
    sleepAverageHours: athlete.sleep_average_hours,
    stressLevel: athlete.stress_level,
    motivationLevel: athlete.motivation_level,
    createdAt: athlete.created_at,
    updatedAt: athlete.updated_at,
  };
}

export type WeeklyCheckInAlertType =
  | 'low_training_adherence'
  | 'low_nutrition_adherence'
  | 'low_energy'
  | 'high_soreness'
  | 'high_stress'
  | 'missed_sessions'
  | 'no_recent_checkin'
  | 'weight_stagnation';

export type ClientAlertSeverity = 'low' | 'medium' | 'high';

export interface ClientAlert {
  id: string;
  type: WeeklyCheckInAlertType;
  severity: ClientAlertSeverity;
  title: string;
  description: string;
  suggestedAction: string;
}

export interface ClientAlertInput {
  athlete: Athlete;
  weeklyCheckins: WeeklyCheckIn[];
  missedSessionsCount?: number;
  today?: string;
}
