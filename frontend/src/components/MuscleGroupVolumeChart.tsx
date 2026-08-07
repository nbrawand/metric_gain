/**
 * Bar chart of weekly set totals for one muscle group.
 * Weeks along the x-axis, sets on the y-axis.
 */

import { ceilingForMuscleGroup } from '../utils/volume';

interface MuscleGroupVolumeChartProps {
  muscleGroup: string;
  weeklySets: number[];
}

export default function MuscleGroupVolumeChart({ muscleGroup, weeklySets }: MuscleGroupVolumeChartProps) {
  const ceiling = ceilingForMuscleGroup(muscleGroup);
  // Keep the ceiling line on the chart even when no week reaches it, so the
  // bars are read against it rather than against their own maximum
  const max = Math.max(...weeklySets, ceiling, 1);
  const exceeds = weeklySets.some((sets) => sets > ceiling);

  return (
    <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h4 className="text-sm font-semibold text-white">{muscleGroup}</h4>
        <span className={`text-[10px] ${exceeds ? 'text-amber-400' : 'text-gray-400'}`}>
          cap ~{ceiling}/wk
        </span>
      </div>
      <div className="relative flex items-end gap-1.5 h-28">
        <div
          className="absolute left-0 right-0 border-t border-dashed border-amber-400/60 pointer-events-none"
          style={{ bottom: `${(ceiling / max) * 100}%` }}
          aria-hidden="true"
        />
        {weeklySets.map((sets, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
            <span
              className={`text-[10px] mb-0.5 ${sets > ceiling ? 'text-amber-300 font-semibold' : 'text-gray-300'}`}
            >
              {sets}
            </span>
            <div
              className={`w-full rounded-t ${sets > ceiling ? 'bg-amber-500' : 'bg-teal-500'}`}
              style={{ height: `${(sets / max) * 100}%`, minHeight: sets > 0 ? '2px' : '0' }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1">
        {weeklySets.map((_, i) => (
          <span key={i} className="flex-1 text-center text-[10px] text-gray-400">
            W{i + 1}
          </span>
        ))}
      </div>
    </div>
  );
}
