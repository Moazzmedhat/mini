import Phaser from 'phaser';
import { Socket } from 'socket.io-client';
import {
  GameSnapshot,
  CombatEvent,
  MapData,
  MAP_OUTPOST_DELTA,
  EVENTS,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PlayerState,
  ProjectileState,
  BoxCollider,
} from '@jetpack-arena/shared';
import { PlayerSprite } from '../entities/PlayerSprite.js';
import { ParticleManager } from '../systems/ParticleManager.js';
import { InputController } from '../../ui/TouchControls.js';
import { soundManager } from '../../audio/SoundSynth.js';

export class ArenaScene extends Phaser.Scene {
  private socket: Socket | null = null;
  private inputCtrl: InputController | null = null;

  private map: MapData = MAP_OUTPOST_DELTA;
  private playerSprites = new Map<string, PlayerSprite>();
  private particles!: ParticleManager;
  private projectileGfx!: Phaser.GameObjects.Graphics;
  private crosshairSprite!: Phaser.GameObjects.Image;

  private latestSnapshot: GameSnapshot | null = null;
  private isSocketBound = false;
  private localPlayerSprite: PlayerSprite | null = null;

  // Background, parallax, and platform graphics
  private bgGfx!: Phaser.GameObjects.Graphics;
  private platformGfx!: Phaser.GameObjects.Graphics;
  private detailGfx!: Phaser.GameObjects.Graphics;
  private clouds: Phaser.GameObjects.Image[] = [];

  // Callbacks to update HTML HUD
  public onLocalPlayerUpdate?: (player: PlayerState) => void;
  public onTimerUpdate?: (seconds: number) => void;
  public onCombatEvent?: (event: CombatEvent) => void;

  constructor() {
    super({ key: 'ArenaScene' });
  }

  public preload(): void {
    // 1. Soldier Character Sprites
    this.load.image('soldier_idle', '/assets/characters/soldier/idle.png');
    this.load.image('soldier_walk1', '/assets/characters/soldier/walk1.png');
    this.load.image('soldier_walk2', '/assets/characters/soldier/walk2.png');
    this.load.image('soldier_jump', '/assets/characters/soldier/jump.png');
    this.load.image('soldier_fall', '/assets/characters/soldier/fall.png');
    this.load.image('soldier_hurt', '/assets/characters/soldier/hurt.png');
    this.load.image('soldier_duck', '/assets/characters/soldier/duck.png');
    this.load.image('soldier_action1', '/assets/characters/soldier/action1.png');

    // 2. Player (Hero) Character Sprites
    this.load.image('player_idle', '/assets/characters/player/idle.png');
    this.load.image('player_walk1', '/assets/characters/player/walk1.png');
    this.load.image('player_walk2', '/assets/characters/player/walk2.png');
    this.load.image('player_jump', '/assets/characters/player/jump.png');
    this.load.image('player_fall', '/assets/characters/player/fall.png');
    this.load.image('player_hurt', '/assets/characters/player/hurt.png');
    this.load.image('player_duck', '/assets/characters/player/duck.png');
    this.load.image('player_action1', '/assets/characters/player/action1.png');

    // 3. Weapons & Ammunition
    this.load.image('weapon_rifle', '/assets/weapons/rifle.png');
    this.load.image('weapon_shotgun', '/assets/weapons/shotgun.png');
    this.load.image('weapon_rocketlauncher', '/assets/weapons/rocketlauncher.png');
    this.load.image('ammo_rifle', '/assets/weapons/ammo_rifle.png');
    this.load.image('ammo_shotgun', '/assets/weapons/ammo_shotgun.png');
    this.load.image('ammo_rocket', '/assets/weapons/ammo_rocket.png');

    // 4. Effects & Particles
    this.load.image('fx_flame_01', '/assets/effects/flame_01.png');
    this.load.image('fx_flame_02', '/assets/effects/flame_02.png');
    this.load.image('fx_muzzle', '/assets/effects/muzzle_01.png');
    this.load.image('fx_smoke', '/assets/effects/smoke_01.png');
    this.load.image('fx_spark', '/assets/effects/spark_01.png');
    this.load.image('fx_circle', '/assets/effects/circle_01.png');

    // 5. Parallax Environment
    this.load.image('cloud1', '/assets/maps/cloud1.png');
    this.load.image('cloud2', '/assets/maps/cloud2.png');
    this.load.image('cloud3', '/assets/maps/cloud3.png');

    // 6. UI & Crosshair
    this.load.image('crosshair', '/assets/ui/crosshair_blue.png');

    // 7. Audio Sound Effects
    this.load.audio('sfx_rifle', '/assets/audio/laser_rifle.ogg');
    this.load.audio('sfx_shotgun', '/assets/audio/shotgun_fire.ogg');
    this.load.audio('sfx_jump', '/assets/audio/jump.ogg');
    this.load.audio('sfx_reload', '/assets/audio/reload.ogg');
    this.load.audio('sfx_kill', '/assets/audio/kill_fanfare.ogg');
    this.load.audio('sfx_hit', '/assets/audio/hit.ogg');
    this.load.audio('sfx_explosion', '/assets/audio/explosion.ogg');
  }

  public init(data?: { socket?: Socket; inputController?: InputController }): void {
    if (data?.socket) {
      this.socket = data.socket;
    }
    if (data?.inputController) {
      this.inputCtrl = data.inputController;
    }
  }

  public attachSession(socket: Socket, inputController: InputController): void {
    this.socket = socket;
    this.inputCtrl = inputController;
    this.bindSocketEvents();
  }

  public create(): void {
    // 1. World Bounds & Camera Setup
    this.cameras.main.setBounds(0, 0, this.map.width, this.map.height);
    this.physics.world.setBounds(0, 0, this.map.width, this.map.height);

    // Initial camera position centered on central decks
    this.cameras.main.centerOn(1200, 750);
    this.cameras.main.setZoom(1.0);

    // 2. Render Environment, Sky, and Platforms
    this.bgGfx = this.add.graphics().setDepth(0);
    this.detailGfx = this.add.graphics().setDepth(2);
    this.platformGfx = this.add.graphics().setDepth(5);

    this.renderEnvironment();
    this.spawnParallaxClouds();
    this.renderPlatforms();

    // 3. Projectile and Particle Layers
    this.projectileGfx = this.add.graphics().setDepth(15);
    this.particles = new ParticleManager(this);

    // 4. In-Game Aim Crosshair
    this.crosshairSprite = this.add.image(1200, 750, 'crosshair');
    this.crosshairSprite.setDepth(25);
    this.crosshairSprite.setDisplaySize(24, 24);

    // 5. Bind socket events if socket already provided
    if (this.socket) {
      this.bindSocketEvents();
    }

    // 6. Send input loop (30 FPS)
    this.time.addEvent({
      delay: 33,
      loop: true,
      callback: () => {
        this.sendInput();
      },
    });
  }

  public bindSocketEvents(): void {
    if (!this.socket || this.isSocketBound) return;
    this.isSocketBound = true;

    this.socket.off(EVENTS.GAME_SNAPSHOT);
    this.socket.off(EVENTS.COMBAT_EVENT);

    this.socket.on(EVENTS.GAME_SNAPSHOT, (snapshot: GameSnapshot) => {
      this.latestSnapshot = snapshot;
    });

    this.socket.on(EVENTS.COMBAT_EVENT, (event: CombatEvent) => {
      this.handleCombatEvent(event);
    });
  }

  private spawnParallaxClouds(): void {
    const cloudKeys = ['cloud1', 'cloud2', 'cloud3'];
    for (let i = 0; i < 8; i++) {
      const cx = 150 + i * 290;
      const cy = 120 + ((i * 47) % 280);
      const key = cloudKeys[i % cloudKeys.length];
      if (this.textures.exists(key)) {
        const cloud = this.add.image(cx, cy, key);
        cloud.setDepth(1);
        cloud.setAlpha(0.45);
        cloud.setScale(0.8 + ((i * 13) % 4) * 0.15);
        this.clouds.push(cloud);
      }
    }
  }

  private renderEnvironment(): void {
    this.bgGfx.clear();
    const w = this.map.width;
    const h = this.map.height;

    // Atmospheric deep navy & twilight sci-fi sky
    this.bgGfx.fillGradientStyle(0x070b14, 0x070b14, 0x0f172a, 0x1e293b, 1);
    this.bgGfx.fillRect(0, 0, w, h);

    // Starfield in the sky
    this.bgGfx.fillStyle(0xffffff, 0.7);
    for (let i = 0; i < 200; i++) {
      const sx = (i * 12345) % w;
      const sy = (i * 98765) % 600;
      const size = (i % 3 === 0) ? 2 : 1;
      this.bgGfx.fillCircle(sx, sy, size);
    }

    // Distant futuristic fortress skyline
    this.bgGfx.fillStyle(0x0c1222, 0.7);
    for (let x = 0; x < w; x += 150) {
      const bh = 300 + ((x * 43) % 250);
      this.bgGfx.fillRect(x, h - bh, 120, bh);

      // Antenna beacon lights
      this.bgGfx.fillStyle(0x1e293b, 0.9);
      this.bgGfx.fillRect(x + 55, h - bh - 60, 6, 60);
      this.bgGfx.fillStyle(0x38bdf8, 0.8);
      this.bgGfx.fillCircle(x + 58, h - bh - 60, 4);
      this.bgGfx.fillStyle(0x0c1222, 0.7);
    }

    // Grid lines for tactical arena coordinate feel
    this.bgGfx.lineStyle(1, 0x1e293b, 0.35);
    for (let x = 0; x < w; x += 120) {
      this.bgGfx.lineBetween(x, 0, x, h);
    }
    for (let y = 0; y < h; y += 120) {
      this.bgGfx.lineBetween(0, y, w, y);
    }

    // Lethal Abyss warning line at the bottom
    this.detailGfx.clear();
    this.detailGfx.lineStyle(3, 0xef4444, 0.85);
    this.detailGfx.lineBetween(0, this.map.deathY, w, this.map.deathY);
    this.detailGfx.fillStyle(0xef4444, 0.15);
    this.detailGfx.fillRect(0, this.map.deathY, w, h - this.map.deathY);
  }

  private renderPlatforms(): void {
    this.platformGfx.clear();

    for (const plat of this.map.platforms) {
      // 1. Structural pillars extending downwards
      this.platformGfx.fillStyle(0x0f172a, 0.85);
      const pillarCount = Math.max(1, Math.floor(plat.w / 120));
      for (let p = 0; p < pillarCount; p++) {
        const px = plat.x + 20 + p * 120;
        this.platformGfx.fillRect(px, plat.y + plat.h, 14, 450);
        // Strut diagonals
        this.platformGfx.lineStyle(2, 0x1e293b, 0.5);
        this.platformGfx.lineBetween(px, plat.y + plat.h, px + 30, plat.y + plat.h + 60);
      }

      // 2. Main Platform Body (Armored metal deck)
      this.platformGfx.fillStyle(0x1e293b, 1);
      this.platformGfx.fillRoundedRect(plat.x, plat.y, plat.w, plat.h, 4);

      // 3. Catwalk top deck surface (Steel walking grate)
      this.platformGfx.fillStyle(0x334155, 1);
      this.platformGfx.fillRect(plat.x + 2, plat.y, plat.w - 4, 8);

      // 4. Vibrant Neon Cyan / Emerald Edge Glow
      this.platformGfx.lineStyle(2.5, 0x38bdf8, 0.9);
      this.platformGfx.strokeRoundedRect(plat.x, plat.y, plat.w, plat.h, 4);

      // 5. High-contrast yellow & black hazard stripes on platform edges
      this.renderHazardStripes(plat);

      // 6. Glowing LED edge lights along the top surface
      this.platformGfx.fillStyle(0x4ade80, 1);
      for (let lx = plat.x + 15; lx < plat.x + plat.w - 15; lx += 45) {
        this.platformGfx.fillCircle(lx, plat.y + 4, 2.5);
      }
    }
  }

  private renderHazardStripes(plat: BoxCollider): void {
    if (plat.w < 60) return;
    const stripeWidth = 8;
    const count = Math.min(4, Math.floor(plat.w / 16));

    for (let i = 0; i < count; i++) {
      this.platformGfx.fillStyle(i % 2 === 0 ? 0xfacc15 : 0x0f172a, 0.9);
      this.platformGfx.fillRect(plat.x + i * stripeWidth, plat.y + 8, stripeWidth, Math.min(10, plat.h - 8));
    }

    for (let i = 0; i < count; i++) {
      this.platformGfx.fillStyle(i % 2 === 0 ? 0xfacc15 : 0x0f172a, 0.9);
      this.platformGfx.fillRect(plat.x + plat.w - (i + 1) * stripeWidth, plat.y + 8, stripeWidth, Math.min(10, plat.h - 8));
    }
  }

  private sendInput(): void {
    if (!this.socket || !this.inputCtrl || !this.socket.connected) return;
    const input = this.inputCtrl.pollInput();
    this.socket.emit(EVENTS.INPUT_FRAME, input);

    // Muzzle flash on fire
    if (input.fire && this.localPlayerSprite) {
      this.localPlayerSprite.triggerMuzzleFlash();
    }
  }

  private handleCombatEvent(event: CombatEvent): void {
    if (this.onCombatEvent) {
      this.onCombatEvent(event);
    }

    const localId = this.socket?.id;
    const isLocalVictim = Boolean(localId && event.victimId === localId);
    const isLocalAttacker = Boolean(localId && event.attackerId === localId);

    // Trigger visual hit reaction on sprite
    const victimSprite = this.playerSprites.get(event.victimId);
    if (victimSprite) {
      victimSprite.triggerHurt();
    }

    switch (event.type) {
      case 'hit':
        if (this.sound.get('sfx_hit')) {
          this.sound.play('sfx_hit', { volume: 0.6 });
        } else {
          soundManager.playHit();
        }

        if (isLocalVictim) {
          this.cameras.main.shake(120, 0.008);
        }
        break;

      case 'kill':
        if (isLocalAttacker) {
          if (this.sound.get('sfx_kill')) {
            this.sound.play('sfx_kill', { volume: 0.7 });
          } else {
            soundManager.playKill();
          }
        }
        break;

      case 'explosion':
        if (this.sound.get('sfx_explosion')) {
          this.sound.play('sfx_explosion', { volume: 0.8 });
        } else {
          soundManager.playExplosion();
        }

        if (event.x !== undefined && event.y !== undefined) {
          this.particles.emitExplosion(event.x, event.y, 85);
          if (this.localPlayerSprite) {
            const dist = Math.hypot(this.localPlayerSprite.x - event.x, this.localPlayerSprite.y - event.y);
            if (dist < 400) {
              this.cameras.main.shake(200, 0.015 * (1 - dist / 400));
            }
          }
        }
        break;

      case 'reload':
        if (isLocalVictim) {
          if (this.sound.get('sfx_reload')) {
            this.sound.play('sfx_reload', { volume: 0.6 });
          } else {
            soundManager.playReload();
          }
        }
        break;
    }
  }

  public update(time: number, delta: number): void {
    const dt = delta / 1000;

    // Slowly scroll clouds across sky
    for (const cloud of this.clouds) {
      cloud.x += 8 * dt;
      if (cloud.x > this.map.width + 100) {
        cloud.x = -100;
      }
    }

    // 1. Process latest server snapshot
    if (this.latestSnapshot) {
      const activeIds = new Set<string>();
      const localId = this.socket?.id || '';

      // Update timer in HUD
      if (this.onTimerUpdate && this.latestSnapshot.matchTimeRemaining !== undefined) {
        this.onTimerUpdate(this.latestSnapshot.matchTimeRemaining);
      }

      for (const pState of this.latestSnapshot.players) {
        activeIds.add(pState.id);
        const isLocal = Boolean(localId && pState.id === localId);

        let sprite = this.playerSprites.get(pState.id);
        if (!sprite) {
          sprite = new PlayerSprite(this, pState.id, pState.name, pState.color, isLocal);
          this.playerSprites.set(pState.id, sprite);

          if (isLocal) {
            this.localPlayerSprite = sprite;
            this.cameras.main.startFollow(sprite, true, 0.15, 0.15);
            this.cameras.main.setZoom(1.0);
          }
        }

        if (isLocal && !this.localPlayerSprite) {
          this.localPlayerSprite = sprite;
          this.cameras.main.startFollow(sprite, true, 0.15, 0.15);
          this.cameras.main.setZoom(1.0);
        }

        sprite.updateState(pState, dt);

        if (isLocal) {
          if (this.onLocalPlayerUpdate) {
            this.onLocalPlayerUpdate(pState);
          }
          soundManager.setJetpackThrust(pState.boosting && !pState.isDead);

          // Update crosshair position in world coordinates
          const aimDist = 90;
          this.crosshairSprite.setPosition(
            pState.x + Math.cos(pState.aimAngle) * aimDist,
            pState.y + Math.sin(pState.aimAngle) * aimDist
          );
        }
      }

      // Clean up disconnected players
      for (const [id, sprite] of this.playerSprites.entries()) {
        if (!activeIds.has(id)) {
          if (this.localPlayerSprite === sprite) {
            this.localPlayerSprite = null;
          }
          sprite.destroy();
          this.playerSprites.delete(id);
        }
      }

      // 2. Render Projectiles
      this.renderProjectiles(this.latestSnapshot.projectiles);
    }

    // 3. Update particle system
    this.particles.update(dt);
  }

  private renderProjectiles(projectiles: ProjectileState[]): void {
    this.projectileGfx.clear();

    for (const proj of projectiles) {
      if (proj.weaponType === 'rocket') {
        // Draw rocket missile sprite with exhaust flame trail
        const angle = Math.atan2(proj.vy, proj.vx);
        const trailX = proj.x - Math.cos(angle) * 14;
        const trailY = proj.y - Math.sin(angle) * 14;

        this.projectileGfx.fillStyle(0xf97316, 0.85);
        this.projectileGfx.fillCircle(trailX, trailY, 5);

        // Rocket body
        this.projectileGfx.fillStyle(0x10b981, 1);
        this.projectileGfx.fillCircle(proj.x, proj.y, proj.radius);
        this.projectileGfx.lineStyle(2, 0x34d399, 1);
        this.projectileGfx.strokeCircle(proj.x, proj.y, proj.radius);
      } else if (proj.weaponType === 'shotgun') {
        // Golden pellets
        this.projectileGfx.fillStyle(0xfacc15, 1);
        this.projectileGfx.fillCircle(proj.x, proj.y, proj.radius);
        this.projectileGfx.fillStyle(0xffffff, 0.85);
        this.projectileGfx.fillCircle(proj.x, proj.y, proj.radius * 0.5);
      } else {
        // Pulse Rifle laser bolt
        const angle = Math.atan2(proj.vy, proj.vx);
        const tailX = proj.x - Math.cos(angle) * 22;
        const tailY = proj.y - Math.sin(angle) * 22;

        this.projectileGfx.lineStyle(3.5, 0x38bdf8, 1);
        this.projectileGfx.lineBetween(tailX, tailY, proj.x, proj.y);
        this.projectileGfx.fillStyle(0xffffff, 1);
        this.projectileGfx.fillCircle(proj.x, proj.y, proj.radius);
      }
    }
  }
}
