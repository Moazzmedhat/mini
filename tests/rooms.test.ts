import { describe, it, expect, beforeEach } from 'vitest';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { RoomManager } from '../server/src/rooms/RoomManager.js';

describe('RoomManager & Room Lifecycle', () => {
  let io: Server;
  let roomManager: RoomManager;

  beforeEach(() => {
    const httpServer = createServer();
    io = new Server(httpServer);
    roomManager = new RoomManager(io);
  });

  it('generates 5-character uppercase codes without ambiguous letters', () => {
    for (let i = 0; i < 50; i++) {
      const code = roomManager.generateRoomCode();
      expect(code).toHaveLength(5);
      expect(code).not.toMatch(/[01OIL]/);
    }
  });

  it('creates a room with the creator as host', () => {
    const mockSocket: any = { id: 'sock_1', join: () => {}, leave: () => {}, emit: () => {} };
    const room = roomManager.createRoom(mockSocket, 'Viper');

    expect(room.hostId).toBe('sock_1');
    expect(room.members.size).toBe(1);
    expect(room.status).toBe('waiting');
    expect(roomManager.getRoom(room.code)).toBe(room);
  });

  it('allows a second player to join with the code', () => {
    const hostSocket: any = { id: 'host_1', join: () => {}, leave: () => {}, emit: () => {} };
    const guestSocket: any = { id: 'guest_1', join: () => {}, leave: () => {}, emit: () => {} };

    const room = roomManager.createRoom(hostSocket, 'HostPilot');
    const joinedRoom = roomManager.joinRoom(guestSocket, room.code, 'GuestPilot');

    expect(joinedRoom.code).toBe(room.code);
    expect(joinedRoom.members.size).toBe(2);
    expect(joinedRoom.members.get('guest_1')?.name).toBe('GuestPilot');
  });

  it('enforces maximum capacity limit', () => {
    const hostSocket: any = { id: 'host_1', join: () => {}, leave: () => {}, emit: () => {} };
    const room = roomManager.createRoom(hostSocket, 'HostPilot');
    room.maxPlayers = 2;

    const guest1: any = { id: 'guest_1', join: () => {}, leave: () => {}, emit: () => {} };
    const guest2: any = { id: 'guest_2', join: () => {}, leave: () => {}, emit: () => {} };

    roomManager.joinRoom(guest1, room.code, 'Guest1');

    expect(() => {
      roomManager.joinRoom(guest2, room.code, 'Guest2');
    }).toThrow(/full/i);

    expect(room.members.size).toBe(2);
  });

  it('migrates host to next player when host leaves', () => {
    const hostSocket: any = { id: 'host_1', join: () => {}, leave: () => {}, emit: () => {} };
    const guestSocket: any = { id: 'guest_1', join: () => {}, leave: () => {}, emit: () => {} };

    const room = roomManager.createRoom(hostSocket, 'Host');
    roomManager.joinRoom(guestSocket, room.code, 'Guest');

    expect(room.hostId).toBe('host_1');
    roomManager.leaveRoom(hostSocket);

    expect(room.members.size).toBe(1);
    expect(room.hostId).toBe('guest_1');
  });

  it('destroys room when all members leave', () => {
    const hostSocket: any = { id: 'host_1', join: () => {}, leave: () => {}, emit: () => {} };
    const room = roomManager.createRoom(hostSocket, 'Solo');
    const code = room.code;

    expect(roomManager.rooms.has(code)).toBe(true);
    roomManager.leaveRoom(hostSocket);

    expect(roomManager.rooms.has(code)).toBe(false);
  });
});
