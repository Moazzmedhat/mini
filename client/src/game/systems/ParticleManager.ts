import Phaser from 'phaser';

export class ParticleManager {
  private scene: Phaser.Scene;
  private gfx: Phaser.GameObjects.Graphics;

  private sparks: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: number;
    alpha: number;
    size: number;
    life: number;
    maxLife: number;
  }> = [];

  private explosions: Array<{
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    alpha: number;
    color: number;
  }> = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.gfx = scene.add.graphics();
    this.gfx.setDepth(20);
  }

  public emitHitSparks(x: number, y: number, color = 0xfacc15, count = 12): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 180;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        alpha: 1,
        size: 2 + Math.random() * 2,
        life: 0,
        maxLife: 0.25 + Math.random() * 0.2,
      });
    }
  }

  public emitMuzzleFlash(x: number, y: number, angle: number): void {
    for (let i = 0; i < 6; i++) {
      const spread = angle + (Math.random() - 0.5) * 0.5;
      const speed = 120 + Math.random() * 150;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(spread) * speed,
        vy: Math.sin(spread) * speed,
        color: 0x38bdf8,
        alpha: 1,
        size: 3,
        life: 0,
        maxLife: 0.12,
      });
    }
  }

  public emitExplosion(x: number, y: number, radius = 80): void {
    this.explosions.push({
      x,
      y,
      radius: 5,
      maxRadius: radius,
      alpha: 1,
      color: 0xf97316,
    });

    // Fire sparks
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 320;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        color: Math.random() > 0.5 ? 0xf97316 : 0xfacc15,
        alpha: 1,
        size: 3 + Math.random() * 3,
        life: 0,
        maxLife: 0.5 + Math.random() * 0.3,
      });
    }
  }

  public update(dt: number): void {
    this.gfx.clear();

    // 1. Draw & update explosions
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i];
      exp.radius += (exp.maxRadius - exp.radius) * 12 * dt;
      exp.alpha -= 2.2 * dt;

      if (exp.alpha <= 0) {
        this.explosions.splice(i, 1);
        continue;
      }

      this.gfx.fillStyle(exp.color, exp.alpha * 0.4);
      this.gfx.fillCircle(exp.x, exp.y, exp.radius);
      this.gfx.lineStyle(2.5, 0xfacc15, exp.alpha);
      this.gfx.strokeCircle(exp.x, exp.y, exp.radius);
    }

    // 2. Draw & update sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.life += dt;
      if (sp.life >= sp.maxLife) {
        this.sparks.splice(i, 1);
        continue;
      }

      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.vy += 300 * dt; // slight gravity on sparks
      const progress = sp.life / sp.maxLife;
      const currentAlpha = (1 - progress) * sp.alpha;

      this.gfx.fillStyle(sp.color, currentAlpha);
      this.gfx.fillCircle(sp.x, sp.y, sp.size * (1 - progress * 0.5));
    }
  }
}
