import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { RoomManager } from '../server/src/rooms/RoomManager.js';
import { setupSocketHandlers } from '../server/src/networking/socketHandler.js';
import { EVENTS, RoomDTO, GameSnapshot } from '@jetpack-arena/shared';

describe('Multiplayer Integration (2 Clients)', () => {
  let httpServer: any;
  let serverIo: Server;
  let roomManager: RoomManager;
  let port: number;

  let clientA: ClientSocketType;
  let clientB: ClientSocketType;

  beforeAll(async () => {
    httpServer = createServer();
    serverIo = new Server(httpServer);
    roomManager = new RoomManager(serverIo);
    setupSocketHandlers(serverIo, roomManager);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        port = httpServer.address().port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (clientA) clientA.disconnect();
    if (clientB) clientB.disconnect();
    if (serverIo) serverIo.close();
    if (httpServer) httpServer.close();
  });

  it('connects 2 clients, creates room, joins, and verifies shared room state', async () => {
    const serverUrl = `http://localhost:${port}`;

    clientA = ClientSocket(serverUrl, { reconnection: false });
    clientB = ClientSocket(serverUrl, { reconnection: false });

    await new Promise<void>((resolve) => {
      let connected = 0;
      const onConnect = () => {
        connected++;
        if (connected === 2) resolve();
      };
      clientA.on('connect', onConnect);
      clientB.on('connect', onConnect);
    });

    // Client A creates room
    const roomStatePromiseA = new Promise<RoomDTO>((resolve) => {
      clientA.once(EVENTS.ROOM_STATE, (data: { room: RoomDTO }) => {
        resolve(data.room);
      });
    });

    clientA.emit(EVENTS.ROOM_CREATE, { callsign: 'Striker', color: '#22c55e' });
    const initialRoom = await roomStatePromiseA;

    expect(initialRoom.code).toHaveLength(5);
    expect(initialRoom.players).toHaveLength(1);
    expect(initialRoom.players[0].name).toBe('Striker');

    // Client B joins room with code
    const roomStatePromiseB = new Promise<RoomDTO>((resolve) => {
      clientB.once(EVENTS.ROOM_STATE, (data: { room: RoomDTO }) => {
        resolve(data.room);
      });
    });

    clientB.emit(EVENTS.ROOM_JOIN, {
      code: initialRoom.code,
      callsign: 'Phantom',
      color: '#3b82f6',
    });

    const updatedRoom = await roomStatePromiseB;
    expect(updatedRoom.code).toBe(initialRoom.code);
    expect(updatedRoom.players).toHaveLength(2);
    expect(updatedRoom.players.some((p) => p.name === 'Phantom')).toBe(true);
  });
});
