import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { DAY_TYPES, DAY_TYPE_LABELS } from '@/types/database';
import type { Athlete, Checkin, Coach, CoachNote, DayTarget, DayType } from '@/types/database';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface ReportData {
  coach: Coach;
  athlete: Athlete;
  weekStart: string;
  targets: Partial<Record<DayType, DayTarget>>;
  checkins: Checkin[];
  coachNote: CoachNote | null;
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
  const { coach, athlete, weekStart, targets, checkins, coachNote } = data;
  const color = coach.primary_color || '#1D9E75';
  const widths = { label: 90, col: (520 - 90) / 4 };

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
      </Page>

      {/* PAGE 2 — nutrition plan */}
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

        <Text style={styles.sectionTitle}>Plan nutritionnel</Text>

        <View style={styles.table}>
          <View style={[styles.row, { backgroundColor: color }]}>
            <Text style={[styles.headerCell, { width: widths.label, textAlign: 'left' }]}>
              {' '}
            </Text>
            {DAY_TYPES.map(dt => (
              <Text key={dt} style={[styles.headerCell, { flex: 0, width: widths.col }]}>
                {DAY_TYPE_LABELS[dt]}
              </Text>
            ))}
          </View>
          <MacroRow
            label="Calories"
            unit="kcal"
            widths={widths}
            values={DAY_TYPES.map(dt => targets[dt]?.calories ?? 0)}
          />
          <MacroRow
            label="Protéines"
            unit="g"
            widths={widths}
            values={DAY_TYPES.map(dt => targets[dt]?.protein_g ?? 0)}
          />
          <MacroRow
            label="Glucides"
            unit="g"
            widths={widths}
            values={DAY_TYPES.map(dt => targets[dt]?.carbs_g ?? 0)}
          />
          <MacroRow
            label="Lipides"
            unit="g"
            widths={widths}
            values={DAY_TYPES.map(dt => targets[dt]?.fat_g ?? 0)}
            last
          />
        </View>

        {DAY_TYPES.some(dt => targets[dt]?.notes) && (
          <>
            <Text style={styles.sectionTitle}>Notes par type de journée</Text>
            {DAY_TYPES.map(dt => {
              const n = targets[dt]?.notes;
              if (!n) return null;
              return (
                <View key={dt} style={styles.notesBox}>
                  <Text style={styles.notesTitle}>{DAY_TYPE_LABELS[dt]}</Text>
                  <Text style={styles.notesContent}>{n}</Text>
                </View>
              );
            })}
          </>
        )}

        <Text style={styles.footer}>NutriOps · Rapport confidentiel</Text>
      </Page>

      {/* PAGE 3 — progression */}
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

        <Text style={styles.sectionTitle}>Progression — 12 derniers check-ins</Text>

        <View style={styles.table}>
          <View style={[styles.checkinHeaderRow]}>
            <Text style={[styles.checkinHeaderCell, { width: 90 }]}>Date</Text>
            <Text style={[styles.checkinHeaderCell, { width: 60 }]}>Poids</Text>
            <Text style={[styles.checkinHeaderCell, { width: 80 }]}>Énergie</Text>
            <Text style={[styles.checkinHeaderCell, { width: 80 }]}>Sommeil</Text>
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

function MacroRow({
  label,
  unit,
  values,
  widths,
  last,
}: {
  label: string;
  unit: string;
  values: number[];
  widths: { label: number; col: number };
  last?: boolean;
}) {
  return (
    <View style={last ? styles.rowLast : styles.row}>
      <Text style={[styles.labelCell, { width: widths.label }]}>{label}</Text>
      {values.map((v, i) => (
        <Text key={i} style={[styles.cell, { flex: 0, width: widths.col }]}>
          {v} {unit}
        </Text>
      ))}
    </View>
  );
}
