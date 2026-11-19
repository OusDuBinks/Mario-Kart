import { useEffect, useRef, useState } from 'react';
import { ALL_ITEMS, ITEM_MAP } from '../../game/config';

const STRIP_ITEMS = [...ALL_ITEMS, ...ALL_ITEMS];

export function ItemSlot({ slot, slotNumber, isPrimary = true }) {
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
    const wasRolling = prevStatusRef.current === 'rolling';
    prevStatusRef.current = status;

    if (wasRolling && status === 'ready') {
      setJustLocked(true);
      const timer = setTimeout(() => setJustLocked(false), 420);
      return () => clearTimeout(timer);
    }
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