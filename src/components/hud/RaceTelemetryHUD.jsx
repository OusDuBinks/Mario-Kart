import { formatTime } from '../../utils/formatters';

export function RaceTelemetryHUD({
  lap = 1,
  totalLaps = 3,
  raceTime = 0,
  currentLapTime = 0,
  bestLapTime = null,
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2.5">
        <div className="bg-black/75 backdrop-blur-md text-white px-4 py-2.5 rounded-xl border border-white/20 shadow-lg text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Tour
          </div>
          <div className="text-2xl font-black text-amber-400">
            {lap} <span className="text-sm text-gray-300">/ {totalLaps}</span>
          </div>
        </div>

        <div className="bg-black/75 backdrop-blur-md text-white px-4 py-2.5 rounded-xl border border-white/20 shadow-lg text-center min-w-[130px]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Temps Total
          </div>
          <div className="text-2xl font-mono font-bold text-white">
            {formatTime(raceTime)}
          </div>
        </div>
      </div>

      <div className="flex justify-between bg-black/65 backdrop-blur-md text-white px-3.5 py-1.5 rounded-xl border border-white/15 text-xs font-mono">
        <span>
          <span className="text-gray-400 font-sans">Tour : </span>
          {formatTime(currentLapTime)}
        </span>
        <span className="text-emerald-300">
          <span className="text-gray-400 font-sans">Record : </span>
          {formatTime(bestLapTime)}
        </span>
      </div>
    </div>
  );
}