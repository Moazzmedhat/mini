import { Server, Socket } from 'socket.io';
import {
  RoomDTO,
  RoomStatus,
  PlayerSummary,
  ScoreboardEntry,
  EVENTS,
  TICK_INTERVAL_MS,
  COMBAT,
  ALL_MAPS,
} from '@jetpack-arena/shared';
import { GameSimulation } from '../game/GameSimulation.js';

export interface RoomMember {
  socket: Socket;
  id: string;
  name: string;
  color: string;
  skin: string;
  isReady: boolean;
  pingMs: number;
}

export class Room {
  public code: string;
  public hostId: string;
  public status: RoomStatus = 'waiting';
  public maxPlayers: number;
  public mapId = 'outpost_delta';
  public roundTimeSec: number = COMBAT.DEFAULT_ROUND_TIME_SEC;
  public members = new Map<string, RoomMember>();
  public simulation: GameSimulation;

  private io: Server;
  private tickInterval: NodeJS.Timeout | null = null;
  private countdownTimer: NodeJS.Timeout | null = null;
  private countdownRemaining = COMBAT.COUNTDOWN_SEC;

  // Track room destruction callback
  public onDestroy?: (code: string) => void;

  constructor(
    code: string,
    hostSocket: Socket,
    hostName: string,
    hostColor: string,
    hostSkin: string,
    io: Server,
    maxPlayers = 8,
    mapId = 'outpost_delta',
    roundTimeSec = COMBAT.DEFAULT_ROUND_TIME_SEC
  ) {
    this.code = code;
    this.hostId = hostSocket.id;
    this.maxPlayers = maxPlayers;
    this.mapId = mapId;
    this.roundTimeSec = roundTimeSec;
    this.io = io;
    this.simulation = new GameSimulation(mapId, roundTimeSec);

    this.addMember(hostSocket, hostName, hostColor, hostSkin);
  }

  public setSettings(mapId?: string, roundTimeSec?: number): void {
    if (this.status !== 'waiting') return;
    if (mapId && ALL_MAPS[mapId]) {
      this.mapId = mapId;
    }
    if (roundTimeSec !== undefined && roundTimeSec >= 0) {
      this.roundTimeSec = roundTimeSec;
    }
    this.simulation.setSettings(this.mapId, this.roundTimeSec);
    this.broadcastState();
  }

  public addMember(socket: Socket, name: string, color: string, skin = 'soldier'): boolean {
    if (this.members.size >= this.maxPlayers) {
      return false;
    }

    const member: RoomMember = {
      socket,
      id: socket.id,
      name,
      color,
      skin: skin || 'soldier',
      isReady: socket.id === this.hostId, // Host is ready by default
      pingMs: 0,
    };

    this.members.set(socket.id, member);
    socket.join(this.code);

    // Add to simulation
    this.simulation.addPlayer(socket.id, name, color, skin);

    this.broadcastState();
    return true;
  }

  public removeMember(socketId: string): void {
    const member = this.members.get(socketId);
    if (!member) return;

    member.socket.leave(this.code);
    this.members.delete(socketId);
    this.simulation.removePlayer(socketId);

    // If host left, elect new host or close
    if (this.hostId === socketId) {
      const nextMember = this.members.values().next().value;
      if (nextMember) {
        this.hostId = nextMember.id;
        nextMember.isReady = true;
      } else {
        this.destroy();
        return;
      }
    }

    if (this.members.size === 0) {
      this.destroy();
      return;
    }

    this.broadcastState();
  }

  public setReady(socketId: string, ready: boolean): void {
    const member = this.members.get(socketId);
    if (!member) return;
    member.isReady = ready;
    this.broadcastState();
  }

  public startCountdown(): boolean {
    if (this.status !== 'waiting') return false;

    this.status = 'starting';
    this.countdownRemaining = COMBAT.COUNTDOWN_SEC;
    this.broadcastState();

    this.countdownTimer = setInterval(() => {
      this.countdownRemaining--;
      this.io.to(this.code).emit(EVENTS.MATCH_COUNTDOWN, { seconds: this.countdownRemaining });

      if (this.countdownRemaining <= 0) {
        if (this.countdownTimer) clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        this.beginMatch();
      }
    }, 1000);

    return true;
  }

  private beginMatch(): void {
    this.status = 'playing';
    this.simulation.startMatch();
    this.broadcastState();

    // Start simulation tick loop
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.tickInterval = setInterval(() => {
      this.tick();
    }, TICK_INTERVAL_MS);
  }

  private tick(): void {
    this.simulation.update();

    // Broadcast snapshot to all room members
    const snapshot = this.simulation.getSnapshot();
    this.io.to(this.code).emit(EVENTS.GAME_SNAPSHOT, snapshot);

    // Flush & broadcast combat events
    const events = this.simulation.flushEvents();
    for (const ev of events) {
      this.io.to(this.code).emit(EVENTS.COMBAT_EVENT, ev);
    }

    // Check if match ended
    if (this.simulation.isMatchOver && this.status === 'playing') {
      this.endMatch();
    }
  }

  private endMatch(): void {
    this.status = 'ended';
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    const scoreboard: ScoreboardEntry[] = Array.from(this.members.values()).map((m) => {
      const p = this.simulation.players.get(m.id);
      return {
        id: m.id,
        name: m.name,
        color: m.color,
        skin: m.skin,
        kills: p?.kills || 0,
        deaths: p?.deaths || 0,
        score: p?.score || 0,
      };
    });

    scoreboard.sort((a, b) => b.score - a.score);

    this.io.to(this.code).emit(EVENTS.MATCH_END, {
      winnerId: this.simulation.winnerId || scoreboard[0]?.id || '',
      winnerName: this.simulation.winnerName || scoreboard[0]?.name || 'Unknown',
      scoreboard,
    });

    this.broadcastState();
  }

  public toDTO(): RoomDTO {
    const players: PlayerSummary[] = Array.from(this.members.values()).map((m) => {
      const p = this.simulation.players.get(m.id);
      return {
        id: m.id,
        name: m.name,
        color: m.color,
        skin: m.skin,
        isHost: m.id === this.hostId,
        isReady: m.isReady,
        kills: p?.kills || 0,
        deaths: p?.deaths || 0,
        score: p?.score || 0,
        pingMs: m.pingMs,
      };
    });

    return {
      code: this.code,
      hostId: this.hostId,
      status: this.status,
      maxPlayers: this.maxPlayers,
      mapId: this.mapId,
      roundTimeSec: this.roundTimeSec,
      players,
      countdownRemaining: this.countdownRemaining,
      matchTimeRemaining: Math.ceil(this.simulation.matchTimeRemaining),
      winnerId: this.simulation.winnerId || undefined,
      winnerName: this.simulation.winnerName || undefined,
    };
  }

  public broadcastState(): void {
    this.io.to(this.code).emit(EVENTS.ROOM_STATE, { room: this.toDTO() });
  }

  public destroy(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    if (this.onDestroy) {
      this.onDestroy(this.code);
    }
  }
}
