import { Socket } from 'socket.io-client';
import { RoomDTO, EVENTS } from '@jetpack-arena/shared';
import { soundManager } from '../audio/SoundSynth.js';

export class LobbyUI {
  private socket: Socket;

  // Screens
  private homeScreen: HTMLElement;
  private roomScreen: HTMLElement;
  private helpModal: HTMLElement;
  private errorToast: HTMLElement;

  // Inputs & buttons
  private callsignInput: HTMLInputElement;
  private roomCodeInput: HTMLInputElement;
  private btnCreate: HTMLButtonElement;
  private btnJoin: HTMLButtonElement;
  private btnLeave: HTMLButtonElement;
  private btnReady: HTMLButtonElement;
  private btnStart: HTMLButtonElement;
  private btnCopyCode: HTMLButtonElement;
  private btnHelp: HTMLButtonElement;
  private btnCloseHelp: HTMLButtonElement;
  private btnMute: HTMLButtonElement;

  // Displays
  private displayRoomCode: HTMLElement;
  private playerList: HTMLElement;
  private roomStatusText: HTMLElement;

  private selectedColor: string = '#22c55e';
  private currentRoom: RoomDTO | null = null;
  private isReady: boolean = false;

  public onMatchStart?: () => void;

  constructor(socket: Socket) {
    this.socket = socket;

    this.homeScreen = document.getElementById('home-screen')!;
    this.roomScreen = document.getElementById('room-screen')!;
    this.helpModal = document.getElementById('help-modal')!;
    this.errorToast = document.getElementById('error-toast')!;

    this.callsignInput = document.getElementById('input-callsign') as HTMLInputElement;
    this.roomCodeInput = document.getElementById('input-room-code') as HTMLInputElement;
    this.btnCreate = document.getElementById('btn-create-room') as HTMLButtonElement;
    this.btnJoin = document.getElementById('btn-join-room') as HTMLButtonElement;
    this.btnLeave = document.getElementById('btn-leave-room') as HTMLButtonElement;
    this.btnReady = document.getElementById('btn-ready-toggle') as HTMLButtonElement;
    this.btnStart = document.getElementById('btn-start-match') as HTMLButtonElement;
    this.btnCopyCode = document.getElementById('btn-copy-code') as HTMLButtonElement;
    this.btnHelp = document.getElementById('btn-help-open') as HTMLButtonElement;
    this.btnCloseHelp = document.getElementById('btn-help-close') as HTMLButtonElement;
    this.btnMute = document.getElementById('btn-mute-toggle') as HTMLButtonElement;

    this.displayRoomCode = document.getElementById('display-room-code')!;
    this.playerList = document.getElementById('room-player-list')!;
    this.roomStatusText = document.getElementById('room-status-text')!;

    this.init();
  }

  private init(): void {
    // Restore saved callsign
    const savedName = localStorage.getItem('jetpack_arena_callsign');
    if (savedName) {
      this.callsignInput.value = savedName;
    } else {
      this.callsignInput.value = `Pilot_${Math.floor(100 + Math.random() * 900)}`;
    }

    // Check URL query parameters for ?room=ABCDE
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
      this.roomCodeInput.value = roomParam.toUpperCase().slice(0, 5);
    }

    // Color options
    document.querySelectorAll('.color-choice').forEach((elem) => {
      elem.addEventListener('click', () => {
        document.querySelectorAll('.color-choice').forEach((c) => c.classList.remove('selected'));
        elem.classList.add('selected');
        this.selectedColor = (elem as HTMLElement).dataset.color || '#22c55e';
      });
    });

    // Create Room
    this.btnCreate.addEventListener('click', () => {
      soundManager.unlock();
      const callsign = this.getSanitizedCallsign();
      this.socket.emit(EVENTS.ROOM_CREATE, { callsign, color: this.selectedColor });
    });

    // Join Room
    this.btnJoin.addEventListener('click', () => {
      soundManager.unlock();
      const callsign = this.getSanitizedCallsign();
      const code = this.roomCodeInput.value.trim().toUpperCase();
      if (code.length !== 5) {
        this.showError('Please enter a valid 5-letter room code.');
        return;
      }
      this.socket.emit(EVENTS.ROOM_JOIN, { code, callsign, color: this.selectedColor });
    });

    // Leave Room
    this.btnLeave.addEventListener('click', () => {
      this.socket.emit(EVENTS.ROOM_LEAVE);
      this.currentRoom = null;
      this.showHomeScreen();
    });

    // Ready Toggle
    this.btnReady.addEventListener('click', () => {
      this.isReady = !this.isReady;
      this.btnReady.textContent = this.isReady ? 'UNREADY' : 'READY UP';
      this.btnReady.classList.toggle('btn-success', this.isReady);
      this.socket.emit(EVENTS.ROOM_READY, { ready: this.isReady });
    });

    // Start Match
    this.btnStart.addEventListener('click', () => {
      this.socket.emit(EVENTS.MATCH_START);
    });

    // Copy Code / Share Link
    this.btnCopyCode.addEventListener('click', () => {
      if (!this.currentRoom) return;
      const shareUrl = `${window.location.origin}${window.location.pathname}?room=${this.currentRoom.code}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        this.btnCopyCode.textContent = 'COPIED LINK!';
        setTimeout(() => (this.btnCopyCode.textContent = 'SHARE LINK'), 2000);
      });
    });

    // Help Modal
    this.btnHelp.addEventListener('click', () => {
      this.helpModal.style.display = 'flex';
    });
    this.btnCloseHelp.addEventListener('click', () => {
      this.helpModal.style.display = 'none';
    });

    // Mute Toggle
    this.btnMute.addEventListener('click', () => {
      const muted = soundManager.toggleMute();
      this.btnMute.textContent = muted ? '🔇 SOUND OFF' : '🔊 SOUND ON';
    });
    this.btnMute.textContent = soundManager.getMuted() ? '🔇 SOUND OFF' : '🔊 SOUND ON';

    // Socket state listener
    this.socket.on(EVENTS.ROOM_STATE, (data: { room: RoomDTO | null }) => {
      if (data.room) {
        this.updateRoom(data.room);
      } else {
        this.showHomeScreen();
      }
    });

    this.socket.on(EVENTS.ROOM_ERROR, (err: { message: string }) => {
      this.showError(err.message);
    });
  }

  private getSanitizedCallsign(): string {
    let name = this.callsignInput.value.trim().slice(0, 16);
    if (!name) name = 'Pilot';
    localStorage.setItem('jetpack_arena_callsign', name);
    return name;
  }

  public updateRoom(room: RoomDTO): void {
    this.currentRoom = room;

    if (room.status === 'playing') {
      // Hide all lobby menus during active match
      this.homeScreen.style.display = 'none';
      this.roomScreen.style.display = 'none';
      if (this.onMatchStart) {
        this.onMatchStart();
      }
      return;
    }

    this.homeScreen.style.display = 'none';
    this.roomScreen.style.display = 'flex';

    this.displayRoomCode.textContent = room.code;
    this.roomStatusText.textContent =
      room.status === 'starting' ? `MATCH STARTING IN ${room.countdownRemaining}s...` : 'LOBBY WAITING';

    // Render player list
    this.playerList.innerHTML = '';
    room.players.forEach((p) => {
      const item = document.createElement('div');
      item.className = 'player-list-item';
      const isYou = p.id === this.socket.id;
      item.innerHTML = `
        <div class="player-item-left">
          <div class="player-color-dot" style="background:${p.color}"></div>
          <span class="player-name">${this.escape(p.name)} ${isYou ? '<span class="you-badge">(YOU)</span>' : ''}</span>
          ${p.isHost ? '<span class="host-badge">HOST</span>' : ''}
        </div>
        <div class="player-item-right">
          <span class="ready-badge ${p.isReady ? 'ready' : 'not-ready'}">
            ${p.isReady ? 'READY' : 'WAITING'}
          </span>
        </div>
      `;
      this.playerList.appendChild(item);
    });

    // Host controls
    const isHost = room.hostId === this.socket.id;
    if (isHost) {
      this.btnStart.style.display = 'block';
      this.btnReady.style.display = 'none'; // Host is automatically ready
    } else {
      this.btnStart.style.display = 'none';
      this.btnReady.style.display = 'block';
    }
  }

  public showHomeScreen(): void {
    this.homeScreen.style.display = 'flex';
    this.roomScreen.style.display = 'none';
  }

  public showError(msg: string): void {
    this.errorToast.textContent = msg;
    this.errorToast.style.display = 'block';
    setTimeout(() => {
      this.errorToast.style.display = 'none';
    }, 4000);
  }

  private escape(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
