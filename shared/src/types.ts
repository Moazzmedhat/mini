import { WeaponType } from './constants.js';

export interface PlayerInputFrame {
  seq: number;
  moveX: number;     // -1 (left), 0 (none), 1 (right)
  jump: boolean;     // jump button held/pressed
  boost: boolean;    // jetpack boost held
  aimAngle: number;  // radians (-PI to PI)
  fire: boolean;     // fire button held
  weaponType?: WeaponType;
  reload?: boolean;
  throwGrenade?: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  color: string;
  skin: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  boosting: boolean;
  health: number;
  fuel: number;
  aimAngle: number;
  currentWeapon: WeaponType;
  ammo: number;
  isReloading: boolean;
  reloadTimerMs: number;
  grenades: number;
  grenadeCooldownMs: number;
  isDead: boolean;
  respawnTimerMs: number;
  spawnProtected: boolean;
  spawnProtectTimerMs: number;
  kills: number;
  deaths: number;
  score: number;
  pingMs?: number;
}

export interface GrenadeState {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  fuseRemainingMs: number;
}

export interface ProjectileState {
  id: string;
  ownerId: string;
  weaponType: WeaponType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  distanceTraveled: number;
  maxDistance: number;
  radius: number;
  damage: number;
  splashRadius: number;
}

export type RoomStatus = 'waiting' | 'starting' | 'playing' | 'ended';

export interface PlayerSummary {
  id: string;
  name: string;
  color: string;
  skin: string;
  isHost: boolean;
  isReady: boolean;
  kills: number;
  deaths: number;
  score: number;
  pingMs: number;
}

export interface RoomDTO {
  code: string;
  hostId: string;
  status: RoomStatus;
  maxPlayers: number;
  mapId: string;
  roundTimeSec: number;
  players: PlayerSummary[];
  countdownRemaining?: number;
  matchTimeRemaining?: number;
  winnerId?: string;
  winnerName?: string;
}

export type CombatEventType = 'hit' | 'kill' | 'respawn' | 'reload' | 'suicide' | 'explosion' | 'grenade_throw';

export interface CombatEvent {
  id: string;
  type: CombatEventType;
  attackerId?: string;
  attackerName?: string;
  victimId: string;
  victimName?: string;
  weaponType?: WeaponType | 'grenade';
  damage?: number;
  x?: number;
  y?: number;
}

export interface GameSnapshot {
  tick: number;
  timestamp: number;
  matchTimeRemaining: number;
  players: PlayerState[];
  projectiles: ProjectileState[];
  grenades?: GrenadeState[];
}

export interface ScoreboardEntry {
  id: string;
  name: string;
  color: string;
  skin: string;
  kills: number;
  deaths: number;
  score: number;
}
