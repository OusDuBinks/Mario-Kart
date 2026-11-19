import { ALL_ITEMS } from '../../game/config';
import { ItemSlot } from './ItemSlot';

export function ItemInventoryHUD({ itemSlots = [] }) {
  return (
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
  );
}