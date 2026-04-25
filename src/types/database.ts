export type AthleteStatus = 'active' | 'offseason' | 'injured';
export type DayType = 'intense' | 'light' | 'rest' | 'competition';

export const DAY_TYPES: DayType[] = ['intense', 'light', 'rest', 'competition'];

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
  week_start: string;
  weight_kg: number;
  energy_level: number;
  sleep_quality: number;
  notes: string | null;
  submitted_at: string;
}

export interface CoachNote {
  id: string;
  athlete_id: string;
  week_start: string;
  content: string;
  created_at: string;
}

export interface AthleteRosterRow extends Athlete {
  last_checkin: Pick<Checkin, 'weight_kg' | 'submitted_at' | 'week_start'> | null;
}
