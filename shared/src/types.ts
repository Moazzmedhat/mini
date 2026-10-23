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
}

export interface PlayerState {
  id: string;
  name: string;
  color: string;
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
  isDead: boolean;
  respawnTimerMs: number;
  spawnProtected: boolean;
  spawnProtectTimerMs: number;
  kills: number;
  deaths: number;
  score: number;
  pingMs?: number;
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
  players: PlayerSummary[];
  countdownRemaining?: number;
  matchTimeRemaining?: number;
  winnerId?: string;
  winnerName?: string;
}

export type CombatEventType = 'hit' | 'kill' | 'respawn' | 'reload' | 'suicide' | 'explosion';

export interface CombatEvent {
  id: string;
  type: CombatEventType;
  attackerId?: string;
  attackerName?: string;
  victimId: string;
  victimName?: string;
  weaponType?: WeaponType;
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
}

export interface ScoreboardEntry {
  id: string;
  name: string;
  color: string;
  kills: number;
  deaths: number;
  score: number;
}
