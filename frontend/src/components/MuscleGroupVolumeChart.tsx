/**
 * Bar chart of weekly set totals for one muscle group.
 * Weeks along the x-axis, sets on the y-axis.
 */

interface MuscleGroupVolumeChartProps {
  muscleGroup: string;
  weeklySets: number[];
}

export default function MuscleGroupVolumeChart({ muscleGroup, weeklySets }: MuscleGroupVolumeChartProps) {
  const max = Math.max(...weeklySets, 1);

  return (
    <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-white mb-3">{muscleGroup}</h4>
      <div className="flex items-end gap-1.5 h-28">
        {weeklySets.map((sets, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
            <span className="text-[10px] text-gray-300 mb-0.5">{sets}</span>
            <div
              className="w-full bg-teal-500 rounded-t"
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
