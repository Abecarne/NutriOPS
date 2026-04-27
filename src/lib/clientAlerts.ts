import { isoDate } from '@/lib/utils';
import type { ClientAlert, ClientAlertInput, WeeklyCheckInAlertType } from '@/types/client';
import type { Athlete, WeeklyCheckIn } from '@/types/database';

export function generateClientAlerts({
  athlete,
  weeklyCheckins,
  missedSessionsCount = 0,
  today = isoDate(),
}: ClientAlertInput): ClientAlert[] {
  const sorted = [...weeklyCheckins].sort((a, b) => b.week_start_date.localeCompare(a.week_start_date));
  const latest = sorted[0] ?? null;
  const alerts: ClientAlert[] = [];

  if (!latest || daysBetween(latest.week_start_date, today) > 10) {
    alerts.push(makeAlert(
      athlete,
      'no_recent_checkin',
      'high',
      'Check-in hebdomadaire manquant',
      'Aucun check-in hebdomadaire récent n’a été reçu.',
      'Relancer le client et vérifier si le rituel de suivi est clair.',
    ));
  }

  if (latest) {
    if (latest.training_adherence_percent < 70) {
      alerts.push(makeAlert(
        athlete,
        'low_training_adherence',
        latest.training_adherence_percent < 50 ? 'high' : 'medium',
        'Adhérence entraînement faible',
        `Seulement ${latest.training_adherence_percent}% des séances ont été réalisées cette semaine.`,
        'Clarifier les obstacles, réduire le volume ou adapter les créneaux.',
      ));
    }

    if (latest.nutrition_adherence_percent < 70) {
      alerts.push(makeAlert(
        athlete,
        'low_nutrition_adherence',
        latest.nutrition_adherence_percent < 50 ? 'high' : 'medium',
        'Adhérence nutrition faible',
        `Adhérence nutrition déclarée à ${latest.nutrition_adherence_percent}% cette semaine.`,
        'Simplifier les consignes nutritionnelles et identifier le repas le plus problématique.',
      ));
    }

    if (latest.energy_level <= 2) {
      alerts.push(makeAlert(
        athlete,
        'low_energy',
        'medium',
        'Fatigue à surveiller',
        `Énergie déclarée à ${latest.energy_level}/5 sur le dernier check-in.`,
        'Réduire temporairement l’intensité ou vérifier sommeil, stress et charge totale.',
      ));
    }

    if (latest.soreness_level >= 4) {
      alerts.push(makeAlert(
        athlete,
        'high_soreness',
        'medium',
        'Récupération insuffisante',
        `Soreness déclaré à ${latest.soreness_level}/5 sur le dernier check-in.`,
        'Ajouter récupération active, ajuster le volume et surveiller les douleurs.',
      ));
    }

    if (latest.stress_level >= 4) {
      alerts.push(makeAlert(
        athlete,
        'high_stress',
        'medium',
        'Stress élevé',
        `Stress déclaré à ${latest.stress_level}/5 sur le dernier check-in.`,
        'Alléger les objectifs de la semaine et prioriser les leviers de récupération.',
      ));
    }
  }

  if (missedSessionsCount > 0) {
    alerts.push(makeAlert(
      athlete,
      'missed_sessions',
      missedSessionsCount >= 2 ? 'high' : 'medium',
      'Séances manquées récentes',
      `${missedSessionsCount} séance${missedSessionsCount > 1 ? 's' : ''} manquée${missedSessionsCount > 1 ? 's' : ''} sur la période récente.`,
      'Replanifier la semaine et valider que les séances sont faisables hors présentiel.',
    ));
  }

  if (isWeightStagnating(sorted)) {
    alerts.push(makeAlert(
      athlete,
      'weight_stagnation',
      'low',
      'Poids stable plusieurs semaines',
      'Le poids évolue de moins de 0,3 kg sur les derniers check-ins hebdomadaires.',
      'Croiser avec mensurations, adhérence et objectif avant de modifier le plan.',
    ));
  }

  return alerts;
}

function makeAlert(
  athlete: Athlete,
  type: WeeklyCheckInAlertType,
  severity: 'low' | 'medium' | 'high',
  title: string,
  description: string,
  suggestedAction: string,
): ClientAlert {
  return {
    id: `${athlete.id}-${type}`,
    type,
    severity,
    title,
    description,
    suggestedAction,
  };
}

function isWeightStagnating(checkins: WeeklyCheckIn[]): boolean {
  const recent = checkins
    .filter(checkin => checkin.weight_kg !== null && checkin.weight_kg !== undefined)
    .slice(0, 4);
  if (recent.length < 3) return false;
  const weights = recent.map(checkin => Number(checkin.weight_kg));
  return Math.max(...weights) - Math.min(...weights) <= 0.3;
}

function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(`${fromISO}T00:00:00`).getTime();
  const to = new Date(`${toISO}T00:00:00`).getTime();
  return Math.floor((to - from) / 86_400_000);
}
