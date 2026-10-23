import {
  PHYSICS,
  FUEL,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PlayerState,
  PlayerInputFrame,
  MapData,
  BoxCollider,
} from '@jetpack-arena/shared';

export class PhysicsEngine {
  public static updatePlayer(
    player: PlayerState,
    input: PlayerInputFrame,
    dt: number,
    map: MapData
  ): void {
    if (player.isDead) return;

    // 1. Horizontal movement
    const targetVx = input.moveX * PHYSICS.RUN_SPEED;
    const accel = player.grounded
      ? (input.moveX !== 0 ? PHYSICS.GROUND_ACCELERATION : PHYSICS.GROUND_DECELERATION)
      : (input.moveX !== 0 ? PHYSICS.AIR_ACCELERATION : PHYSICS.AIR_DECELERATION);

    if (player.vx < targetVx) {
      player.vx = Math.min(targetVx, player.vx + accel * dt);
    } else if (player.vx > targetVx) {
      player.vx = Math.max(targetVx, player.vx - accel * dt);
    }

    // 2. Jetpack Boost
    let boostingThisFrame = false;
    if (input.boost && player.fuel > 0) {
      boostingThisFrame = true;
      player.vy += PHYSICS.BOOST_THRUST * dt;
      // Cap maximum upward climb speed
      if (player.vy < PHYSICS.MAX_UPWARD_VELOCITY) {
        player.vy = PHYSICS.MAX_UPWARD_VELOCITY;
      }
      player.fuel = Math.max(0, player.fuel - FUEL.DRAIN_PER_SEC * dt);
    } else {
      // Fuel recharge: when not boosting
      if (player.fuel < FUEL.MAX) {
        player.fuel = Math.min(FUEL.MAX, player.fuel + FUEL.RECHARGE_PER_SEC * dt);
      }
    }
    player.boosting = boostingThisFrame;

    // 3. Jump (instant upward impulse, only when grounded)
    if (input.jump && player.grounded) {
      player.vy = PHYSICS.JUMP_IMPULSE;
      player.grounded = false;
    }

    // 4. Gravity
    player.vy += PHYSICS.GRAVITY * dt;
    if (player.vy > PHYSICS.MAX_FALL_VELOCITY) {
      player.vy = PHYSICS.MAX_FALL_VELOCITY;
    }

    // 5. Tentative position update
    const prevX = player.x;
    const prevY = player.y;
    let newX = prevX + player.vx * dt;
    let newY = prevY + player.vy * dt;

    // 6. Collision resolution with map platforms (AABB)
    const halfW = PLAYER_WIDTH / 2;
    const halfH = PLAYER_HEIGHT / 2;

    player.grounded = false;

    // Check collisions with all platforms
    for (const plat of map.platforms) {
      // Horizontal collision check first
      const platLeft = plat.x;
      const platRight = plat.x + plat.w;
      const platTop = plat.y;
      const platBottom = plat.y + plat.h;

      // Check vertical intersection
      if (
        newX + halfW > platLeft &&
        newX - halfW < platRight
      ) {
        // Falling down onto platform top
        if (prevY + halfH <= platTop && newY + halfH >= platTop) {
          newY = platTop - halfH;
          player.vy = 0;
          player.grounded = true;
        }
        // Hitting ceiling / platform bottom from below
        else if (prevY - halfH >= platBottom && newY - halfH <= platBottom) {
          newY = platBottom + halfH;
          player.vy = 0;
        }
      }

      // Check horizontal collision against side of thick walls/ground
      if (
        newY + halfH > platTop &&
        newY - halfH < platBottom
      ) {
        // Moving right into left wall
        if (prevX + halfW <= platLeft && newX + halfW >= platLeft) {
          newX = platLeft - halfW;
          player.vx = 0;
        }
        // Moving left into right wall
        else if (prevX - halfW >= platRight && newX - halfW <= platRight) {
          newX = platRight + halfW;
          player.vx = 0;
        }
      }
    }

    // 7. World boundaries clamp
    if (newX - halfW < 0) {
      newX = halfW;
      player.vx = 0;
    } else if (newX + halfW > map.width) {
      newX = map.width - halfW;
      player.vx = 0;
    }

    if (newY - halfH < 0) {
      newY = halfH;
      player.vy = 0;
    }

    player.x = newX;
    player.y = newY;
    player.aimAngle = input.aimAngle;
  }

  public static checkAABB(
    box1: { x: number; y: number; w: number; h: number },
    box2: { x: number; y: number; w: number; h: number }
  ): boolean {
    return (
      box1.x < box2.x + box2.w &&
      box1.x + box1.w > box2.x &&
      box1.y < box2.y + box2.h &&
      box1.y + box1.h > box2.y
    );
  }

  public static checkPointInCircle(
    px: number,
    py: number,
    cx: number,
    cy: number,
    radius: number
  ): boolean {
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy <= radius * radius;
  }

  public static checkCircleBox(
    cx: number,
    cy: number,
    radius: number,
    box: BoxCollider
  ): boolean {
    const closestX = Math.max(box.x, Math.min(cx, box.x + box.w));
    const closestY = Math.max(box.y, Math.min(cy, box.y + box.h));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy <= radius * radius;
  }
}
