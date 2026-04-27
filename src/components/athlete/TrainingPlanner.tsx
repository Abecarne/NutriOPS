import { useEffect, useMemo, useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Textarea';
import { WeekSelector } from '@/components/athlete/WeekSelector';
import { WeekDayPicker, type WeekDaySummary } from '@/components/athlete/WeekDayPicker';
import { formatDateShort, isoWeekDays } from '@/lib/utils';
import {
  TRAINING_SESSION_STATUSES,
  TRAINING_SESSION_STATUS_LABELS,
  TRAINING_SESSION_TYPES,
  TRAINING_SESSION_TYPE_LABELS,
} from '@/types/database';
import type { TrainingSession, TrainingSessionStatus, TrainingSessionType } from '@/types/database';
import type { TrainingSessionInput } from '@/hooks/useTrainingSessions';

interface Props {
  athleteId: string;
  weekStart: string;
  onWeekChange: (weekStart: string) => void;
  sessionsByDate: Map<string, TrainingSession[]>;
  sessions: TrainingSession[];
  loading: boolean;
  error: string | null;
  upsertSession: (input: TrainingSessionInput) => Promise<TrainingSession>;
  deleteSession: (id: string) => Promise<void>;
  duplicatePreviousWeek: (weekStart: string) => Promise<TrainingSession[]>;
}

export function TrainingPlanner({
  athleteId,
  weekStart,
  onWeekChange,
  sessionsByDate,
  sessions,
  loading,
  error,
  upsertSession,
  deleteSession,
  duplicatePreviousWeek,
}: Props) {
  const days = useMemo(() => isoWeekDays(weekStart), [weekStart]);
  const [selectedDate, setSelectedDate] = useState(weekStart);
  const [duplicating, setDuplicating] = useState(false);
  const weeklyLoad = sessions.reduce((sum, session) => sum + (session.internal_load ?? predictedLoad(session)), 0);
  const selectedSessions = sessionsByDate.get(selectedDate) ?? [];

  useEffect(() => {
    if (!days.includes(selectedDate)) setSelectedDate(weekStart);
  }, [days, selectedDate, weekStart]);

  const daySummaries = useMemo<WeekDaySummary[]>(
    () => days.map(day => {
      const daySessions = sessionsByDate.get(day) ?? [];
      const load = daySessions.reduce((sum, session) => sum + (session.internal_load ?? predictedLoad(session)), 0);
      return {
        date: day,
        label: daySessions.length ? `${daySessions.length} séance(s)` : 'Repos / libre',
        subline: daySessions.length ? `Load ${load}` : 'Cliquer pour préparer',
        tone: daySessions.length ? 'ok' : 'mute',
      };
    }),
    [days, sessionsByDate],
  );

  const duplicate = async () => {
    setDuplicating(true);
    try {
      await duplicatePreviousWeek(weekStart);
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Planification entraînement</CardTitle>
        <WeekSelector weekStart={weekStart} onChange={onWeekChange} />
      </CardHeader>
      <CardBody className="flex flex-col gap-5">
        {error && <ErrorMessage message={error} />}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-[12px] text-slate-500">
            Charge semaine estimée/réalisée : <span className="font-mono text-slate-900">{weeklyLoad}</span>
          </div>
          <Button variant="secondary" onClick={duplicate} loading={duplicating}>
            Dupliquer semaine précédente
          </Button>
        </div>

        {loading ? (
          <div className="py-10 flex justify-center"><Spinner className="h-6 w-6" /></div>
        ) : (
          <>
            <WeekDayPicker days={daySummaries} selectedDate={selectedDate} onSelect={setSelectedDate} />
            <TrainingDayDetail
              athleteId={athleteId}
              date={selectedDate}
              sessions={selectedSessions}
              onSave={upsertSession}
              onDelete={deleteSession}
            />
          </>
        )}
      </CardBody>
    </Card>
  );
}

function TrainingDayDetail({
  athleteId,
  date,
  sessions,
  onSave,
  onDelete,
}: {
  athleteId: string;
  date: string;
  sessions: TrainingSession[];
  onSave: (input: TrainingSessionInput) => Promise<TrainingSession>;
  onDelete: (id: string) => Promise<void>;
}) {
  const dayLoad = sessions.reduce((sum, session) => sum + (session.internal_load ?? predictedLoad(session)), 0);

  return (
    <div className="rounded-md border border-[#EAE9E5] bg-white overflow-hidden">
      <div className="px-4 py-3 flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between" style={{ background: '#FAFAF8', borderBottom: '1px solid #EAE9E5' }}>
        <div>
          <div className="text-[14px] font-medium text-slate-900">Préparation du {formatDateShort(date)}</div>
          <div className="text-[12px] text-slate-500">{sessions.length} séance(s) · charge {dayLoad}</div>
        </div>
        <NewSessionForm athleteId={athleteId} date={date} onSave={onSave} />
      </div>
      <div className="p-4">
        {sessions.length === 0 ? (
          <div className="rounded-md border border-dashed border-[#EAE9E5] py-10 text-center text-sm text-slate-500">
            Aucune séance sur ce jour. Utilise le bouton “+ Séance” pour préparer le contenu.
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {sessions.map(session => (
              <SessionEditor key={session.id} session={session} onSave={onSave} onDelete={onDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NewSessionForm({
  athleteId,
  date,
  onSave,
}: {
  athleteId: string;
  date: string;
  onSave: (input: TrainingSessionInput) => Promise<TrainingSession>;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        + Séance
      </Button>
    );
  }

  return (
    <SessionForm
      initial={{
        athlete_id: athleteId,
        session_date: date,
        title: '',
        session_type: 'strength',
        planned_duration_min: 60,
        planned_intensity: 6,
        description: '',
        status: 'planned',
      }}
      compact={false}
      onCancel={() => setOpen(false)}
      onSubmit={async input => {
        await onSave(input);
        setOpen(false);
      }}
    />
  );
}

function SessionEditor({
  session,
  onSave,
  onDelete,
}: {
  session: TrainingSession;
  onSave: (input: TrainingSessionInput) => Promise<TrainingSession>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const load = session.internal_load ?? predictedLoad(session);

  if (editing) {
    return (
      <SessionForm
        initial={session}
        compact={false}
        onCancel={() => setEditing(false)}
        onDelete={async () => {
          await onDelete(session.id);
          setEditing(false);
        }}
        onSubmit={async input => {
          await onSave(input);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="rounded-md border border-[#EAE9E5] bg-[#FAFAF8] px-3 py-2 text-left hover:bg-white transition-colors"
    >
      <div className="text-[12px] font-medium text-slate-900 truncate">{session.title}</div>
      <div className="mt-1 text-[10px] text-slate-500 truncate">
        {TRAINING_SESSION_TYPE_LABELS[session.session_type]} · {TRAINING_SESSION_STATUS_LABELS[session.status]} · load {load || '—'}
      </div>
    </button>
  );
}

function SessionForm({
  initial,
  compact,
  onSubmit,
  onCancel,
  onDelete,
}: {
  initial: TrainingSessionInput;
  compact?: boolean;
  onSubmit: (input: TrainingSessionInput) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    ...initial,
    title: initial.title ?? '',
    session_type: initial.session_type ?? 'strength',
    planned_duration_min: initial.planned_duration_min ?? 60,
    planned_intensity: initial.planned_intensity ?? 6,
    description: initial.description ?? '',
    status: initial.status ?? 'planned',
    actual_duration_min: initial.actual_duration_min ?? null,
    rpe: initial.rpe ?? null,
    coach_notes: initial.coach_notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!draft.title.trim()) {
      setError('Le titre est requis.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        id: draft.id,
        athlete_id: draft.athlete_id,
        session_date: draft.session_date,
        title: draft.title.trim(),
        session_type: draft.session_type,
        planned_duration_min: numberOrNull(draft.planned_duration_min),
        planned_intensity: numberOrNull(draft.planned_intensity),
        status: draft.status,
        actual_duration_min: numberOrNull(draft.actual_duration_min),
        rpe: numberOrNull(draft.rpe),
        athlete_notes: draft.athlete_notes ?? null,
        description: draft.description?.trim() || null,
        coach_notes: draft.coach_notes?.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sauvegarde impossible');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-md border border-[#EAE9E5] p-3 bg-white flex flex-col gap-2">
      <Input label="Titre" value={draft.title} onChange={event => setDraft(prev => ({ ...prev, title: event.target.value }))} />
      <div className={compact ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-4 gap-2'}>
        <Select label="Type" value={draft.session_type} onChange={event => setDraft(prev => ({ ...prev, session_type: event.target.value as TrainingSessionType }))}>
          {TRAINING_SESSION_TYPES.map(type => <option key={type} value={type}>{TRAINING_SESSION_TYPE_LABELS[type]}</option>)}
        </Select>
        <Select label="Statut" value={draft.status} onChange={event => setDraft(prev => ({ ...prev, status: event.target.value as TrainingSessionStatus }))}>
          {TRAINING_SESSION_STATUSES.map(status => <option key={status} value={status}>{TRAINING_SESSION_STATUS_LABELS[status]}</option>)}
        </Select>
        <Input label="Min." type="number" value={draft.planned_duration_min ?? ''} onChange={event => setDraft(prev => ({ ...prev, planned_duration_min: Number(event.target.value) }))} />
        <Input label="Int." type="number" min={1} max={10} value={draft.planned_intensity ?? ''} onChange={event => setDraft(prev => ({ ...prev, planned_intensity: Number(event.target.value) }))} />
      </div>
      <Textarea label="Consignes" rows={compact ? 2 : 3} value={draft.description ?? ''} onChange={event => setDraft(prev => ({ ...prev, description: event.target.value }))} />
      {error && <div className="text-xs text-red-600">{error}</div>}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={save} loading={saving}>Save</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        {onDelete && <Button size="sm" variant="danger" onClick={onDelete}>Delete</Button>}
      </div>
    </div>
  );
}

function predictedLoad(session: TrainingSession) {
  if (!session.planned_duration_min || !session.planned_intensity) return 0;
  return session.planned_duration_min * session.planned_intensity;
}

function numberOrNull(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
