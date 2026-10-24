import { Server, Socket } from 'socket.io';
import { Room } from './Room.js';

// Safe characters omitting 0, O, 1, I, L
const SAFE_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export class RoomManager {
  private io: Server;
  public rooms = new Map<string, Room>();
  public socketToRoom = new Map<string, string>();
  private maxRooms = 200;

  constructor(io: Server) {
    this.io = io;
  }

  public generateRoomCode(): string {
    let attempts = 0;
    while (attempts < 1000) {
      let code = '';
      for (let i = 0; i < 5; i++) {
        const randomIndex = Math.floor(Math.random() * SAFE_CODE_CHARS.length);
        code += SAFE_CODE_CHARS[randomIndex];
      }
      if (!this.rooms.has(code)) {
        return code;
      }
      attempts++;
    }
    throw new Error('Failed to generate unique room code. System busy.');
  }

  public createRoom(
    socket: Socket,
    hostName: string,
    hostColor = '#22c55e',
    hostSkin = 'soldier',
    mapId = 'outpost_delta',
    roundTimeSec = 180
  ): Room {
    // If socket is already in a room, leave first
    this.leaveRoom(socket);

    if (this.rooms.size >= this.maxRooms) {
      throw new Error('Server room limit reached. Please try again later.');
    }

    const code = this.generateRoomCode();
    const room = new Room(code, socket, hostName, hostColor, hostSkin, this.io, 8, mapId, roundTimeSec);
    room.onDestroy = (c) => this.rooms.delete(c);

    this.rooms.set(code, room);
    this.socketToRoom.set(socket.id, code);

    return room;
  }

  public joinRoom(socket: Socket, code: string, callsign: string, color = '#3b82f6', skin = 'soldier'): Room {
    this.leaveRoom(socket);

    const upperCode = code.toUpperCase().trim();
    const room = this.rooms.get(upperCode);

    if (!room) {
      throw new Error(`Room "${upperCode}" does not exist.`);
    }

    if (room.members.size >= room.maxPlayers) {
      throw new Error(`Room "${upperCode}" is already full.`);
    }

    const added = room.addMember(socket, callsign, color, skin);
    if (!added) {
      throw new Error(`Could not join room "${upperCode}".`);
    }

    this.socketToRoom.set(socket.id, upperCode);
    return room;
  }

  public leaveRoom(socket: Socket): void {
    const code = this.socketToRoom.get(socket.id);
    if (!code) return;

    this.socketToRoom.delete(socket.id);
    const room = this.rooms.get(code);
    if (room) {
      room.removeMember(socket.id);
      if (room.members.size === 0) {
        room.destroy();
        this.rooms.delete(code);
      }
    }
  }

  public getRoomBySocket(socketId: string): Room | undefined {
    const code = this.socketToRoom.get(socketId);
    if (!code) return undefined;
    return this.rooms.get(code);
  }

  public getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase().trim());
  }
}
