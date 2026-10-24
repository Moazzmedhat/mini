import { Server, Socket } from 'socket.io';
import {
  EVENTS,
  RoomCreatePayload,
  RoomJoinPayload,
  RoomReadyPayload,
  PlayerInputFrame,
} from '@jetpack-arena/shared';
import { RoomManager } from '../rooms/RoomManager.js';
import { callsignSchema, roomCodeSchema, inputFrameSchema } from '../validation/schemas.js';

interface RateTracker {
  count: number;
  resetAt: number;
}

export function setupSocketHandlers(io: Server, roomManager: RoomManager) {
  const rateLimits = new Map<string, RateTracker>();

  function checkRateLimit(socketId: string, maxPerSecond = 60): boolean {
    const now = Date.now();
    let tracker = rateLimits.get(socketId);
    if (!tracker || now > tracker.resetAt) {
      tracker = { count: 1, resetAt: now + 1000 };
      rateLimits.set(socketId, tracker);
      return true;
    }
    tracker.count++;
    return tracker.count <= maxPerSecond;
  }

  io.on('connection', (socket: Socket) => {
    // 1. Create Room
    socket.on(EVENTS.ROOM_CREATE, (payload: RoomCreatePayload) => {
      try {
        if (!checkRateLimit(socket.id, 5)) {
          socket.emit(EVENTS.ROOM_ERROR, { message: 'Too many requests. Please slow down.' });
          return;
        }

        const callsign = callsignSchema.parse(payload?.callsign || 'Pilot');
        const color = payload?.color || '#22c55e';
        const skin = payload?.skin || 'soldier';
        const mapId = payload?.mapId || 'outpost_delta';
        const roundTimeSec = payload?.roundTimeSec ?? 180;

        const room = roomManager.createRoom(socket, callsign, color, skin, mapId, roundTimeSec);
        socket.emit(EVENTS.ROOM_STATE, { room: room.toDTO() });
      } catch (err: any) {
        socket.emit(EVENTS.ROOM_ERROR, { message: err?.message || 'Failed to create room' });
      }
    });

    // 2. Join Room
    socket.on(EVENTS.ROOM_JOIN, (payload: RoomJoinPayload) => {
      try {
        if (!checkRateLimit(socket.id, 10)) {
          socket.emit(EVENTS.ROOM_ERROR, { message: 'Too many requests. Please slow down.' });
          return;
        }

        const code = roomCodeSchema.parse(payload?.code);
        const callsign = callsignSchema.parse(payload?.callsign || 'Cadet');
        const color = payload?.color || '#3b82f6';
        const skin = payload?.skin || 'player';

        const room = roomManager.joinRoom(socket, code, callsign, color, skin);
        socket.emit(EVENTS.ROOM_STATE, { room: room.toDTO() });
      } catch (err: any) {
        socket.emit(EVENTS.ROOM_ERROR, { message: err?.message || 'Failed to join room' });
      }
    });

    // Room Settings (Host only)
    socket.on(EVENTS.ROOM_SETTINGS, (payload: any) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room || room.hostId !== socket.id) return;
      room.setSettings(payload?.mapId, payload?.roundTimeSec);
    });

    // 3. Ready Toggle
    socket.on(EVENTS.ROOM_READY, (payload: RoomReadyPayload) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) return;
      room.setReady(socket.id, !!payload?.ready);
    });

    // 4. Start Match
    socket.on(EVENTS.MATCH_START, () => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) return;

      // Only host can start match
      if (room.hostId !== socket.id) {
        socket.emit(EVENTS.ROOM_ERROR, { message: 'Only the room host can start the match.' });
        return;
      }

      room.startCountdown();
    });

    // 5. Input Frame
    socket.on(EVENTS.INPUT_FRAME, (input: PlayerInputFrame) => {
      if (!checkRateLimit(socket.id, 65)) {
        return; // drop spam frames
      }

      const room = roomManager.getRoomBySocket(socket.id);
      if (!room || room.status !== 'playing') return;

      const parsed = inputFrameSchema.safeParse(input);
      if (!parsed.success) return;

      room.simulation.receiveInput(socket.id, parsed.data as PlayerInputFrame);
    });

    // 6. Reload Request
    socket.on(EVENTS.WEAPON_RELOAD, () => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room || room.status !== 'playing') return;
      room.simulation.triggerReload(socket.id);
    });

    // 7. Leave Room
    socket.on(EVENTS.ROOM_LEAVE, () => {
      roomManager.leaveRoom(socket);
      socket.emit(EVENTS.ROOM_STATE, { room: null });
    });

    // 8. Ping / Latency
    socket.on(EVENTS.PING, (timestamp: number) => {
      socket.emit(EVENTS.PONG, timestamp);
    });

    // 9. Disconnect
    socket.on('disconnect', () => {
      rateLimits.delete(socket.id);
      roomManager.leaveRoom(socket);
    });
  });
}
