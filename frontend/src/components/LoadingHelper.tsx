/**
 * What goes on the bar, and how to get there.
 *
 * Both were arithmetic the lifter was doing in their head at the rack.
 */

import { BAR_WEIGHT, computePlateLoading, computeWarmupSets } from '../utils/loading';
import { weightUnitLabel, type WeightUnit } from '../utils/units';

interface LoadingHelperProps {
  weight: number;
  unit: WeightUnit;
  exerciseName: string;
  onClose: () => void;
}

export default function LoadingHelper({
  weight,
  unit,
  exerciseName,
  onClose,
}: LoadingHelperProps) {
  const label = weightUnitLabel(unit);
  const loading = computePlateLoading(weight, unit);
  const warmups = computeWarmupSets(weight, unit);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-sm w-full max-h-[85vh] overflow-y-auto">
        <div className="p-5">
          <h3 className="text-lg font-semibold text-white">
            {weight} {label}
          </h3>
          <p className="text-xs text-gray-400 mb-4">{exerciseName}</p>

          {/* Plates */}
          <div className="mb-5">
            <h4 className="text-sm font-medium text-white mb-2">Each side of the bar</h4>
            {loading.belowBar ? (
              <p className="text-sm text-gray-400">
                Below the {BAR_WEIGHT[unit]} {label} bar. This will be dumbbells, a
                machine, or the bar on its own.
              </p>
            ) : loading.perSide.length === 0 ? (
              <p className="text-sm text-gray-400">Empty bar.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {loading.perSide.map(({ plate, count }) => (
                    <span
                      key={plate}
                      className="bg-gray-700 text-white text-sm rounded px-3 py-1.5"
                    >
                      {count} × {plate}
                    </span>
                  ))}
                </div>
                {loading.shortfall !== 0 && (
                  <p className="text-xs text-amber-400 mt-2">
                    Closest is {loading.achievable} {label}, {loading.shortfall} {label} short.
                    No plate combination hits {weight} exactly.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Warmup */}
          <div>
            <h4 className="text-sm font-medium text-white mb-2">Working up</h4>
            {warmups.length === 0 ? (
              <p className="text-sm text-gray-400">Nothing to work up to.</p>
            ) : (
              <div className="space-y-1">
                {warmups.map((set, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm bg-gray-700/50 rounded px-3 py-2"
                  >
                    <span className="text-white">
                      {set.weight} {label}
                    </span>
                    <span className="text-gray-400">
                      × {set.reps}
                      <span className="text-gray-500 ml-2 text-xs">{set.percent}%</span>
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm bg-teal-900/40 border border-teal-700 rounded px-3 py-2">
                  <span className="text-teal-200 font-medium">
                    {weight} {label}
                  </span>
                  <span className="text-teal-300 text-xs">working set</span>
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              A guide, not a prescription. Rest as little as you need between these.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-5 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
