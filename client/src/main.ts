import Phaser from 'phaser';
import { io as SocketClient, Socket } from 'socket.io-client';
import { EVENTS, MatchCountdownPayload, MatchEndPayload } from '@jetpack-arena/shared';
import { createGameConfig } from './game/config.js';
import { ArenaScene } from './game/scenes/ArenaScene.js';
import { InputController } from './ui/TouchControls.js';
import { LobbyUI } from './ui/Lobby.js';
import { HUD } from './ui/HUD.js';
import { soundManager } from './audio/SoundSynth.js';

function getSocketUrl(): string {
  // If Vite dev server (port 5173), point to backend server at port 3000
  if (window.location.port === '5173') {
    return `http://${window.location.hostname}:3000`;
  }
  return window.location.origin;
}

window.addEventListener('DOMContentLoaded', () => {
  const socketUrl = getSocketUrl();
  console.log(`[Jetpack Arena] Connecting to server at ${socketUrl}`);

  const statusDot = document.querySelector('.status-dot') as HTMLElement;
  const statusText = document.getElementById('connection-text')!;

  const socket: Socket = SocketClient(socketUrl, {
    reconnection: true,
    reconnectionAttempts: 15,
    reconnectionDelay: 1000,
  });

  // 1. Initialize Input & UI managers
  const inputCtrl = new InputController();
  const hud = new HUD();
  const lobbyUI = new LobbyUI(socket);

  // 2. Initialize Phaser Game
  const config = createGameConfig('game-container');
  const game = new Phaser.Game(config);

  function wireArenaScene() {
    const arenaScene = game.scene.getScene('ArenaScene') as ArenaScene;
    if (arenaScene) {
      arenaScene.attachSession(socket, inputCtrl);
      arenaScene.onLocalPlayerUpdate = (p) => hud.updateLocalPlayer(p);
      arenaScene.onTimerUpdate = (sec) => hud.updateTimer(sec);
      arenaScene.onCombatEvent = (e) => hud.addKillFeedItem(e);
    }
  }

  game.events.once('ready', () => {
    wireArenaScene();
  });

  socket.on('connect', () => {
    console.log('[Jetpack Arena] Connected. Socket ID:', socket.id);
    if (statusDot) statusDot.style.background = '#22c55e';
    if (statusText) statusText.textContent = 'ONLINE';
    wireArenaScene();
  });

  socket.on('disconnect', () => {
    console.warn('[Jetpack Arena] Disconnected from server');
    if (statusDot) statusDot.style.background = '#ef4444';
    if (statusText) statusText.textContent = 'DISCONNECTED';
  });

  socket.on('reconnect_attempt', () => {
    if (statusDot) statusDot.style.background = '#f59e0b';
    if (statusText) statusText.textContent = 'RECONNECTING...';
  });

  // 3. When match starts (or joined active match)
  lobbyUI.onMatchStart = () => {
    soundManager.unlock();
    inputCtrl.showTouchControls(true);
    wireArenaScene();
  };

  // 4. Match countdown event
  socket.on(EVENTS.MATCH_COUNTDOWN, (data: MatchCountdownPayload) => {
    hud.showCountdown(data.seconds);
  });

  // 5. Match end event
  socket.on(EVENTS.MATCH_END, (data: MatchEndPayload) => {
    inputCtrl.showTouchControls(false);
    hud.showMatchEnd(data.winnerName, data.scoreboard);
  });

  // User gesture unlock for audio
  const unlockAudio = () => {
    soundManager.unlock();
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('keydown', unlockAudio);
});
