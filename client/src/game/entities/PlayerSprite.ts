import Phaser from 'phaser';
import { PlayerState, PLAYER_WIDTH, PLAYER_HEIGHT } from '@jetpack-arena/shared';

export class PlayerSprite extends Phaser.GameObjects.Container {
  public id: string;
  private isLocal: boolean;

  // Visual sub-elements
  private bodyGfx: Phaser.GameObjects.Graphics;
  private weaponArm: Phaser.GameObjects.Container;
  private weaponGfx: Phaser.GameObjects.Graphics;
  private jetpackFlame: Phaser.GameObjects.Graphics;
  private shieldBubble: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private healthBarBg: Phaser.GameObjects.Graphics;
  private healthBarFg: Phaser.GameObjects.Graphics;

  // Smoothing targets
  public targetX = 0;
  public targetY = 0;
  public targetAngle = 0;

  constructor(scene: Phaser.Scene, id: string, name: string, color: string, isLocal: boolean) {
    super(scene, 0, 0);
    this.id = id;
    this.isLocal = isLocal;

    // 1. Shield bubble
    this.shieldBubble = scene.add.graphics();
    this.add(this.shieldBubble);

    // 2. Jetpack Thruster Flame
    this.jetpackFlame = scene.add.graphics();
    this.add(this.jetpackFlame);

    // 3. Body & Helmet Graphics
    this.bodyGfx = scene.add.graphics();
    this.renderSoldierBody(color);
    this.add(this.bodyGfx);

    // 4. Aimable Weapon Arm
    this.weaponArm = scene.add.container(0, -6);
    this.weaponGfx = scene.add.graphics();
    this.weaponArm.add(this.weaponGfx);
    this.renderWeapon('rifle');
    this.add(this.weaponArm);

    // 5. Nameplate Text
    this.nameText = scene.add.text(0, -PLAYER_HEIGHT / 2 - 20, name, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '11px',
      color: isLocal ? '#4ade80' : '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5);
    this.add(this.nameText);

    // 6. Health Bar
    this.healthBarBg = scene.add.graphics();
    this.healthBarBg.fillStyle(0x1e293b, 0.85);
    this.healthBarBg.fillRoundedRect(-18, -PLAYER_HEIGHT / 2 - 8, 36, 6, 2);
    this.add(this.healthBarBg);

    this.healthBarFg = scene.add.graphics();
    this.add(this.healthBarFg);

    scene.add.existing(this);
  }

  private renderSoldierBody(colorHex: string): void {
    const numColor = Phaser.Display.Color.HexStringToColor(colorHex).color;
    this.bodyGfx.clear();

    // Jetpack backpack (on back)
    this.bodyGfx.fillStyle(0x334155, 1);
    this.bodyGfx.fillRoundedRect(-14, -14, 8, 20, 2);
    // Exhaust nozzle
    this.bodyGfx.fillStyle(0x64748b, 1);
    this.bodyGfx.fillRect(-13, 6, 6, 4);

    // Legs / Boots
    this.bodyGfx.fillStyle(0x1e293b, 1);
    this.bodyGfx.fillRect(-10, 10, 8, 14); // Left leg
    this.bodyGfx.fillRect(2, 10, 8, 14);  // Right leg
    this.bodyGfx.fillStyle(0x0f172a, 1);
    this.bodyGfx.fillRect(-12, 20, 10, 5); // Boot
    this.bodyGfx.fillRect(2, 20, 10, 5);

    // Torso Armor
    this.bodyGfx.fillStyle(numColor, 1);
    this.bodyGfx.fillRoundedRect(-10, -8, 20, 20, 4);
    // Chest plate detail
    this.bodyGfx.fillStyle(0x0f172a, 0.6);
    this.bodyGfx.fillRect(-6, -4, 12, 10);

    // Helmet
    this.bodyGfx.fillStyle(0x334155, 1);
    this.bodyGfx.fillCircle(0, -16, 12);
    this.bodyGfx.fillStyle(numColor, 1);
    this.bodyGfx.fillRoundedRect(-10, -25, 20, 6, 2); // helmet crown

    // Sci-Fi Visor (glow cyan/lime)
    this.bodyGfx.fillStyle(0x38bdf8, 1);
    this.bodyGfx.fillRoundedRect(-2, -18, 12, 6, 2);
  }

  public renderWeapon(weaponType: string): void {
    this.weaponGfx.clear();

    if (weaponType === 'shotgun') {
      // Chunky shotgun
      this.weaponGfx.fillStyle(0x475569, 1);
      this.weaponGfx.fillRoundedRect(4, -4, 20, 8, 2);
      this.weaponGfx.fillStyle(0x94a3b8, 1);
      this.weaponGfx.fillRect(16, -5, 10, 4); // Twin barrels
      this.weaponGfx.fillRect(16, -1, 10, 4);
    } else if (weaponType === 'rocket') {
      // Big rocket launcher tube
      this.weaponGfx.fillStyle(0x059669, 1);
      this.weaponGfx.fillRoundedRect(2, -7, 28, 14, 3);
      this.weaponGfx.fillStyle(0x10b981, 1);
      this.weaponGfx.fillRect(26, -6, 6, 12); // Nozzle
    } else {
      // Default Pulse Rifle
      this.weaponGfx.fillStyle(0x1e293b, 1);
      this.weaponGfx.fillRoundedRect(4, -4, 22, 7, 2);
      this.weaponGfx.fillStyle(0x38bdf8, 1);
      this.weaponGfx.fillRect(12, -2, 8, 3); // Energy magazine
      this.weaponGfx.fillStyle(0x64748b, 1);
      this.weaponGfx.fillRect(24, -3, 6, 5); // Muzzle
    }
  }

  public updateState(state: PlayerState, dt: number): void {
    // Dead visibility
    if (state.isDead) {
      this.setVisible(false);
      return;
    }
    this.setVisible(true);

    // Smooth position interpolation
    if (this.isLocal) {
      this.setPosition(state.x, state.y);
    } else {
      // Lerp remote player towards authoritative coordinates
      this.x = Phaser.Math.Linear(this.x, state.x, 0.45);
      this.y = Phaser.Math.Linear(this.y, state.y, 0.45);
    }

    // Facing direction
    const facingLeft = Math.cos(state.aimAngle) < 0;
    this.bodyGfx.setScale(facingLeft ? -1 : 1, 1);

    // Weapon arm rotation
    this.weaponArm.setRotation(state.aimAngle);
    if (facingLeft) {
      this.weaponArm.setScale(1, -1);
    } else {
      this.weaponArm.setScale(1, 1);
    }

    // Jetpack thruster flame
    this.jetpackFlame.clear();
    if (state.boosting) {
      const flameLength = 12 + Math.random() * 8;
      this.jetpackFlame.fillStyle(0xf97316, 0.9); // Orange
      this.jetpackFlame.fillTriangle(-12, 10, -6, 10, -9, 10 + flameLength);
      this.jetpackFlame.fillStyle(0xfacc15, 0.9); // Yellow core
      this.jetpackFlame.fillTriangle(-11, 10, -7, 10, -9, 10 + flameLength * 0.6);
    }

    // Spawn protection shield bubble
    this.shieldBubble.clear();
    if (state.spawnProtected) {
      const pulse = 1 + Math.sin(this.scene.time.now * 0.01) * 0.08;
      this.shieldBubble.lineStyle(2.5, 0x38bdf8, 0.85);
      this.shieldBubble.strokeCircle(0, 0, (PLAYER_HEIGHT / 2 + 6) * pulse);
      this.shieldBubble.fillStyle(0x38bdf8, 0.15);
      this.shieldBubble.fillCircle(0, 0, (PLAYER_HEIGHT / 2 + 6) * pulse);
    }

    // Health bar update
    this.healthBarFg.clear();
    const hpRatio = Math.max(0, Math.min(1, state.health / 100));
    let hpColor = 0x22c55e; // Green
    if (hpRatio < 0.3) {
      hpColor = 0xef4444; // Red
    } else if (hpRatio < 0.6) {
      hpColor = 0xeab308; // Yellow
    }
    this.healthBarFg.fillStyle(hpColor, 1);
    this.healthBarFg.fillRoundedRect(-17, -PLAYER_HEIGHT / 2 - 7, 34 * hpRatio, 4, 1.5);
  }
}
