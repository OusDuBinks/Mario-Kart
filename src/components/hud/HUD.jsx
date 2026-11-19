import { formatTime } from '../../utils/formatters';
import { ItemInventoryHUD } from './ItemInventoryHUD';
import { RaceTelemetryHUD } from './RaceTelemetryHUD';

export function HUD({
  speedKmh = 0,
  driftLevel = 0,
  isBoosting = false,
  isStarActive = false,
  isBulletActive = false,
  isOffRoad = false,
  itemSlots = [],
  lap = 1,
  totalLaps = 3,
  raceTime = 0,
  currentLapTime = 0,
  bestLapTime = null,
  lapBanner = null,
  isWrongWay = false,
  isFinished = false,
}) {
  return (
    <>
      {/* Commandes (Haut Gauche) */}
      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white p-4 rounded-xl border border-white/15 shadow-lg">
        <h1 className="font-bold text-lg tracking-wide text-amber-400">
          KART RACING
        </h1>
        <ul className="text-xs text-gray-200 mt-2 space-y-1">
          <li><span className="font-semibold text-white">Z / W / ↑</span> : Accélérer</li>
          <li><span className="font-semibold text-white">S / ↓</span> : Freiner / Reculer</li>
          <li><span className="font-semibold text-white">Q / D / ← →</span> : Tourner</li>
          <li><span className="font-semibold text-amber-300">Espace + Virage</span> : Déraper</li>
          <li><span className="font-semibold text-sky-300">E / Shift</span> : Utiliser l'objet</li>
          <li><span className="font-semibold text-white">R</span> : Recommencer la course</li>
        </ul>
      </div>

      {/* Bloc Haut Droite : Double Inventaire + Tours & Chronos */}
      <div className="absolute top-4 right-4 z-30 flex items-start gap-4">
        <ItemInventoryHUD itemSlots={itemSlots} />
        <RaceTelemetryHUD
          lap={lap}
          totalLaps={totalLaps}
          raceTime={raceTime}
          currentLapTime={currentLapTime}
          bestLapTime={bestLapTime}
        />
      </div>

      {/* Alerte Sens Inverse */}
      {isWrongWay && !isFinished && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-pulse">
          <div className="flex flex-col items-center px-7 py-3 rounded-2xl bg-red-600/95 border-2 border-white text-white shadow-2xl">
            <div className="flex items-center gap-2 text-2xl font-black italic tracking-wider uppercase">
              <span>↩️</span>
              <span>SENS INVERSE !</span>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-red-100 mt-0.5">
              Faites demi-tour
            </span>
          </div>
        </div>
      )}

      {/* Bannière d'annonce de tour */}
      {lapBanner && !isWrongWay && !isFinished && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none animate-bounce">
          <div className="px-8 py-3 rounded-2xl bg-slate-950/90 border-2 border-amber-400 text-3xl font-black italic tracking-wider text-amber-400 shadow-2xl">
            {lapBanner}
          </div>
        </div>
      )}

      {/* Alerte Hors-Piste */}
      {isOffRoad && !isBoosting && !isStarActive && !isBulletActive && !isFinished && (
        <div className="absolute bottom-24 left-6 bg-emerald-950/80 border border-emerald-400/40 text-emerald-300 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
          Hors-piste (Utilisez un boost !)
        </div>
      )}

      {/* Indicateur Mode Fusée */}
      {isBulletActive && !isFinished && (
        <div className="absolute bottom-24 right-6 px-4 py-1.5 rounded-full font-black text-xs uppercase tracking-wider shadow-lg bg-rose-600 text-white animate-pulse">
          🚀 Pilote Automatique Fusée
        </div>
      )}

      {/* Indicateur de charge de dérapage */}
      {driftLevel > 0 && !isBoosting && !isBulletActive && (
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

      {/* Compteur de vitesse (Bas Droite) */}
      <div
        className={`absolute bottom-6 right-6 backdrop-blur-md text-white px-6 py-3 rounded-2xl border shadow-xl flex items-baseline gap-2 transition-transform duration-150 ${
          isBulletActive
            ? 'bg-rose-600/90 border-rose-200 scale-110'
            : isStarActive
            ? 'bg-purple-600/85 border-purple-200 scale-110'
            : isBoosting
            ? 'bg-amber-500/80 border-amber-200 scale-110'
            : 'bg-black/70 border-white/15 scale-100'
        }`}
      >
        <span
          className={`text-4xl font-black italic tracking-tighter ${
            isBoosting || isStarActive || isBulletActive ? 'text-white' : 'text-amber-400'
          }`}
        >
          {speedKmh}
        </span>
        <span className="text-xs font-bold uppercase text-gray-200">km/h</span>
      </div>

      {/* Écran de fin de course */}
      {isFinished && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="bg-slate-900/95 border border-amber-400/50 p-8 rounded-3xl text-center text-white shadow-2xl max-w-sm">
            <div className="text-sm font-bold uppercase tracking-widest text-amber-400">
              Course Terminée !
            </div>
            <div className="text-4xl font-mono font-black my-3">
              {formatTime(raceTime)}
            </div>
            {bestLapTime !== null && (
              <div className="text-xs font-mono text-emerald-300 mb-4">
                Meilleur tour : {formatTime(bestLapTime)}
              </div>
            )}
            <p className="text-xs text-gray-300">
              Appuyez sur <span className="font-bold text-white">R</span> pour rejouer et battre votre record.
            </p>
          </div>
        </div>
      )}
    </>
  );
}