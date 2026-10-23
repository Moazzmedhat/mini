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
  private selectedWeapon: WeaponType = 'rifle';

  // Mouse aim (desktop)
  private mouseAimAngle = 0;
  private isPointerDown = false;

  // Touch state
  private touchMoveX = 0;
  private touchJump = false;
  private touchBoost = false;
  private touchFire = false;
  private touchAimAngle: number | null = null;

  // Active touch pointers by ID
  private joystickPointerId: number | null = null;
  private joystickStartX = 0;
  private joystickStartY = 0;

  private aimPointerId: number | null = null;
  private aimStartX = 0;
  private aimStartY = 0;

  private isTouchDevice = false;

  // DOM elements for touch UI
  private touchContainer!: HTMLElement;
  private joystickBase!: HTMLElement;
  private joystickThumb!: HTMLElement;
  private boostBtn!: HTMLElement;
  private fireBtn!: HTMLElement;
  private jumpBtn!: HTMLElement;
  private reloadBtn!: HTMLElement;

  constructor() {
    this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.setupDesktopListeners();
    this.setupTouchUI();
  }

  private setupDesktopListeners(): void {
    window.addEventListener('keydown', (e) => {
      // Ignore typing in input fields
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
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keyBoost = true;
          break;
        case 'KeyR':
          this.keyReload = true;
          break;
        case 'Digit1':
          this.selectedWeapon = 'rifle';
          break;
        case 'Digit2':
          this.selectedWeapon = 'shotgun';
          break;
        case 'Digit3':
          this.selectedWeapon = 'rocket';
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
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keyBoost = false;
          break;
        case 'KeyR':
          this.keyReload = false;
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
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isPointerDown = false;
      }
    });
  }

  private setupTouchUI(): void {
    this.touchContainer = document.getElementById('touch-controls-layer')!;
    if (!this.touchContainer) return;

    this.joystickBase = document.getElementById('joystick-base')!;
    this.joystickThumb = document.getElementById('joystick-thumb')!;
    this.boostBtn = document.getElementById('btn-touch-boost')!;
    this.fireBtn = document.getElementById('btn-touch-fire')!;
    this.jumpBtn = document.getElementById('btn-touch-jump')!;
    this.reloadBtn = document.getElementById('btn-touch-reload')!;

    // Boost button touch handling
    this.boostBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.touchBoost = true;
      this.boostBtn.classList.add('active');
    });
    const releaseBoost = (e: PointerEvent) => {
      e.preventDefault();
      this.touchBoost = false;
      this.boostBtn.classList.remove('active');
    };
    this.boostBtn.addEventListener('pointerup', releaseBoost);
    this.boostBtn.addEventListener('pointercancel', releaseBoost);

    // Fire button touch handling
    this.fireBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.touchFire = true;
      this.fireBtn.classList.add('active');
    });
    const releaseFire = (e: PointerEvent) => {
      e.preventDefault();
      this.touchFire = false;
      this.fireBtn.classList.remove('active');
    };
    this.fireBtn.addEventListener('pointerup', releaseFire);
    this.fireBtn.addEventListener('pointercancel', releaseFire);

    // Jump button touch handling
    this.jumpBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.touchJump = true;
      this.jumpBtn.classList.add('active');
    });
    const releaseJump = (e: PointerEvent) => {
      e.preventDefault();
      this.touchJump = false;
      this.jumpBtn.classList.remove('active');
    };
    this.jumpBtn.addEventListener('pointerup', releaseJump);
    this.jumpBtn.addEventListener('pointercancel', releaseJump);

    // Reload button
    this.reloadBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.keyReload = true;
    });

    // Joystick Touch Zone (left half of screen)
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

    window.addEventListener('pointermove', (e) => {
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

        // Swipe up on joystick can also trigger jump
        if (dy < -35) {
          this.touchJump = true;
        }
      }

      // Aim drag pad on right half
      if (e.pointerId === this.aimPointerId) {
        const dx = e.clientX - this.aimStartX;
        const dy = e.clientY - this.aimStartY;
        if (Math.hypot(dx, dy) > 10) {
          this.touchAimAngle = Math.atan2(dy, dx);
        }
      }
    });

    const releaseJoystick = (e: PointerEvent) => {
      if (e.pointerId === this.joystickPointerId) {
        this.joystickPointerId = null;
        this.touchMoveX = 0;
        this.joystickBase.style.display = 'none';
        this.joystickThumb.style.transform = `translate(-50%, -50%)`;
      }
      if (e.pointerId === this.aimPointerId) {
        this.aimPointerId = null;
      }
    };

    window.addEventListener('pointerup', releaseJoystick);
    window.addEventListener('pointercancel', releaseJoystick);

    // Aim drag area on right side
    const aimZone = document.getElementById('aim-touch-zone')!;
    aimZone.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('.touch-action-btn')) return;
      if (this.aimPointerId !== null) return;
      this.aimPointerId = e.pointerId;
      this.aimStartX = e.clientX;
      this.aimStartY = e.clientY;
    });
  }

  public setWeapon(weapon: WeaponType): void {
    this.selectedWeapon = weapon;
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
    if (this.touchAimAngle !== null) {
      aimAngle = this.touchAimAngle;
    }

    // Combined fire
    const fire = this.isPointerDown || this.keyFire || this.touchFire;

    const reload = this.keyReload;
    this.keyReload = false; // consume trigger

    return {
      seq: this.seq,
      moveX: Math.max(-1, Math.min(1, moveX)),
      jump,
      boost,
      aimAngle,
      fire,
      weaponType: this.selectedWeapon,
      reload,
    };
  }

  public showTouchControls(show: boolean): void {
    if (this.touchContainer) {
      const hasTouch = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
      this.touchContainer.style.display = (show && hasTouch) ? 'block' : 'none';
    }
  }
}
