import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useOfflineSyncStore } from '../stores/offlineSyncStore';
import { onConnectivityChange, getServerReachable } from '../api/client';
import { getWorkoutSession, updateWorkoutSet, updateWorkoutSession, listWorkoutSessions, swapExercise, removeExercise, addExercise, addSetToExercise, removeSetFromExercise } from '../api/workoutSessions';
import { getExercises } from '../api/exercises';
import { getMesocycleInstance, updateMesocycleInstance, updateInstanceExerciseNotes } from '../api/mesocycles';
import { WorkoutSession, WorkoutSet, WorkoutSessionListItem } from '../types/workout_session';
import { Exercise } from '../types/exercise';
import { MesocycleInstance } from '../types/mesocycle';
import { computeTargetRir } from '../utils/volume';

// Local state for tracking input values before they're saved
type SetInputValues = Record<number, { weight: string; reps: string }>;

export default function WorkoutExecution() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [instance, setInstance] = useState<MesocycleInstance | null>(null);
  const [allSessions, setAllSessions] = useState<WorkoutSessionListItem[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Exercise edits also change the later weeks of this day, which the user
  // cannot see from here — say so rather than changing them silently
  const [notice, setNotice] = useState<string | null>(null);
  const [completionBanner, setCompletionBanner] = useState<{ week: number; day: number } | null>(null);

  const [showInfo, setShowInfo] = useState(false);
  const [showWeightInfo, setShowWeightInfo] = useState(false);
  const [showLogInfo, setShowLogInfo] = useState(false);

  // Exercise management state
  const [showExerciseMenu, setShowExerciseMenu] = useState<number | null>(null); // exercise_id of open dropdown
  const [showExercisePicker, setShowExercisePicker] = useState<'swap' | 'add' | null>(null);
  const [swapTargetExerciseId, setSwapTargetExerciseId] = useState<number | null>(null);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const latestSessionRequestRef = useRef<string | undefined>(undefined);

  // Notes editing state
  const [editingNotesExerciseId, setEditingNotesExerciseId] = useState<number | null>(null);
  const [draftNotes, setDraftNotes] = useState('');

  // Local input state to prevent re-renders while typing
  const [inputValues, setInputValues] = useState<SetInputValues>({});

  // Last persisted numbers per set (server row or queued offline save). The
  // leave-guard compares typed input against this — not against the live
  // session, which mirrors every keystroke and so never differs.
  const savedValuesRef = useRef<Record<number, { weight: number; reps: number }>>({});

  // Collapsible exercises
  const [collapsedExercises, setCollapsedExercises] = useState<Set<number>>(new Set());
  const toggleExerciseCollapsed = (exerciseId: number) => {
    setCollapsedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseId)) next.delete(exerciseId);
      else next.add(exerciseId);
      return next;
    });
  };

  // Explicit save tracking
  const [loggedSetIds, setLoggedSetIds] = useState<Set<number>>(new Set());
  const [savingSetIds, setSavingSetIds] = useState<Set<number>>(new Set());
  const [completingWorkout, setCompletingWorkout] = useState(false);

  // Offline sync
  const { enqueue, remove, removeForSet, drainQueue, getPendingSetIds, getPendingForSession, hasPending } = useOfflineSyncStore();
  const [serverReachable, setServerReachableState] = useState(getServerReachable);

  useEffect(() => {
    loadWorkoutSession();
  }, [sessionId]);

  // Offline sync: subscribe to connectivity changes, drain queue when back online
  const handleOnline = useCallback((reachable: boolean) => {
    setServerReachableState(reachable);
    if (reachable && accessToken) {
      drainQueue(accessToken).then(({ syncedSetIds }) => {
        if (syncedSetIds.length > 0) {
          setLoggedSetIds((prev) => {
            const next = new Set(prev);
            syncedSetIds.forEach((id) => next.add(id));
            return next;
          });
        }
      });
    }
  }, [accessToken, drainQueue]);

  useEffect(() => {
    const unsub = onConnectivityChange(handleOnline);

    // Also listen to browser online/offline events as early detection
    const onBrowserOnline = () => handleOnline(true);
    const onBrowserOffline = () => setServerReachableState(false);
    window.addEventListener('online', onBrowserOnline);
    window.addEventListener('offline', onBrowserOffline);

    return () => {
      unsub();
      window.removeEventListener('online', onBrowserOnline);
      window.removeEventListener('offline', onBrowserOffline);
    };
  }, [handleOnline]);

  // On mount, drain any leftover queue from a previous session.
  // Also poll every 10s while there are pending items, since stopping/starting
  // the backend doesn't trigger browser online/offline events.
  useEffect(() => {
    if (accessToken && hasPending()) {
      drainQueue(accessToken);
    }

    const interval = setInterval(() => {
      if (accessToken && hasPending()) {
        drainQueue(accessToken).then(({ syncedSetIds }) => {
          if (syncedSetIds.length > 0) {
            setServerReachableState(true);
            setLoggedSetIds((prev) => {
              const next = new Set(prev);
              syncedSetIds.forEach((id) => next.add(id));
              return next;
            });
          }
        });
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [accessToken]);

  // Initialize input values when session data loads (merge, don't overwrite edits)
  useEffect(() => {
    if (session) {
      setInputValues((prev) => {
        const currentSetIds = new Set(session.workout_sets.map(s => s.id));
        const next: SetInputValues = {};
        // Keep existing edits for sets that still exist
        for (const id of Object.keys(prev).map(Number)) {
          if (currentSetIds.has(id)) {
            next[id] = prev[id];
          }
        }
        // Add entries for new sets only
        session.workout_sets.forEach((set) => {
          if (!(set.id in next)) {
            next[set.id] = {
              weight: set.weight.toString(),
              reps: set.reps.toString(),
            };
          }
        });
        return next;
      });
      // First sighting of a set (e.g. just added) fixes its saved baseline.
      // Later session updates are keystroke mirrors and must not move it.
      session.workout_sets.forEach((set) => {
        if (!(set.id in savedValuesRef.current)) {
          savedValuesRef.current[set.id] = { weight: set.weight, reps: set.reps };
        }
      });
    }
  }, [session]);

  // Close exercise menu on click outside
  useEffect(() => {
    if (!showExerciseMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowExerciseMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExerciseMenu]);

  // Load exercises when picker opens
  useEffect(() => {
    if (!showExercisePicker || !accessToken) return;
    getExercises({ limit: 500 }, accessToken)
      .then(setAvailableExercises)
      .catch((err) => console.error('Error loading exercises:', err));
  }, [showExercisePicker, accessToken]);

  const futureWeeksNotice = (count: number | null | undefined, verb: string) => {
    if (!count) return;
    setNotice(`Also ${verb} in the next ${count} ${count === 1 ? 'week' : 'weeks'} of this day.`);
  };

  const handleRemoveExercise = async (exerciseId: number) => {
    if (!accessToken || !session) return;
    if (!confirm('Remove this exercise from this workout and the rest of the block?')) return;
    try {
      const updated = await removeExercise(session.id, exerciseId, accessToken);
      // Clean up stale IDs for removed sets
      const updatedSetIds = new Set(updated.workout_sets.map(s => s.id));
      setLoggedSetIds(prev => {
        const next = new Set<number>();
        prev.forEach(id => { if (updatedSetIds.has(id)) next.add(id); });
        return next;
      });
      setSession(updated);
      futureWeeksNotice(updated.future_sessions_updated, 'removed');
      setShowExerciseMenu(null);
    } catch (err: any) {
      console.error('Error removing exercise:', err);
      setError(err?.detail || 'Could not remove that exercise. Please try again.');
    }
  };

  const handleOpenSwap = (exerciseId: number) => {
    setSwapTargetExerciseId(exerciseId);
    setShowExercisePicker('swap');
    setExerciseSearch('');
    setShowExerciseMenu(null);
  };

  const handleOpenAdd = () => {
    setShowExercisePicker('add');
    setExerciseSearch('');
  };

  const handleAddSet = async (exerciseId: number) => {
    if (!accessToken || !session) return;
    try {
      const updated = await addSetToExercise(session.id, exerciseId, accessToken);
      setSession(updated);
    } catch (err: any) {
      console.error('Error adding set:', err);
      setError(err?.detail || 'Could not add a set. Please try again.');
    }
  };

  const handleRemoveSet = async (exerciseId: number) => {
    if (!accessToken || !session) return;
    try {
      const updated = await removeSetFromExercise(session.id, exerciseId, accessToken);
      // Clean up stale IDs for removed sets
      const updatedSetIds = new Set(updated.workout_sets.map(s => s.id));
      setLoggedSetIds(prev => {
        const next = new Set<number>();
        prev.forEach(id => { if (updatedSetIds.has(id)) next.add(id); });
        return next;
      });
      setSession(updated);
    } catch (err: any) {
      console.error('Error removing set:', err);
      setError(err?.detail || 'Could not remove that set. Please try again.');
    }
  };

  const handleExercisePickerSelect = async (newExerciseId: number) => {
    if (!accessToken || !session) return;
    try {
      let updated: WorkoutSession;
      if (showExercisePicker === 'swap' && swapTargetExerciseId !== null) {
        updated = await swapExercise(session.id, swapTargetExerciseId, newExerciseId, accessToken);

        // The swap reuses the same set rows with the performance cleared, so
        // the old exercise's checkmarks, typed numbers and any queued offline
        // saves have to go with it — otherwise the new exercise looks already
        // logged and gets stored as 0 x 0.
        const swappedSetIds = updated.workout_sets
          .filter((s) => s.exercise_id === newExerciseId)
          .map((s) => s.id);
        setLoggedSetIds((prev) => {
          const next = new Set(prev);
          swappedSetIds.forEach((id) => next.delete(id));
          return next;
        });
        setInputValues((prev) => {
          const next = { ...prev };
          swappedSetIds.forEach((id) => {
            const swappedSet = updated.workout_sets.find((s) => s.id === id);
            next[id] = {
              weight: (swappedSet?.weight ?? 0).toString(),
              reps: (swappedSet?.reps ?? 0).toString(),
            };
          });
          return next;
        });
        swappedSetIds.forEach((id) => removeForSet(session.id, id));
        futureWeeksNotice(updated.future_sessions_updated, 'swapped');
      } else {
        updated = await addExercise(session.id, newExerciseId, accessToken);
        futureWeeksNotice(updated.future_sessions_updated, 'added');
      }
      setSession(updated);
    } catch (err: any) {
      const msg = err?.detail || 'Could not update that exercise. Please try again.';
      alert(msg);
      console.error('Error in exercise picker:', err);
    } finally {
      setShowExercisePicker(null);
      setSwapTargetExerciseId(null);
    }
  };

  const loadWorkoutSession = async () => {
    if (!accessToken || !sessionId) return;

    // Two overlapping loads (finishing a workout, then picking another from
    // the calendar) could leave the earlier one on screen while the URL said
    // the later one, so every save went to the wrong session.
    const requestedSessionId = sessionId;
    const isStale = () => requestedSessionId !== latestSessionRequestRef.current;
    latestSessionRequestRef.current = requestedSessionId;

    try {
      setLoading(true);
      const sessionData = await getWorkoutSession(parseInt(sessionId), accessToken);
      if (isStale()) return;

      // Load the instance and its sessions before committing any of it. Showing
      // the new session next to the previous one's instance pointed "Complete
      // Workout" and "End Mesocycle" at the wrong mesocycle entirely.
      const instanceData = await getMesocycleInstance(sessionData.mesocycle_instance_id, accessToken);
      if (isStale()) return;
      const sessions = await listWorkoutSessions(
        { mesocycle_instance_id: sessionData.mesocycle_instance_id, limit: 500 },
        accessToken
      );
      if (isStale()) return;

      setSession(sessionData);
      setInstance(instanceData);
      setAllSessions(sessions);

      // Sets saved while offline are only in the queue, not on the server yet.
      // Without folding them back in, a reload shows them unlogged at 0 and
      // completing the workout would overwrite the queued values with zeros.
      // Queued clears are the opposite case: the server still holds the old
      // numbers, so the set must show as unlogged despite what the server says.
      const pending = getPendingForSession(sessionData.id);
      const pendingClearIds = new Set(
        pending.filter((item) => item.markLogged === false).map((item) => item.setId)
      );
      setLoggedSetIds(new Set([
        ...sessionData.workout_sets
          .filter(s => (s.skipped || s.weight > 0 || s.reps > 0) && !pendingClearIds.has(s.id))
          .map(s => s.id),
        ...pending.filter((item) => item.markLogged !== false).map((item) => item.setId),
      ]));
      if (pending.length > 0) {
        setInputValues((prev) => {
          const next = { ...prev };
          for (const item of pending) {
            next[item.setId] = {
              weight: String(item.data.weight ?? 0),
              reps: String(item.data.reps ?? 0),
            };
          }
          return next;
        });
      }

      // Baseline for the leave-guard: the last value known to be persisted
      // (server row, or queued offline data). Comparing against the live
      // session is useless — keystrokes are mirrored into it immediately.
      const baseline: Record<number, { weight: number; reps: number }> = {};
      sessionData.workout_sets.forEach((s) => {
        baseline[s.id] = { weight: s.weight, reps: s.reps };
      });
      for (const item of pending) {
        baseline[item.setId] = { weight: item.data.weight ?? 0, reps: item.data.reps ?? 0 };
      }
      savedValuesRef.current = baseline;

      setError(null);
    } catch (err: any) {
      if (isStale()) return;
      setError(
        err?.status === 0
          ? "You're offline, so this workout can't be opened right now."
          : 'Could not load this workout. Please try again.'
      );
      console.error('Error loading workout session:', err);
    } finally {
      if (!isStale()) setLoading(false);
    }
  };

  // Handle local input change (no API call, just update local state)
  const handleInputChange = (setId: number, field: 'weight' | 'reps', value: string) => {
    // Allow empty string (user clearing the field) or valid non-negative numbers
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;

    setInputValues((prev) => ({
      ...prev,
      [setId]: {
        ...prev[setId],
        [field]: value,
      },
    }));

    // A queued offline save holds the old numbers. Left in the queue it would
    // drain later, overwrite what was just typed, and mark the set saved again.
    if (session) removeForSet(session.id, setId);

    // Editing a saved set clears its check to show the change is unsaved. The
    // server keeps the last saved value until the user saves again — zeroing it
    // here would throw away real data the moment they touch the field.
    if (loggedSetIds.has(setId)) {
      setLoggedSetIds((prev) => {
        const next = new Set(prev);
        next.delete(setId);
        return next;
      });
    }

    // Also update local session state for immediate UI feedback
    if (session) {
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          workout_sets: prev.workout_sets.map((set) =>
            set.id === setId
              ? { ...set, [field]: parseFloat(value) || 0 }
              : set
          ),
        };
      });
    }
  };

  // Clean up display value on blur (no server call)
  const handleInputBlur = useCallback((setId: number, field: 'weight' | 'reps') => {
    const rawValue = inputValues[setId]?.[field];
    if (rawValue === undefined) return;

    let numValue = Math.max(0, parseFloat(rawValue) || 0);
    if (field === 'reps') numValue = Math.floor(numValue);

    // Update the displayed value to the cleaned number
    const displayValue = numValue.toString();
    if (rawValue !== displayValue) {
      setInputValues((prev) => ({
        ...prev,
        [setId]: { ...prev[setId], [field]: displayValue },
      }));
    }
  }, [inputValues]);

  // Get the display value for an input (prefer local state, fall back to session data)
  const getInputValue = (setId: number, field: 'weight' | 'reps'): string => {
    if (inputValues[setId]?.[field] !== undefined) {
      return inputValues[setId][field];
    }
    const set = session?.workout_sets.find((s) => s.id === setId);
    return set ? set[field].toString() : '0';
  };

  // Save a single set to the server
  const handleLogSet = async (setId: number) => {
    if (!accessToken || !session) return;
    if (savingSetIds.has(setId)) return;

    setSavingSetIds((prev) => new Set(prev).add(setId));

    const weight = Math.max(0, parseFloat(inputValues[setId]?.weight || '0') || 0);
    const reps = Math.floor(Math.max(0, parseFloat(inputValues[setId]?.reps || '0') || 0));

    const setData = { weight, reps, skipped: (weight === 0 && reps === 0) ? 1 : 0 as 0 | 1 };

    try {
      await updateWorkoutSet(session.id, setId, setData, accessToken);
      // Drop any older queued value for this set, or the next drain would
      // overwrite what was just saved with what the user already replaced
      removeForSet(session.id, setId);
      setLoggedSetIds((prev) => new Set(prev).add(setId));
      savedValuesRef.current[setId] = { weight, reps };
    } catch (err: any) {
      if (err?.status === 0) {
        // Network error — queue for later sync
        enqueue(session.id, setId, setData);
        setLoggedSetIds((prev) => new Set(prev).add(setId));
        savedValuesRef.current[setId] = { weight, reps };
      } else {
        console.error('Error logging set:', err);
        setError(err?.detail || 'Could not save that set. Please try again.');
      }
    } finally {
      setSavingSetIds((prev) => {
        const next = new Set(prev);
        next.delete(setId);
        return next;
      });
    }
  };

  // Reset a set on the server (unlog it)
  const handleUnlogSet = async (setId: number) => {
    if (!accessToken || !session) return;

    // Immediately mark as unlogged in UI and remove from offline queue
    remove(`${session.id}:${setId}`);
    setLoggedSetIds((prev) => {
      const next = new Set(prev);
      next.delete(setId);
      return next;
    });

    // Reset local input values and session state
    setInputValues((prev) => ({
      ...prev,
      [setId]: { weight: '0', reps: '0' },
    }));
    savedValuesRef.current[setId] = { weight: 0, reps: 0 };
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        workout_sets: prev.workout_sets.map((s) =>
          s.id === setId ? { ...s, weight: 0, reps: 0 } : s
        ),
      };
    });

    const cleared = { weight: 0, reps: 0, skipped: 0 as 0 | 1 };
    try {
      await updateWorkoutSet(session.id, setId, cleared, accessToken);
    } catch (err: any) {
      if (err?.status === 0) {
        // Offline: queue the clear like a save, or the server keeps the old
        // numbers and the set reappears logged after a reload. markLogged
        // false, so draining it doesn't flip the set back to "saved 0×0".
        enqueue(session.id, setId, cleared, false);
      } else {
        console.error('Error resetting set:', err);
        setError(err?.detail || 'Could not clear that set. Please try again.');
      }
    }
  };

  // Auto-dismiss completion banner
  useEffect(() => {
    if (!completionBanner) return;
    const timer = setTimeout(() => setCompletionBanner(null), 2000);
    return () => clearTimeout(timer);
  }, [completionBanner]);

  const handleCompleteWorkoutClick = async () => {
    if (!session || !accessToken) return;
    // Held for the whole flow, not just the save step: the button used to stay
    // live through the completion request, and a second tap ran a second
    // completion whose navigation raced the first.
    if (completingWorkout) return;
    setCompletingWorkout(true);
    try {
      await runCompleteWorkout();
    } finally {
      setCompletingWorkout(false);
    }
  };

  const runCompleteWorkout = async () => {
    if (!session || !accessToken) return;

    // Try to drain any pending offline saves first
    if (hasPending()) {
      await drainQueue(accessToken);
      if (hasPending()) {
        const proceed = window.confirm(
          'Some sets are saved locally but not yet synced to the server. ' +
          'They will sync automatically when you reconnect. Continue completing the workout?'
        );
        if (!proceed) return;
      }
    }

    // Find all unlogged sets
    const unloggedSetIds = session.workout_sets
      .filter(s => !loggedSetIds.has(s.id))
      .map(s => s.id);

    if (unloggedSetIds.length > 0) {
      setSavingSetIds(new Set(unloggedSetIds));

      // allSettled, not all: one failure used to leave every set that did save
      // rendering as unsaved
      const outcomes = await Promise.allSettled(
        unloggedSetIds.map(async (setId) => {
            const weight = Math.max(0, parseFloat(inputValues[setId]?.weight || '0') || 0);
            const reps = Math.floor(Math.max(0, parseFloat(inputValues[setId]?.reps || '0') || 0));
            const setData = { weight, reps, skipped: (weight === 0 && reps === 0) ? 1 : 0 as 0 | 1 };
            try {
              await updateWorkoutSet(session.id, setId, setData, accessToken);
            } catch (err: any) {
              if (err?.status === 0) {
                enqueue(session.id, setId, setData);
              } else {
                throw err;
              }
            }
          })
      );
      setSavingSetIds(new Set());

      const saved = unloggedSetIds.filter((_, i) => outcomes[i].status === 'fulfilled');
      setLoggedSetIds(prev => {
        const next = new Set(prev);
        saved.forEach(id => next.add(id));
        return next;
      });

      if (outcomes.some(o => o.status === 'rejected')) {
        const failure = outcomes.find(o => o.status === 'rejected') as PromiseRejectedResult;
        console.error('Error saving sets:', failure.reason);
        setError('Could not save some sets. Fix them individually, then finish again.');
        return;
      }
    }

    await handleCompleteWorkout();
  };

  const handleCompleteWorkout = async () => {
    if (!accessToken || !session || !instance) return;

    const mesocycle = instance.mesocycle_template;
    if (!mesocycle) return;
    const completedWeek = session.week_number;
    const completedDay = session.day_number;
    const daysPerWeek = instance.template_days_per_week || mesocycle.workout_templates?.length || 0;

    try {
      await updateWorkoutSession(
        session.id,
        { status: 'completed' },
        accessToken
      );

      // Re-fetch sessions to find the next uncompleted workout
      const updatedSessions = await listWorkoutSessions(
        { mesocycle_instance_id: instance.id },
        accessToken
      );

      // Check if all workouts in the mesocycle are now completed. Counted over
      // the deload week as well: without it the block completes as soon as the
      // last training week is done and the recovery week is never reachable.
      const weekSpan =
        instance.total_weeks || (instance.template_weeks || mesocycle.weeks);
      const totalWorkouts = weekSpan * daysPerWeek;
      const completedCount = updatedSessions.filter(s => s.status === 'completed').length;

      if (completedCount >= totalWorkouts) {
        await updateMesocycleInstance(instance.id, { status: 'completed' }, accessToken);
        navigate('/');
        return;
      }

      // Find the next uncompleted session in order
      const nextSession = updatedSessions
        .filter(s => s.status !== 'completed')
        .sort((a, b) => a.week_number - b.week_number || a.day_number - b.day_number)[0];

      if (nextSession) {
        navigate(`/workout/${nextSession.id}`);
      } else {
        navigate('/');
        return;
      }

      // Show the completion banner for the workout we just finished
      setCompletionBanner({ week: completedWeek, day: completedDay });
    } catch (err: any) {
      console.error('Error completing workout:', err);
      setError(err?.detail || 'Could not complete the workout. Your sets are saved — please try again.');
    }
  };

  const getDayLabel = (dayNumber: number): string => {
    return `Day ${dayNumber}`;
  };

  const getSessionStatus = (weekNum: number, dayNum: number): 'completed' | 'in_progress' | 'skipped' | null => {
    const foundSession = allSessions.find(
      s => s.week_number === weekNum && s.day_number === dayNum
    );
    if (!foundSession) return null;
    return foundSession.status;
  };

  const getSessionId = (weekNum: number, dayNum: number): number | null => {
    const foundSession = allSessions.find(
      s => s.week_number === weekNum && s.day_number === dayNum
    );
    return foundSession?.id || null;
  };

  // Typed-but-unsaved numbers only live in inputValues, and loading another
  // session drops every entry that doesn't belong to it. Leaving silently threw
  // the numbers away with nothing on screen to say so. Compared against the
  // saved baseline, not the session — keystrokes mirror into the session
  // immediately, so it always matches what was typed.
  const hasUnsavedInput = (): boolean =>
    !!session &&
    session.workout_sets.some((s) => {
      if (loggedSetIds.has(s.id)) return false;
      const typed = inputValues[s.id];
      const saved = savedValuesRef.current[s.id];
      if (!typed || !saved) return false;
      // Normalize the same way handleLogSet would, so "8" vs "8." never warns
      const weight = Math.max(0, parseFloat(typed.weight || '0') || 0);
      const reps = Math.floor(Math.max(0, parseFloat(typed.reps || '0') || 0));
      return weight !== saved.weight || reps !== saved.reps;
    });

  const handleCalendarCellClick = async (weekNum: number, dayNum: number) => {
    const sessId = getSessionId(weekNum, dayNum);
    if (!sessId || String(sessId) === sessionId) {
      setShowCalendar(false);
      return;
    }
    if (
      hasUnsavedInput() &&
      !confirm('This workout has weights or reps you have not saved yet. Leave anyway and lose them?')
    ) {
      return;
    }
    navigate(`/workout/${sessId}`);
    setShowCalendar(false);
  };

  const getWeightRecommendation = (set: WorkoutSet): string => {
    if (set.weight > 0) return '';

    if (set.target_weight && set.target_weight > 0) {
      // The backend already rounds to the nearest 5; rounding again here made
      // this disagree with the placeholder showing the same target
      return `target: ${set.target_weight} lbs`;
    }

    return '';
  };

  const mesocycle = instance?.mesocycle_template;
  // Week count is taken from the snapshot made when the block started, so
  // later edits to the template cannot resize the calendar under the user.
  // Includes the deload week, so the calendar shows every session that exists
  const instanceWeeks =
    instance?.total_weeks || instance?.template_weeks || mesocycle?.weeks || 0;
  const trainingWeeks = instance?.template_weeks || mesocycle?.weeks || 0;
  const isDeloadWeek = (week: number) => trainingWeeks > 0 && week > trainingWeeks;
  // Day count from the same snapshot as the weeks, so a template edited
  // mid-block cannot change how many workouts this block is thought to have
  const instanceDays =
    instance?.template_days_per_week || mesocycle?.workout_templates?.length || 0;

  // Look up template exercise to get notes.
  // Matched by id, then by order_index — never by array position. The session
  // already records which workout template it came from, and position only
  // happens to equal day_number while the array arrives in plan order.
  const getTemplateExercise = (exerciseId: number) => {
    if (!mesocycle?.workout_templates || !session) return null;
    const templates = mesocycle.workout_templates;
    const template =
      templates.find(wt => wt.id === session.workout_template_id) ||
      templates.find(wt => wt.order_index === session.day_number - 1);
    if (!template) return null;
    return template.exercises.find(e => e.exercise_id === exerciseId) || null;
  };

  // Get the effective notes for an exercise: instance override first, then template
  const getEffectiveNotes = (exerciseId: number): string => {
    const templateExercise = getTemplateExercise(exerciseId);
    if (!templateExercise) return '';
    const instanceNote = instance?.exercise_notes?.[String(templateExercise.id)];
    if (instanceNote !== undefined) return instanceNote;
    return templateExercise.notes || '';
  };

  const handleNotesEdit = (exerciseId: number) => {
    setEditingNotesExerciseId(exerciseId);
    setDraftNotes(getEffectiveNotes(exerciseId));
  };

  const handleNotesSave = async (exerciseId: number) => {
    setEditingNotesExerciseId(null);
    if (!accessToken || !mesocycle || !session || !instance) return;

    const templateExercise = getTemplateExercise(exerciseId);
    if (!templateExercise) return;

    // Skip save if unchanged
    const currentNotes = getEffectiveNotes(exerciseId);
    if (currentNotes === draftNotes) return;

    try {
      const updatedNotes = await updateInstanceExerciseNotes(
        instance.id,
        templateExercise.id,
        draftNotes,
        accessToken
      );
      // Update local instance state so the UI reflects the change
      setInstance(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          exercise_notes: updatedNotes,
        };
      });
    } catch (err: any) {
      console.error('Error updating exercise notes:', err);
      // Reopen the editor with the text still in it — closing on failure made
      // the note the user just typed simply vanish
      setEditingNotesExerciseId(exerciseId);
      setError(err?.detail || 'Could not save that note. Please try again.');
    }
  };

  // Reorder an exercise within its muscle group
  const handleMoveExercise = async (exerciseId: number, direction: 'up' | 'down') => {
    if (!accessToken || !session) return;

    // Find the muscle group for this exercise
    const exerciseSet = session.workout_sets.find(s => s.exercise_id === exerciseId);
    if (!exerciseSet) return;
    const muscleGroup = exerciseSet.exercise?.muscle_group || 'Other';

    // Get unique exercises in this muscle group, sorted by order_index
    const muscleGroupSets = session.workout_sets.filter(
      s => (s.exercise?.muscle_group || 'Other') === muscleGroup
    );
    const seen = new Set<number>();
    const exercises: { id: number; orderIndex: number }[] = [];
    muscleGroupSets.forEach(s => {
      if (!seen.has(s.exercise_id)) {
        seen.add(s.exercise_id);
        exercises.push({ id: s.exercise_id, orderIndex: s.order_index });
      }
    });
    exercises.sort((a, b) => a.orderIndex - b.orderIndex);

    const currentIdx = exercises.findIndex(e => e.id === exerciseId);
    const targetIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1;
    if (targetIdx < 0 || targetIdx >= exercises.length) return;

    const currentOrderIndex = exercises[currentIdx].orderIndex;
    const targetOrderIndex = exercises[targetIdx].orderIndex;
    const targetExerciseId = exercises[targetIdx].id;

    // Swap order_index in local state immediately
    setSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        workout_sets: prev.workout_sets.map(s => {
          if (s.exercise_id === exerciseId) return { ...s, order_index: targetOrderIndex };
          if (s.exercise_id === targetExerciseId) return { ...s, order_index: currentOrderIndex };
          return s;
        }),
      };
    });

    // Update backend for all affected sets
    const setsToUpdate = session.workout_sets.filter(
      s => s.exercise_id === exerciseId || s.exercise_id === targetExerciseId
    );
    try {
      await Promise.all(setsToUpdate.map(s => {
        const newOrderIndex = s.exercise_id === exerciseId ? targetOrderIndex : currentOrderIndex;
        return updateWorkoutSet(session.id, s.id, { order_index: newOrderIndex }, accessToken);
      }));
    } catch (err: any) {
      console.error('Error reordering exercises:', err);
      // These are independent PATCHes, so some have already landed. Only the
      // server knows the real order now — a local rollback would put an order
      // on screen that isn't stored anywhere.
      setError(err?.detail || 'Could not reorder exercises. Please try again.');
      await loadWorkoutSession();
    }
  };

  // Reorder a muscle group (with all its exercises) up or down
  const handleMoveMuscleGroup = async (muscleGroup: string, direction: 'up' | 'down') => {
    if (!accessToken || !session) return;

    // Build sorted list of muscle groups by their minimum order_index
    const mgMap: Record<string, WorkoutSet[]> = {};
    session.workout_sets.forEach(s => {
      const mg = s.exercise?.muscle_group || 'Other';
      if (!mgMap[mg]) mgMap[mg] = [];
      mgMap[mg].push(s);
    });
    const sortedGroups = Object.entries(mgMap)
      .map(([mg, sets]) => ({ mg, minOrder: Math.min(...sets.map(s => s.order_index)), sets }))
      .sort((a, b) => a.minOrder - b.minOrder);

    const currentIdx = sortedGroups.findIndex(g => g.mg === muscleGroup);
    const targetIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1;
    if (targetIdx < 0 || targetIdx >= sortedGroups.length) return;

    // Assign new order_index values: swap positions and reassign sequential indices
    const allGroups = [...sortedGroups];
    [allGroups[currentIdx], allGroups[targetIdx]] = [allGroups[targetIdx], allGroups[currentIdx]];

    // Reassign order_index: group 0 starts at 0, each exercise gets sequential indices
    const updates: { setId: number; newOrderIndex: number }[] = [];
    let nextOrder = 0;
    allGroups.forEach(group => {
      // Get unique exercises sorted by current order_index
      const seen = new Set<number>();
      const exercises: { id: number; orderIndex: number }[] = [];
      group.sets.forEach(s => {
        if (!seen.has(s.exercise_id)) {
          seen.add(s.exercise_id);
          exercises.push({ id: s.exercise_id, orderIndex: s.order_index });
        }
      });
      exercises.sort((a, b) => a.orderIndex - b.orderIndex);

      exercises.forEach(ex => {
        const exSets = group.sets.filter(s => s.exercise_id === ex.id);
        exSets.forEach(s => {
          updates.push({ setId: s.id, newOrderIndex: nextOrder });
        });
        nextOrder += 100;
      });
    });

    // Update local state immediately
    setSession(prev => {
      if (!prev) return prev;
      const updateMap = new Map(updates.map(u => [u.setId, u.newOrderIndex]));
      return {
        ...prev,
        workout_sets: prev.workout_sets.map(s => {
          const newIdx = updateMap.get(s.id);
          return newIdx !== undefined ? { ...s, order_index: newIdx } : s;
        }),
      };
    });

    // Persist to backend - only update sets whose order_index actually changed
    const changedSets = updates.filter(u => {
      const original = session.workout_sets.find(s => s.id === u.setId);
      return original && original.order_index !== u.newOrderIndex;
    });
    try {
      await Promise.all(changedSets.map(u =>
        updateWorkoutSet(session.id, u.setId, { order_index: u.newOrderIndex }, accessToken)
      ));
    } catch (err: any) {
      console.error('Error reordering muscle groups:', err);
      setError(err?.detail || 'Could not reorder muscle groups. Please try again.');
      await loadWorkoutSession();
    }
  };

  // Group exercises by muscle group
  const groupedExercises = session?.workout_sets.reduce((acc, set) => {
    const muscleGroup = set.exercise?.muscle_group || 'Other';
    if (!acc[muscleGroup]) {
      acc[muscleGroup] = [];
    }
    acc[muscleGroup].push(set);
    return acc;
  }, {} as Record<string, WorkoutSet[]>) || {};

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading workout...</div>
      </div>
    );
  }

  // Only a failure to load at all can replace the screen. A failed save must
  // stay a banner: the user's typed sets live in component state, and swapping
  // the page out for an error message would strand them mid-workout.
  if (!session || !instance || !mesocycle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
        <p className="text-red-400">{error || "This workout could not be opened"}</p>
        <div className="flex gap-3">
          <button
            onClick={() => loadWorkoutSession()}
            className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-5 rounded-lg transition-colors"
          >
            Try again
          </button>
          <button
            onClick={() => navigate("/")}
            className="border border-gray-600 text-gray-300 hover:bg-gray-800 font-medium py-2 px-5 rounded-lg transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-20">
      {error && (
        <div className="bg-red-900/80 border-b border-red-500 px-4 py-3 flex items-start justify-between gap-3">
          <p className="text-sm text-red-100">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-200 hover:text-white text-sm font-medium shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}
      {notice && (
        <div className="bg-teal-900/80 border-b border-teal-500 px-4 py-3 flex items-start justify-between gap-3">
          <p className="text-sm text-teal-100">{notice}</p>
          <button
            onClick={() => setNotice(null)}
            className="text-teal-200 hover:text-white text-sm font-medium shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}
      {/* Header */}
      <div className="bg-gray-800 p-4 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="text-sm text-gray-400 uppercase hover:text-white transition"
            >
              {mesocycle.name}
            </button>
            <h2 className="text-lg font-semibold">
              WEEK {session.week_number} &bull; DAY {session.day_number}
              {isDeloadWeek(session.week_number) && (
                <span className="ml-2 text-xs font-semibold text-teal-300 bg-teal-900/60 px-2 py-0.5 rounded align-middle">
                  DELOAD
                </span>
              )}
            </h2>
          </div>
        </div>
      </div>

      {/* Offline Banner */}
      {!serverReachable && (
        <div className="bg-amber-600 text-white text-center text-sm py-1 px-4">
          Offline — sets will sync when reconnected
        </div>
      )}

      {/* Completion Banner */}
      {completionBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none animate-slide-down">
          <div className="bg-teal-600 text-white px-6 py-3 rounded-b-lg shadow-lg text-center">
            <p className="font-semibold">Week {completionBanner.week}, Day {completionBanner.day} Complete</p>
          </div>
        </div>
      )}

      {/* Calendar Popup */}
      {showCalendar && mesocycle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm text-gray-400 uppercase">Weeks</h3>
              <button
                onClick={() => setShowCalendar(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                {/* Week Headers */}
                <div className="flex gap-2 mb-2">
                  <div className="w-12"></div>
                  {Array.from({ length: instanceWeeks }, (_, i) => i + 1).map(weekNum => (
                    <div key={weekNum} className="flex-1 min-w-[60px] text-center">
                      <div className="text-xs text-gray-400 font-semibold">
                        {`${weekNum}`}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Day Rows - use actual number of workout templates */}
                {Array.from({ length: instanceDays }, (_, i) => i + 1).map(dayNum => (
                  <div key={dayNum} className="flex gap-2 mb-2">
                    {/* Day Label */}
                    <div className="w-12 flex items-center">
                      <span className="text-xs text-gray-400">{getDayLabel(dayNum)}</span>
                    </div>

                    {/* Week Cells */}
                    {Array.from({ length: instanceWeeks }, (_, i) => i + 1).map(weekNum => {
                      const status = getSessionStatus(weekNum, dayNum);
                      const sessId = getSessionId(weekNum, dayNum);
                      const isCurrentSession = sessId === session?.id;

                      return (
                        <div key={weekNum} className="flex-1 min-w-[60px]">
                          <button
                            onClick={() => handleCalendarCellClick(weekNum, dayNum)}
                            className={`w-full py-2 px-3 rounded text-xs font-medium transition-colors ${
                              status === 'completed'
                                ? 'bg-teal-600 text-white hover:bg-teal-700'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 cursor-pointer'
                            } ${
                              isCurrentSession ? 'ring-2 ring-white' : ''
                            }`}
                          >
                            {getDayLabel(dayNum)}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* End Mesocycle Button */}
            <div className="mt-6 pt-4 border-t border-gray-700">
              <button
                onClick={async () => {
                  if (!confirm('Are you sure you want to end this mesocycle? This will mark it as completed.')) return;
                  try {
                    await updateMesocycleInstance(instance.id, { status: 'completed' }, accessToken!);
                    setShowCalendar(false);
                    navigate('/');
                  } catch (err) {
                    console.error('Error ending mesocycle:', err);
                    alert('Failed to end mesocycle');
                  }
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                End Mesocycle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exercises grouped by muscle group */}
      <div className="p-4 space-y-4">
        {Object.entries(groupedExercises)
          .sort((a, b) => {
            const minA = Math.min(...a[1].map(s => s.order_index));
            const minB = Math.min(...b[1].map(s => s.order_index));
            return minA - minB;
          })
          .map(([muscleGroup, sets], mgIdx, mgArr) => {
          // Group sets by exercise id, not by name: two exercises can share a
          // name (a custom one may duplicate a stock one), and merging them
          // into one card made add/remove/swap act on only half of it.
          const exerciseGroups = sets.reduce((acc, set) => {
            const key = String(set.exercise_id);
            if (!acc[key]) {
              acc[key] = [];
            }
            acc[key].push(set);
            return acc;
          }, {} as Record<string, WorkoutSet[]>);

          const isFirstMg = mgIdx === 0;
          const isLastMg = mgIdx === mgArr.length - 1;

          return (
            <div key={muscleGroup}>
              {/* Muscle Group Badge with Reorder */}
              <div className="flex items-center gap-1 mb-2">
                <div className="inline-block bg-teal-600 text-white text-xs font-bold px-3 py-1 rounded">
                  {muscleGroup.toUpperCase()}
                </div>
                {session.status !== 'completed' && mgArr.length > 1 && (
                  <div className="flex gap-0.5">
                    <button
                      onClick={() => handleMoveMuscleGroup(muscleGroup, 'up')}
                      disabled={isFirstMg}
                      className={`p-0.5 ${isFirstMg ? 'text-gray-700' : 'text-gray-400 hover:text-white'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleMoveMuscleGroup(muscleGroup, 'down')}
                      disabled={isLastMg}
                      className={`p-0.5 ${isLastMg ? 'text-gray-700' : 'text-gray-400 hover:text-white'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Exercise Cards */}
              {Object.entries(exerciseGroups)
                .sort((a, b) => (a[1][0]?.order_index ?? 0) - (b[1][0]?.order_index ?? 0))
                .map(([exerciseKey, exerciseSets], exIdx, exArr) => {
                const exerciseId = exerciseSets[0]?.exercise_id;
                const exerciseName = exerciseSets[0]?.exercise?.name || "Unknown";
                const isFirstInGroup = exIdx === 0;
                const isLastInGroup = exIdx === exArr.length - 1;
                return (
                <div key={exerciseKey} className="bg-gray-800 rounded-lg mb-3">
                  <div className="flex items-center justify-between p-4 pb-0">
                    <div
                      className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                      onClick={() => toggleExerciseCollapsed(exerciseId)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-4 w-4 text-gray-400 transition-transform flex-shrink-0 ${collapsedExercises.has(exerciseId) ? '' : 'rotate-180'}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                      <div className="min-w-0">
                        <h3 className="font-semibold">{exerciseName}</h3>
                        <p className="text-xs text-gray-400">
                          {exerciseSets[0]?.exercise?.equipment || 'Bodyweight'}
                          {collapsedExercises.has(exerciseId) && ` • ${exerciseSets.length} ${exerciseSets.length === 1 ? 'set' : 'sets'}`}
                        </p>
                      </div>
                    </div>
                    {/* Progress indicator */}
                    {(() => {
                      const loggedCount = exerciseSets.filter(s => loggedSetIds.has(s.id)).length;
                      const totalSets = exerciseSets.length;
                      const allDone = loggedCount === totalSets;
                      return (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${allDone ? 'bg-teal-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                          {allDone ? '✓' : `${loggedCount}/${totalSets}`}
                        </span>
                      );
                    })()}
                    {session.status !== 'completed' && (
                      <div className="flex items-center gap-1">
                        {/* Reorder arrows */}
                        {!isFirstInGroup || !isLastInGroup ? (
                          <div className="flex flex-col">
                            <button
                              onClick={() => handleMoveExercise(exerciseId, 'up')}
                              disabled={isFirstInGroup}
                              className={`p-0.5 ${isFirstInGroup ? 'text-gray-700' : 'text-gray-400 hover:text-white'}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleMoveExercise(exerciseId, 'down')}
                              disabled={isLastInGroup}
                              className={`p-0.5 ${isLastInGroup ? 'text-gray-700' : 'text-gray-400 hover:text-white'}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        ) : null}
                        {/* Three-dot menu */}
                        <div className="relative">
                        <button
                          onClick={() => setShowExerciseMenu(showExerciseMenu === exerciseId ? null : exerciseId)}
                          className="text-gray-400 hover:text-white p-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <circle cx="10" cy="4" r="1.5" />
                            <circle cx="10" cy="10" r="1.5" />
                            <circle cx="10" cy="16" r="1.5" />
                          </svg>
                        </button>
                        {showExerciseMenu === exerciseId && (
                          <div ref={menuRef} className="absolute right-0 top-8 bg-gray-700 rounded-lg shadow-lg z-20 py-1 min-w-[160px]">
                            <button
                              onClick={() => handleOpenSwap(exerciseId)}
                              className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600"
                            >
                              Swap Exercise
                            </button>
                            <button
                              onClick={() => handleRemoveExercise(exerciseId)}
                              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-600"
                            >
                              Remove Exercise
                            </button>
                          </div>
                        )}
                      </div>
                      </div>
                    )}
                  </div>

                  {/* Exercise Notes (always visible) */}
                  <div className="px-4 pb-2">
                    {mesocycle && (() => {
                      const templateExercise = getTemplateExercise(exerciseId);
                      if (!templateExercise) return null;
                      const isEditing = editingNotesExerciseId === exerciseId;
                      const notes = getEffectiveNotes(exerciseId);

                      if (isEditing) {
                        return (
                          <input
                            type="text"
                            value={draftNotes}
                            onChange={(e) => setDraftNotes(e.target.value)}
                            onBlur={() => handleNotesSave(exerciseId)}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            className="mt-1 w-full bg-gray-700 text-gray-300 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-500"
                            placeholder="Add notes..."
                            autoFocus
                          />
                        );
                      }

                      if (notes) {
                        return (
                          <p
                            onClick={() => session.status !== 'completed' && handleNotesEdit(exerciseId)}
                            className={`text-xs text-gray-500 italic mt-1 ${session.status !== 'completed' ? 'cursor-pointer hover:text-gray-300' : ''}`}
                          >
                            {notes}
                          </p>
                        );
                      }

                      if (session.status !== 'completed') {
                        return (
                          <button
                            onClick={() => handleNotesEdit(exerciseId)}
                            className="text-xs text-gray-600 hover:text-gray-400 mt-1"
                          >
                            + add note
                          </button>
                        );
                      }

                      return null;
                    })()}
                  </div>

                  {/* Collapsible content */}
                  {!collapsedExercises.has(exerciseId) && (<div className="px-4 pb-4">
                  {/* Column Headers */}
                  <div className="grid grid-cols-12 gap-1 sm:gap-2 text-xs text-gray-400 mb-2">
                    <div className="col-span-1"></div>
                    <div className="col-span-4 text-center">WEIGHT <button onClick={() => setShowWeightInfo(true)} className="text-gray-400 hover:text-white">ⓘ</button></div>
                    <div className="col-span-4 text-center">REPS <button onClick={() => setShowInfo(true)} className="text-gray-400 hover:text-white">ⓘ</button></div>
                    <div className="col-span-3 text-center">SAVE <button onClick={() => setShowLogInfo(true)} className="text-gray-400 hover:text-white">ⓘ</button></div>
                  </div>

                  {/* Sets */}
                  {exerciseSets.sort((a, b) => a.set_number - b.set_number).map((set) => {
                    const recommendation = getWeightRecommendation(set);
                    const isSaving = savingSetIds.has(set.id);
                    const isLogged = loggedSetIds.has(set.id);
                    const isPending = session ? getPendingSetIds(session.id).has(set.id) : false;
                    return (
                      <div key={set.id} className="mb-3">
                        <div className="grid grid-cols-12 gap-1 sm:gap-2 items-start">
                          <div className="col-span-1 text-gray-500 pt-2">&#8942;</div>

                          <div className="col-span-4">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={getInputValue(set.id, 'weight')}
                              onChange={(e) => handleInputChange(set.id, 'weight', e.target.value)}
                              onFocus={(e) => e.target.select()}
                              onBlur={() => handleInputBlur(set.id, 'weight')}
                              className="w-full bg-gray-700 text-white text-center rounded py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                              placeholder={set.target_weight ? set.target_weight.toString() : "0"}
                            />
                            {recommendation && (
                              <div className="text-xs text-teal-400 text-center mt-1">
                                {recommendation}
                              </div>
                            )}
                          </div>

                          <div className="col-span-4">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={getInputValue(set.id, 'reps')}
                              onChange={(e) => handleInputChange(set.id, 'reps', e.target.value)}
                              onFocus={(e) => e.target.select()}
                              onBlur={() => handleInputBlur(set.id, 'reps')}
                              className="w-full bg-gray-700 text-white text-center rounded py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                              placeholder={set.target_reps ? set.target_reps.toString() : "0"}
                            />
                            {set.reps === 0 && (() => {
                              // Prefer the RIR stored on the set: that is the plan the
                              // backend generated, and recomputing it here can disagree.
                              const weekRir =
                                set.target_rir ?? computeTargetRir(session.week_number, trainingWeeks);
                              return (
                                <div className="text-xs text-teal-400 text-center mt-1">
                                  {set.target_reps
                                    ? `target: ${set.target_reps} reps at ${weekRir} RIR`
                                    : `target: 6-15 reps at ${weekRir} RIR`}
                                </div>
                              );
                            })()}
                          </div>

                          <div className="col-span-3 flex justify-center pt-1">
                            {isSaving ? (
                              <div className="w-8 h-8 flex items-center justify-center">
                                <svg className="animate-spin h-5 w-5 text-teal-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              </div>
                            ) : isLogged && isPending ? (
                              <button
                                onClick={() => handleUnlogSet(set.id)}
                                className="w-8 h-8 rounded bg-amber-500 border-2 border-amber-500 flex items-center justify-center text-white hover:bg-amber-600 transition-colors"
                                title="Saved locally, syncs when online"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </button>
                            ) : isLogged ? (
                              <button
                                onClick={() => handleUnlogSet(set.id)}
                                className="w-8 h-8 rounded bg-teal-500 border-2 border-teal-500 flex items-center justify-center text-white hover:bg-teal-600 transition-colors"
                                title="Clear this set"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleLogSet(set.id)}
                                className="w-8 h-8 rounded border-2 border-gray-600 hover:border-gray-500 flex items-center justify-center transition-colors"
                                title="Save this set"
                              >
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add/Remove Set Controls */}
                  {session.status !== 'completed' && (
                    <div className="border-t border-gray-700 pt-3 flex items-center justify-center gap-4">
                      <button
                        onClick={() => handleRemoveSet(exerciseId)}
                        disabled={exerciseSets.length <= 1}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                          exerciseSets.length <= 1
                            ? 'bg-gray-700 text-gray-600 cursor-not-allowed'
                            : 'bg-gray-700 text-gray-300 hover:bg-red-600 hover:text-white'
                        }`}
                      >
                        −
                      </button>
                      <span className="text-sm text-gray-400">{exerciseSets.length} {exerciseSets.length === 1 ? 'set' : 'sets'}</span>
                      <button
                        onClick={() => handleAddSet(exerciseId)}
                        className="w-8 h-8 rounded-full bg-gray-700 text-gray-300 hover:bg-teal-600 hover:text-white flex items-center justify-center text-sm font-bold transition-colors"
                      >
                        +
                      </button>
                    </div>
                  )}
                  </div>)}
                </div>
              );
              })}
            </div>
          );
        })}

        {/* Add Exercise Button */}
        {session.status !== 'completed' && (
          <button
            onClick={handleOpenAdd}
            className="w-full border-2 border-dashed border-gray-600 rounded-lg py-3 text-gray-400 hover:text-white hover:border-gray-400 transition-colors"
          >
            + Add Exercise
          </button>
        )}
      </div>

      {/* Exercise Picker Modal */}
      {showExercisePicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
                {showExercisePicker === 'swap' ? 'Swap Exercise' : 'Add Exercise'}
              </h3>
              <button
                onClick={() => { setShowExercisePicker(null); setSwapTargetExerciseId(null); }}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              value={exerciseSearch}
              onChange={(e) => setExerciseSearch(e.target.value)}
              placeholder="Search exercises..."
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
              autoFocus
            />

            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {(() => {
                // Filter out exercises already in the session
                const currentExerciseIds = new Set(session.workout_sets.map(s => s.exercise_id));
                const filtered = availableExercises
                  .filter(ex =>
                    !currentExerciseIds.has(ex.id) &&
                    (ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
                     ex.muscle_group.toLowerCase().includes(exerciseSearch.toLowerCase()))
                  );

                // Group by muscle group
                const grouped = filtered.reduce((acc, ex) => {
                  acc[ex.muscle_group] = acc[ex.muscle_group] || [];
                  acc[ex.muscle_group].push(ex);
                  return acc;
                }, {} as Record<string, Exercise[]>);

                if (Object.keys(grouped).length === 0) {
                  return <p className="text-gray-400 text-sm text-center py-4">No exercises found</p>;
                }

                return Object.entries(grouped).map(([group, exercises]) => (
                  <div key={group}>
                    <div className="text-xs text-gray-500 font-semibold uppercase px-2 py-1 sticky top-0 bg-gray-800">
                      {group}
                    </div>
                    {exercises.map(ex => (
                      <button
                        key={ex.id}
                        onClick={() => handleExercisePickerSelect(ex.id)}
                        className="w-full text-left px-3 py-2 rounded hover:bg-gray-700 transition-colors"
                      >
                        <span className="text-white text-sm">{ex.name}</span>
                        {ex.equipment && (
                          <span className="text-gray-500 text-xs ml-2">{ex.equipment}</span>
                        )}
                      </button>
                    ))}
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Weight Info Modal */}
      {showWeightInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Weight Guide</h3>
              <button
                onClick={() => setShowWeightInfo(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm text-gray-300">
              <div>
                <p className="font-medium text-white mb-1">Picking a Weight</p>
                <p>Choose a weight where you can complete your target reps with the shown RIR (Reps In Reserve) — that's how many more reps you <span className="italic">could</span> have done.</p>
              </div>

              <div>
                <p className="font-medium text-white mb-1">What is RIR?</p>
                <p>3 RIR = stop when you think you can do only 3 more reps at the end of your set. 0 RIR = you couldn't do another rep. The RIR target steps down over the block, so you gradually push harder.</p>
              </div>

              <div>
                <p className="font-medium text-white mb-1">Rest Between Sets</p>
                <p>No timer here on purpose. Rest until you feel ready to give your next set full effort. That's usually 2-4 minutes for big lifts, 1-2 for smaller ones.</p>
              </div>
            </div>

            <button
              onClick={() => setShowWeightInfo(false)}
              className="w-full mt-5 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 rounded-lg"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Reps Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Reps Guide</h3>
              <button
                onClick={() => setShowInfo(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm text-gray-300">
              <div>
                <p className="font-medium text-white mb-1">Rep Range</p>
                <p>Aim for 6-15 reps per set for muscle growth. If you can do more than 15, go heavier. If you can't hit 6, go lighter.</p>
              </div>

              <div>
                <p className="font-medium text-white mb-1">What is RIR?</p>
                <p>3 RIR = stop when you think you can do only 3 more reps at the end of your set. 0 RIR = you couldn't do another rep. The RIR target steps down over the block, so you gradually push harder.</p>
              </div>

              <div>
                <p className="font-medium text-white mb-1">Rest Between Sets</p>
                <p>No timer here on purpose. Rest until you feel ready to give your next set full effort. That's usually 2-4 minutes for big lifts, 1-2 for smaller ones.</p>
              </div>
            </div>

            <button
              onClick={() => setShowInfo(false)}
              className="w-full mt-5 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 rounded-lg"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Log Info Modal */}
      {showLogInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Saving Sets</h3>
              <button
                onClick={() => setShowLogInfo(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm text-gray-300">
              <p>Tap the square to save your weight and reps to the server.</p>
              <p>A teal checkmark means the set is saved. Editing weight or reps clears the checkmark so you can re-save.</p>
              <p>Tapping "Complete Workout" auto-saves any remaining unsaved sets before finishing.</p>
            </div>

            <button
              onClick={() => setShowLogInfo(false)}
              className="w-full mt-5 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 rounded-lg"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Complete Workout Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 p-4 shadow-lg">
        <button
          onClick={handleCompleteWorkoutClick}
          disabled={completingWorkout}
          className={`w-full text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 ${
            completingWorkout
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-teal-600 hover:bg-teal-700'
          }`}
        >
          {completingWorkout && (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {completingWorkout ? 'Saving Sets...' : 'Complete Workout'}
        </button>
      </div>
    </div>
  );
}
