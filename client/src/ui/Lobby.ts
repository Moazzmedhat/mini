import { Socket } from 'socket.io-client';
import { RoomDTO, EVENTS, ALL_MAPS } from '@jetpack-arena/shared';
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

  // Map & time selectors
  private mapSelect!: HTMLSelectElement;
  private timeSelect!: HTMLSelectElement;
  private settingsRow!: HTMLElement;
  private settingsDisplay!: HTMLElement;

  // Displays
  private displayRoomCode: HTMLElement;
  private playerList: HTMLElement;
  private roomStatusText: HTMLElement;

  private selectedColor: string = '#22c55e';
  private selectedSkin: string = 'soldier';
  private currentRoom: RoomDTO | null = null;
  private isReady: boolean = false;

  public onMatchStart?: () => void;
  public onMapChange?: (mapId: string) => void;

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

    this.mapSelect = document.getElementById('select-map') as HTMLSelectElement;
    this.timeSelect = document.getElementById('select-round-time') as HTMLSelectElement;
    this.settingsRow = document.getElementById('room-host-settings')!;
    this.settingsDisplay = document.getElementById('room-settings-display')!;

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

    // Restore saved skin
    const savedSkin = localStorage.getItem('jetpack_arena_skin');
    if (savedSkin) {
      this.selectedSkin = savedSkin;
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

    // Skin options
    document.querySelectorAll('.skin-choice').forEach((elem) => {
      const skinKey = (elem as HTMLElement).dataset.skin;
      if (skinKey === this.selectedSkin) {
        elem.classList.add('selected');
      }
      elem.addEventListener('click', () => {
        document.querySelectorAll('.skin-choice').forEach((c) => c.classList.remove('selected'));
        elem.classList.add('selected');
        this.selectedSkin = (elem as HTMLElement).dataset.skin || 'soldier';
        localStorage.setItem('jetpack_arena_skin', this.selectedSkin);
      });
    });

    // Map & Time selector changes (host)
    if (this.mapSelect) {
      this.mapSelect.addEventListener('change', () => {
        this.emitSettings();
      });
    }
    if (this.timeSelect) {
      this.timeSelect.addEventListener('change', () => {
        this.emitSettings();
      });
    }

    // Create Room
    this.btnCreate.addEventListener('click', () => {
      soundManager.unlock();
      const callsign = this.getSanitizedCallsign();
      const mapId = this.mapSelect?.value || 'outpost_delta';
      const roundTimeSec = parseInt(this.timeSelect?.value || '180', 10);

      this.socket.emit(EVENTS.ROOM_CREATE, {
        callsign,
        color: this.selectedColor,
        skin: this.selectedSkin,
        mapId,
        roundTimeSec,
      });
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
      this.socket.emit(EVENTS.ROOM_JOIN, {
        code,
        callsign,
        color: this.selectedColor,
        skin: this.selectedSkin,
      });
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

  private emitSettings(): void {
    if (!this.currentRoom || this.currentRoom.hostId !== this.socket.id) return;
    const mapId = this.mapSelect.value;
    const roundTimeSec = parseInt(this.timeSelect.value, 10);
    this.socket.emit(EVENTS.ROOM_SETTINGS, { mapId, roundTimeSec });
  }

  private getSanitizedCallsign(): string {
    let name = this.callsignInput.value.trim().slice(0, 16);
    if (!name) name = 'Pilot';
    localStorage.setItem('jetpack_arena_callsign', name);
    return name;
  }

  public updateRoom(room: RoomDTO): void {
    this.currentRoom = room;

    if (this.onMapChange && room.mapId) {
      this.onMapChange(room.mapId);
    }

    if (room.status === 'playing') {
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

    // Host controls & settings
    const isHost = room.hostId === this.socket.id;
    if (isHost) {
      this.btnStart.style.display = 'block';
      this.btnReady.style.display = 'none';
      this.settingsRow.style.display = 'block';
      this.settingsDisplay.style.display = 'none';

      if (this.mapSelect.value !== room.mapId) {
        this.mapSelect.value = room.mapId;
      }
      if (this.timeSelect.value !== String(room.roundTimeSec)) {
        this.timeSelect.value = String(room.roundTimeSec);
      }
    } else {
      this.btnStart.style.display = 'none';
      this.btnReady.style.display = 'block';
      this.settingsRow.style.display = 'none';
      this.settingsDisplay.style.display = 'block';

      const mapObj = ALL_MAPS[room.mapId] || ALL_MAPS.outpost_delta;
      const timeStr = room.roundTimeSec === 0 ? 'Unlimited' : `${room.roundTimeSec / 60} Mins`;
      this.settingsDisplay.innerHTML = `<strong>Map:</strong> ${mapObj.name} | <strong>Time:</strong> ${timeStr}`;
    }

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
          <span class="player-skin-badge">${this.escape(p.skin.toUpperCase())}</span>
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
