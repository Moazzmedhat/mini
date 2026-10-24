import {
  TICK_RATE,
  TICK_DELTA_SEC,
  COMBAT,
  WEAPONS,
  WeaponType,
  PlayerState,
  PlayerInputFrame,
  ProjectileState,
  GameSnapshot,
  CombatEvent,
  MapData,
  MAP_OUTPOST_DELTA,
  ALL_MAPS,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
} from '@jetpack-arena/shared';
import { PhysicsEngine } from './Physics.js';

export class GameSimulation {
  public map: MapData = MAP_OUTPOST_DELTA;
  public players = new Map<string, PlayerState>();
  public latestInputs = new Map<string, PlayerInputFrame>();
  public projectiles: ProjectileState[] = [];
  public nextProjectileId = 1;

  public tickCount = 0;
  public roundDurationSec = COMBAT.DEFAULT_ROUND_TIME_SEC;
  public matchTimeRemaining = COMBAT.DEFAULT_ROUND_TIME_SEC;
  public isMatchActive = false;
  public isMatchOver = false;
  public winnerId: string | null = null;
  public winnerName: string | null = null;

  // Weapon cooldowns: playerId -> lastFireTimestamp
  private lastFireTimes = new Map<string, number>();

  // Combat event buffer emitted to players
  public pendingEvents: CombatEvent[] = [];

  constructor(mapId = 'outpost_delta', roundTimeSec = COMBAT.DEFAULT_ROUND_TIME_SEC) {
    this.setSettings(mapId, roundTimeSec);
  }

  public setSettings(mapId: string, roundTimeSec: number): void {
    if (ALL_MAPS[mapId]) {
      this.map = ALL_MAPS[mapId];
    }
    this.roundDurationSec = roundTimeSec;
    this.matchTimeRemaining = roundTimeSec;
  }

  public addPlayer(id: string, name: string, color: string, skin = 'soldier'): PlayerState {
    const spawnIndex = this.players.size % this.map.spawnPoints.length;
    const spawn = this.map.spawnPoints[spawnIndex];

    const player: PlayerState = {
      id,
      name,
      color,
      skin: skin || 'soldier',
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      grounded: true,
      boosting: false,
      health: COMBAT.MAX_HEALTH,
      fuel: 100,
      aimAngle: 0,
      currentWeapon: 'rifle',
      ammo: WEAPONS.rifle.magazineSize,
      isReloading: false,
      reloadTimerMs: 0,
      isDead: false,
      respawnTimerMs: 0,
      spawnProtected: true,
      spawnProtectTimerMs: COMBAT.SPAWN_PROTECTION_MS,
      kills: 0,
      deaths: 0,
      score: 0,
    };

    this.players.set(id, player);
    return player;
  }

  public removePlayer(id: string): void {
    this.players.delete(id);
    this.latestInputs.delete(id);
    this.lastFireTimes.delete(id);
    // Remove their active projectiles
    this.projectiles = this.projectiles.filter((p) => p.ownerId !== id);
  }

  public receiveInput(id: string, input: PlayerInputFrame): void {
    if (!this.players.has(id)) return;
    this.latestInputs.set(id, input);

    // Switch weapon if requested
    if (input.weaponType && WEAPONS[input.weaponType]) {
      const p = this.players.get(id)!;
      if (p.currentWeapon !== input.weaponType && !p.isReloading) {
        p.currentWeapon = input.weaponType;
        p.ammo = WEAPONS[input.weaponType].magazineSize;
      }
    }

    // Manual reload
    if (input.reload) {
      this.triggerReload(id);
    }
  }

  public triggerReload(id: string): void {
    const player = this.players.get(id);
    if (!player || player.isDead || player.isReloading) return;
    if (player.currentWeapon === 'knife') return; // Melee doesn't reload
    const cfg = WEAPONS[player.currentWeapon];
    if (player.ammo >= cfg.magazineSize) return;

    player.isReloading = true;
    player.reloadTimerMs = cfg.reloadTimeMs;

    this.pendingEvents.push({
      id: `ev_${Date.now()}_${Math.random()}`,
      type: 'reload',
      victimId: id,
      weaponType: player.currentWeapon,
    });
  }

  public startMatch(): void {
    this.isMatchActive = true;
    this.isMatchOver = false;
    this.matchTimeRemaining = this.roundDurationSec;
    this.tickCount = 0;
    this.projectiles = [];
    this.pendingEvents = [];

    // Respawn all players fresh
    let i = 0;
    for (const player of this.players.values()) {
      const sp = this.map.spawnPoints[i % this.map.spawnPoints.length];
      i++;
      player.x = sp.x;
      player.y = sp.y;
      player.vx = 0;
      player.vy = 0;
      player.health = COMBAT.MAX_HEALTH;
      player.fuel = 100;
      player.isDead = false;
      player.respawnTimerMs = 0;
      player.spawnProtected = true;
      player.spawnProtectTimerMs = COMBAT.SPAWN_PROTECTION_MS;
      player.ammo = WEAPONS[player.currentWeapon].magazineSize;
      player.isReloading = false;
      player.kills = 0;
      player.deaths = 0;
      player.score = 0;
    }
  }

  public update(dt: number = TICK_DELTA_SEC): void {
    this.tickCount++;
    const now = Date.now();

    // Update match time
    if (this.isMatchActive && !this.isMatchOver) {
      this.matchTimeRemaining = Math.max(0, this.matchTimeRemaining - dt);
      if (this.matchTimeRemaining <= 0) {
        this.endMatch();
      }
    }

    // 1. Update players
    for (const [id, player] of this.players.entries()) {
      // Dead player respawn timer
      if (player.isDead) {
        player.respawnTimerMs = Math.max(0, player.respawnTimerMs - dt * 1000);
        if (player.respawnTimerMs <= 0) {
          this.respawnPlayer(player);
        }
        continue;
      }

      // Spawn protection timer
      if (player.spawnProtected) {
        player.spawnProtectTimerMs = Math.max(0, player.spawnProtectTimerMs - dt * 1000);
        if (player.spawnProtectTimerMs <= 0) {
          player.spawnProtected = false;
        }
      }

      // Reload timer
      if (player.isReloading) {
        player.reloadTimerMs = Math.max(0, player.reloadTimerMs - dt * 1000);
        if (player.reloadTimerMs <= 0) {
          player.isReloading = false;
          player.ammo = WEAPONS[player.currentWeapon].magazineSize;
        }
      }

      // Get input
      const input = this.latestInputs.get(id) || {
        seq: 0,
        moveX: 0,
        jump: false,
        boost: false,
        aimAngle: player.aimAngle,
        fire: false,
      };

      // Physics update
      PhysicsEngine.updatePlayer(player, input, dt, this.map);

      // Check void fall death
      if (player.y >= this.map.deathY) {
        this.killPlayer(player, null, undefined, 'fell into the abyss');
        continue;
      }

      // Fire weapon
      if (input.fire && !player.isDead && !player.isReloading) {
        this.attemptFire(player, now);
      }
    }

    // 2. Update projectiles
    this.updateProjectiles(dt);
  }

  private attemptFire(player: PlayerState, now: number): void {
    const cfg = WEAPONS[player.currentWeapon];
    const lastFire = this.lastFireTimes.get(player.id) || 0;

    if (now - lastFire < cfg.fireCooldownMs) {
      return;
    }

    // Melee attack logic (Combat Knife)
    if (player.currentWeapon === 'knife') {
      this.lastFireTimes.set(player.id, now);
      player.ammo = 999;

      const meleeReach = cfg.maxDistance || 85;
      const meleeArc = Math.PI * 0.75; // 135-degree forward slash cone
      let hitCount = 0;

      for (const [targetId, target] of this.players) {
        if (targetId === player.id || target.isDead || target.spawnProtected) continue;

        const dx = target.x - player.x;
        const dy = (target.y - 10) - (player.y - 10);
        const dist = Math.hypot(dx, dy);

        if (dist <= meleeReach) {
          const targetAngle = Math.atan2(dy, dx);
          let angleDiff = Math.abs(targetAngle - player.aimAngle);
          while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);

          if (angleDiff <= meleeArc / 2) {
            this.applyDamage(target, cfg.damage, player.id, 'knife');
            hitCount++;
          }
        }
      }

      // Add melee slash event for client animation & sound
      this.pendingEvents.push({
        id: `ev_slash_${Date.now()}_${Math.random()}`,
        type: 'hit',
        attackerId: player.id,
        attackerName: player.name,
        victimId: hitCount > 0 ? 'enemy' : '',
        weaponType: 'knife',
        damage: hitCount > 0 ? cfg.damage : 0,
        x: player.x + Math.cos(player.aimAngle) * 36,
        y: player.y - 6 + Math.sin(player.aimAngle) * 36,
      });
      return;
    }

    if (player.ammo <= 0) {
      this.triggerReload(player.id);
      return;
    }

    // Spend ammo
    player.ammo--;
    this.lastFireTimes.set(player.id, now);

    // Muzzle position slightly offset in aim direction
    const muzzleDist = 24;
    const baseAngle = player.aimAngle;
    const originX = player.x + Math.cos(baseAngle) * muzzleDist;
    const originY = player.y - 6 + Math.sin(baseAngle) * muzzleDist;

    // Spawn pellets / projectiles
    const count = cfg.pelletCount;
    for (let i = 0; i < count; i++) {
      // Calculate spread angle
      let angle = baseAngle;
      if (cfg.spreadAngle > 0) {
        const spreadOffset = (Math.random() - 0.5) * cfg.spreadAngle;
        angle += spreadOffset;
      }

      const vx = Math.cos(angle) * cfg.speed;
      const vy = Math.sin(angle) * cfg.speed;

      this.projectiles.push({
        id: `p_${this.nextProjectileId++}`,
        ownerId: player.id,
        weaponType: player.currentWeapon,
        x: originX,
        y: originY,
        vx,
        vy,
        distanceTraveled: 0,
        maxDistance: cfg.maxDistance,
        radius: cfg.projectileRadius,
        damage: cfg.damage,
        splashRadius: cfg.splashRadius,
      });
    }

    // Auto-reload on empty clip
    if (player.ammo <= 0) {
      this.triggerReload(player.id);
    }
  }

  private updateProjectiles(dt: number): void {
    const remainingProjectiles: ProjectileState[] = [];

    for (const proj of this.projectiles) {
      const stepX = proj.vx * dt;
      const stepY = proj.vy * dt;
      const dist = Math.sqrt(stepX * stepX + stepY * stepY);

      proj.x += stepX;
      proj.y += stepY;
      proj.distanceTraveled += dist;

      // Check max range
      if (proj.distanceTraveled >= proj.maxDistance) {
        if (proj.splashRadius > 0) {
          this.triggerExplosion(proj);
        }
        continue;
      }

      // Check collision with map platforms
      let hitPlatform = false;
      for (const plat of this.map.platforms) {
        if (PhysicsEngine.checkCircleBox(proj.x, proj.y, proj.radius, plat)) {
          hitPlatform = true;
          break;
        }
      }

      if (hitPlatform) {
        if (proj.splashRadius > 0) {
          this.triggerExplosion(proj);
        }
        continue; // Projectile destroyed by wall
      }

      // Check collision with players
      let hitPlayer: PlayerState | null = null;
      for (const target of this.players.values()) {
        // Cannot hit self with direct bullets (unless self-splash)
        if (target.id === proj.ownerId) continue;
        if (target.isDead || target.spawnProtected) continue;

        // Player hitbox box
        const targetBox = {
          x: target.x - PLAYER_WIDTH / 2,
          y: target.y - PLAYER_HEIGHT / 2,
          w: PLAYER_WIDTH,
          h: PLAYER_HEIGHT,
        };

        if (PhysicsEngine.checkCircleBox(proj.x, proj.y, proj.radius, targetBox)) {
          hitPlayer = target;
          break;
        }
      }

      if (hitPlayer) {
        if (proj.splashRadius > 0) {
          this.triggerExplosion(proj);
        } else {
          this.applyDamage(hitPlayer, proj.damage, proj.ownerId, proj.weaponType);
        }
        continue; // Projectile consumed
      }

      remainingProjectiles.push(proj);
    }

    this.projectiles = remainingProjectiles;
  }

  private triggerExplosion(proj: ProjectileState): void {
    const explosionEvent: CombatEvent = {
      id: `ev_exp_${Date.now()}_${Math.random()}`,
      type: 'explosion',
      attackerId: proj.ownerId,
      victimId: '',
      weaponType: proj.weaponType,
      x: proj.x,
      y: proj.y,
    };
    this.pendingEvents.push(explosionEvent);

    // Apply splash damage to all vulnerable players in radius
    for (const player of this.players.values()) {
      if (player.isDead || player.spawnProtected) continue;
      const dx = player.x - proj.x;
      const dy = player.y - proj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= proj.splashRadius) {
        const falloff = 1 - dist / proj.splashRadius;
        const splashDmg = Math.round(proj.damage * falloff);
        if (splashDmg > 0) {
          this.applyDamage(player, splashDmg, proj.ownerId, proj.weaponType);
        }
      }
    }
  }

  public applyDamage(
    victim: PlayerState,
    amount: number,
    attackerId: string,
    weaponType: WeaponType
  ): void {
    if (victim.isDead || victim.spawnProtected) return;

    victim.health = Math.max(0, victim.health - amount);

    const attacker = this.players.get(attackerId);

    this.pendingEvents.push({
      id: `ev_hit_${Date.now()}_${Math.random()}`,
      type: 'hit',
      attackerId,
      attackerName: attacker?.name,
      victimId: victim.id,
      victimName: victim.name,
      weaponType,
      damage: amount,
    });

    if (victim.health <= 0) {
      this.killPlayer(victim, attacker || null, weaponType);
    }
  }

  private killPlayer(
    victim: PlayerState,
    killer: PlayerState | null,
    weaponType?: WeaponType,
    reason?: string
  ): void {
    if (victim.isDead) return;

    victim.isDead = true;
    victim.health = 0;
    victim.deaths++;
    victim.respawnTimerMs = COMBAT.RESPAWN_DELAY_MS;
    victim.vx = 0;
    victim.vy = 0;

    if (killer && killer.id !== victim.id) {
      killer.kills++;
      killer.score++;

      this.pendingEvents.push({
        id: `ev_kill_${Date.now()}_${Math.random()}`,
        type: 'kill',
        attackerId: killer.id,
        attackerName: killer.name,
        victimId: victim.id,
        victimName: victim.name,
        weaponType: weaponType || killer.currentWeapon,
      });

      // Check win condition
      if (killer.kills >= COMBAT.SCORE_TARGET && this.isMatchActive) {
        this.winnerId = killer.id;
        this.winnerName = killer.name;
        this.endMatch();
      }
    } else {
      // Suicide or fell in void
      this.pendingEvents.push({
        id: `ev_suicide_${Date.now()}_${Math.random()}`,
        type: 'suicide',
        victimId: victim.id,
        victimName: victim.name,
      });
    }
  }

  private respawnPlayer(player: PlayerState): void {
    // Pick spawn furthest from other players
    let bestSpawn = this.map.spawnPoints[0];
    let maxMinDist = -1;

    for (const sp of this.map.spawnPoints) {
      let minDistToPlayer = Infinity;
      for (const other of this.players.values()) {
        if (other.id === player.id || other.isDead) continue;
        const d = Math.hypot(other.x - sp.x, other.y - sp.y);
        if (d < minDistToPlayer) minDistToPlayer = d;
      }
      if (minDistToPlayer > maxMinDist) {
        maxMinDist = minDistToPlayer;
        bestSpawn = sp;
      }
    }

    player.x = bestSpawn.x;
    player.y = bestSpawn.y;
    player.vx = 0;
    player.vy = 0;
    player.health = COMBAT.MAX_HEALTH;
    player.fuel = 100;
    player.isDead = false;
    player.respawnTimerMs = 0;
    player.spawnProtected = true;
    player.spawnProtectTimerMs = COMBAT.SPAWN_PROTECTION_MS;
    player.ammo = WEAPONS[player.currentWeapon].magazineSize;
    player.isReloading = false;

    this.pendingEvents.push({
      id: `ev_respawn_${Date.now()}_${Math.random()}`,
      type: 'respawn',
      victimId: player.id,
      victimName: player.name,
    });
  }

  private endMatch(): void {
    this.isMatchActive = false;
    this.isMatchOver = true;

    // If no winner set by score, choose highest score
    if (!this.winnerId) {
      let topScore = -1;
      let topPlayer: PlayerState | null = null;
      for (const p of this.players.values()) {
        if (p.score > topScore) {
          topScore = p.score;
          topPlayer = p;
        }
      }
      if (topPlayer) {
        this.winnerId = topPlayer.id;
        this.winnerName = topPlayer.name;
      }
    }
  }

  public getSnapshot(): GameSnapshot {
    return {
      tick: this.tickCount,
      timestamp: Date.now(),
      matchTimeRemaining: Math.ceil(this.matchTimeRemaining),
      players: Array.from(this.players.values()).map((p) => ({ ...p })),
      projectiles: this.projectiles.map((pr) => ({ ...pr })),
    };
  }

  public flushEvents(): CombatEvent[] {
    const events = this.pendingEvents;
    this.pendingEvents = [];
    return events;
  }
}
