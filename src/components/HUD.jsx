export function HUD({ speedKmh = 0, driftLevel = 0, isBoosting = false }) {
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
            <span className="font-semibold text-amber-300">Espace</span> : Sauter / Déraper
          </li>
          <li>
            <span className="font-semibold text-white">R</span> : Replacer sur la piste
          </li>
        </ul>
      </div>

      {/* Indicateur visuel de charge de dérapage */}
      {driftLevel > 0 && !isBoosting && (
        <div
          className={`absolute bottom-24 right-6 px-4 py-1.5 rounded-full font-black text-xs uppercase tracking-wider shadow-lg animate-pulse ${
            driftLevel === 2
              ? 'bg-orange-500 text-white'
              : 'bg-sky-400 text-slate-950'
          }`}
        >
          {driftLevel === 2 ? 'Super Mini-Turbo Prêt !' : 'Mini-Turbo Prêt'}
        </div>
      )}

      {/* Compteur de vitesse */}
      <div
        className={`absolute bottom-6 right-6 backdrop-blur-md text-white px-6 py-3 rounded-2xl border shadow-xl flex items-baseline gap-2 transition-transform duration-150 ${
          isBoosting
            ? 'bg-amber-500/80 border-amber-200 scale-110'
            : 'bg-black/70 border-white/15 scale-100'
        }`}
      >
        <span
          className={`text-4xl font-black italic tracking-tighter ${
            isBoosting ? 'text-white' : 'text-amber-400'
          }`}
        >
          {speedKmh}
        </span>
        <span className="text-xs font-bold uppercase text-gray-200">km/h</span>
      </div>
    </>
  );
}