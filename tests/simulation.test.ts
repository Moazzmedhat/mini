import { describe, it, expect, beforeEach } from 'vitest';
import { GameSimulation } from '../server/src/game/GameSimulation.js';
import { PHYSICS, FUEL, COMBAT, WEAPONS } from '@jetpack-arena/shared';

describe('GameSimulation Physics & Combat', () => {
  let sim: GameSimulation;

  beforeEach(() => {
    sim = new GameSimulation();
  });

  it('initializes player with full health, fuel, and default rifle', () => {
    const player = sim.addPlayer('p1', 'Alpha', '#ff0000');
    expect(player.health).toBe(COMBAT.MAX_HEALTH);
    expect(player.fuel).toBe(100);
    expect(player.currentWeapon).toBe('rifle');
    expect(player.ammo).toBe(WEAPONS.rifle.magazineSize);
    expect(player.grenades).toBe(3);
    expect(player.isDead).toBe(false);
  });

  it('drains fuel when boosting and recharges when idle', () => {
    const player = sim.addPlayer('p1', 'Alpha', '#ff0000');
    player.y = 500; // mid-air

    // Boost for 1 second (30 ticks)
    for (let i = 0; i < 30; i++) {
      sim.receiveInput('p1', {
        seq: i,
        moveX: 0,
        jump: false,
        boost: true,
        aimAngle: 0,
        fire: false,
      });
      sim.update(1 / 30);
    }

    expect(player.fuel).toBeLessThan(100);
    expect(player.fuel).toBeGreaterThan(50);

    const drainedFuel = player.fuel;

    // Idle for 1 second (fuel should recharge)
    for (let i = 0; i < 30; i++) {
      sim.receiveInput('p1', {
        seq: 30 + i,
        moveX: 0,
        jump: false,
        boost: false,
        aimAngle: 0,
        fire: false,
      });
      sim.update(1 / 30);
    }

    expect(player.fuel).toBeGreaterThan(drainedFuel);
  });

  it('allows jump only when grounded', () => {
    const player = sim.addPlayer('p1', 'Alpha', '#ff0000');
    player.grounded = true;
    player.vy = 0;

    sim.receiveInput('p1', {
      seq: 1,
      moveX: 0,
      jump: true,
      boost: false,
      aimAngle: 0,
      fire: false,
    });
    sim.update(1 / 30);

    expect(player.vy).toBeLessThan(0); // Upward impulse applied
    expect(player.grounded).toBe(false);
  });

  it('fires weapon, decrements ammo, and produces projectiles', () => {
    sim.addPlayer('p1', 'Alpha', '#ff0000');
    sim.startMatch();

    expect(sim.projectiles.length).toBe(0);

    sim.receiveInput('p1', {
      seq: 1,
      moveX: 0,
      jump: false,
      boost: false,
      aimAngle: 0,
      fire: true,
    });
    sim.update(1 / 30);

    const player = sim.players.get('p1')!;
    expect(player.ammo).toBe(WEAPONS.rifle.magazineSize - 1);
    expect(sim.projectiles.length).toBe(1);
    expect(sim.projectiles[0].ownerId).toBe('p1');
  });

  it('applies damage and handles death and respawn', () => {
    const p1 = sim.addPlayer('p1', 'Attacker', '#ff0000');
    const p2 = sim.addPlayer('p2', 'Victim', '#0000ff');
    sim.startMatch();

    p2.spawnProtected = false; // remove spawn protection for direct damage test
    expect(p2.health).toBe(100);

    sim.applyDamage(p2, 30, 'p1', 'rifle');
    expect(p2.health).toBe(70);

    // Fatal damage
    sim.applyDamage(p2, 80, 'p1', 'rifle');
    expect(p2.health).toBe(0);
    expect(p2.isDead).toBe(true);
    expect(p1.kills).toBe(1);
    expect(p2.deaths).toBe(1);
    expect(p2.respawnTimerMs).toBeGreaterThan(0);
  });

  it('throws grenade with arc trajectory and consumes grenade ammo', () => {
    const p1 = sim.addPlayer('p1', 'Thrower', '#ff0000');
    sim.startMatch();

    expect(p1.grenades).toBe(3);
    expect(sim.grenades.length).toBe(0);

    sim.receiveInput('p1', {
      seq: 1,
      moveX: 0,
      jump: false,
      boost: false,
      aimAngle: -Math.PI / 4, // 45 degrees up-right
      fire: false,
      throwGrenade: true,
    });
    sim.update(1 / 30);

    expect(p1.grenades).toBe(2);
    expect(sim.grenades.length).toBe(1);
    expect(sim.grenades[0].ownerId).toBe('p1');
    expect(sim.grenades[0].vx).toBeGreaterThan(0);
    expect(sim.grenades[0].vy).toBeLessThan(0); // upward velocity initially
  });
});
