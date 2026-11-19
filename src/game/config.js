const deepFreeze = (obj) => {
  Object.keys(obj).forEach((key) => {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      deepFreeze(obj[key]);
    }
  });
  return Object.freeze(obj);
};

export const KART_CONFIG = deepFreeze({
  MAX_SPEED: 36,
  MAX_REVERSE: -14,
  ACCELERATION: 26,
  BRAKING: 40,
  FRICTION: 14,
  TURN_SPEED: 2.2,

  // Circuit et surfaces
  TRACK_HALF_WIDTH: 8.5,
  WALL_HALF_WIDTH: 14.0,
  OFFROAD_SPEED_MULT: 0.52,
  TOTAL_LAPS: 3,

  // Dérapage (Mario Kart)
  MIN_DRIFT_SPEED: 18,
  DRIFT_TURN_NEUTRAL: 1.05,
  DRIFT_TURN_INWARD: 1.75,
  DRIFT_TURN_OUTWARD: 0.28,
  DRIFT_SLIDE_SPEED: 4.5,
  DRIFT_L1_TIME: 1.0,
  DRIFT_L2_TIME: 2.2,
  BOOST_L1_DURATION: 0.9,
  BOOST_L2_DURATION: 1.6,
  BOOST_SPEED_MULT: 1.38,

  // Objets et dalles
  BOOST_PAD_DURATION: 1.1,
  TRIPLE_BOOST_DURATION: 2.7,
  STAR_DURATION: 4.2,
  BULLET_DURATION: 4.5,
  BULLET_SPEED: 58,
  ITEM_BOX_PICKUP_RADIUS: 3.5,
  ITEM_RESPAWN_TIME: 4.0,
  SPINOUT_DURATION: 1.15,
  PROJECTILE_SPEED: 48,
  PROJECTILE_MAX_BOUNCES: 8,
  PROJECTILE_LIFE: 12.0,
});

export const ALL_ITEMS = deepFreeze([
  { key: 'turbo', label: 'Turbo', badge: '🍄', ring: 'border-amber-400 bg-amber-950/90 text-amber-300 shadow-amber-500/40' },
  { key: 'triple_turbo', label: 'Mega x3', badge: '🔥', ring: 'border-orange-400 bg-orange-950/90 text-orange-300 shadow-orange-500/40' },
  { key: 'missile', label: 'Obus', badge: '🟢', ring: 'border-emerald-400 bg-emerald-950/90 text-emerald-300 shadow-emerald-500/40' },
  { key: 'trap', label: 'Piège', badge: '⚠️', ring: 'border-yellow-400 bg-yellow-950/90 text-yellow-300 shadow-yellow-500/40' },
  { key: 'star', label: 'Étoile', badge: '⭐', ring: 'border-purple-400 bg-purple-950/90 text-purple-200 shadow-purple-500/50' },
  { key: 'bullet', label: 'Fusée', badge: '🚀', ring: 'border-rose-500 bg-rose-950/90 text-rose-200 shadow-rose-500/50' },
]);

export const ITEM_MAP = deepFreeze(
  Object.fromEntries(ALL_ITEMS.map((item) => [item.key, item]))
);

export const ALLOWED_ITEM_IDS = Object.freeze(ALL_ITEMS.map((item) => item.key));

// Poids d'apparition selon le classement (1er, Milieu, Dernier)
export const ITEM_WEIGHT_PROFILES = deepFreeze({
  SOLO: { trap: 30, missile: 30, turbo: 22, triple_turbo: 10, star: 5, bullet: 3 },
  FIRST: { trap: 42, missile: 35, turbo: 20, triple_turbo: 3, star: 0, bullet: 0 },
  MID: { trap: 14, missile: 24, turbo: 30, triple_turbo: 20, star: 8, bullet: 4 },
  LAST: { trap: 0, missile: 5, turbo: 10, triple_turbo: 23, star: 28, bullet: 34 },
});