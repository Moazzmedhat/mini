# Jetpack Arena — System Architecture

## 1. System Overview

Jetpack Arena is structured as an authoritative client-server multiplayer game. The server executes the core physics and combat loop at a fixed rate, ensuring no client can spoof movement speeds, teleport, or report forged damage.

```
+-------------------------------------------------------------------------+
|                              Client (Browser)                           |
|                                                                         |
|  +------------------+   +-------------------+   +--------------------+  |
|  |   HTML/CSS UI    |   |    Phaser 3 2D    |   |     Touch & Key    |  |
|  |  (Lobby, HUD,    |   |  (Render, Camera, |   |      Input System  |  |
|  |   Leaderboard)   |   |   Particles, SFX) |   |  (Dual Virtual Pad)|  |
|  +--------+---------+   +---------+---------+   +---------+----------+  |
|           |                       ^                       |             |
|           v                       |                       v             |
|  +--------------------------------+----------------------------------+  |
|  |                     Client Network Controller                     |  |
|  |           (Socket.IO client, interpolation buffer, prediction)    |  |
|  +--------------------------------+----------------------------------+  |
+-----------------------------------|-------------------------------------+
                                    | WebSockets (Socket.IO)
                                    v
+-----------------------------------|-------------------------------------+
|                              Node.js Server                             |
|                                                                         |
|  +--------------------------------+----------------------------------+  |
|  |                     Server Network Manager                        |  |
|  |      (Express HTTP, Socket.IO Server, Rate-Limiting, Validation)  |  |
|  +--------------------------------+----------------------------------+  |
|                                   |                                     |
|  +------------------+   +---------v---------+   +--------------------+  |
|  |   Room Manager   |   |  Game Simulation  |   |  Weapon & Combat   |  |
|  | (Code gen, hosts,|   | (Authoritative 30 |   | (Projectiles, hits,|  |
|  |  players, states)|   |  Hz tick physics) |   |  damage, respawns) |  |
|  +------------------+   +-------------------+   +--------------------+  |
+-------------------------------------------------------------------------+
```

---

## 2. Directory Structure

```
/
├── shared/             # TypeScript models, packet schemas, constants, map data
│   ├── constants.ts    # Physics, weapons, tick rates, fuel drain rates
│   ├── protocol.ts     # Socket.IO event names and payload typings
│   ├── types.ts        # Game state entities: Player, Projectile, Room
│   └── map.ts          # Map geometry (platforms, spawns, boundaries)
├── server/             # Authoritative backend
│   ├── src/
│   │   ├── index.ts              # Express HTTP & Socket.IO initialization
│   │   ├── rooms/RoomManager.ts  # Room lifecycle, code generation, host handling
│   │   ├── game/GameSimulation.ts# Physics engine, movement, collisions, tick loop
│   │   ├── game/Weapons.ts       # Fire rate, ammo, projectile logic, damage
│   │   └── networking/handler.ts # Socket event registration, rate limiting
│   └── package.json
├── client/             # Frontend browser client
│   ├── index.html
│   ├── src/
│   │   ├── main.ts               # App entrypoint, lobby wiring, scene mounting
│   │   ├── game/
│   │   │   ├── config.ts         # Phaser game config, scale manager
│   │   │   ├── scenes/ArenaScene.ts # Main combat scene, rendering, camera
│   │   │   ├── entities/PlayerSprite.ts # Soldier rendering, visual states
│   │   │   ├── systems/ParticleManager.ts # Jetpack fire, sparks, explosions
│   │   │   └── audio/SoundSynth.ts # Zero-latency procedural Web Audio sound FX
│   │   └── ui/
│   │       ├── TouchControls.ts  # Multi-touch dual joystick & action buttons
│   │       ├── HUD.ts            # Health, fuel, weapon, kill feed, timer
│   │       └── Lobby.ts          # Room creation, joining, ready check, callsign
│   └── package.json
├── tests/              # Vitest suites for unit & integration testing
└── docs/               # Architecture, Implementation Plan, QA Checklist
```

---

## 3. Network Architecture & Protocol

### 3.1 Network Frequency & Sync
- **Server Tick Rate**: 30 Hz (33.3ms interval).
- **Snapshot Rate**: 30 Hz state broadcast to active players in room.
- **Client Input Rate**: Sent at client frame rate capped to 30 Hz.
- **Entity Interpolation**: Remote entities smoothly interpolated over a 60–100ms render buffer with cubic/linear blending to prevent jitter under minor network latency.

### 3.2 Client to Server Packets
| Event | Payload | Validation & Security |
|---|---|---|
| `room:create` | `{ callsign: string }` | Sanitized name (1–16 chars, alphanumeric + spaces). Max rooms limit. |
| `room:join` | `{ code: string, callsign: string }` | Validates 5-letter code, max 8 players, sanitized callsign. |
| `room:ready` | `{ ready: boolean }` | Must be in room; host checks all ready. |
| `match:start` | `{}` | Only host can initiate match start. |
| `player:input` | `{ seq: number, moveX: number, jump: boolean, boost: boolean, aimAngle: number, fire: boolean }` | Clamped values: moveX [-1, 1], aimAngle [-π, π]. Rate-limited. |
| `player:reload`| `{}` | Validates weapon state and reload timer. |
| `room:leave` | `{}` | Cleans up player state, triggers host migration or room destruction if empty. |

### 3.3 Server to Client Packets
| Event | Payload | Purpose |
|---|---|---|
| `room:state` | `{ room: RoomDTO }` | Updates member list, host ID, ready statuses, room code. |
| `match:countdown` | `{ seconds: number }` | 3..2..1..GO countdown overlay. |
| `game:snapshot` | `{ tick: number, players: PlayerState[], projectiles: ProjectileState[] }` | Authoritative entity positions, velocities, fuel, health. |
| `combat:event` | `{ type: 'hit'\|'kill'\|'respawn', attackerId?, victimId, weaponId }` | Triggers UI kill feed, hit markers, audio cues. |
| `match:end` | `{ scoreboard: ScoreboardEntry[], winnerId: string }` | Displays post-game screen and rematch countdown. |
| `error:message` | `{ message: string }` | Shows safe user-facing notification toast. |

---

## 4. Physics & Combat Design

### 4.1 Movement Physics
- **Units**: Pixels / World Units.
- **Gravity**: 950 px/s².
- **Horizontal Speed**: Run speed capped at 260 px/s with ground friction deceleration. Air acceleration is 70% of ground.
- **Jump**: Instant upward impulse of -400 px/s, permitted only when player `grounded` flag is true (checked against platform AABB tops).
- **Jetpack Boost**: Applies upward acceleration of -1350 px/s² while boosting, capping vertical upward velocity at -420 px/s.
- **Fuel System**: Max fuel 100. Boosting consumes ~35 fuel/sec. When grounded or falling without boost, recharges at ~30 fuel/sec after a 0.25s delay.

### 4.2 Weapons
1. **Assault Rifle**:
   - Damage: 14 per hit
   - Fire Rate: 7.5 rounds/sec (133ms cooldown)
   - Magazine: 25 rounds (Reload: 1.2s)
   - Velocity: 1100 px/s projectile with slight spread (±2.5°)
2. **Combat Shotgun**:
   - Damage: 9 per pellet (5 pellets per blast = up to 45 dmg)
   - Fire Rate: 1.5 rounds/sec (660ms cooldown)
   - Magazine: 6 shells (Reload: 1.5s)
   - Velocity: 950 px/s projectile with spread cone (±15°)
3. **Plasma Rocket**:
   - Damage: 60 direct / 35 splash radius
   - Fire Rate: 0.9 rounds/sec
   - Magazine: 3 rockets (Reload: 2.0s)
   - Velocity: 600 px/s rocket with visual trail and explosion radius (80px)

---

## 5. Mobile Ergonomics

- Dual-touch system using native Pointer Events:
  - Left Zone: Floating or static Virtual D-Pad / Joystick for lateral movement and jump swipe.
  - Right Zone: Dedicated Boost Button (easy thumb rest) + Aim Pad & Fire Button.
- Touch action `touch-action: none` and user-select disabled across viewport to prevent accidental gesture zoom or scrolling.
- Responsive scale manager maintaining a 16:9 or 19.5:9 target aspect ratio with adaptive viewport padding for notches and dynamic island.
