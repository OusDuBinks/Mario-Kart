import { ALLOWED_ITEM_IDS, ITEM_WEIGHT_PROFILES } from '../config';

const ALLOWED_SET = new Set(ALLOWED_ITEM_IDS);

function computeWeightsForRank(rank, totalRacers) {
  if (totalRacers <= 1) {
    return ITEM_WEIGHT_PROFILES.SOLO;
  }

  // 0.0 = 1er, 0.5 = milieu, 1.0 = dernier
  const ratio = Math.min(1, Math.max(0, (rank - 1) / (totalRacers - 1)));
  const from = ratio <= 0.5 ? ITEM_WEIGHT_PROFILES.FIRST : ITEM_WEIGHT_PROFILES.MID;
  const to = ratio <= 0.5 ? ITEM_WEIGHT_PROFILES.MID : ITEM_WEIGHT_PROFILES.LAST;
  const localT = ratio <= 0.5 ? ratio * 2 : (ratio - 0.5) * 2;

  const weights = {};
  ALLOWED_ITEM_IDS.forEach((id) => {
    weights[id] = from[id] + (to[id] - from[id]) * localT;
  });
  return weights;
}

function pickWeightedItem(rank, totalRacers) {
  const weights = computeWeightsForRank(rank, totalRacers);
  let totalWeight = 0;

  for (const id of ALLOWED_ITEM_IDS) {
    totalWeight += Math.max(0, weights[id] || 0);
  }

  let cursor = Math.random() * totalWeight;
  for (const id of ALLOWED_ITEM_IDS) {
    cursor -= Math.max(0, weights[id] || 0);
    if (cursor <= 0 && ALLOWED_SET.has(id)) {
      return id;
    }
  }
  return 'turbo';
}

export class Inventory {
  constructor() {
    this.reset();
  }

  reset() {
    this.slots = [
      { status: 'empty', item: null, rollTimer: 0, rank: 1, totalRacers: 1 },
      { status: 'empty', item: null, rollTimer: 0, rank: 1, totalRacers: 1 },
    ];
  }

  triggerRoll(count = 1, rank = 1, totalRacers = 1) {
    const safeCount = Math.min(Math.max(1, Math.floor(count)), 2);
    let granted = 0;

    if (this.slots[0].status === 'empty' && granted < safeCount) {
      this.slots[0] = { status: 'rolling', item: null, rollTimer: 1.1, rank, totalRacers };
      granted++;
    }

    if (this.slots[1].status === 'empty' && granted < safeCount) {
      const delay = granted > 0 ? 1.45 : 1.1;
      this.slots[1] = { status: 'rolling', item: null, rollTimer: delay, rank, totalRacers };
      granted++;
    }
  }

  update(delta) {
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (slot.status !== 'rolling') continue;

      slot.rollTimer -= delta;
      if (slot.rollTimer <= 0) {
        const picked = pickWeightedItem(slot.rank, slot.totalRacers);
        if (ALLOWED_SET.has(picked)) {
          slot.status = 'ready';
          slot.item = picked;
          slot.rollTimer = 0;
        }
      }
    }
  }

  consumePrimary() {
    const primary = this.slots[0];
    if (primary.status !== 'ready' || !ALLOWED_SET.has(primary.item)) {
      return null;
    }

    const usedItem = primary.item;
    this.slots[0] = { ...this.slots[1] };
    this.slots[1] = { status: 'empty', item: null, rollTimer: 0, rank: 1, totalRacers: 1 };
    return usedItem;
  }

  getPrimaryVisualKey() {
    const primary = this.slots[0];
    if (primary.status === 'empty') return 'empty';
    if (primary.status === 'rolling') return 'rolling';
    return ALLOWED_SET.has(primary.item) ? primary.item : 'empty';
  }

  getSnapshot() {
    return [
      { status: this.slots[0].status, item: this.slots[0].item },
      { status: this.slots[1].status, item: this.slots[1].item },
    ];
  }
}