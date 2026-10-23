export const TICK_RATE = 30;
export const TICK_INTERVAL_MS = 1000 / TICK_RATE;
export const TICK_DELTA_SEC = 1 / TICK_RATE;

export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 1300;
export const DEATH_Y = 1250;

export const PLAYER_WIDTH = 34;
export const PLAYER_HEIGHT = 50;

export const PHYSICS = {
  GRAVITY: 980,
  RUN_SPEED: 280,
  GROUND_ACCELERATION: 1600,
  AIR_ACCELERATION: 1100,
  GROUND_DECELERATION: 2000,
  AIR_DECELERATION: 600,
  JUMP_IMPULSE: -430,
  BOOST_THRUST: -1500,
  MAX_UPWARD_VELOCITY: -460,
  MAX_FALL_VELOCITY: 850,
};

export const FUEL = {
  MAX: 100,
  DRAIN_PER_SEC: 36,
  RECHARGE_PER_SEC: 32,
  RECHARGE_DELAY_MS: 300,
};

export const COMBAT = {
  MAX_HEALTH: 100,
  RESPAWN_DELAY_MS: 3000,
  SPAWN_PROTECTION_MS: 2500,
  SCORE_TARGET: 15,
  ROUND_TIME_SEC: 180,
  COUNTDOWN_SEC: 3,
};

export type WeaponType = 'rifle' | 'shotgun' | 'rocket';

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
    fireCooldownMs: 130, // ~7.7 rps
    speed: 1200,
    maxDistance: 1400,
    magazineSize: 30,
    reloadTimeMs: 1200,
    pelletCount: 1,
    spreadAngle: 0.04, // radians (~2.3 deg)
    projectileRadius: 3.5,
    splashRadius: 0,
  },
  shotgun: {
    id: 'shotgun',
    name: 'Spread Cannon',
    damage: 9, // 5 pellets * 9 = 45 max
    fireCooldownMs: 650,
    speed: 950,
    maxDistance: 750,
    magazineSize: 6,
    reloadTimeMs: 1500,
    pelletCount: 5,
    spreadAngle: 0.22, // cone spread
    projectileRadius: 3,
    splashRadius: 0,
  },
  rocket: {
    id: 'rocket',
    name: 'Plasma Rocket',
    damage: 65,
    fireCooldownMs: 1000,
    speed: 650,
    maxDistance: 1600,
    magazineSize: 3,
    reloadTimeMs: 2000,
    pelletCount: 1,
    spreadAngle: 0,
    projectileRadius: 6,
    splashRadius: 85,
  },
};
