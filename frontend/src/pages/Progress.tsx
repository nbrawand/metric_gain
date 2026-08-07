import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
  getOverview,
  getPersonalRecords,
  getStrengthHistory,
  getTrainedExercises,
  getVolumeHistory,
  PersonalRecord,
  StrengthHistory,
  TrainedExercise,
  TrainingOverview,
  VolumeHistory,
} from '../api/analytics';
import { weightUnitLabel, weightUnitFromPreferences } from '../utils/units';
import { ceilingForMuscleGroup } from '../utils/volume';

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

/** Line chart of estimated 1RM over time, drawn as an inline SVG. */
function StrengthChart({ history, unit }: { history: StrengthHistory; unit: string }) {
  const points = history.points;
  if (points.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-8 text-center">
        No completed sets for this exercise yet.
      </p>
    );
  }
  if (points.length === 1) {
    const only = points[0];
    return (
      <div className="py-8 text-center">
        <div className="text-3xl font-bold text-teal-400">
          {only.estimated_1rm} {unit}
        </div>
        <p className="text-sm text-gray-400 mt-2">
          Estimated 1RM on {formatDate(only.date)}. One more session and this becomes a trend.
        </p>
      </div>
    );
  }

  const values = points.map((p) => p.estimated_1rm);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // A flat series would divide by zero; pad it so the line sits mid-chart
  const span = max - min || Math.max(1, max * 0.1);
  const width = 100;
  const height = 40;
  const coords = points.map((p, i) => {
    const x = points.length === 1 ? 0 : (i / (points.length - 1)) * width;
    const y = height - ((p.estimated_1rm - min) / span) * height;
    return { x, y, point: p };
  });
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const first = values[0];
  const last = values[values.length - 1];
  const change = last - first;

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-3xl font-bold text-teal-400">
          {last} {unit}
        </span>
        <span className={`text-sm font-medium ${change >= 0 ? 'text-teal-300' : 'text-amber-400'}`}>
          {change >= 0 ? '+' : ''}
          {Math.round(change * 10) / 10} {unit} since {formatDate(points[0].date)}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-32"
        role="img"
        aria-label={`Estimated one rep max for ${history.exercise_name} over time`}
      >
        <path d={path} fill="none" stroke="#2dd4bf" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={1} fill="#2dd4bf" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-gray-500 mt-1">
        <span>{formatDate(points[0].date)}</span>
        <span>{formatDate(points[points.length - 1].date)}</span>
      </div>
      <p className="text-xs text-gray-500 mt-3">
        Estimated from your best set each session, counting reps left in reserve.
        Low: {min} {unit} · High: {max} {unit}
      </p>
    </div>
  );
}

/** Stacked weekly sets per muscle group. */
function VolumeChart({ history }: { history: VolumeHistory }) {
  if (history.weeks.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-8 text-center">
        Complete a workout and your weekly volume shows up here.
      </p>
    );
  }

  const totals = history.weeks.map((_, i) =>
    history.muscle_groups.reduce((sum, g) => sum + (history.sets[g]?.[i] ?? 0), 0)
  );
  const max = Math.max(...totals, 1);

  return (
    <div>
      <div className="flex items-end gap-2 h-40">
        {history.weeks.map((week, i) => (
          <div key={week} className="flex-1 flex flex-col items-center justify-end h-full">
            <span className="text-[10px] text-gray-300 mb-1">{totals[i]}</span>
            <div
              className="w-full bg-teal-500 rounded-t"
              style={{ height: `${(totals[i] / max) * 100}%`, minHeight: totals[i] > 0 ? '2px' : '0' }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-1">
        {history.weeks.map((week) => (
          <span key={week} className="flex-1 text-center text-[10px] text-gray-500">
            {formatDate(week)}
          </span>
        ))}
      </div>

      <div className="mt-6 space-y-2">
        {history.muscle_groups.map((group) => {
          const sets = history.sets[group] ?? [];
          const latest = sets[sets.length - 1] ?? 0;
          const ceiling = ceilingForMuscleGroup(group);
          return (
            <div key={group} className="flex items-center gap-3">
              <span className="text-xs text-gray-300 w-24 shrink-0">{group}</span>
              <div className="flex-1 bg-gray-700 rounded h-2 overflow-hidden">
                <div
                  className={`h-full ${latest > ceiling ? 'bg-amber-500' : 'bg-teal-500'}`}
                  style={{ width: `${Math.min(100, (latest / ceiling) * 100)}%` }}
                />
              </div>
              <span className={`text-xs w-16 text-right ${latest > ceiling ? 'text-amber-400' : 'text-gray-400'}`}>
                {latest}/{ceiling}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 mt-3">
        Hard sets per muscle group in the most recent week, against a recoverable weekly total.
      </p>
    </div>
  );
}

export default function Progress() {
  const { accessToken, user } = useAuthStore();
  const unit = weightUnitLabel(weightUnitFromPreferences(user?.preferences));

  const [overview, setOverview] = useState<TrainingOverview | null>(null);
  const [volume, setVolume] = useState<VolumeHistory | null>(null);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [trained, setTrained] = useState<TrainedExercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<number | null>(null);
  const [strength, setStrength] = useState<StrengthHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getOverview(accessToken),
      getVolumeHistory(accessToken),
      getPersonalRecords(accessToken),
      getTrainedExercises(accessToken),
    ])
      .then(([o, v, r, t]) => {
        if (cancelled) return;
        setOverview(o);
        setVolume(v);
        setRecords(r.records);
        setTrained(t);
        // Default to the heaviest lift — most likely the one they care about
        if (t.length > 0) setSelectedExercise(r.records[0]?.exercise_id ?? t[0].id);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your progress. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || selectedExercise === null) return;
    let cancelled = false;
    getStrengthHistory(selectedExercise, accessToken)
      .then((h) => {
        if (!cancelled) setStrength(h);
      })
      .catch(() => {
        if (!cancelled) setStrength(null);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, selectedExercise]);

  const hasHistory = useMemo(
    () => (overview?.sets_logged ?? 0) > 0,
    [overview]
  );

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-4">Progress</h1>
        <p className="text-gray-400">Loading…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-4">Progress</h1>
        <p className="text-red-400">{error}</p>
      </main>
    );
  }

  if (!hasHistory) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-4">Progress</h1>
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-300 mb-2">Nothing to show yet.</p>
          <p className="text-sm text-gray-400">
            Finish a workout and your estimated strength, weekly volume and best lifts
            will appear here.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Progress</h1>

      {/* Headline totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Workouts', value: overview!.sessions_completed },
          { label: 'Sets logged', value: overview!.sets_logged },
          { label: 'Blocks finished', value: overview!.blocks_completed },
          {
            label: `Total lifted (${unit})`,
            value: Math.round(overview!.total_volume).toLocaleString(),
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Strength over time */}
      <section className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="text-lg font-semibold text-white">Estimated Strength</h2>
          <select
            value={selectedExercise ?? ''}
            onChange={(e) => setSelectedExercise(Number(e.target.value))}
            className="bg-gray-700 text-white rounded px-3 py-2 text-sm max-w-[60%]"
            aria-label="Exercise"
          >
            {trained.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.name}
              </option>
            ))}
          </select>
        </div>
        {strength && <StrengthChart history={strength} unit={unit} />}
      </section>

      {/* Weekly volume */}
      <section className="bg-gray-800 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Weekly Volume</h2>
        {volume && <VolumeChart history={volume} />}
      </section>

      {/* Personal records */}
      <section className="bg-gray-800 rounded-lg overflow-hidden">
        <h2 className="text-lg font-semibold text-white p-4 pb-3">Best Lifts</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-xs text-gray-400 font-medium px-4 py-2">Exercise</th>
                <th className="text-right text-xs text-gray-400 font-medium px-4 py-2">Est. 1RM</th>
                <th className="text-right text-xs text-gray-400 font-medium px-4 py-2">Heaviest</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.exercise_id} className="border-b border-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="text-sm text-white">{record.exercise_name}</div>
                    <div className="text-xs text-gray-500">{record.muscle_group}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="text-sm text-teal-400 font-medium">
                      {record.best_estimated_1rm ?? '—'} {unit}
                    </div>
                    {record.best_estimated_1rm_date && (
                      <div className="text-xs text-gray-500">
                        {formatDate(record.best_estimated_1rm_date)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="text-sm text-white">
                      {record.heaviest_weight ?? '—'} {unit}
                      {record.heaviest_weight_reps ? ` × ${record.heaviest_weight_reps}` : ''}
                    </div>
                    {record.heaviest_weight_date && (
                      <div className="text-xs text-gray-500">
                        {formatDate(record.heaviest_weight_date)}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
