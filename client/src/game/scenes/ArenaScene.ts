import Phaser from 'phaser';
import { Socket } from 'socket.io-client';
import {
  GameSnapshot,
  CombatEvent,
  MapData,
  MAP_OUTPOST_DELTA,
  ALL_MAPS,
  EVENTS,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PlayerState,
  ProjectileState,
  GrenadeState,
  BoxCollider,
} from '@jetpack-arena/shared';
import { PlayerSprite } from '../entities/PlayerSprite.js';
import { ParticleManager } from '../systems/ParticleManager.js';
import { InputController } from '../../ui/TouchControls.js';
import { soundManager } from '../../audio/SoundSynth.js';

export class ArenaScene extends Phaser.Scene {
  private socket: Socket | null = null;
  private inputCtrl: InputController | null = null;

  public currentMap: MapData = MAP_OUTPOST_DELTA;
  private playerSprites = new Map<string, PlayerSprite>();
  private particles!: ParticleManager;
  private projectileGfx!: Phaser.GameObjects.Graphics;
  private crosshairSprite!: Phaser.GameObjects.Image;
  private grenadeSprites = new Map<string, Phaser.GameObjects.Image>();

  private latestSnapshot: GameSnapshot | null = null;
  private isSocketBound = false;
  private localPlayerSprite: PlayerSprite | null = null;

  // Background and platform graphics
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
    // 1. All 5 Character Skins (Soldier, Player/Hero, Adventurer, Female/Valkyrie, Zombie)
    const skins = ['soldier', 'player', 'adventurer', 'female', 'zombie'];
    const poses = ['idle', 'walk1', 'walk2', 'jump', 'fall', 'hurt', 'duck'];

    for (const s of skins) {
      for (const p of poses) {
        this.load.image(`${s}_${p}`, `/assets/characters/${s}/${p}.png`);
      }
    }

    // 2. All Weapons
    this.load.image('weapon_rifle', '/assets/weapons/rifle.png');
    this.load.image('weapon_shotgun', '/assets/weapons/shotgun.png');
    this.load.image('weapon_rocketlauncher', '/assets/weapons/rocketlauncher.png');
    this.load.image('weapon_sniper', '/assets/weapons/sniper.png');
    this.load.image('weapon_uzi', '/assets/weapons/uzi.png');
    this.load.image('weapon_pistol', '/assets/weapons/pistol.png');
    this.load.image('weapon_knife', '/assets/weapons/knife.png');
    this.load.image('weapon_grenade', '/assets/weapons/grenade.png');

    // Ammunition
    this.load.image('ammo_rifle', '/assets/weapons/ammo_rifle.png');
    this.load.image('ammo_shotgun', '/assets/weapons/ammo_shotgun.png');
    this.load.image('ammo_rocket', '/assets/weapons/ammo_rocket.png');

    // 3. Effects & Particles
    this.load.image('fx_flame_01', '/assets/effects/flame_01.png');
    this.load.image('fx_flame_02', '/assets/effects/flame_02.png');
    this.load.image('fx_muzzle', '/assets/effects/muzzle_01.png');
    this.load.image('fx_smoke', '/assets/effects/smoke_01.png');
    this.load.image('fx_spark', '/assets/effects/spark_01.png');
    this.load.image('fx_circle', '/assets/effects/circle_01.png');

    // 4. Parallax Maps
    this.load.image('cloud1', '/assets/maps/cloud1.png');
    this.load.image('cloud2', '/assets/maps/cloud2.png');
    this.load.image('cloud3', '/assets/maps/cloud3.png');

    // 5. Crosshair
    this.load.image('crosshair', '/assets/ui/crosshair_blue.png');

    // 6. Audio
    this.load.audio('sfx_rifle', '/assets/audio/laser_rifle.ogg');
    this.load.audio('sfx_shotgun', '/assets/audio/shotgun_fire.ogg');
    this.load.audio('sfx_jump', '/assets/audio/jump.ogg');
    this.load.audio('sfx_reload', '/assets/audio/reload.ogg');
    this.load.audio('sfx_kill', '/assets/audio/kill_fanfare.ogg');
    this.load.audio('sfx_hit', '/assets/audio/hit.ogg');
    this.load.audio('sfx_explosion', '/assets/audio/explosion.ogg');
  }

  public init(data?: { socket?: Socket; inputController?: InputController; mapId?: string }): void {
    if (data?.socket) {
      this.socket = data.socket;
    }
    if (data?.inputController) {
      this.inputCtrl = data.inputController;
    }
    if (data?.mapId && ALL_MAPS[data.mapId]) {
      this.currentMap = ALL_MAPS[data.mapId];
    }
  }

  public setMap(mapId: string): void {
    if (ALL_MAPS[mapId] && this.currentMap.id !== mapId) {
      this.currentMap = ALL_MAPS[mapId];
      if (this.bgGfx) {
        this.renderEnvironment();
        this.renderPlatforms();
      }
    }
  }

  public attachSession(socket: Socket, inputController: InputController): void {
    this.socket = socket;
    this.inputCtrl = inputController;
    this.bindSocketEvents();
  }

  public create(): void {
    // 1. World Bounds & Camera Setup
    this.cameras.main.setBounds(0, 0, this.currentMap.width, this.currentMap.height);
    this.physics.world.setBounds(0, 0, this.currentMap.width, this.currentMap.height);

    // Initial camera position centered on map
    this.cameras.main.centerOn(1300, 750);
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
    this.crosshairSprite = this.add.image(1300, 750, 'crosshair');
    this.crosshairSprite.setDepth(25);
    this.crosshairSprite.setDisplaySize(24, 24);

    // 5. Bind socket events if socket already provided
    if (this.socket) {
      this.bindSocketEvents();
    }

    // 6. Send input loop (60 FPS)
    this.time.addEvent({
      delay: 16,
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
    for (let i = 0; i < 10; i++) {
      const cx = 100 + i * 270;
      const cy = 80 + ((i * 47) % 300);
      const key = cloudKeys[i % cloudKeys.length];
      if (this.textures.exists(key)) {
        const cloud = this.add.image(cx, cy, key);
        cloud.setDepth(1);
        cloud.setAlpha(this.currentMap.theme === 'bunker' ? 0.2 : 0.45);
        cloud.setScale(0.8 + ((i * 13) % 4) * 0.15);
        this.clouds.push(cloud);
      }
    }
  }

  private renderEnvironment(): void {
    this.bgGfx.clear();
    const w = this.currentMap.width;
    const h = this.currentMap.height;
    const [c1, c2, c3, c4] = this.currentMap.skyGradient;

    // Atmospheric multi-stop sky gradient
    this.bgGfx.fillGradientStyle(c1, c2, c3, c4, 1);
    this.bgGfx.fillRect(0, 0, w, h);

    // Starfield in the sky
    this.bgGfx.fillStyle(0xffffff, this.currentMap.theme === 'citadel' ? 0.3 : 0.7);
    for (let i = 0; i < 240; i++) {
      const sx = (i * 12345) % w;
      const sy = (i * 98765) % 700;
      const size = (i % 3 === 0) ? 2 : 1;
      this.bgGfx.fillCircle(sx, sy, size);
    }

    // Distant background silhouette
    const silColor = this.currentMap.theme === 'bunker' ? 0x110b24 : 0x0c1222;
    this.bgGfx.fillStyle(silColor, 0.7);
    for (let x = 0; x < w; x += 160) {
      const bh = 320 + ((x * 43) % 260);
      this.bgGfx.fillRect(x, h - bh, 130, bh);

      // Antenna beacon lights
      this.bgGfx.fillStyle(0x1e293b, 0.9);
      this.bgGfx.fillRect(x + 60, h - bh - 60, 6, 60);
      const beaconColor = this.currentMap.theme === 'bunker' ? 0xa855f7 : 0x38bdf8;
      this.bgGfx.fillStyle(beaconColor, 0.85);
      this.bgGfx.fillCircle(x + 63, h - bh - 60, 4);
      this.bgGfx.fillStyle(silColor, 0.7);
    }

    // Coordinate grid overlay
    this.bgGfx.lineStyle(1, 0x334155, 0.25);
    for (let x = 0; x < w; x += 120) {
      this.bgGfx.lineBetween(x, 0, x, h);
    }
    for (let y = 0; y < h; y += 120) {
      this.bgGfx.lineBetween(0, y, w, y);
    }

    // Lethal Abyss warning line at the bottom
    this.detailGfx.clear();
    this.detailGfx.lineStyle(3, 0xef4444, 0.85);
    this.detailGfx.lineBetween(0, this.currentMap.deathY, w, this.currentMap.deathY);
    this.detailGfx.fillStyle(0xef4444, 0.15);
    this.detailGfx.fillRect(0, this.currentMap.deathY, w, h - this.currentMap.deathY);
  }

  private renderPlatforms(): void {
    this.platformGfx.clear();

    const isBunker = this.currentMap.theme === 'bunker';
    const isCitadel = this.currentMap.theme === 'citadel';

    const rimColor = isBunker ? 0xc084fc : (isCitadel ? 0x67e8f9 : 0x38bdf8);
    const ledColor = isBunker ? 0xf43f5e : (isCitadel ? 0xfacc15 : 0x4ade80);

    for (const plat of this.currentMap.platforms) {
      // 1. Structural pillars extending downwards
      this.platformGfx.fillStyle(0x0f172a, 0.9);
      const pillarCount = Math.max(1, Math.floor(plat.w / 120));
      for (let p = 0; p < pillarCount; p++) {
        const px = plat.x + 20 + p * 120;
        this.platformGfx.fillRect(px, plat.y + plat.h, 14, 450);
        this.platformGfx.lineStyle(2, 0x1e293b, 0.5);
        this.platformGfx.lineBetween(px, plat.y + plat.h, px + 30, plat.y + plat.h + 60);
      }

      // 2. Main Platform Body
      this.platformGfx.fillStyle(isBunker ? 0x181329 : 0x1e293b, 1);
      this.platformGfx.fillRoundedRect(plat.x, plat.y, plat.w, plat.h, 4);

      // 3. Catwalk top deck surface
      this.platformGfx.fillStyle(isBunker ? 0x2e1b4d : 0x334155, 1);
      this.platformGfx.fillRect(plat.x + 2, plat.y, plat.w - 4, 8);

      // 4. Vibrant Neon Edge Glow
      this.platformGfx.lineStyle(2.5, rimColor, 0.9);
      this.platformGfx.strokeRoundedRect(plat.x, plat.y, plat.w, plat.h, 4);

      // 5. Hazard stripes on edges
      this.renderHazardStripes(plat);

      // 6. Glowing LED edge lights along the top surface
      this.platformGfx.fillStyle(ledColor, 1);
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

    if (input.fire && this.localPlayerSprite) {
      if (input.weaponType === 'knife') {
        this.localPlayerSprite.triggerMeleeSlash();
      } else {
        this.localPlayerSprite.triggerMuzzleFlash();
      }
    }
  }

  private handleCombatEvent(event: CombatEvent): void {
    if (this.onCombatEvent) {
      this.onCombatEvent(event);
    }

    const localId = this.socket?.id;
    const isLocalVictim = Boolean(localId && event.victimId === localId);
    const isLocalAttacker = Boolean(localId && event.attackerId === localId);

    const victimSprite = this.playerSprites.get(event.victimId);
    if (victimSprite) {
      victimSprite.triggerHurt();
    }

    switch (event.type) {
      case 'hit':
        if (event.weaponType === 'knife') {
          soundManager.playSlash();
          const attackerSprite = event.attackerId ? this.playerSprites.get(event.attackerId) : null;
          if (attackerSprite) {
            attackerSprite.triggerMeleeSlash();
          }
          if (event.x !== undefined && event.y !== undefined) {
            this.particles.emitHitSparks(event.x, event.y, 0xe2e8f0, 10);
          }
        } else {
          if (this.sound.get('sfx_hit')) {
            this.sound.play('sfx_hit', { volume: 0.6 });
          } else {
            soundManager.playHit();
          }
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
          const blastRadius = event.weaponType === 'grenade' ? 120 : 90;
          this.particles.emitExplosion(event.x, event.y, blastRadius);
          if (this.localPlayerSprite) {
            const dist = Math.hypot(this.localPlayerSprite.x - event.x, this.localPlayerSprite.y - event.y);
            if (dist < 460) {
              this.cameras.main.shake(220, 0.018 * (1 - dist / 460));
            }
          }
        }
        break;

      case 'grenade_throw':
        if (this.sound.get('sfx_jump')) {
          this.sound.play('sfx_jump', { volume: 0.5, rate: 1.4 });
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
      if (cloud.x > this.currentMap.width + 100) {
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
          sprite = new PlayerSprite(this, pState.id, pState.name, pState.color, pState.skin, isLocal);
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

          // Update crosshair in world coordinates
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

      // 2. Render Projectiles & Grenades
      this.renderProjectiles(this.latestSnapshot.projectiles);
      this.renderGrenades(this.latestSnapshot.grenades || []);
    }

    // 3. Update particle system
    this.particles.update(dt);
  }

  private renderProjectiles(projectiles: ProjectileState[]): void {
    this.projectileGfx.clear();

    for (const proj of projectiles) {
      if (proj.weaponType === 'rocket') {
        const angle = Math.atan2(proj.vy, proj.vx);
        const trailX = proj.x - Math.cos(angle) * 14;
        const trailY = proj.y - Math.sin(angle) * 14;

        this.projectileGfx.fillStyle(0xf97316, 0.85);
        this.projectileGfx.fillCircle(trailX, trailY, 5);

        this.projectileGfx.fillStyle(0x10b981, 1);
        this.projectileGfx.fillCircle(proj.x, proj.y, proj.radius);
        this.projectileGfx.lineStyle(2, 0x34d399, 1);
        this.projectileGfx.strokeCircle(proj.x, proj.y, proj.radius);
      } else if (proj.weaponType === 'shotgun') {
        this.projectileGfx.fillStyle(0xfacc15, 1);
        this.projectileGfx.fillCircle(proj.x, proj.y, proj.radius);
        this.projectileGfx.fillStyle(0xffffff, 0.85);
        this.projectileGfx.fillCircle(proj.x, proj.y, proj.radius * 0.5);
      } else if (proj.weaponType === 'sniper') {
        // High-energy laser beam
        const angle = Math.atan2(proj.vy, proj.vx);
        const tailX = proj.x - Math.cos(angle) * 36;
        const tailY = proj.y - Math.sin(angle) * 36;

        this.projectileGfx.lineStyle(4, 0xa855f7, 1);
        this.projectileGfx.lineBetween(tailX, tailY, proj.x, proj.y);
        this.projectileGfx.fillStyle(0xffffff, 1);
        this.projectileGfx.fillCircle(proj.x, proj.y, proj.radius);
      } else if (proj.weaponType === 'uzi') {
        // Fast small yellow bullets
        const angle = Math.atan2(proj.vy, proj.vx);
        const tailX = proj.x - Math.cos(angle) * 14;
        const tailY = proj.y - Math.sin(angle) * 14;

        this.projectileGfx.lineStyle(2.5, 0xf59e0b, 1);
        this.projectileGfx.lineBetween(tailX, tailY, proj.x, proj.y);
      } else {
        // Pulse Rifle / Pistol
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

  private renderGrenades(grenades: GrenadeState[]): void {
    const activeGrenadeIds = new Set<string>();

    for (const g of grenades) {
      activeGrenadeIds.add(g.id);
      let spr = this.grenadeSprites.get(g.id);

      if (!spr) {
        spr = this.add.image(g.x, g.y, 'weapon_grenade');
        spr.setDisplaySize(20, 20);
        spr.setDepth(12);
        this.grenadeSprites.set(g.id, spr);
      }

      spr.setPosition(g.x, g.y);
      spr.setRotation(g.rotation);

      // Flashing warning red tint as fuse runs down
      if (g.fuseRemainingMs < 700) {
        const flashRate = Math.sin(Date.now() * 0.02) > 0;
        spr.setTint(flashRate ? 0xff0000 : 0xffffff);
      } else {
        spr.clearTint();
      }

      // Small smoke trail while airborne
      if (Math.abs(g.vx) > 30 || Math.abs(g.vy) > 30) {
        if (Math.random() < 0.3) {
          this.particles.emitHitSparks(g.x, g.y, 0xcccccc, 2);
        }
      }
    }

    // Clean up expired or exploded grenades
    for (const [id, spr] of this.grenadeSprites.entries()) {
      if (!activeGrenadeIds.has(id)) {
        spr.destroy();
        this.grenadeSprites.delete(id);
      }
    }
  }
}
