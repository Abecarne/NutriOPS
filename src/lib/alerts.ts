import { isoDate } from '@/lib/utils';
import type { Athlete, Checkin, DailyNutritionTarget, TrainingSession, AlertCategory, AlertSeverity } from '@/types/database';

export interface ComputedAthleteAlert {
  id: string;
  athlete_id: string;
  athlete_name?: string;
  alert_date: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  description: string;
}

interface AlertInput {
  athlete: Athlete;
  checkins: Checkin[];
  sessions: TrainingSession[];
  targets: DailyNutritionTarget[];
  today?: string;
}

export function computeAthleteAlerts({
  athlete,
  checkins,
  sessions,
  targets,
  today = isoDate(),
}: AlertInput): ComputedAthleteAlert[] {
  const sorted = [...checkins].sort((a, b) => b.checkin_date.localeCompare(a.checkin_date));
  const todayCheckin = sorted.find(checkin => checkin.checkin_date === today);
  const todaySessions = sessions.filter(session => session.session_date === today);
  const todayTarget = targets.find(target => target.target_date === today);
  const alerts: ComputedAthleteAlert[] = [];

  if (!todayCheckin) {
    alerts.push(makeAlert(athlete, today, 'warning', 'adherence', 'Check-in manquant', 'Aucune donnée quotidienne reçue aujourd’hui.'));
  }

  if (twoConsecutiveLow(sorted, 'energy_level')) {
    alerts.push(makeAlert(athlete, today, 'warning', 'recovery', 'Énergie basse', 'Énergie à 2/5 ou moins sur deux check-ins consécutifs.'));
  }

  if (twoConsecutiveLow(sorted, 'sleep_quality')) {
    alerts.push(makeAlert(athlete, today, 'warning', 'recovery', 'Sommeil bas', 'Sommeil à 2/5 ou moins sur deux check-ins consécutifs.'));
  }

  if ((todayCheckin?.soreness_level ?? 0) >= 4 && todaySessions.some(session => (session.planned_intensity ?? 0) >= 7 || session.session_type === 'strength' || session.session_type === 'endurance')) {
    alerts.push(makeAlert(athlete, today, 'warning', 'training', 'Soreness élevé', 'Douleurs élevées avec une séance intense prévue aujourd’hui.'));
  }

  if ((todayCheckin?.sleep_quality ?? 5) <= 2 && todaySessions.some(session => (session.rpe ?? 0) >= 8)) {
    alerts.push(makeAlert(athlete, today, 'critical', 'recovery', 'Charge haute + mauvais sommeil', 'RPE élevé déclaré avec sommeil très faible.'));
  }

  const weightAlert = weightVariationAlert(sorted);
  if (weightAlert) {
    alerts.push(makeAlert(athlete, today, 'warning', 'weight', 'Poids instable', weightAlert));
  }

  if (twoConsecutiveNutritionLow(sorted)) {
    alerts.push(makeAlert(athlete, today, 'warning', 'nutrition', 'Adhérence nutrition basse', 'Adhérence nutrition faible sur deux check-ins consécutifs.'));
  }

  if (todaySessions.some(session => session.status === 'missed')) {
    alerts.push(makeAlert(athlete, today, 'warning', 'training', 'Séance manquée', 'Une séance prévue aujourd’hui a été déclarée manquée.'));
  }

  if (!todayTarget) {
    alerts.push(makeAlert(athlete, today, 'warning', 'nutrition', 'Cible nutrition manquante', 'Aucune cible calories/macros n’est définie pour aujourd’hui.'));
  }

  return alerts;
}

function makeAlert(
  athlete: Athlete,
  date: string,
  severity: AlertSeverity,
  category: AlertCategory,
  title: string,
  description: string,
): ComputedAthleteAlert {
  return {
    id: `${athlete.id}-${date}-${category}-${title.toLowerCase().replace(/\s+/g, '-')}`,
    athlete_id: athlete.id,
    athlete_name: athlete.full_name,
    alert_date: date,
    severity,
    category,
    title,
    description,
  };
}

function twoConsecutiveLow(checkins: Checkin[], key: 'energy_level' | 'sleep_quality') {
  return checkins.slice(0, 2).length === 2 && checkins.slice(0, 2).every(checkin => checkin[key] <= 2);
}

function twoConsecutiveNutritionLow(checkins: Checkin[]) {
  return checkins.slice(0, 2).length === 2 && checkins.slice(0, 2).every(checkin => checkin.nutrition_adherence === 'low');
}

function weightVariationAlert(checkins: Checkin[]) {
  if (checkins.length < 2) return null;
  const latest = checkins[0];
  const previous = checkins.find(checkin => checkin.checkin_date <= dateMinusDays(latest.checkin_date, 6)) ?? checkins[checkins.length - 1];
  if (!previous || previous.id === latest.id || !previous.weight_kg) return null;
  const change = ((latest.weight_kg - previous.weight_kg) / previous.weight_kg) * 100;
  if (Math.abs(change) <= 1.5) return null;
  const direction = change > 0 ? 'hausse' : 'baisse';
  return `Variation de poids en ${direction} de ${Math.abs(change).toFixed(1)}% sur la période récente.`;
}

function dateMinusDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
