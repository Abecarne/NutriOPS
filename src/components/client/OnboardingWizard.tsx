import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { TOKENS } from '@/components/dashboard/kit';
import { updateAthlete } from '@/hooks/useAthlete';
import {
  CLIENT_EXPERIENCE_LEVEL_LABELS,
  CLIENT_EXPERIENCE_LEVELS,
  CLIENT_GOAL_TYPE_LABELS,
  CLIENT_GOAL_TYPES,
} from '@/types/database';
import type { Athlete, ClientExperienceLevel, ClientGoalType } from '@/types/database';

type StepKey = 'profile' | 'goals' | 'sport' | 'nutrition' | 'lifestyle' | 'psychology' | 'engagement' | 'review';
type FieldType = 'text' | 'email' | 'tel' | 'date' | 'number' | 'textarea' | 'select';
type OnboardingValues = Record<string, string>;

interface FieldSpec {
  name: string;
  label: string;
  type?: FieldType;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  className?: string;
  section?: string;
}

const STEPS: Array<{ key: StepKey; title: string; subtitle: string; fields: FieldSpec[] }> = [
  {
    key: 'profile',
    title: 'Profil',
    subtitle: 'Identité, données physiques et santé globale.',
    fields: [
      section('Identité'),
      field('first_name', 'Prénom'),
      field('last_name', 'Nom'),
      field('email', 'Email', 'email'),
      field('phone', 'Numéro de téléphone', 'tel'),
      field('birth_date', 'Date de naissance', 'date'),
      selectField('gender', 'Sexe', ['Femme', 'Homme', 'Autre', 'Préfère ne pas répondre']),
      section('Données physiques'),
      field('height_cm', 'Taille (cm)', 'number'),
      field('current_weight_kg', 'Poids actuel (kg)', 'number'),
      field('lowest_weight_12m', 'Poids le plus bas des 12 derniers mois', 'number'),
      field('highest_weight_12m', 'Poids le plus haut des 12 derniers mois', 'number'),
      field('target_weight_kg', 'Poids cible', 'number'),
      field('waist_cm', 'Tour de taille', 'number'),
      field('hips_cm', 'Hanches', 'number'),
      field('chest_cm', 'Poitrine', 'number'),
      field('arm_cm', 'Bras', 'number'),
      field('thigh_cm', 'Cuisses', 'number'),
      section('Santé globale'),
      textField('diagnosed_health_issues', 'As-tu des problèmes de santé diagnostiqués ?'),
      textField('medications', 'Prends-tu des médicaments ?'),
      textField('hormonal_issues', 'As-tu des troubles hormonaux ?'),
      textField('chronic_pain', 'As-tu des douleurs chroniques ?'),
    ],
  },
  {
    key: 'goals',
    title: 'Objectifs',
    subtitle: 'Objectif principal, motivation profonde, échéance et engagement.',
    fields: [
      selectField('goal_type', 'Quel est ton objectif principal ?', CLIENT_GOAL_TYPES.map(type => ({ value: type, label: CLIENT_GOAL_TYPE_LABELS[type] }))),
      textField('secondary_goals', "As-tu d'autres objectifs ?"),
      textField('motivation_why', 'Pourquoi veux-tu atteindre cet objectif ?'),
      textField('motivation_now', 'Pourquoi maintenant ?'),
      textField('life_change', 'Qu’est-ce que ça va changer dans ta vie ?'),
      textField('deadline', 'As-tu une échéance précise ?'),
      textField('specific_event', 'Y a-t-il un événement spécifique ?'),
      field('commitment_level_10', 'Sur 1 à 10, à quel point es-tu prêt à t’investir ?', 'number'),
      textField('ready_to_sacrifice', 'Qu’es-tu prêt à sacrifier ?'),
    ],
  },
  {
    key: 'sport',
    title: 'Sport',
    subtitle: 'Historique sportif, contraintes physiques et environnement d’entraînement.',
    fields: [
      section('Expérience'),
      textField('training_age', 'Depuis combien de temps t’entraînes-tu ?'),
      selectField('structured_program_before', 'As-tu déjà suivi un programme structuré ?', yesNo()),
      selectField('worked_with_coach_before', 'As-tu déjà travaillé avec un coach ?', yesNo()),
      textField('sports_practiced_before', 'Quels sports as-tu pratiqués ?'),
      textField('sports_current', 'Quels sports pratiques-tu actuellement ?'),
      field('training_frequency_per_week', 'Combien de fois t’entraînes-tu par semaine ?', 'number'),
      textField('liked_exercises', 'Quels exercices aimes-tu ?'),
      textField('disliked_exercises', 'Quels exercices détestes-tu ?'),
      selectField('experience_level', 'Niveau perçu', CLIENT_EXPERIENCE_LEVELS.map(level => ({ value: level, label: CLIENT_EXPERIENCE_LEVEL_LABELS[level] }))),
      section('Performance actuelle'),
      field('squat_max', 'Squat (charge max ou approx)', 'number'),
      field('bench_max', 'Développé couché', 'number'),
      field('deadlift_max', 'Deadlift', 'number'),
      field('pullups_count', 'Tractions (nombre)', 'number'),
      field('cardio_5k_time', 'Cardio (ex : 5km temps)'),
      section('Blessures et limitations'),
      textField('injuries_detail', 'As-tu déjà eu des blessures ? Lesquelles ?'),
      textField('injuries_current', 'Sont-elles encore présentes ?'),
      textField('movement_limitations', 'Y a-t-il des mouvements que tu ne peux pas faire ?'),
      textField('current_pain', 'As-tu des douleurs actuelles ?'),
      textField('mobility_issues', 'As-tu des problèmes de mobilité ? Zones raides ou sensibles ?'),
      section('Environnement'),
      selectField('training_location', 'Où t’entraînes-tu ?', ['Salle', 'Maison', 'Extérieur', 'Mixte']),
      textField('available_equipment', 'Matériel disponible précis : haltères, barre, machines, élastiques, kettlebell, rack, tapis…'),
      field('session_duration_minutes', 'Combien de temps par séance ?', 'number'),
      textField('available_days', 'Quels jours disponibles ?'),
    ],
  },
  {
    key: 'nutrition',
    title: 'Nutrition',
    subtitle: 'Habitudes, tracking, relation à la nourriture et contexte social.',
    fields: [
      field('meals_per_day', 'Combien de repas par jour ?', 'number'),
      selectField('fixed_meal_times', 'Manges-tu à heures fixes ?', yesNo()),
      selectField('snacking', 'Grignotes-tu ?', yesNo()),
      selectField('calorie_tracking_before', 'As-tu déjà compté tes calories ?', yesNo()),
      textField('tracking_app', 'Utilises-tu une app comme MyFitnessPal ?'),
      field('food_quality_10', 'Comment évalues-tu ton alimentation (1 à 10) ?', 'number'),
      selectField('processed_foods', 'Manges-tu beaucoup de produits transformés ?', yesNo()),
      selectField('knows_macros', 'Sais-tu ce que sont les protéines, glucides, lipides ?', yesNo()),
      field('water_l_per_day', 'Combien de litres d’eau par jour ?', 'number'),
      textField('protein_intake_estimate', 'Estimes-tu ton apport en protéines ?'),
      textField('allergies', 'Allergies ?'),
      textField('intolerances', 'Intolérances ?'),
      textField('specific_diet', 'Régime spécifique (vegan, halal, etc.)'),
      textField('food_compulsions', 'As-tu des compulsions alimentaires ?'),
      selectField('stress_eating', 'Manges-tu par stress ?', yesNo()),
      selectField('extreme_diets', 'As-tu déjà fait des régimes extrêmes ?', yesNo()),
      field('eating_out_frequency', 'Combien de fois manges-tu à l’extérieur ?', 'number'),
      textField('social_life_food', 'As-tu une vie sociale active (restos, soirées) ?'),
    ],
  },
  {
    key: 'lifestyle',
    title: 'Lifestyle',
    subtitle: 'Travail, stress, sommeil, récupération et activité quotidienne.',
    fields: [
      field('job', 'Quel est ton métier ?'),
      selectField('job_activity', 'Sédentaire ou actif ?', ['Sédentaire', 'Actif', 'Mixte']),
      selectField('work_schedule_type', 'Horaires fixes ou variables ?', ['Fixes', 'Variables', 'Travail posté', 'Autre']),
      field('stress_level_10', 'Niveau de stress (1 à 10)', 'number'),
      textField('main_stress_source', 'Source principale de stress ?'),
      field('sleep_hours', 'Combien d’heures dors-tu ?', 'number'),
      field('sleep_quality_10', 'Qualité du sommeil (1 à 10)', 'number'),
      selectField('sleep_onset_difficulty', 'Difficulté à s’endormir ?', yesNo()),
      selectField('night_wakings', 'Réveils nocturnes ?', yesNo()),
      selectField('rested_on_wake', 'Te sens-tu reposé au réveil ?', yesNo()),
      field('daily_fatigue_10', 'Niveau de fatigue quotidien (1 à 10)', 'number'),
      field('average_steps', 'Nombre de pas moyen ?', 'number'),
      textField('non_sport_activity', 'Activité hors sport ?'),
    ],
  },
  {
    key: 'psychology',
    title: 'Psychologie',
    subtitle: 'Discipline, obstacles, motivation, confiance et habitudes.',
    fields: [
      selectField('disciplined_self_view', 'Te considères-tu discipliné ?', yesNo()),
      textField('current_obstacles', 'Qu’est-ce qui t’empêche de progresser aujourd’hui ?'),
      selectField('abandoned_program_before', 'As-tu déjà abandonné un programme ?', yesNo()),
      textField('abandon_reason', 'Pourquoi ?'),
      textField('motivators', 'Qu’est-ce qui te motive ?'),
      textField('demotivators', 'Qu’est-ce qui te démotive ?'),
      field('self_confidence_10', 'Niveau de confiance en toi (1 à 10)', 'number'),
      textField('routine', 'As-tu une routine ?'),
    ],
  },
  {
    key: 'engagement',
    title: 'Engagement',
    subtitle: 'Adhérence, préférences coaching, données, vision et éléments premium.',
    fields: [
      section('Adhérence'),
      field('guaranteed_sessions_per_week', 'Combien de séances peux-tu garantir par semaine ?', 'number'),
      selectField('ready_nutrition_plan', 'Es-tu prêt à suivre un plan alimentaire ?', yesNo()),
      selectField('ready_tracking', 'Es-tu prêt à tracker tes données ?', yesNo()),
      selectField('ready_weekly_checkin', 'Es-tu prêt à faire un check-in chaque semaine ?', yesNo()),
      selectField('accountability_preference', 'Préfères-tu être autonome ou encadré ?', ['Autonome', 'Encadré', 'Mixte']),
      section('Préférences coaching'),
      selectField('coaching_style', 'Style de coaching préféré', ['Strict', 'Flexible', 'Pédagogique', 'Motivant']),
      selectField('communication_style', 'Communication préférée', ['Messages courts', 'Explications détaillées']),
      field('feedback_frequency', 'À quelle fréquence veux-tu du feedback ?'),
      section('Suivi & données'),
      textField('accepted_data', 'Acceptes-tu de partager : poids, photos, performances, nutrition ?'),
      field('tracking_frequency', 'Combien de fois veux-tu être suivi ?'),
      section('Mesures initiales'),
      textField('initial_photos', 'Photos : face, profil, dos'),
      textField('baseline_tests', 'Tests physiques simples'),
      field('resting_heart_rate', 'Fréquence cardiaque au repos (si dispo)', 'number'),
      section('Projection'),
      textField('vision_6_months', 'Où veux-tu être dans 6 mois ?'),
      textField('vision_1_year', 'Dans 1 an ?'),
      textField('ideal_success', 'À quoi ressemblerait ta réussite idéale ?'),
      section('Questions ouvertes'),
      textField('important_to_know', 'Y a-t-il quelque chose d’important que je devrais savoir ?'),
      textField('expectations_from_coach', 'Qu’attends-tu vraiment de moi ?'),
      textField('coaching_success_definition', 'Qu’est-ce qui ferait que ce coaching est un succès pour toi ?'),
      section('Ultra premium'),
      field('hrv', 'HRV (si capteur type Whoop Strap)', 'number'),
      field('wake_time', 'Heure de lever'),
      field('bed_time', 'Heure de coucher'),
      field('screen_time', 'Temps écran'),
      field('caffeine', 'Caféine (quantité / heure)'),
      textField('family_support', 'Support familial ?'),
      textField('social_influence', 'Influence sociale ?'),
    ],
  },
  {
    key: 'review',
    title: 'Résumé',
    subtitle: 'Vue de contrôle avant de valider ou reprendre plus tard.',
    fields: [],
  },
];

export const ONBOARDING_FIELD_LABELS: Record<string, string> = Object.fromEntries(
  STEPS.flatMap(step => step.fields)
    .filter(fieldSpec => fieldSpec.name)
    .map(fieldSpec => [fieldSpec.name, fieldSpec.label]),
);

interface Props {
  athlete: Athlete;
  onSaved: (athlete: Athlete) => void;
}

export function OnboardingWizard({ athlete, onSaved }: Props) {
  const initialStep = getInitialStep(athlete);
  const [stepIndex, setStepIndex] = useState(() => initialStep);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<OnboardingValues>({
    defaultValues: buildDefaultValues(athlete),
    mode: 'onBlur',
  });
  const step = STEPS[stepIndex];
  const values = form.watch();

  const answeredCount = useMemo(() => {
    const data = form.getValues();
    return questionFields().filter(f => (data[f.name] ?? '').trim()).length;
  }, [values, form]);
  const totalQuestions = questionFields().length;
  const completed = athlete.onboarding_completed_steps ?? [];
  const skipped = athlete.onboarding_skipped_steps ?? [];

  const saveDraft = async (options?: { complete?: boolean; skipCurrent?: boolean; nextIndex?: number }) => {
    setSaving(true);
    setError(null);
    try {
      const allValues = form.getValues();
      const nextCompleted = options?.skipCurrent
        ? completed
        : unique([...completed, step.key]);
      const nextSkipped = options?.skipCurrent
        ? unique([...skipped, step.key])
        : skipped.filter(key => key !== step.key);
      const updated = await updateAthlete(athlete.id, {
        ...corePatch(allValues, options?.complete),
        onboarding_data: allValues,
        onboarding_completed_steps: nextCompleted,
        onboarding_skipped_steps: nextSkipped,
        onboarding_last_step: STEPS[options?.nextIndex ?? stepIndex]?.key ?? step.key,
      });
      onSaved(updated);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sauvegarde impossible');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const goTo = async (nextIndex: number) => {
    await saveDraft({ nextIndex });
    setStepIndex(nextIndex);
  };

  const next = async () => {
    const nextIndex = Math.min(stepIndex + 1, STEPS.length - 1);
    await saveDraft({ nextIndex });
    setStepIndex(nextIndex);
  };

  const skip = async () => {
    const nextIndex = Math.min(stepIndex + 1, STEPS.length - 1);
    await saveDraft({ skipCurrent: true, nextIndex });
    setStepIndex(nextIndex);
  };

  const finish = async () => {
    await saveDraft({ complete: true, nextIndex: stepIndex });
  };

  return (
    <div className="bg-white rounded-md overflow-hidden" style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}>
      <div className="p-5" style={{ background: TOKENS.PANEL_BG, borderBottom: `1px solid ${TOKENS.HAIRLINE}` }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.12em] font-medium text-slate-500">Onboarding premium</div>
            <h2 className="mt-1 text-[20px] font-medium text-slate-900">{step.title}</h2>
            <p className="mt-1 text-[13px] text-slate-500">{step.subtitle}</p>
          </div>
          <div className="font-mono text-[11px] text-slate-500">
            {answeredCount}/{totalQuestions} réponses · étape {stepIndex + 1}/{STEPS.length}
          </div>
        </div>
        <div className="mt-4 h-1.5 rounded-full overflow-hidden" style={{ background: TOKENS.HAIRLINE }}>
          <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${Math.round((answeredCount / totalQuestions) * 100)}%` }} />
        </div>
        <div className="mt-4 flex flex-wrap gap-1">
          {STEPS.map((item, index) => (
            <button
              key={item.key}
              type="button"
              onClick={() => goTo(index)}
              className="h-8 rounded-full px-3 text-[11px]"
              style={{
                background: index === stepIndex ? '#0F172A' : '#fff',
                color: index === stepIndex ? '#fff' : skipped.includes(item.key) ? TOKENS.AMBER : '#475569',
                border: `1px solid ${index === stepIndex ? '#0F172A' : TOKENS.HAIRLINE}`,
              }}
            >
              {item.title}
              {completed.includes(item.key) && item.key !== 'review' ? ' ✓' : skipped.includes(item.key) ? ' · skip' : ''}
            </button>
          ))}
        </div>
      </div>

      <form className="p-5 flex flex-col gap-5" onSubmit={e => { e.preventDefault(); void finish(); }}>
        {error && <ErrorMessage message={error} />}
        {step.key === 'review' ? <Review values={values} /> : <StepFields step={step} form={form} />}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-[#EAE9E5] pt-4">
          <Button
            type="button"
            variant="secondary"
            disabled={stepIndex === 0 || saving}
            onClick={() => setStepIndex(i => Math.max(i - 1, 0))}
          >
            Précédent
          </Button>
          <div className="flex flex-wrap justify-end gap-2">
            {step.key !== 'review' && (
              <Button type="button" variant="ghost" loading={saving} onClick={skip}>
                Passer cette étape
              </Button>
            )}
            <Button type="button" variant="secondary" loading={saving} onClick={() => saveDraft()}>
              Sauvegarder et revenir plus tard
            </Button>
            {step.key === 'review' ? (
              <Button type="submit" loading={saving}>Valider l'onboarding</Button>
            ) : (
              <Button type="button" loading={saving} onClick={next}>Suivant</Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

function StepFields({ step, form }: { step: (typeof STEPS)[number]; form: ReturnType<typeof useForm<OnboardingValues>> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {step.fields.map(item => {
        if (item.section) {
          return (
            <div key={item.section} className="sm:col-span-2 pt-2 first:pt-0">
              <div className="text-[11px] uppercase tracking-[0.12em] font-medium text-slate-500">{item.section}</div>
            </div>
          );
        }
        if (item.type === 'textarea') {
          return (
            <Textarea
              key={item.name}
              label={item.label}
              rows={4}
              placeholder={item.placeholder}
              className={item.className ?? 'sm:col-span-2'}
              {...form.register(item.name)}
            />
          );
        }
        if (item.type === 'select') {
          return (
            <Select key={item.name} label={item.label} className={item.className} {...form.register(item.name)}>
              <option value="">Non renseigné</option>
              {(item.options ?? []).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          );
        }
        return (
          <Input
            key={item.name}
            label={item.label}
            type={item.type ?? 'text'}
            placeholder={item.placeholder}
            className={item.className}
            {...form.register(item.name)}
          />
        );
      })}
    </div>
  );
}

function Review({ values }: { values: OnboardingValues }) {
  const groups = STEPS.filter(step => step.key !== 'review').map(step => ({
    title: step.title,
    fields: step.fields.filter(item => item.name && (values[item.name] ?? '').trim()),
  })).filter(group => group.fields.length > 0);

  if (groups.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-[#EAE9E5] p-8 text-center text-sm text-slate-500">
        Aucune réponse pour le moment. Tu peux valider plus tard ou revenir sur une étape.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map(group => (
        <div key={group.title} className="rounded-md overflow-hidden" style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}>
          <div className="px-4 py-3 text-[13px] font-medium text-slate-900" style={{ background: TOKENS.PANEL_BG }}>
            {group.title}
          </div>
          {group.fields.map((fieldSpec, index) => (
            <div
              key={fieldSpec.name}
              className="grid grid-cols-1 sm:grid-cols-[260px_1fr] gap-2 px-4 py-3 text-[13px]"
              style={{ borderTop: index === 0 ? undefined : `1px solid ${TOKENS.HAIRLINE}` }}
            >
              <div className="text-slate-500">{fieldSpec.label}</div>
              <div className="text-slate-900 whitespace-pre-wrap">{displayValue(fieldSpec, values[fieldSpec.name])}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function corePatch(values: OnboardingValues, complete = false): Parameters<typeof updateAthlete>[1] {
  const firstName = clean(values.first_name);
  const lastName = clean(values.last_name);
  const fullName = `${firstName} ${lastName}`.trim();
  return {
    first_name: firstName || null,
    last_name: lastName || null,
    full_name: fullName || 'Client',
    email: clean(values.email) || null,
    phone: clean(values.phone) || null,
    birth_date: clean(values.birth_date) || null,
    gender: clean(values.gender) || null,
    height_cm: numberOrNull(values.height_cm),
    current_weight_kg: numberOrNull(values.current_weight_kg),
    target_weight_kg: numberOrNull(values.target_weight_kg),
    goal: clean(values.motivation_why) || clean(values.secondary_goals) || null,
    goal_type: clean(values.goal_type) as ClientGoalType || null,
    experience_level: (clean(values.experience_level) as ClientExperienceLevel) || 'beginner',
    training_frequency_per_week: numberOrDefault(values.training_frequency_per_week, 0),
    available_equipment: textToArray(values.available_equipment),
    injuries: textToArray(values.injuries_detail),
    medical_notes: [
      values.diagnosed_health_issues,
      values.medications,
      values.hormonal_issues,
      values.chronic_pain,
    ].map(clean).filter(Boolean).join('\n') || null,
    food_preferences: textToArray(values.specific_diet),
    dietary_restrictions: [
      values.allergies,
      values.intolerances,
    ].map(clean).filter(Boolean),
    lifestyle_notes: clean(values.important_to_know) || null,
    work_schedule: clean(values.work_schedule_type) || clean(values.job) || null,
    sleep_average_hours: numberOrNull(values.sleep_hours),
    stress_level: clamp(numberOrDefault(values.stress_level_10, 3), 1, 5),
    motivation_level: clamp(numberOrDefault(values.commitment_level_10, 3), 1, 5),
    onboarding_completed_at: complete ? new Date().toISOString() : undefined,
  };
}

function buildDefaultValues(athlete: Athlete): OnboardingValues {
  const data = normalizeData(athlete.onboarding_data);
  const base: OnboardingValues = {};
  for (const fieldSpec of questionFields()) base[fieldSpec.name] = data[fieldSpec.name] ?? '';
  return {
    ...base,
    first_name: data.first_name ?? athlete.first_name ?? athlete.full_name.split(/\s+/)[0] ?? '',
    last_name: data.last_name ?? athlete.last_name ?? athlete.full_name.split(/\s+/).slice(1).join(' ') ?? '',
    email: data.email ?? athlete.email ?? '',
    phone: data.phone ?? athlete.phone ?? '',
    birth_date: data.birth_date ?? athlete.birth_date ?? '',
    gender: data.gender ?? athlete.gender ?? '',
    height_cm: data.height_cm ?? valueOf(athlete.height_cm),
    current_weight_kg: data.current_weight_kg ?? valueOf(athlete.current_weight_kg),
    target_weight_kg: data.target_weight_kg ?? valueOf(athlete.target_weight_kg),
    goal_type: data.goal_type ?? athlete.goal_type ?? '',
    experience_level: data.experience_level ?? athlete.experience_level ?? '',
    training_frequency_per_week: data.training_frequency_per_week ?? valueOf(athlete.training_frequency_per_week),
    available_equipment: data.available_equipment ?? (athlete.available_equipment ?? []).join(', '),
    injuries_detail: data.injuries_detail ?? (athlete.injuries ?? []).join(', '),
    sleep_hours: data.sleep_hours ?? valueOf(athlete.sleep_average_hours),
    stress_level_10: data.stress_level_10 ?? valueOf(athlete.stress_level),
    commitment_level_10: data.commitment_level_10 ?? valueOf(athlete.motivation_level),
  };
}

function getInitialStep(athlete: Athlete) {
  const last = athlete.onboarding_last_step;
  const index = STEPS.findIndex(step => step.key === last);
  return index >= 0 ? index : 0;
}

function questionFields() {
  return STEPS.flatMap(step => step.fields).filter(fieldSpec => !!fieldSpec.name);
}

function field(name: string, label: string, type: FieldType = 'text', className?: string): FieldSpec {
  return { name, label, type, className };
}

function textField(name: string, label: string): FieldSpec {
  return { name, label, type: 'textarea', className: 'sm:col-span-2' };
}

function selectField(name: string, label: string, options: string[] | Array<{ value: string; label: string }>): FieldSpec {
  return {
    name,
    label,
    type: 'select',
    options: options.map(option => typeof option === 'string' ? { value: option, label: option } : option),
  };
}

function section(label: string): FieldSpec {
  return { name: '', label: '', section: label };
}

function yesNo() {
  return ['Oui', 'Non', 'Je ne sais pas'];
}

function normalizeData(value: Record<string, unknown> | null | undefined): OnboardingValues {
  const out: OnboardingValues = {};
  for (const [key, item] of Object.entries(value ?? {})) {
    if (item === null || item === undefined) out[key] = '';
    else if (Array.isArray(item)) out[key] = item.join(', ');
    else out[key] = String(item);
  }
  return out;
}

function valueOf(value: number | string | null | undefined) {
  return value === null || value === undefined ? '' : String(value);
}

function clean(value: string | undefined) {
  return (value ?? '').trim();
}

function numberOrNull(value: string | undefined) {
  const v = clean(value);
  if (!v) return null;
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : null;
}

function numberOrDefault(value: string | undefined, fallback: number) {
  const parsed = numberOrNull(value);
  return parsed ?? fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function textToArray(value: string | undefined) {
  return clean(value).split(',').map(item => item.trim()).filter(Boolean);
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function displayValue(fieldSpec: FieldSpec, value: string) {
  if (!value) return '—';
  if (fieldSpec.name === 'goal_type' && value in CLIENT_GOAL_TYPE_LABELS) return CLIENT_GOAL_TYPE_LABELS[value as ClientGoalType];
  if (fieldSpec.name === 'experience_level' && value in CLIENT_EXPERIENCE_LEVEL_LABELS) return CLIENT_EXPERIENCE_LEVEL_LABELS[value as ClientExperienceLevel];
  return value;
}
