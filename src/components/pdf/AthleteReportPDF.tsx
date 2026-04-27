import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { DAY_TYPE_LABELS, MEAL_SLOT_LABELS, NUTRITION_ADHERENCE_LABELS, TRAINING_SESSION_STATUS_LABELS, TRAINING_SESSION_TYPE_LABELS } from '@/types/database';
import type { Athlete, Checkin, Coach, CoachNote, DailyNutritionTarget, NutritionMealItem, TrainingSession } from '@/types/database';
import type { ComputedAthleteAlert } from '@/lib/alerts';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface ReportData {
  coach: Coach;
  athlete: Athlete;
  weekStart: string;
  dailyTargets: DailyNutritionTarget[];
  mealItems: NutritionMealItem[];
  trainingSessions: TrainingSession[];
  checkins: Checkin[];
  coachNote: CoachNote | null;
  alerts: ComputedAthleteAlert[];
}

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    color: '#0f172a',
    fontFamily: 'Helvetica',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    paddingBottom: 12,
    marginBottom: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 40, height: 40, borderRadius: 4, objectFit: 'cover' },
  clubName: { fontSize: 12, fontWeight: 700, color: '#0f172a' },
  coachName: { fontSize: 9, color: '#475569' },
  headerRight: { textAlign: 'right' },
  generatedAt: { fontSize: 8, color: '#64748b' },
  titleBlock: { marginBottom: 20 },
  title: { fontSize: 18, fontWeight: 700 },
  subtitle: { fontSize: 10, color: '#475569', marginTop: 4 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 8, marginTop: 4 },
  table: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, marginBottom: 12 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  rowLast: { flexDirection: 'row' },
  headerCell: {
    flex: 1,
    padding: 6,
    fontSize: 9,
    fontWeight: 700,
    color: '#ffffff',
    textAlign: 'center',
  },
  labelCell: {
    width: 90,
    padding: 6,
    fontSize: 9,
    fontWeight: 700,
    backgroundColor: '#f1f5f9',
    color: '#334155',
  },
  cell: {
    flex: 1,
    padding: 6,
    fontSize: 9,
    textAlign: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#e2e8f0',
  },
  checkinHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  checkinHeaderCell: {
    padding: 6,
    fontSize: 9,
    fontWeight: 700,
    color: '#334155',
  },
  checkinBodyCell: {
    padding: 6,
    fontSize: 9,
    color: '#0f172a',
    borderLeftWidth: 1,
    borderLeftColor: '#e2e8f0',
  },
  notesBox: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 10,
    backgroundColor: '#fafaf9',
  },
  notesTitle: { fontSize: 10, fontWeight: 700, marginBottom: 4 },
  notesContent: { fontSize: 9, color: '#334155', lineHeight: 1.4 },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
  },
});

function fmt(d: string | null | undefined) {
  if (!d) return '—';
  return format(parseISO(d), 'dd MMM yyyy', { locale: fr });
}

function stars(n: number) {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

export function AthleteReportPDF({ data }: { data: ReportData }) {
  const { coach, athlete, weekStart, dailyTargets, mealItems, trainingSessions, checkins, coachNote, alerts } = data;
  const color = coach.primary_color || '#1D9E75';

  return (
    <Document>
      {/* PAGE 1 — cover */}
      <Page size="A4" style={styles.page}>
        <View style={[styles.headerRow, { borderBottomColor: color }]}>
          <View style={styles.headerLeft}>
            {coach.logo_url && <Image src={coach.logo_url} style={styles.logo} />}
            <View>
              <Text style={styles.clubName}>{coach.club_name || coach.full_name}</Text>
              {coach.club_name && <Text style={styles.coachName}>Coach : {coach.full_name}</Text>}
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.generatedAt}>
              Généré le {format(new Date(), 'dd MMM yyyy, HH:mm', { locale: fr })}
            </Text>
          </View>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>Rapport de suivi — {athlete.full_name}</Text>
          <Text style={styles.subtitle}>
            {athlete.sport} · Semaine du {fmt(weekStart)}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Profil athlète</Text>
        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={styles.labelCell}>Sport</Text>
            <Text style={[styles.cell, { textAlign: 'left' }]}>{athlete.sport}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.labelCell}>Objectif</Text>
            <Text style={[styles.cell, { textAlign: 'left' }]}>{athlete.goal || '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.labelCell}>Date de naissance</Text>
            <Text style={[styles.cell, { textAlign: 'left' }]}>{fmt(athlete.birth_date)}</Text>
          </View>
          <View style={styles.rowLast}>
            <Text style={styles.labelCell}>Taille</Text>
            <Text style={[styles.cell, { textAlign: 'left' }]}>
              {athlete.height_cm ? `${athlete.height_cm} cm` : '—'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Alertes principales</Text>
        <View style={styles.table}>
          {alerts.length === 0 ? (
            <View style={styles.rowLast}>
              <Text style={[styles.checkinBodyCell, { flex: 1, borderLeftWidth: 0 }]}>Aucune alerte calculée sur la période.</Text>
            </View>
          ) : alerts.slice(0, 6).map((alert, index) => (
            <View key={alert.id} style={index === Math.min(alerts.length, 6) - 1 ? styles.rowLast : styles.row}>
              <Text style={[styles.checkinBodyCell, { width: 90, borderLeftWidth: 0 }]}>{alert.severity}</Text>
              <Text style={[styles.checkinBodyCell, { width: 120 }]}>{alert.title}</Text>
              <Text style={[styles.checkinBodyCell, { flex: 1 }]}>{alert.description}</Text>
            </View>
          ))}
        </View>
      </Page>

      {/* PAGE 2 — daily nutrition */}
      <Page size="A4" style={styles.page}>
        <View style={[styles.headerRow, { borderBottomColor: color }]}>
          <View style={styles.headerLeft}>
            {coach.logo_url && <Image src={coach.logo_url} style={styles.logo} />}
            <Text style={styles.clubName}>{coach.club_name || coach.full_name}</Text>
          </View>
          <Text style={styles.generatedAt}>
            {athlete.full_name} · Semaine du {fmt(weekStart)}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Nutrition quotidienne</Text>

        <View style={styles.table}>
          <View style={[styles.checkinHeaderRow, { backgroundColor: color }]}>
            <Text style={[styles.headerCell, { width: 70 }]}>Date</Text>
            <Text style={[styles.headerCell, { width: 90 }]}>Type</Text>
            <Text style={[styles.headerCell, { width: 70 }]}>Kcal</Text>
            <Text style={[styles.headerCell, { width: 70 }]}>Prot.</Text>
            <Text style={[styles.headerCell, { width: 70 }]}>Gluc.</Text>
            <Text style={[styles.headerCell, { width: 70 }]}>Lip.</Text>
            <Text style={[styles.headerCell, { flex: 1 }]}>Notes</Text>
          </View>
          {dailyTargets.length === 0 ? (
            <View style={styles.rowLast}>
              <Text style={[styles.checkinBodyCell, { flex: 1, borderLeftWidth: 0 }]}>Aucune cible nutrition quotidienne définie.</Text>
            </View>
          ) : dailyTargets.map((target, index) => (
            <View key={target.id} style={index === dailyTargets.length - 1 ? styles.rowLast : styles.row}>
              <Text style={[styles.checkinBodyCell, { width: 70, borderLeftWidth: 0 }]}>{fmt(target.target_date)}</Text>
              <Text style={[styles.checkinBodyCell, { width: 90 }]}>{DAY_TYPE_LABELS[target.day_type]}</Text>
              <Text style={[styles.checkinBodyCell, { width: 70 }]}>{target.calories}</Text>
              <Text style={[styles.checkinBodyCell, { width: 70 }]}>{target.protein_g} g</Text>
              <Text style={[styles.checkinBodyCell, { width: 70 }]}>{target.carbs_g} g</Text>
              <Text style={[styles.checkinBodyCell, { width: 70 }]}>{target.fat_g} g</Text>
              <Text style={[styles.checkinBodyCell, { flex: 1 }]}>{target.notes || '—'}</Text>
            </View>
          ))}
        </View>

        {mealItems.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Repas et collations</Text>
            <View style={styles.table}>
              <View style={[styles.checkinHeaderRow]}>
                <Text style={[styles.checkinHeaderCell, { width: 70 }]}>Date</Text>
                <Text style={[styles.checkinHeaderCell, { width: 85 }]}>Repas</Text>
                <Text style={[styles.checkinHeaderCell, { flex: 1 }]}>Item</Text>
                <Text style={[styles.checkinHeaderCell, { width: 55 }]}>Kcal</Text>
                <Text style={[styles.checkinHeaderCell, { width: 45 }]}>P</Text>
                <Text style={[styles.checkinHeaderCell, { width: 45 }]}>G</Text>
                <Text style={[styles.checkinHeaderCell, { width: 45 }]}>L</Text>
              </View>
              {mealItems.slice(0, 18).map((item, index) => {
                const target = dailyTargets.find(t => t.id === item.target_id);
                return (
                  <View key={item.id} style={index === Math.min(mealItems.length, 18) - 1 ? styles.rowLast : styles.row}>
                    <Text style={[styles.checkinBodyCell, { width: 70, borderLeftWidth: 0 }]}>{fmt(target?.target_date)}</Text>
                    <Text style={[styles.checkinBodyCell, { width: 85 }]}>{MEAL_SLOT_LABELS[item.meal_slot]}</Text>
                    <Text style={[styles.checkinBodyCell, { flex: 1 }]}>{item.name} {item.quantity ? `· ${item.quantity}` : ''}</Text>
                    <Text style={[styles.checkinBodyCell, { width: 55 }]}>{item.calories}</Text>
                    <Text style={[styles.checkinBodyCell, { width: 45 }]}>{item.protein_g}</Text>
                    <Text style={[styles.checkinBodyCell, { width: 45 }]}>{item.carbs_g}</Text>
                    <Text style={[styles.checkinBodyCell, { width: 45 }]}>{item.fat_g}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <Text style={styles.footer}>NutriOps · Rapport confidentiel</Text>
      </Page>

      {/* PAGE 3 — training */}
      <Page size="A4" style={styles.page}>
        <View style={[styles.headerRow, { borderBottomColor: color }]}>
          <View style={styles.headerLeft}>
            {coach.logo_url && <Image src={coach.logo_url} style={styles.logo} />}
            <Text style={styles.clubName}>{coach.club_name || coach.full_name}</Text>
          </View>
          <Text style={styles.generatedAt}>
            {athlete.full_name} · Semaine du {fmt(weekStart)}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Séances de la semaine</Text>
        <View style={styles.table}>
          <View style={[styles.checkinHeaderRow]}>
            <Text style={[styles.checkinHeaderCell, { width: 70 }]}>Date</Text>
            <Text style={[styles.checkinHeaderCell, { width: 120 }]}>Séance</Text>
            <Text style={[styles.checkinHeaderCell, { width: 80 }]}>Type</Text>
            <Text style={[styles.checkinHeaderCell, { width: 75 }]}>Statut</Text>
            <Text style={[styles.checkinHeaderCell, { width: 55 }]}>Durée</Text>
            <Text style={[styles.checkinHeaderCell, { width: 45 }]}>RPE</Text>
            <Text style={[styles.checkinHeaderCell, { flex: 1 }]}>Notes</Text>
          </View>
          {trainingSessions.length === 0 ? (
            <View style={styles.rowLast}>
              <Text style={[styles.checkinBodyCell, { flex: 1, borderLeftWidth: 0 }]}>Aucune séance planifiée.</Text>
            </View>
          ) : trainingSessions.map((session, index) => (
            <View key={session.id} style={index === trainingSessions.length - 1 ? styles.rowLast : styles.row}>
              <Text style={[styles.checkinBodyCell, { width: 70, borderLeftWidth: 0 }]}>{fmt(session.session_date)}</Text>
              <Text style={[styles.checkinBodyCell, { width: 120 }]}>{session.title}</Text>
              <Text style={[styles.checkinBodyCell, { width: 80 }]}>{TRAINING_SESSION_TYPE_LABELS[session.session_type]}</Text>
              <Text style={[styles.checkinBodyCell, { width: 75 }]}>{TRAINING_SESSION_STATUS_LABELS[session.status]}</Text>
              <Text style={[styles.checkinBodyCell, { width: 55 }]}>{session.actual_duration_min ?? session.planned_duration_min ?? '—'}</Text>
              <Text style={[styles.checkinBodyCell, { width: 45 }]}>{session.rpe ?? '—'}</Text>
              <Text style={[styles.checkinBodyCell, { flex: 1 }]}>{session.athlete_notes || session.coach_notes || '—'}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>NutriOps · Rapport confidentiel</Text>
      </Page>

      {/* PAGE 4 — progression */}
      <Page size="A4" style={styles.page}>
        <View style={[styles.headerRow, { borderBottomColor: color }]}>
          <View style={styles.headerLeft}>
            {coach.logo_url && <Image src={coach.logo_url} style={styles.logo} />}
            <Text style={styles.clubName}>{coach.club_name || coach.full_name}</Text>
          </View>
          <Text style={styles.generatedAt}>
            {athlete.full_name} · Semaine du {fmt(weekStart)}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Progression — check-ins quotidiens</Text>

        <View style={styles.table}>
          <View style={[styles.checkinHeaderRow]}>
            <Text style={[styles.checkinHeaderCell, { width: 90 }]}>Date</Text>
            <Text style={[styles.checkinHeaderCell, { width: 60 }]}>Poids</Text>
            <Text style={[styles.checkinHeaderCell, { width: 80 }]}>Énergie</Text>
            <Text style={[styles.checkinHeaderCell, { width: 80 }]}>Sommeil</Text>
            <Text style={[styles.checkinHeaderCell, { width: 55 }]}>Soreness</Text>
            <Text style={[styles.checkinHeaderCell, { width: 70 }]}>Nutrition</Text>
            <Text style={[styles.checkinHeaderCell, { flex: 1 }]}>Notes athlète</Text>
          </View>
          {checkins.length === 0 ? (
            <View style={styles.row}>
              <Text style={[styles.checkinBodyCell, { flex: 1, textAlign: 'center', borderLeftWidth: 0 }]}>
                Aucun check-in enregistré.
              </Text>
            </View>
          ) : (
            checkins.map((c, idx) => (
              <View key={c.id} style={idx === checkins.length - 1 ? styles.rowLast : styles.row}>
                <Text style={[styles.checkinBodyCell, { width: 90, borderLeftWidth: 0 }]}>
                  {fmt(c.checkin_date)}
                </Text>
                <Text style={[styles.checkinBodyCell, { width: 60 }]}>{c.weight_kg} kg</Text>
                <Text style={[styles.checkinBodyCell, { width: 80 }]}>{stars(c.energy_level)}</Text>
                <Text style={[styles.checkinBodyCell, { width: 80 }]}>{stars(c.sleep_quality)}</Text>
                <Text style={[styles.checkinBodyCell, { width: 55 }]}>{c.soreness_level ?? '—'}</Text>
                <Text style={[styles.checkinBodyCell, { width: 70 }]}>
                  {c.nutrition_adherence ? NUTRITION_ADHERENCE_LABELS[c.nutrition_adherence] : '—'}
                </Text>
                <Text style={[styles.checkinBodyCell, { flex: 1 }]}>{c.notes || '—'}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.notesBox}>
          <Text style={styles.notesTitle}>Notes du coach — semaine du {fmt(weekStart)}</Text>
          <Text style={styles.notesContent}>
            {coachNote?.content?.trim() || 'Aucune note pour cette semaine.'}
          </Text>
        </View>

        <Text style={styles.footer}>NutriOps · Rapport confidentiel</Text>
      </Page>
    </Document>
  );
}
