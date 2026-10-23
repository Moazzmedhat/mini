import Phaser from 'phaser';
import { PlayerState, PLAYER_WIDTH, PLAYER_HEIGHT, WeaponType } from '@jetpack-arena/shared';

export class PlayerSprite extends Phaser.GameObjects.Container {
  public id: string;
  private isLocal: boolean;
  private skin: 'soldier' | 'player';

  // Sprites & Containers
  private jetpackBg: Phaser.GameObjects.Graphics;
  private jetpackFlame: Phaser.GameObjects.Image;
  private bodySprite: Phaser.GameObjects.Sprite;
  private weaponContainer: Phaser.GameObjects.Container;
  private weaponSprite: Phaser.GameObjects.Image;
  private muzzleFlash: Phaser.GameObjects.Image;
  private shieldBubble: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private healthBarBg: Phaser.GameObjects.Graphics;
  private healthBarFg: Phaser.GameObjects.Graphics;

  private currentWeaponType: WeaponType = 'rifle';
  private hurtTimer = 0;
  private muzzleFlashTimer = 0;

  constructor(scene: Phaser.Scene, id: string, name: string, color: string, isLocal: boolean) {
    super(scene, 0, 0);
    this.id = id;
    this.isLocal = isLocal;

    // Pick skin based on color or ID parity (e.g. green/orange = soldier, blue/purple/red = player)
    this.skin = (color === '#22c55e' || color === '#f97316') ? 'soldier' : 'player';

    // 1. Shield bubble (behind player)
    this.shieldBubble = scene.add.graphics();
    this.add(this.shieldBubble);

    // 2. Jetpack exhaust flame
    this.jetpackFlame = scene.add.image(-12, 16, 'fx_flame_01');
    this.jetpackFlame.setDisplaySize(18, 30);
    this.jetpackFlame.setOrigin(0.5, 0);
    this.jetpackFlame.setVisible(false);
    this.add(this.jetpackFlame);

    // 3. Jetpack backpack
    this.jetpackBg = scene.add.graphics();
    this.jetpackBg.fillStyle(0x334155, 1);
    this.jetpackBg.fillRoundedRect(-16, -10, 10, 22, 2);
    this.jetpackBg.fillStyle(0x64748b, 1);
    this.jetpackBg.fillRect(-15, 10, 8, 4); // nozzle
    this.add(this.jetpackBg);

    // 4. Character Body Sprite
    const initialTexture = `${this.skin}_idle`;
    this.bodySprite = scene.add.sprite(0, 0, scene.textures.exists(initialTexture) ? initialTexture : '__DEFAULT');
    this.bodySprite.setDisplaySize(44, 56);
    this.bodySprite.setOrigin(0.5, 0.5);
    this.add(this.bodySprite);

    // 5. Aimable Weapon Arm & Weapon Sprite
    this.weaponContainer = scene.add.container(2, 0);

    const initialWeaponTex = scene.textures.exists('weapon_rifle') ? 'weapon_rifle' : '__DEFAULT';
    this.weaponSprite = scene.add.image(14, 0, initialWeaponTex);
    this.weaponSprite.setDisplaySize(38, 17);
    this.weaponSprite.setOrigin(0.2, 0.5);
    this.weaponContainer.add(this.weaponSprite);

    // Muzzle flash on weapon tip
    this.muzzleFlash = scene.add.image(34, 0, 'fx_muzzle');
    this.muzzleFlash.setDisplaySize(20, 20);
    this.muzzleFlash.setOrigin(0.2, 0.5);
    this.muzzleFlash.setVisible(false);
    this.weaponContainer.add(this.muzzleFlash);

    this.add(this.weaponContainer);

    // 6. Nameplate Text
    this.nameText = scene.add.text(0, -PLAYER_HEIGHT / 2 - 20, name, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '11px',
      color: isLocal ? '#4ade80' : '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5);
    this.add(this.nameText);

    // 7. Health Bar
    this.healthBarBg = scene.add.graphics();
    this.healthBarBg.fillStyle(0x1e293b, 0.85);
    this.healthBarBg.fillRoundedRect(-18, -PLAYER_HEIGHT / 2 - 8, 36, 6, 2);
    this.add(this.healthBarBg);

    this.healthBarFg = scene.add.graphics();
    this.add(this.healthBarFg);

    scene.add.existing(this);
  }

  public setWeapon(weaponType: WeaponType): void {
    if (this.currentWeaponType === weaponType) return;
    this.currentWeaponType = weaponType;

    let texKey = 'weapon_rifle';
    let w = 38;
    let h = 17;

    if (weaponType === 'shotgun') {
      texKey = 'weapon_shotgun';
      w = 36;
      h = 14;
    } else if (weaponType === 'rocket') {
      texKey = 'weapon_rocketlauncher';
      w = 46;
      h = 18;
    }

    if (this.scene.textures.exists(texKey)) {
      this.weaponSprite.setTexture(texKey);
      this.weaponSprite.setDisplaySize(w, h);
    }
  }

  public triggerMuzzleFlash(): void {
    this.muzzleFlashTimer = 0.08;
    this.muzzleFlash.setVisible(true);
  }

  public triggerHurt(): void {
    this.hurtTimer = 0.2;
  }

  public updateState(state: PlayerState, dt: number): void {
    if (state.isDead) {
      this.setVisible(false);
      return;
    }
    this.setVisible(true);

    // Position interpolation
    if (this.isLocal) {
      this.setPosition(state.x, state.y);
    } else {
      this.x = Phaser.Math.Linear(this.x, state.x, 0.45);
      this.y = Phaser.Math.Linear(this.y, state.y, 0.45);
    }

    // Facing direction based on aim angle
    const facingLeft = Math.cos(state.aimAngle) < 0;
    this.bodySprite.setScale(facingLeft ? -1 : 1, 1);
    this.jetpackBg.setScale(facingLeft ? -1 : 1, 1);
    this.jetpackFlame.setX(facingLeft ? 12 : -12);

    // Weapon container rotation & scale inversion when looking left
    this.weaponContainer.setRotation(state.aimAngle);
    if (facingLeft) {
      this.weaponContainer.setScale(1, -1);
    } else {
      this.weaponContainer.setScale(1, 1);
    }

    // Sync weapon graphic if changed
    this.setWeapon(state.currentWeapon);

    // Update muzzle flash timer
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      if (this.muzzleFlashTimer <= 0) {
        this.muzzleFlash.setVisible(false);
      }
    }

    // Jetpack flame animation
    if (state.boosting) {
      this.jetpackFlame.setVisible(true);
      const flameTex = (Math.random() > 0.5) ? 'fx_flame_01' : 'fx_flame_02';
      if (this.scene.textures.exists(flameTex)) {
        this.jetpackFlame.setTexture(flameTex);
      }
      this.jetpackFlame.setScale((0.85 + Math.random() * 0.3) * (facingLeft ? -1 : 1), 0.85 + Math.random() * 0.3);
    } else {
      this.jetpackFlame.setVisible(false);
    }

    // Animation / Texture state logic
    if (this.hurtTimer > 0) {
      this.hurtTimer -= dt;
      this.setBodyTexture(`${this.skin}_hurt`);
    } else if (state.boosting || (!state.grounded && state.vy < -50)) {
      this.setBodyTexture(`${this.skin}_jump`);
    } else if (!state.grounded && state.vy > 50) {
      this.setBodyTexture(`${this.skin}_fall`);
    } else if (state.grounded && Math.abs(state.vx) > 20) {
      // Walking frame oscillation
      const walkFrame = Math.floor(this.scene.time.now / 150) % 2 === 0 ? 'walk1' : 'walk2';
      this.setBodyTexture(`${this.skin}_${walkFrame}`);
    } else {
      this.setBodyTexture(`${this.skin}_idle`);
    }

    // Spawn protection shield bubble
    this.shieldBubble.clear();
    if (state.spawnProtected) {
      const pulse = 1 + Math.sin(this.scene.time.now * 0.01) * 0.08;
      this.shieldBubble.lineStyle(2.5, 0x38bdf8, 0.85);
      this.shieldBubble.strokeCircle(0, 0, (PLAYER_HEIGHT / 2 + 8) * pulse);
      this.shieldBubble.fillStyle(0x38bdf8, 0.15);
      this.shieldBubble.fillCircle(0, 0, (PLAYER_HEIGHT / 2 + 8) * pulse);
    }

    // Health bar update
    this.healthBarFg.clear();
    const hpRatio = Math.max(0, Math.min(1, state.health / 100));
    let hpColor = 0x22c55e;
    if (hpRatio < 0.3) {
      hpColor = 0xef4444;
    } else if (hpRatio < 0.6) {
      hpColor = 0xeab308;
    }
    this.healthBarFg.fillStyle(hpColor, 1);
    this.healthBarFg.fillRoundedRect(-17, -PLAYER_HEIGHT / 2 - 7, 34 * hpRatio, 4, 1.5);
  }

  private setBodyTexture(textureKey: string): void {
    if (this.scene.textures.exists(textureKey) && this.bodySprite.texture.key !== textureKey) {
      this.bodySprite.setTexture(textureKey);
    }
  }
}
