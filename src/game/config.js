export const KART_CONFIG = {
  MAX_SPEED: 36,
  MAX_REVERSE: -14,
  ACCELERATION: 26,
  BRAKING: 40,
  FRICTION: 14,
  TURN_SPEED: 2.2,

  // Paramètres du circuit et des surfaces
  TRACK_HALF_WIDTH: 8.5,     // Largeur de l'asphalte (8.5m de chaque côté du centre)
  WALL_HALF_WIDTH: 14.0,     // Distance des glissières (laisse 5.5m d'herbe pour couper)
  OFFROAD_SPEED_MULT: 0.52,  // Vitesse max dans l'herbe (52% sans boost)
  TOTAL_LAPS: 3,

  // Paramètres de dérapage authentique (Mario Kart)
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
};