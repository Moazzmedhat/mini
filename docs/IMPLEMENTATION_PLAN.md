# Jetpack Arena — Implementation Plan

## Overview
Jetpack Arena is a 2D side-view multiplayer cartoon military arena shooter built for mobile browsers and desktop.
This implementation plan covers the complete architecture, execution steps, and acceptance criteria.

---

## Architecture Stack
- **Shared**: TypeScript contracts, packet definitions, physics constants, map layout geometry, weapon stats.
- **Server**: Node.js, Express, Socket.IO, server-authoritative physics simulation at 30-45 TPS, snapshot broadcasting at 20-30 Hz.
- **Client**: Phaser 3, Vite, TypeScript, responsive mobile touch controls (dual virtual sticks + action buttons), procedural particle & Web Audio synthesis for instantaneous, zero-latency sounds without external asset dependencies.
- **Testing**: Vitest for unit & integration testing of room lifecycle, physics boundaries, rate limiting, and 2-client simulated gameplay.

---

## Detailed Implementation Steps

### Phase 1: Planning and Scaffolding
- [x] Create project documentation (`docs/IMPLEMENTATION_PLAN.md`, `docs/ARCHITECTURE.md`).
- [ ] Scaffold root package structure with workspaces: `shared`, `server`, `client`.
- [ ] Configure TypeScript, Vite, Vitest, and unified dev/build scripts (`npm run dev`, `npm run build`, `npm run test`, `npm start`).
- [ ] Add `.env.example`, `.gitignore`, and health endpoint (`GET /health`).

### Phase 2: Shared Protocol & Map Geometry
- [ ] Centralize constants: player speeds, jump power, jetpack fuel drain/recharge, projectile speeds, weapon damage/cooldown.
- [ ] Shared map geometry representation (platforms, spawn points, boundaries).
- [ ] Typed Socket.IO event protocol: room actions, input frames, authoritative state snapshots, combat events, kill feed.

### Phase 3: Server-Authoritative Engine & Rooms
- [ ] `RoomManager`: Safe 5-character room code generator, room capacity (max 8), host election, host migration on disconnect.
- [ ] `Room` lifecycle: WAITING, STARTING (countdown), PLAYING, ROUND_OVER.
- [ ] `GameSimulation`: Fixed timestep tick loop.
  - Player physics: acceleration, gravity, jump impulse, jetpack thrust with fuel limits, platform collision resolution, world clamping.
  - Projectile simulation: trajectory, collision with map platforms and enemy hitboxes.
  - Combat resolution: health deduction, death state, respawn timer with temporary invulnerability (spawn shield), score tracking.
- [ ] Input handling: Rate-limited, validated client input packets (horizontal axis, jump button, boost button, aim angle, fire state).

### Phase 4: Client Core & Responsive Phaser Scene
- [ ] Dynamic canvas scaling with letterboxing / safe-area insets suitable for both mobile landscape and desktop viewports.
- [ ] Procedural asset generator: vector-style cartoon soldier graphics (chunky helmet, visor, jetpack exhaust nozzles, weapon arm pointing at aim angle, blue/red team palettes).
- [ ] Parallax arena background with multi-tier platforms, cover, and hazard zones.
- [ ] Particle systems: jetpack thrust flame/smoke, muzzle flash, bullet sparks, blood/impact sparks, shield halo.
- [ ] Web Audio sound engine: crisp procedural synth sound effects for jump, jetpack hiss, rifle shot, shotgun blast, hit thump, death explosion, respawn chirp.

### Phase 5: Mobile Touch & Desktop Controls
- [ ] Desktop: WASD / Arrow keys for movement/jump, Shift/Space for jetpack, mouse for aim and fire, R for reload/swap.
- [ ] Mobile: Multi-touch on-screen dual controls:
  - Left joystick for horizontal run & jump.
  - Jetpack boost hold button with immediate visual fuel gauge feedback.
  - Right-side aim pad & fire button supporting simultaneous hold-to-boost + aim + fire.
  - Touch event isolation (`preventDefault`, `touch-action: none`) preventing page pinch/scroll/zoom.
  - Device rotation guidance screen if played in portrait mode.

### Phase 6: Lobby UI & Match HUD
- [ ] Clean dark navy + neon lime HUD overlay.
- [ ] Lobby screen: Call sign input, Create Room, Join Room, shareable link (`?room=ABCDE`), ready state toggles, player count.
- [ ] In-game HUD: Health bar, Jetpack fuel meter, Weapon ammo & icon, Scoreboard, Kill feed alerts, Ping / connection status.
- [ ] End-of-round podium & rematch countdown.

### Phase 7: Verification & Testing
- [ ] Vitest unit tests:
  - Room code uniqueness & room creation/joining/leaving/capacity limit.
  - Player movement bounds, fuel consumption, jumping rules.
  - Weapon cooldowns, projectile raycasting, health reduction, death & respawn timers.
- [ ] Simulated 2-client multiplayer integration test over virtual sockets.
- [ ] Manual testing across simulated mobile viewport sizes and desktop.
- [ ] Documentation: `docs/QA_CHECKLIST.md` and `README.md`.
