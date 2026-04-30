import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Textarea';
import { TOKENS } from '@/components/dashboard/kit';
import { useTrainingPrograms } from '@/hooks/useTrainingPrograms';
import {
  TRAINING_PROGRAM_STATUS_LABELS,
  TRAINING_PROGRAM_STATUSES,
  TRAINING_SESSION_STATUS_LABELS,
  TRAINING_SESSION_STATUSES,
  TRAINING_SESSION_TYPE_LABELS,
  TRAINING_SESSION_TYPES,
} from '@/types/database';
import type {
  TrainingExercise,
  TrainingProgram,
  TrainingProgramSession,
  TrainingSessionStatus,
  TrainingSessionType,
  TrainingWeek,
} from '@/types/database';

export function TrainingProgramPanel({ athleteId }: { athleteId: string }) {
  const training = useTrainingPrograms(athleteId);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [selectedWeekNumber, setSelectedWeekNumber] = useState(1);
  const selectedProgram = useMemo(
    () => training.programs.find(program => program.id === selectedProgramId) ?? training.activeProgram,
    [selectedProgramId, training.activeProgram, training.programs],
  );
  const weeks = selectedProgram ? (training.weeksByProgramId.get(selectedProgram.id) ?? []) : [];
  const selectedWeek = weeks.find(week => week.week_number === selectedWeekNumber) ?? weeks[0] ?? null;

  const createDefaultProgram = async () => {
    const program = await training.upsertProgram({
      athlete_id: athleteId,
      title: 'Programme premium',
      goal: 'Progression individualisée',
      start_date: new Date().toISOString().slice(0, 10),
      end_date: null,
      status: 'active',
    });
    const week = await training.upsertWeek({
      program_id: program.id,
      week_number: 1,
      focus: 'Base technique',
      notes: null,
    });
    setSelectedProgramId(program.id);
    setSelectedWeekNumber(week.week_number);
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Programmes d'entraînement</CardTitle>
          <Button size="sm" onClick={createDefaultProgram}>+ Programme</Button>
        </CardHeader>
        <CardBody>
          {training.error && <ErrorMessage message={training.error} className="mb-4" />}
          {training.loading ? (
            <div className="py-10 flex justify-center"><Spinner className="h-6 w-6" /></div>
          ) : training.programs.length === 0 ? (
            <div className="rounded-md border border-dashed border-[#EAE9E5] p-8 text-center text-sm text-slate-500">
              Aucun programme structuré. Crée un programme pour organiser semaines, séances et exercices.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <ProgramSelector
                programs={training.programs}
                selectedId={selectedProgram?.id ?? ''}
                onSelect={id => {
                  setSelectedProgramId(id);
                  setSelectedWeekNumber(1);
                }}
              />
              {selectedProgram && (
                <ProgramEditor
                  program={selectedProgram}
                  onSave={training.upsertProgram}
                />
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {selectedProgram && (
        <Card>
          <CardHeader>
            <CardTitle>Vue par semaine</CardTitle>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                const next = Math.max(1, ...weeks.map(week => week.week_number), 0) + 1;
                const week = await training.upsertWeek({ program_id: selectedProgram.id, week_number: next, focus: '', notes: null });
                setSelectedWeekNumber(week.week_number);
              }}
            >
              + Semaine
            </Button>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-1">
              {weeks.length === 0 ? (
                <Button size="sm" variant="secondary" onClick={() => training.upsertWeek({ program_id: selectedProgram.id, week_number: 1, focus: '', notes: null })}>
                  Créer semaine 1
                </Button>
              ) : weeks.map(week => (
                <button
                  key={week.id}
                  type="button"
                  onClick={() => setSelectedWeekNumber(week.week_number)}
                  className="h-8 rounded-full px-3 text-[12px]"
                  style={{
                    background: selectedWeek?.id === week.id ? '#0F172A' : '#fff',
                    color: selectedWeek?.id === week.id ? '#fff' : '#475569',
                    border: `1px solid ${selectedWeek?.id === week.id ? '#0F172A' : TOKENS.HAIRLINE}`,
                  }}
                >
                  S{week.week_number}
                </button>
              ))}
            </div>
            {selectedWeek && (
              <WeekEditor
                week={selectedWeek}
                sessions={training.sessionsByWeekId.get(selectedWeek.id) ?? []}
                exercisesBySessionId={training.exercisesBySessionId}
                onWeekSave={training.upsertWeek}
                onSessionSave={training.upsertSession}
                onExerciseSave={training.upsertExercise}
                onExerciseDelete={training.deleteExercise}
              />
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function ProgramSelector({
  programs,
  selectedId,
  onSelect,
}: {
  programs: TrainingProgram[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {programs.map(program => (
        <button
          key={program.id}
          type="button"
          onClick={() => onSelect(program.id)}
          className="rounded-md px-3 py-2 text-left"
          style={{
            border: `1px solid ${program.id === selectedId ? 'var(--brand)' : TOKENS.HAIRLINE}`,
            background: program.id === selectedId ? '#F7FBF9' : '#fff',
          }}
        >
          <div className="text-[13px] font-medium text-slate-900">{program.title}</div>
          <div className="text-[11px] text-slate-500">{TRAINING_PROGRAM_STATUS_LABELS[program.status]} · {program.start_date}</div>
        </button>
      ))}
    </div>
  );
}

function ProgramEditor({
  program,
  onSave,
}: {
  program: TrainingProgram;
  onSave: (input: Parameters<ReturnType<typeof useTrainingPrograms>['upsertProgram']>[0]) => Promise<TrainingProgram>;
}) {
  const [draft, setDraft] = useState(program);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(program);
  }, [program]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Input label="Titre" value={draft.title} onChange={e => setDraft(p => ({ ...p, title: e.target.value }))} />
      <Select label="Statut" value={draft.status} onChange={e => setDraft(p => ({ ...p, status: e.target.value as TrainingProgram['status'] }))}>
        {TRAINING_PROGRAM_STATUSES.map(status => <option key={status} value={status}>{TRAINING_PROGRAM_STATUS_LABELS[status]}</option>)}
      </Select>
      <Input label="Début" type="date" value={draft.start_date} onChange={e => setDraft(p => ({ ...p, start_date: e.target.value }))} />
      <Input label="Fin" type="date" value={draft.end_date ?? ''} onChange={e => setDraft(p => ({ ...p, end_date: e.target.value || null }))} />
      <Textarea label="Objectif" rows={3} className="sm:col-span-2" value={draft.goal} onChange={e => setDraft(p => ({ ...p, goal: e.target.value }))} />
      <div className="sm:col-span-2 flex justify-end">
        <Button
          size="sm"
          loading={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave({
                id: draft.id,
                athlete_id: draft.athlete_id,
                title: draft.title.trim() || 'Programme',
                goal: draft.goal.trim(),
                start_date: draft.start_date,
                end_date: draft.end_date,
                status: draft.status,
              });
            } finally {
              setSaving(false);
            }
          }}
        >
          Enregistrer le programme
        </Button>
      </div>
    </div>
  );
}

function WeekEditor({
  week,
  sessions,
  exercisesBySessionId,
  onWeekSave,
  onSessionSave,
  onExerciseSave,
  onExerciseDelete,
}: {
  week: TrainingWeek;
  sessions: TrainingProgramSession[];
  exercisesBySessionId: Map<string, TrainingExercise[]>;
  onWeekSave: (input: Parameters<ReturnType<typeof useTrainingPrograms>['upsertWeek']>[0]) => Promise<TrainingWeek>;
  onSessionSave: (input: Parameters<ReturnType<typeof useTrainingPrograms>['upsertSession']>[0]) => Promise<TrainingProgramSession>;
  onExerciseSave: (input: Parameters<ReturnType<typeof useTrainingPrograms>['upsertExercise']>[0]) => Promise<TrainingExercise>;
  onExerciseDelete: (id: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState({ focus: week.focus ?? '', notes: week.notes ?? '' });
  const [addingSession, setAddingSession] = useState(false);

  useEffect(() => {
    setDraft({ focus: week.focus ?? '', notes: week.notes ?? '' });
  }, [week]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-3 items-end">
        <Input label="Focus semaine" value={draft.focus} onChange={e => setDraft(p => ({ ...p, focus: e.target.value }))} />
        <Input label="Notes" value={draft.notes} onChange={e => setDraft(p => ({ ...p, notes: e.target.value }))} />
        <Button size="sm" variant="secondary" onClick={() => onWeekSave({ id: week.id, program_id: week.program_id, week_number: week.week_number, focus: draft.focus || null, notes: draft.notes || null })}>
          Enregistrer
        </Button>
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAddingSession(true)}>+ Séance</Button>
      </div>

      {addingSession && (
        <SessionEditor
          session={{
            id: '',
            week_id: week.id,
            title: '',
            scheduled_date: null,
            status: 'planned',
            session_type: 'strength',
            duration_minutes: 60,
            notes: null,
            linked_session_id: null,
            created_at: '',
            updated_at: '',
          }}
          onSave={async input => {
            await onSessionSave(input);
            setAddingSession(false);
          }}
          onCancel={() => setAddingSession(false)}
        />
      )}

      {sessions.length === 0 && !addingSession ? (
        <div className="rounded-md border border-dashed border-[#EAE9E5] p-8 text-center text-sm text-slate-500">
          Aucune séance dans cette semaine.
        </div>
      ) : sessions.map(session => (
        <SessionBlock
          key={session.id}
          session={session}
          exercises={exercisesBySessionId.get(session.id) ?? []}
          onSessionSave={onSessionSave}
          onExerciseSave={onExerciseSave}
          onExerciseDelete={onExerciseDelete}
        />
      ))}
    </div>
  );
}

function SessionBlock({
  session,
  exercises,
  onSessionSave,
  onExerciseSave,
  onExerciseDelete,
}: {
  session: TrainingProgramSession;
  exercises: TrainingExercise[];
  onSessionSave: (input: Parameters<ReturnType<typeof useTrainingPrograms>['upsertSession']>[0]) => Promise<TrainingProgramSession>;
  onExerciseSave: (input: Parameters<ReturnType<typeof useTrainingPrograms>['upsertExercise']>[0]) => Promise<TrainingExercise>;
  onExerciseDelete: (id: string) => Promise<void>;
}) {
  const [editingSession, setEditingSession] = useState(false);
  const [addingExercise, setAddingExercise] = useState(false);

  return (
    <div className="rounded-md overflow-hidden" style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}>
      <div className="px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between" style={{ background: TOKENS.PANEL_BG }}>
        <div>
          <div className="text-[13px] font-medium text-slate-900">{session.title}</div>
          <div className="mt-1 text-[11px] text-slate-500">
            {TRAINING_SESSION_TYPE_LABELS[session.session_type]} · {TRAINING_SESSION_STATUS_LABELS[session.status]} · {session.duration_minutes ?? '—'} min
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setEditingSession(v => !v)}>Éditer</Button>
          <Button size="sm" onClick={() => setAddingExercise(true)}>+ Exercice</Button>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-3">
        {editingSession && (
          <SessionEditor
            session={session}
            onSave={async input => {
              await onSessionSave(input);
              setEditingSession(false);
            }}
            onCancel={() => setEditingSession(false)}
          />
        )}
        {addingExercise && (
          <ExerciseEditor
            exercise={{
              id: '',
              session_id: session.id,
              exercise_name: '',
              sets: 3,
              reps: '8-10',
              target_load_kg: null,
              actual_load_kg: null,
              tempo: null,
              rest_seconds: 90,
              rpe: null,
              notes: null,
              video_url: null,
              position: exercises.length,
              created_at: '',
              updated_at: '',
            }}
            onSave={async input => {
              await onExerciseSave(input);
              setAddingExercise(false);
            }}
            onCancel={() => setAddingExercise(false)}
          />
        )}
        {exercises.length === 0 && !addingExercise ? (
          <div className="text-[13px] text-slate-500">Aucun exercice saisi.</div>
        ) : exercises.map(exercise => (
          <ExerciseRow key={exercise.id} exercise={exercise} onSave={onExerciseSave} onDelete={onExerciseDelete} />
        ))}
      </div>
    </div>
  );
}

function SessionEditor({
  session,
  onSave,
  onCancel,
}: {
  session: TrainingProgramSession;
  onSave: (input: Parameters<ReturnType<typeof useTrainingPrograms>['upsertSession']>[0]) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(session);
  const [saving, setSaving] = useState(false);

  return (
    <div className="rounded-md border border-[#EAE9E5] p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Input label="Titre" value={draft.title} onChange={e => setDraft(p => ({ ...p, title: e.target.value }))} />
      <Input label="Date prévue" type="date" value={draft.scheduled_date ?? ''} onChange={e => setDraft(p => ({ ...p, scheduled_date: e.target.value || null }))} />
      <Select label="Type" value={draft.session_type} onChange={e => setDraft(p => ({ ...p, session_type: e.target.value as TrainingSessionType }))}>
        {TRAINING_SESSION_TYPES.map(type => <option key={type} value={type}>{TRAINING_SESSION_TYPE_LABELS[type]}</option>)}
      </Select>
      <Select label="Statut" value={draft.status} onChange={e => setDraft(p => ({ ...p, status: e.target.value as TrainingSessionStatus }))}>
        {TRAINING_SESSION_STATUSES.map(status => <option key={status} value={status}>{TRAINING_SESSION_STATUS_LABELS[status]}</option>)}
      </Select>
      <Input label="Durée" type="number" value={draft.duration_minutes ?? ''} onChange={e => setDraft(p => ({ ...p, duration_minutes: e.target.value ? Number(e.target.value) : null }))} />
      <Textarea label="Notes" rows={3} value={draft.notes ?? ''} onChange={e => setDraft(p => ({ ...p, notes: e.target.value || null }))} />
      <div className="sm:col-span-2 flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={onCancel} disabled={saving}>Annuler</Button>
        <Button
          size="sm"
          loading={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave({
                id: draft.id || undefined,
                week_id: draft.week_id,
                title: draft.title.trim() || 'Séance',
                scheduled_date: draft.scheduled_date,
                status: draft.status,
                session_type: draft.session_type,
                duration_minutes: draft.duration_minutes,
                notes: draft.notes,
              });
            } finally {
              setSaving(false);
            }
          }}
        >
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

function ExerciseRow({
  exercise,
  onSave,
  onDelete,
}: {
  exercise: TrainingExercise;
  onSave: (input: Parameters<ReturnType<typeof useTrainingPrograms>['upsertExercise']>[0]) => Promise<TrainingExercise>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <ExerciseEditor
        exercise={exercise}
        onSave={async input => {
          await onSave(input);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
        onDelete={async () => {
          await onDelete(exercise.id);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="rounded-md border border-[#EAE9E5] px-3 py-2 text-left hover:bg-[#FAFAF8]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-[13px] font-medium text-slate-900">{exercise.exercise_name}</div>
        <div className="font-mono text-[11px] text-slate-500">
          {exercise.sets} x {exercise.reps}
          {exercise.target_load_kg ? ` · cible ${exercise.target_load_kg}kg` : ''}
          {exercise.actual_load_kg ? ` · réel ${exercise.actual_load_kg}kg` : ''}
        </div>
      </div>
      {(exercise.rpe || exercise.notes) && (
        <div className="mt-1 text-[11px] text-slate-500">
          {exercise.rpe ? `RPE ${exercise.rpe}` : ''}
          {exercise.rpe && exercise.notes ? ' · ' : ''}
          {exercise.notes}
        </div>
      )}
    </button>
  );
}

function ExerciseEditor({
  exercise,
  onSave,
  onCancel,
  onDelete,
}: {
  exercise: TrainingExercise;
  onSave: (input: Parameters<ReturnType<typeof useTrainingPrograms>['upsertExercise']>[0]) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}) {
  const [draft, setDraft] = useState(exercise);
  const [saving, setSaving] = useState(false);

  return (
    <div className="rounded-md border border-[#EAE9E5] p-3 grid grid-cols-1 sm:grid-cols-4 gap-3">
      <Input label="Exercice" className="sm:col-span-2" value={draft.exercise_name} onChange={e => setDraft(p => ({ ...p, exercise_name: e.target.value }))} />
      <Input label="Séries" type="number" value={draft.sets} onChange={e => setDraft(p => ({ ...p, sets: Number(e.target.value) }))} />
      <Input label="Reps" value={draft.reps} onChange={e => setDraft(p => ({ ...p, reps: e.target.value }))} />
      <Input label="Charge cible" type="number" step="0.5" value={draft.target_load_kg ?? ''} onChange={e => setDraft(p => ({ ...p, target_load_kg: e.target.value ? Number(e.target.value) : null }))} />
      <Input label="Charge réelle" type="number" step="0.5" value={draft.actual_load_kg ?? ''} onChange={e => setDraft(p => ({ ...p, actual_load_kg: e.target.value ? Number(e.target.value) : null }))} />
      <Input label="Tempo" value={draft.tempo ?? ''} onChange={e => setDraft(p => ({ ...p, tempo: e.target.value || null }))} />
      <Input label="Repos sec." type="number" value={draft.rest_seconds ?? ''} onChange={e => setDraft(p => ({ ...p, rest_seconds: e.target.value ? Number(e.target.value) : null }))} />
      <Input label="RPE" type="number" min={1} max={10} value={draft.rpe ?? ''} onChange={e => setDraft(p => ({ ...p, rpe: e.target.value ? Number(e.target.value) : null }))} />
      <Input label="Vidéo" className="sm:col-span-3" value={draft.video_url ?? ''} onChange={e => setDraft(p => ({ ...p, video_url: e.target.value || null }))} />
      <Textarea label="Notes" rows={3} className="sm:col-span-4" value={draft.notes ?? ''} onChange={e => setDraft(p => ({ ...p, notes: e.target.value || null }))} />
      <div className="sm:col-span-4 flex justify-between gap-2">
        {onDelete ? <Button size="sm" variant="danger" onClick={onDelete} disabled={saving}>Supprimer</Button> : <span />}
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={onCancel} disabled={saving}>Annuler</Button>
          <Button
            size="sm"
            loading={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave({
                  id: draft.id || undefined,
                  session_id: draft.session_id,
                  exercise_name: draft.exercise_name.trim() || 'Exercice',
                  sets: draft.sets,
                  reps: draft.reps,
                  target_load_kg: draft.target_load_kg,
                  actual_load_kg: draft.actual_load_kg,
                  tempo: draft.tempo,
                  rest_seconds: draft.rest_seconds,
                  rpe: draft.rpe,
                  notes: draft.notes,
                  video_url: draft.video_url,
                  position: draft.position,
                });
              } finally {
                setSaving(false);
              }
            }}
          >
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
}
