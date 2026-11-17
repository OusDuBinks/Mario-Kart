export function HUD({ speedKmh }) {
  return (
    <>
      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white p-4 rounded-xl border border-white/15 shadow-lg">
        <h1 className="font-bold text-lg tracking-wide text-amber-400">
          KART PROTOTYPE
        </h1>
        <ul className="text-xs text-gray-200 mt-2 space-y-1">
          <li>
            <span className="font-semibold text-white">Z / W / ↑</span> : Accélérer
          </li>
          <li>
            <span className="font-semibold text-white">S / ↓</span> : Freiner / Reculer
          </li>
          <li>
            <span className="font-semibold text-white">Q / D / ← →</span> : Tourner
          </li>
          <li>
            <span className="font-semibold text-white">R</span> : Replacer sur la piste
          </li>
        </ul>
      </div>

      <div className="absolute bottom-6 right-6 bg-black/70 backdrop-blur-md text-white px-6 py-3 rounded-2xl border border-white/15 shadow-xl flex items-baseline gap-2">
        <span className="text-4xl font-black italic tracking-tighter text-amber-400">
          {speedKmh}
        </span>
        <span className="text-xs font-bold uppercase text-gray-300">km/h</span>
      </div>
    </>
  );
}