/**
 * Lifter Profile page — displays per-muscle-group optimizer parameters
 * with reset buttons and optimal volume preview.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { getMuscleParams, resetSingleMuscleParams, MuscleParamEntry } from '../api/auth';

const PARAM_DESCRIPTIONS: { key: string; label: string; description: string }[] = [
  { key: 'k1', label: 'k1', description: 'Fitness gain multiplier — how much muscle growth you get per set. Higher means more responsive to training.' },
  { key: 'k3', label: 'k3', description: 'Fatigue sensitivity rate — how quickly fatigue accumulates with sustained training. Higher means volume becomes costly faster.' },
  { key: 'kappa0', label: 'κ0', description: 'Initial fatigue sensitivity — your starting fatigue cost per set at the beginning of a mesocycle.' },
  { key: 'tau1', label: 'τ1', description: 'Fitness time constant (weeks) — how slowly fitness gains decay. Higher means adaptations persist longer.' },
  { key: 'tau2', label: 'τ2', description: 'Fatigue time constant (weeks) — how quickly fatigue dissipates. Lower means faster recovery between weeks.' },
  { key: 'tau3', label: 'τ3', description: 'Fatigue sensitivity decay (weeks) — how quickly accumulated fatigue sensitivity fades during rest.' },
  { key: 'tau_alpha', label: 'τα', description: 'Adaptation threshold time constant (weeks) — how quickly your maintenance volume floor adjusts to recent training.' },
  { key: 'alpha0', label: 'α0', description: 'Initial maintenance volume — sets below this level are just maintenance and do not drive new growth.' },
];

const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

function formatParam(value: number): string {
  if (value === 0) return '0';
  if (value >= 1) return value.toFixed(1);
  if (value >= 0.01) return value.toFixed(3);
  return value.toFixed(4);
}

export default function LifterProfile() {
  const { accessToken } = useAuthStore();
  const [entries, setEntries] = useState<MuscleParamEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [infoParam, setInfoParam] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState<{ muscleGroup: string; level: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accessToken) loadParams();
  }, [accessToken]);

  const loadParams = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getMuscleParams(accessToken);
      setEntries(data);
    } catch (err) {
      console.error('Error loading muscle params:', err);
      setError('Failed to load parameters.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetClick = (muscleGroup: string, level: string) => {
    setConfirmReset({ muscleGroup, level });
  };

  const handleResetConfirm = async () => {
    if (!accessToken || !confirmReset) return;
    const { muscleGroup, level } = confirmReset;
    setConfirmReset(null);
    setResetting(`${muscleGroup}-${level}`);
    setError(null);
    try {
      await resetSingleMuscleParams(muscleGroup, level, accessToken);
      await loadParams();
    } catch (err) {
      console.error('Error resetting muscle params:', err);
      setError(`Failed to reset ${muscleGroup} parameters.`);
    } finally {
      setResetting(null);
    }
  };

  const toggleExpand = (mg: string) => {
    setExpandedGroup(expandedGroup === mg ? null : mg);
  };

  const allInfoEntries = [
    ...PARAM_DESCRIPTIONS,
    { key: 'volume_preview', label: 'Prescribed Sets', description: 'The optimal number of sets per week for this muscle group across a 9-week mesocycle, computed from your current parameters. Volume ramps up each week during accumulation, then drops for the deload week to allow recovery.' },
  ];
  const activeInfo = allInfoEntries.find(p => p.key === infoParam);

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-6">Lifter Profile</h1>
        <p className="text-gray-400">Loading parameters...</p>
      </main>
    );
  }

  if (entries.length === 0) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-6">Lifter Profile</h1>
        <div className="bg-gray-800 rounded-lg p-6">
          <p className="text-gray-400">
            No muscle group parameters found. Start a mesocycle to generate your personalized parameters.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Lifter Profile</h1>
        <p className="text-gray-400">
          Your per-muscle-group volume parameters, adjusted by workout feedback.{' '}
          <Link to="/how-it-works" className="text-teal-400 hover:text-teal-300">Learn what these mean</Link>
        </p>
      </div>


      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {entries.map((entry) => {
          const isExpanded = expandedGroup === entry.muscle_group;
          return (
            <div key={entry.muscle_group} className="bg-gray-800 rounded-lg overflow-hidden">
              {/* Header - always visible */}
              <button
                onClick={() => toggleExpand(entry.muscle_group)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-700 transition-colors"
              >
                <h2 className="text-lg font-semibold text-teal-400">{entry.muscle_group}</h2>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4">
                  {/* Parameters table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr>
                          {PARAM_DESCRIPTIONS.map(({ key, label }) => (
                            <th key={key} className="px-2 py-2 text-white font-semibold text-center text-base">
                              {label}
                              <button
                                onClick={(e) => { e.stopPropagation(); setInfoParam(key); }}
                                className="ml-1 text-gray-400 hover:text-white align-middle"
                              >
                                &#9432;
                              </button>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {PARAM_DESCRIPTIONS.map(({ key }) => (
                            <td key={key} className="px-2 py-2 text-white text-center font-mono text-base">
                              {formatParam((entry.params as Record<string, number>)[key])}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Volume profile preview */}
                  {entry.volume_profile.length > 0 && (
                    <div>
                      {/* Week labels row */}
                      <div className="flex gap-1 pt-2 mt-2 border-t border-gray-700">
                        {entry.volume_profile.map((_, i) => {
                          const isDeload = i === entry.volume_profile.length - 1;
                          return (
                            <div key={i} className="flex-1 text-center">
                              <span className="text-base text-white font-semibold">
                                {isDeload ? 'Deload' : `Week ${i + 1}`}
                              </span>
                              {i === 0 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setInfoParam('volume_preview'); }}
                                  className="ml-1 text-gray-400 hover:text-white align-middle"
                                >
                                  &#9432;
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {/* Set values */}
                      <div className="flex gap-1">
                        {entry.volume_profile.map((sets, i) => (
                          <div key={i} className="flex-1 text-center">
                            <span className="text-base text-white font-medium">{Math.round(sets)} sets</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reset buttons */}
                  <div className="flex gap-2 flex-wrap mt-4">
                    <span className="text-xs text-gray-400 self-center mr-1">Reset to:</span>
                    {EXPERIENCE_LEVELS.map((level) => {
                      const isResetting = resetting === `${entry.muscle_group}-${level}`;
                      return (
                        <button
                          key={level}
                          onClick={() => handleResetClick(entry.muscle_group, level)}
                          disabled={isResetting}
                          className="text-xs px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-gray-300 transition-colors capitalize"
                        >
                          {isResetting ? '...' : level}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reset confirmation modal */}
      {confirmReset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-white mb-3">Reset Parameters</h3>
            <p className="text-sm text-gray-300 leading-relaxed mb-2">
              Reset <span className="text-teal-400 font-medium">{confirmReset.muscleGroup}</span> to <span className="text-white font-medium capitalize">{confirmReset.level}</span> defaults?
            </p>
            <p className="text-sm text-gray-400 leading-relaxed mb-5">
              This will overwrite your current parameters and re-optimize any active mesocycle workouts for this muscle group.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmReset(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResetConfirm}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 rounded-lg transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Parameter info modal */}
      {activeInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">{activeInfo.label}</h3>
              <button
                onClick={() => setInfoParam(null)}
                className="text-gray-400 hover:text-white text-xl"
              >
                &#10005;
              </button>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{activeInfo.description}</p>
            <button
              onClick={() => setInfoParam(null)}
              className="w-full mt-5 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 rounded-lg"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
