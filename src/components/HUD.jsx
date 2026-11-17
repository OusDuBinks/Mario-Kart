import { useEffect, useRef, useState } from 'react';

function formatTime(seconds) {
  if (seconds === null || seconds === undefined) return '--:--.--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hundredths = Math.floor((seconds % 1) * 100);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}

const ALL_ITEMS = [
  { key: 'turbo', label: 'Turbo', badge: '🍄', ring: 'border-amber-400 bg-amber-950/90 text-amber-300 shadow-amber-500/40' },
  { key: 'triple_turbo', label: 'Mega x3', badge: '🔥', ring: 'border-orange-400 bg-orange-950/90 text-orange-300 shadow-orange-500/40' },
  { key: 'missile', label: 'Obus', badge: '🟢', ring: 'border-emerald-400 bg-emerald-950/90 text-emerald-300 shadow-emerald-500/40' },
  { key: 'trap', label: 'Piège', badge: '⚠️', ring: 'border-yellow-400 bg-yellow-950/90 text-yellow-300 shadow-yellow-500/40' },
  { key: 'star', label: 'Étoile', badge: '⭐', ring: 'border-purple-400 bg-purple-950/90 text-purple-200 shadow-purple-500/50' },
];

const ITEM_MAP = Object.fromEntries(ALL_ITEMS.map((item) => [item.key, item]));
const STRIP_ITEMS = [...ALL_ITEMS, ...ALL_ITEMS];

function ItemSlot({ slot, slotNumber, isPrimary = true }) {
  const reelRef = useRef(null);
  const [justLocked, setJustLocked] = useState(false);
  const prevStatusRef = useRef(slot?.status || 'empty');

  const status = slot?.status || 'empty';
  const itemHeight = isPrimary ? 80 : 64;

  useEffect(() => {
    if (status !== 'rolling') return;

    let frameId;
    let offset = Math.random() * (ALL_ITEMS.length * itemHeight);
    const loopHeight = ALL_ITEMS.length * itemHeight;
    let lastTime = performance.now();

    const spin = (now) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      offset = (offset + 950 * dt) % loopHeight;
      if (reelRef.current) {
        reelRef.current.style.transform = `translate3d(0, -${offset}px, 0)`;
      }
      frameId = requestAnimationFrame(spin);
    };

    frameId = requestAnimationFrame(spin);
    return () => cancelAnimationFrame(frameId);
  }, [status, itemHeight]);

  useEffect(() => {
    if (prevStatusRef.current === 'rolling' && status === 'ready') {
      setJustLocked(true);
      const timer = setTimeout(() => setJustLocked(false), 420);
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = status;
  }, [status]);

  const activeMeta = status === 'ready' && slot?.item ? ITEM_MAP[slot.item] : null;
  const boxSize = isPrimary ? 'w-20 h-20 rounded-2xl' : 'w-16 h-16 rounded-xl';

  return (
    <div className="relative flex flex-col items-center">
      <span
        className={`absolute -top-2 -left-2 z-20 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center border shadow ${
          status === 'ready'
            ? 'bg-amber-400 text-slate-950 border-white'
            : 'bg-slate-700 text-white border-white/40'
        }`}
      >
        {slotNumber}
      </span>

      <div
        className={`${boxSize} relative overflow-hidden backdrop-blur-md border-2 flex items-center justify-center shadow-xl transition-transform duration-150 ${
          status === 'rolling'
            ? 'border-sky-400 bg-slate-950 shadow-sky-400/60 scale-105'
            : activeMeta
            ? `${activeMeta.ring} ${justLocked ? 'scale-110 brightness-150' : 'scale-100'}`
            : 'bg-slate-800/90 border-amber-400/40 text-gray-200'
        }`}
      >
        {justLocked && (
          <div className="absolute inset-0 bg-white/60 animate-ping pointer-events-none z-20" />
        )}

        {status === 'rolling' && (
          <>
            <div ref={reelRef} className="absolute top-0 left-0 w-full will-change-transform">
              {STRIP_ITEMS.map((item, idx) => (
                <div
                  key={`${item.key}-${idx}`}
                  style={{ height: `${itemHeight}px` }}
                  className="w-full flex flex-col items-center justify-center"
                >
                  <span className={`${isPrimary ? 'text-3xl' : 'text-2xl'} leading-none`}>
                    {item.badge}
                  </span>
                  <span className="text-[8px] font-extrabold uppercase tracking-wider text-sky-200 mt-1">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-10" />
            <div className="absolute inset-x-0 bottom-0 h-3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10" />
          </>
        )}

        {status === 'ready' && activeMeta && (
          <div className="flex flex-col items-center justify-center">
            <span className={`${isPrimary ? 'text-3xl' : 'text-2xl'} leading-none drop-shadow`}>
              {activeMeta.badge}
            </span>
            <span className="text-[9px] font-black uppercase tracking-wider mt-1">
              {activeMeta.label}
            </span>
          </div>
        )}

        {status === 'empty' && (
          <div className="flex flex-col items-center justify-center">
            <span className={`${isPrimary ? 'text-2xl' : 'text-lg'} font-black text-amber-300/70`}>
              ?
            </span>
            <span className="text-[8px] font-bold uppercase tracking-wider text-gray-300">
              {isPrimary ? 'Actif' : 'Réserve'}
            </span>
          </div>
        )}
      </div>

      {isPrimary && status === 'ready' && (
        <span className="mt-1.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wide shadow">
          Touche E
        </span>
      )}
    </div>
  );
}

export function HUD({
  speedKmh = 0,
  driftLevel = 0,
  isBoosting = false,
  isStarActive = false,
  isOffRoad = false,
  itemSlots = [],
  lap = 1,
  totalLaps = 3,
  raceTime = 0,
  currentLapTime = 0,
  bestLapTime = null,
  lapBanner = null,
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

      {/* Bloc Haut Droite : Double Inventaire + Tours & Chronomètres */}
      <div className="absolute top-4 right-4 z-30 flex items-start gap-4">
        <div className="flex flex-col items-center bg-slate-950/85 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border-2 border-amber-400/50 shadow-2xl">
          <div className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-2">
            Objets (2 max)
          </div>

          <div className="flex items-center gap-2.5">
            <ItemSlot slot={itemSlots[0]} slotNumber={1} isPrimary={true} />
            <span className="text-amber-400 font-black text-xs">◀</span>
            <ItemSlot slot={itemSlots[1]} slotNumber={2} isPrimary={false} />
          </div>

          <div className="mt-2 flex items-center gap-1.5 bg-white/10 px-2.5 py-0.5 rounded-full text-xs">
            {ALL_ITEMS.map((item) => (
              <span key={item.key} title={item.label}>
                {item.badge}
              </span>
            ))}
          </div>
        </div>

        {/* Tours & Chronos */}
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
      </div>

      {/* Bannière d'annonce de tour au centre de l'écran */}
      {lapBanner && !isFinished && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none animate-bounce">
          <div className="px-8 py-3 rounded-2xl bg-slate-950/90 border-2 border-amber-400 text-3xl font-black italic tracking-wider text-amber-400 shadow-2xl">
            {lapBanner}
          </div>
        </div>
      )}

      {/* Alerte Hors-Piste */}
      {isOffRoad && !isBoosting && !isStarActive && !isFinished && (
        <div className="absolute bottom-24 left-6 bg-emerald-950/80 border border-emerald-400/40 text-emerald-300 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
          Hors-piste (Utilisez un boost !)
        </div>
      )}

      {/* Indicateur de charge de dérapage */}
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

      {/* Compteur de vitesse (Bas Droite) */}
      <div
        className={`absolute bottom-6 right-6 backdrop-blur-md text-white px-6 py-3 rounded-2xl border shadow-xl flex items-baseline gap-2 transition-transform duration-150 ${
          isStarActive
            ? 'bg-purple-600/85 border-purple-200 scale-110'
            : isBoosting
            ? 'bg-amber-500/80 border-amber-200 scale-110'
            : 'bg-black/70 border-white/15 scale-100'
        }`}
      >
        <span
          className={`text-4xl font-black italic tracking-tighter ${
            isBoosting || isStarActive ? 'text-white' : 'text-amber-400'
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
            {bestLapTime && (
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