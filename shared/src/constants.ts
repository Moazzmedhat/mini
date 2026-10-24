export const TICK_RATE = 60;
export const TICK_INTERVAL_MS = 1000 / TICK_RATE;
export const TICK_DELTA_SEC = 1 / TICK_RATE;

export const WORLD_WIDTH = 2600;
export const WORLD_HEIGHT = 1400;
export const DEATH_Y = 1350;

export const PLAYER_WIDTH = 34;
export const PLAYER_HEIGHT = 52;

export const PHYSICS = {
  GRAVITY: 980,
  RUN_SPEED: 300,
  GROUND_ACCELERATION: 1800,
  AIR_ACCELERATION: 1200,
  GROUND_DECELERATION: 2200,
  AIR_DECELERATION: 700,
  JUMP_IMPULSE: -450,
  BOOST_THRUST: -2500, // Punchy, responsive jetpack boost
  MAX_UPWARD_VELOCITY: -550,
  MAX_FALL_VELOCITY: 850,
};

export const FUEL = {
  MAX: 100,
  DRAIN_PER_SEC: 32,
  RECHARGE_PER_SEC: 38,
  RECHARGE_DELAY_MS: 200,
};

export const COMBAT = {
  MAX_HEALTH: 100,
  RESPAWN_DELAY_MS: 2500,
  SPAWN_PROTECTION_MS: 2500,
  SCORE_TARGET: 15,
  DEFAULT_ROUND_TIME_SEC: 180, // 3 minutes
  COUNTDOWN_SEC: 3,
};

export type WeaponType = 'rifle' | 'shotgun' | 'rocket' | 'sniper' | 'uzi' | 'pistol';

export interface WeaponConfig {
  id: WeaponType;
  name: string;
  damage: number;
  fireCooldownMs: number;
  speed: number;
  maxDistance: number;
  magazineSize: number;
  reloadTimeMs: number;
  pelletCount: number;
  spreadAngle: number;
  projectileRadius: number;
  splashRadius: number;
}

export const WEAPONS: Record<WeaponType, WeaponConfig> = {
  rifle: {
    id: 'rifle',
    name: 'Pulse Rifle',
    damage: 15,
    fireCooldownMs: 120, // ~8.3 rps
    speed: 1300,
    maxDistance: 1500,
    magazineSize: 30,
    reloadTimeMs: 1200,
    pelletCount: 1,
    spreadAngle: 0.035,
    projectileRadius: 3.5,
    splashRadius: 0,
  },
  shotgun: {
    id: 'shotgun',
    name: 'Spread Cannon',
    damage: 10, // 5 * 10 = 50 max
    fireCooldownMs: 550,
    speed: 1050,
    maxDistance: 800,
    magazineSize: 8,
    reloadTimeMs: 1400,
    pelletCount: 5,
    spreadAngle: 0.22,
    projectileRadius: 3,
    splashRadius: 0,
  },
  rocket: {
    id: 'rocket',
    name: 'Plasma Rocket',
    damage: 70,
    fireCooldownMs: 900,
    speed: 720,
    maxDistance: 1800,
    magazineSize: 3,
    reloadTimeMs: 1800,
    pelletCount: 1,
    spreadAngle: 0,
    projectileRadius: 7,
    splashRadius: 95,
  },
  sniper: {
    id: 'sniper',
    name: 'Beam Sniper',
    damage: 60,
    fireCooldownMs: 800,
    speed: 2000,
    maxDistance: 2400,
    magazineSize: 5,
    reloadTimeMs: 1600,
    pelletCount: 1,
    spreadAngle: 0.005,
    projectileRadius: 4,
    splashRadius: 0,
  },
  uzi: {
    id: 'uzi',
    name: 'Dual SMG',
    damage: 9,
    fireCooldownMs: 70, // ~14 rps rapid shred
    speed: 1200,
    maxDistance: 1100,
    magazineSize: 40,
    reloadTimeMs: 1100,
    pelletCount: 1,
    spreadAngle: 0.06,
    projectileRadius: 3,
    splashRadius: 0,
  },
  pistol: {
    id: 'pistol',
    name: 'Heavy Magnum',
    damage: 24,
    fireCooldownMs: 200,
    speed: 1250,
    maxDistance: 1300,
    magazineSize: 12,
    reloadTimeMs: 1000,
    pelletCount: 1,
    spreadAngle: 0.02,
    projectileRadius: 3.5,
    splashRadius: 0,
  },
};
