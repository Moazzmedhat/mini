import Phaser from 'phaser';
import { PlayerState, PLAYER_WIDTH, PLAYER_HEIGHT, WeaponType } from '@jetpack-arena/shared';

export class PlayerSprite extends Phaser.GameObjects.Container {
  public id: string;
  private isLocal: boolean;
  public skin: string;

  // Sprites & Containers
  private jetpackBg: Phaser.GameObjects.Graphics;
  private jetpackFlame: Phaser.GameObjects.Image;
  private bodySprite: Phaser.GameObjects.Sprite;
  private weaponContainer: Phaser.GameObjects.Container;
  private weaponSprite: Phaser.GameObjects.Image;
  private handGfx: Phaser.GameObjects.Graphics;
  private muzzleFlash: Phaser.GameObjects.Image;
  private shieldBubble: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private healthBarBg: Phaser.GameObjects.Graphics;
  private healthBarFg: Phaser.GameObjects.Graphics;

  private currentWeaponType: WeaponType = 'rifle';
  private hurtTimer = 0;
  private muzzleFlashTimer = 0;

  constructor(scene: Phaser.Scene, id: string, name: string, color: string, skin: string, isLocal: boolean) {
    super(scene, 0, 0);
    this.id = id;
    this.isLocal = isLocal;
    this.skin = skin || 'soldier';

    // 1. Forcefield shield bubble
    this.shieldBubble = scene.add.graphics();
    this.add(this.shieldBubble);

    // 2. Jetpack exhaust flame
    this.jetpackFlame = scene.add.image(-14, 18, 'fx_flame_01');
    this.jetpackFlame.setDisplaySize(20, 32);
    this.jetpackFlame.setOrigin(0.5, 0);
    this.jetpackFlame.setVisible(false);
    this.add(this.jetpackFlame);

    // 3. Jetpack backpack
    this.jetpackBg = scene.add.graphics();
    this.renderJetpackPack();
    this.add(this.jetpackBg);

    // 4. Character Body Sprite
    const initialTexture = `${this.skin}_idle`;
    const textureToUse = scene.textures.exists(initialTexture) ? initialTexture : 'soldier_idle';
    this.bodySprite = scene.add.sprite(0, 0, scene.textures.exists(textureToUse) ? textureToUse : '__DEFAULT');
    this.bodySprite.setDisplaySize(46, 58);
    this.bodySprite.setOrigin(0.5, 0.5);
    this.add(this.bodySprite);

    // 5. Aimable Weapon Arm & Weapon Sprite
    this.weaponContainer = scene.add.container(6, 4);

    const initialWeaponTex = scene.textures.exists('weapon_rifle') ? 'weapon_rifle' : '__DEFAULT';
    this.weaponSprite = scene.add.image(10, 0, initialWeaponTex);
    this.weaponSprite.setDisplaySize(38, 16);
    this.weaponSprite.setOrigin(0.2, 0.5);
    this.weaponContainer.add(this.weaponSprite);

    // Gloved tactical hand holding weapon handle
    this.handGfx = scene.add.graphics();
    this.handGfx.fillStyle(0x1e293b, 1);
    this.handGfx.fillCircle(10, 2, 4);
    this.handGfx.fillStyle(0x0284c7, 1);
    this.handGfx.fillRect(4, 0, 6, 4); // cuff
    this.weaponContainer.add(this.handGfx);

    // Muzzle flash on weapon tip
    this.muzzleFlash = scene.add.image(32, 0, 'fx_muzzle');
    this.muzzleFlash.setDisplaySize(22, 22);
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
    this.healthBarBg.fillStyle(0x0f172a, 0.9);
    this.healthBarBg.fillRoundedRect(-18, -PLAYER_HEIGHT / 2 - 8, 36, 6, 2);
    this.add(this.healthBarBg);

    this.healthBarFg = scene.add.graphics();
    this.add(this.healthBarFg);

    scene.add.existing(this);
  }

  private renderJetpackPack(): void {
    this.jetpackBg.clear();
    // Armored canister
    this.jetpackBg.fillStyle(0x1e293b, 1);
    this.jetpackBg.fillRoundedRect(-18, -10, 10, 24, 3);
    // Cyan LED energy line
    this.jetpackBg.fillStyle(0x38bdf8, 1);
    this.jetpackBg.fillRect(-17, -4, 2, 12);
    // Exhaust nozzle
    this.jetpackBg.fillStyle(0x475569, 1);
    this.jetpackBg.fillRect(-17, 12, 8, 5);
  }

  public setWeapon(weaponType: WeaponType): void {
    if (this.currentWeaponType === weaponType) return;
    this.currentWeaponType = weaponType;

    let texKey = 'weapon_rifle';
    let w = 38;
    let h = 16;
    let muzzleX = 32;

    switch (weaponType) {
      case 'shotgun':
        texKey = 'weapon_shotgun';
        w = 36;
        h = 13;
        muzzleX = 30;
        break;
      case 'rocket':
        texKey = 'weapon_rocketlauncher';
        w = 46;
        h = 18;
        muzzleX = 38;
        break;
      case 'sniper':
        texKey = 'weapon_sniper';
        w = 48;
        h = 14;
        muzzleX = 40;
        break;
      case 'uzi':
        texKey = 'weapon_uzi';
        w = 28;
        h = 16;
        muzzleX = 22;
        break;
      case 'pistol':
        texKey = 'weapon_pistol';
        w = 24;
        h = 15;
        muzzleX = 18;
        break;
    }

    if (this.scene.textures.exists(texKey)) {
      this.weaponSprite.setTexture(texKey);
      this.weaponSprite.setDisplaySize(w, h);
      this.muzzleFlash.setX(muzzleX);
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

    if (state.skin && state.skin !== this.skin) {
      this.skin = state.skin;
    }

    // Position interpolation
    if (this.isLocal) {
      this.setPosition(state.x, state.y);
    } else {
      this.x = Phaser.Math.Linear(this.x, state.x, 0.45);
      this.y = Phaser.Math.Linear(this.y, state.y, 0.45);
    }

    // Facing direction
    const facingLeft = Math.cos(state.aimAngle) < 0;
    this.bodySprite.setFlipX(facingLeft);
    this.jetpackBg.setScale(facingLeft ? -1 : 1, 1);
    this.jetpackFlame.setX(facingLeft ? 14 : -14);

    // Shoulder attachment point shifts slightly when character turns
    this.weaponContainer.setPosition(facingLeft ? -6 : 6, 4);
    this.weaponContainer.setRotation(state.aimAngle);
    if (facingLeft) {
      this.weaponContainer.setScale(1, -1);
    } else {
      this.weaponContainer.setScale(1, 1);
    }

    // Weapon texture
    this.setWeapon(state.currentWeapon);

    // Muzzle flash timer
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      if (this.muzzleFlashTimer <= 0) {
        this.muzzleFlash.setVisible(false);
      }
    }

    // Jetpack flame
    if (state.boosting) {
      this.jetpackFlame.setVisible(true);
      const flameTex = (Math.random() > 0.5) ? 'fx_flame_01' : 'fx_flame_02';
      if (this.scene.textures.exists(flameTex)) {
        this.jetpackFlame.setTexture(flameTex);
      }
      this.jetpackFlame.setScale((0.9 + Math.random() * 0.3) * (facingLeft ? -1 : 1), 0.9 + Math.random() * 0.3);
    } else {
      this.jetpackFlame.setVisible(false);
    }

    // State animation texture
    if (this.hurtTimer > 0) {
      this.hurtTimer -= dt;
      this.setBodyTexture(`${this.skin}_hurt`);
    } else if (state.boosting || (!state.grounded && state.vy < -40)) {
      this.setBodyTexture(`${this.skin}_jump`);
    } else if (!state.grounded && state.vy > 40) {
      this.setBodyTexture(`${this.skin}_fall`);
    } else if (state.grounded && Math.abs(state.vx) > 15) {
      const walkFrame = Math.floor(this.scene.time.now / 140) % 2 === 0 ? 'walk1' : 'walk2';
      this.setBodyTexture(`${this.skin}_${walkFrame}`);
    } else {
      this.setBodyTexture(`${this.skin}_idle`);
    }

    // Spawn protection shield bubble
    this.shieldBubble.clear();
    if (state.spawnProtected) {
      const pulse = 1 + Math.sin(this.scene.time.now * 0.012) * 0.08;
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
    } else if (!this.scene.textures.exists(textureKey)) {
      // Fallback
      const fallbackKey = 'soldier_idle';
      if (this.scene.textures.exists(fallbackKey) && this.bodySprite.texture.key !== fallbackKey) {
        this.bodySprite.setTexture(fallbackKey);
      }
    }
  }
}
