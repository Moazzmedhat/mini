import { RoomDTO, PlayerInputFrame, GameSnapshot, CombatEvent, ScoreboardEntry } from './types.js';

export const EVENTS = {
  // Room events
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_READY: 'room:ready',
  ROOM_SETTINGS: 'room:settings',
  ROOM_STATE: 'room:state',
  ROOM_ERROR: 'room:error',

  // Match lifecycle
  MATCH_START: 'match:start',
  MATCH_COUNTDOWN: 'match:countdown',
  MATCH_END: 'match:end',

  // Gameplay
  INPUT_FRAME: 'input:frame',
  GAME_SNAPSHOT: 'game:snapshot',
  COMBAT_EVENT: 'combat:event',
  WEAPON_SWITCH: 'weapon:switch',
  WEAPON_RELOAD: 'weapon:reload',

  // Latency
  PING: 'ping:req',
  PONG: 'ping:res',
} as const;

export interface RoomCreatePayload {
  callsign: string;
  color?: string;
  skin?: string;
  mapId?: string;
  roundTimeSec?: number;
}

export interface RoomJoinPayload {
  code: string;
  callsign: string;
  color?: string;
  skin?: string;
}

export interface RoomReadyPayload {
  ready: boolean;
}

export interface RoomSettingsPayload {
  mapId?: string;
  roundTimeSec?: number;
}

export interface MatchCountdownPayload {
  seconds: number;
}

export interface MatchEndPayload {
  winnerId: string;
  winnerName: string;
  scoreboard: ScoreboardEntry[];
}
