import { WeaponType } from '@jetpack-arena/shared';

export interface InputSnapshot {
  seq: number;
  moveX: number;
  jump: boolean;
  boost: boolean;
  aimAngle: number;
  fire: boolean;
  weaponType?: WeaponType;
  reload?: boolean;
  throwGrenade?: boolean;
}

export class InputController {
  private seq = 0;

  // State flags
  private keyLeft = false;
  private keyRight = false;
  private keyJump = false;
  private keyBoost = false;
  private keyFire = false;
  private keyReload = false;
  private keyGrenade = false;
  private selectedWeapon: WeaponType = 'rifle';

  // Mouse aim (desktop)
  private mouseAimAngle = 0;
  private isPointerDown = false;

  // Touch state
  private touchMoveX = 0;
  private touchJump = false;
  private touchBoost = false;
  private touchFire = false;
  private touchAimAngle = 0;

  // Active touch pointers by ID
  private joystickPointerId: number | null = null;
  private joystickStartX = 0;
  private joystickStartY = 0;

  // Aim joystick
  private aimJoystickPointerId: number | null = null;
  private aimJoystickCenterX = 0;
  private aimJoystickCenterY = 0;

  private isTouchDevice = false;

  // DOM elements for touch UI
  private touchContainer!: HTMLElement;
  private joystickBase!: HTMLElement;
  private joystickThumb!: HTMLElement;
  private reloadBtn!: HTMLElement;
  private grenadeBtn!: HTMLElement | null;
  private aimJoystickBase!: HTMLElement;
  private aimJoystickThumb!: HTMLElement;
  private aimDirectionLine!: HTMLElement;

  public onWeaponChange?: (weapon: WeaponType) => void;

  constructor() {
    this.isTouchDevice = Boolean('ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0));
    this.setupDesktopListeners();
    this.setupTouchUI();
  }

  private setupDesktopListeners(): void {
    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      switch (e.code) {
        case 'KeyA':
        case 'ArrowLeft':
          this.keyLeft = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keyRight = true;
          break;
        case 'KeyW':
        case 'ArrowUp':
        case 'Space':
          this.keyJump = true;
          this.keyBoost = true; // Space, W, Up Arrow activate jump AND jetpack boost!
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keyBoost = true;
          break;
        case 'KeyR':
          this.keyReload = true;
          break;
        case 'KeyG':
          this.keyGrenade = true;
          break;
        case 'Digit1':
          this.setWeapon('rifle');
          break;
        case 'Digit2':
          this.setWeapon('shotgun');
          break;
        case 'Digit3':
          this.setWeapon('rocket');
          break;
        case 'Digit4':
          this.setWeapon('sniper');
          break;
        case 'Digit5':
          this.setWeapon('uzi');
          break;
        case 'Digit6':
          this.setWeapon('pistol');
          break;
        case 'Digit7':
        case 'KeyV':
        case 'KeyF':
          this.setWeapon('knife');
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyA':
        case 'ArrowLeft':
          this.keyLeft = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keyRight = false;
          break;
        case 'KeyW':
        case 'ArrowUp':
        case 'Space':
          this.keyJump = false;
          this.keyBoost = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keyBoost = false;
          break;
        case 'KeyR':
          this.keyReload = false;
          break;
        case 'KeyG':
          this.keyGrenade = false;
          break;
      }
    });

    window.addEventListener('mousemove', (e) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      this.mouseAimAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    });

    window.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).closest('.interactive-ui')) return;
      if (e.button === 0) {
        this.isPointerDown = true;
      } else if (e.button === 2) {
        // Right click activates jetpack boost
        this.keyBoost = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isPointerDown = false;
      } else if (e.button === 2) {
        this.keyBoost = false;
      }
    });
  }

  private setupTouchUI(): void {
    this.touchContainer = document.getElementById('touch-controls-layer')!;
    if (!this.touchContainer) return;

    this.joystickBase = document.getElementById('joystick-base')!;
    this.joystickThumb = document.getElementById('joystick-thumb')!;
    this.reloadBtn = document.getElementById('btn-touch-reload')!;
    this.grenadeBtn = document.getElementById('btn-touch-grenade');
    this.aimJoystickBase = document.getElementById('aim-joystick-base')!;
    this.aimJoystickThumb = document.getElementById('aim-joystick-thumb')!;
    this.aimDirectionLine = document.getElementById('aim-direction-line')!;

    // Reload button
    if (this.reloadBtn) {
      this.reloadBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.keyReload = true;
        this.reloadBtn.classList.add('active');
      });
      const releaseReload = () => {
        this.reloadBtn.classList.remove('active');
      };
      this.reloadBtn.addEventListener('pointerup', releaseReload);
      this.reloadBtn.addEventListener('pointercancel', releaseReload);
    }

    // Grenade button
    if (this.grenadeBtn) {
      this.grenadeBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.keyGrenade = true;
        this.grenadeBtn?.classList.add('active');
      });
      const releaseGrenade = () => {
        this.grenadeBtn?.classList.remove('active');
      };
      this.grenadeBtn.addEventListener('pointerup', releaseGrenade);
      this.grenadeBtn.addEventListener('pointercancel', releaseGrenade);
    }

    // ---- 360° AIM JOYSTICK ----
    if (this.aimJoystickBase) {
      this.aimJoystickBase.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (this.aimJoystickPointerId !== null) return;
        this.aimJoystickPointerId = e.pointerId;

        const rect = this.aimJoystickBase.getBoundingClientRect();
        this.aimJoystickCenterX = rect.left + rect.width / 2;
        this.aimJoystickCenterY = rect.top + rect.height / 2;

        this.touchFire = true;
        this.aimJoystickBase.classList.add('active');
        if (this.aimDirectionLine) this.aimDirectionLine.style.display = 'block';
      });
    }

    // ---- JOYSTICK ZONE (left half) ----
    const joystickZone = document.getElementById('joystick-touch-zone')!;
    joystickZone.addEventListener('pointerdown', (e) => {
      if (this.joystickPointerId !== null) return;
      this.joystickPointerId = e.pointerId;
      this.joystickStartX = e.clientX;
      this.joystickStartY = e.clientY;

      this.joystickBase.style.display = 'block';
      this.joystickBase.style.left = `${e.clientX}px`;
      this.joystickBase.style.top = `${e.clientY}px`;
      this.joystickThumb.style.transform = `translate(-50%, -50%)`;
    });

    // ---- GLOBAL POINTER MOVE ----
    window.addEventListener('pointermove', (e) => {
      // Left joystick move
      if (e.pointerId === this.joystickPointerId) {
        const dx = e.clientX - this.joystickStartX;
        const dy = e.clientY - this.joystickStartY;
        const maxRadius = 55;
        const dist = Math.min(maxRadius, Math.hypot(dx, dy));
        const angle = Math.atan2(dy, dx);

        const clampedX = Math.cos(angle) * dist;
        const clampedY = Math.sin(angle) * dist;

        this.joystickThumb.style.transform = `translate(calc(-50% + ${clampedX}px), calc(-50% + ${clampedY}px))`;

        // Horizontal movement: normalized -1 to 1
        this.touchMoveX = Math.max(-1, Math.min(1, clampedX / 40));

        // Pulling joystick UP activates jetpack flight!
        if (dy < -20) {
          this.touchJump = true;
          this.touchBoost = true;
        } else {
          this.touchJump = false;
          this.touchBoost = false;
        }
      }

      // Right aim joystick move — 360° aiming
      if (e.pointerId === this.aimJoystickPointerId) {
        const dx = e.clientX - this.aimJoystickCenterX;
        const dy = e.clientY - this.aimJoystickCenterY;
        const dist = Math.hypot(dx, dy);

        if (dist > 5) {
          this.touchAimAngle = Math.atan2(dy, dx);

          // Move aim thumb visually
          const maxR = 30;
          const clampDist = Math.min(maxR, dist);
          const nx = Math.cos(this.touchAimAngle) * clampDist;
          const ny = Math.sin(this.touchAimAngle) * clampDist;
          this.aimJoystickThumb.style.transform = `translate(${nx}px, ${ny}px)`;

          // Rotate direction indicator line
          if (this.aimDirectionLine) {
            const degrees = (this.touchAimAngle * 180 / Math.PI) - 90;
            this.aimDirectionLine.style.transform = `rotate(${degrees}deg)`;
          }
        }
      }
    });

    // ---- GLOBAL POINTER UP ----
    const releasePointers = (e: PointerEvent) => {
      // Release left joystick
      if (e.pointerId === this.joystickPointerId) {
        this.joystickPointerId = null;
        this.touchMoveX = 0;
        this.touchJump = false;
        this.touchBoost = false;
        this.joystickBase.style.display = 'none';
        this.joystickThumb.style.transform = `translate(-50%, -50%)`;
      }

      // Release aim joystick
      if (e.pointerId === this.aimJoystickPointerId) {
        this.aimJoystickPointerId = null;
        this.touchFire = false;
        this.aimJoystickBase.classList.remove('active');
        this.aimJoystickThumb.style.transform = 'translate(0, 0)';
        if (this.aimDirectionLine) this.aimDirectionLine.style.display = 'none';
      }
    };

    window.addEventListener('pointerup', releasePointers);
    window.addEventListener('pointercancel', releasePointers);

    // ---- MOBILE WEAPON CART ----
    this.setupTouchWeaponCart();
  }

  private setupTouchWeaponCart(): void {
    const cart = document.getElementById('touch-weapon-cart');
    if (!cart) return;

    const slots = cart.querySelectorAll('.touch-weapon-slot');
    slots.forEach((slot) => {
      slot.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const weapon = (slot as HTMLElement).dataset.weapon as WeaponType;
        if (!weapon) return;

        this.setWeapon(weapon);

        // Update active visual state
        slots.forEach((s) => s.classList.remove('active'));
        slot.classList.add('active');
      });
    });
  }

  public setWeapon(weapon: WeaponType): void {
    this.selectedWeapon = weapon;
    if (this.onWeaponChange) {
      this.onWeaponChange(weapon);
    }
  }

  public getSelectedWeapon(): WeaponType {
    return this.selectedWeapon;
  }

  public pollInput(): InputSnapshot {
    this.seq++;

    // Combined horizontal input
    let moveX = 0;
    if (this.keyLeft) moveX -= 1;
    if (this.keyRight) moveX += 1;
    if (this.touchMoveX !== 0) moveX = this.touchMoveX;

    // Combined jump & boost
    const jump = this.keyJump || this.touchJump;
    const boost = this.keyBoost || this.touchBoost;

    // Combined aim angle
    let aimAngle = this.mouseAimAngle;
    if (this.isTouchDevice && this.aimJoystickPointerId !== null) {
      aimAngle = this.touchAimAngle;
    } else if (!this.isTouchDevice) {
      aimAngle = this.mouseAimAngle;
    } else {
      // When aim joystick is not actively touched, keep the last known touch aim
      aimAngle = this.touchAimAngle || this.mouseAimAngle;
    }

    // Combined fire
    const fire = this.isPointerDown || this.keyFire || this.touchFire;

    const reload = this.keyReload;
    this.keyReload = false; // consume trigger

    const throwGrenade = this.keyGrenade;
    this.keyGrenade = false; // consume trigger

    return {
      seq: this.seq,
      moveX: Math.max(-1, Math.min(1, moveX)),
      jump,
      boost,
      aimAngle,
      fire,
      weaponType: this.selectedWeapon,
      reload,
      throwGrenade,
    };
  }

  public showTouchControls(show: boolean): void {
    if (this.touchContainer) {
      const hasTouch = Boolean('ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0));
      this.touchContainer.style.display = (show && hasTouch) ? 'block' : 'none';

      const desktopCart = document.getElementById('hud-weapon-cart');
      if (desktopCart) {
        desktopCart.style.display = (show && hasTouch) ? 'none' : 'flex';
      }
    }
  }
}
