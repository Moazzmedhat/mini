# Jetpack Arena

A mobile-browser-first, fast-paced 2D online multiplayer jetpack arena shooter built with **Phaser 3**, **Node.js**, **Express**, **Socket.IO**, and **TypeScript**.

Inspired by classic 2D mobile jetpack shooters, **Jetpack Arena** features side-view arena combat, original cartoon soldier characters, server-authoritative physics, jetpack flight, aiming, shooting, multiple weapons, and real-time multiplayer with shareable room codes.

---

## Features

- **Real-Time Authoritative Multiplayer**: 30 Hz server simulation tick loop for movement, platform collisions, weapons, damage, respawns, and room lifecycles.
- **Mobile-Browser-First Dual-Touch Controls**: Floating virtual joystick on the left, aim zone + hold-to-boost button + fire button on the right with multi-touch pointer isolation (`touch-action: none`).
- **Desktop Controls**: Full WASD / Arrow movement, Space / W jumping, Shift jetpack boost, mouse aiming and left-click firing, R reloading, and 1/2/3 weapon switching.
- **Original Cartoon Soldiers**: Distinct silhouettes, helmets, glowing visors, animated jetpack exhaust nozzles with dynamic flame/smoke particles, and aimable weapon arms.
- **Procedural Sound Engine**: Zero-latency Web Audio API synthesizer for gunshots, shotgun blasts, rocket whoosh, explosions, jetpack thrust hissing, hits, kills, and reloads without relying on external audio assets.
- **Room Code System**: Private 5-character rooms with collision-resistant codes (omitting ambiguous characters `0`, `O`, `1`, `I`), automatic host migration, and one-click shareable URLs (`?room=ABCDE`).
- **Sci-Fi Outpost Map**: Multi-tier metallic platforms, catwalks, high sniper decks, and open airspace for jetpack maneuvers.

---

## Quick Start

### Prerequisites
- **Node.js**: v18.0.0 or later (tested on v24.14.0)
- **npm**: v9.0.0 or later

### Installation
```bash
# Install all workspace dependencies (shared, server, client)
npm install
```

### Development Mode
Starts both the backend Socket.IO server (port 3000) and the Vite client dev server (port 5173) with hot reload:
```bash
npm run dev
```
Open **http://localhost:5173** in your browser.

### Production Build & Run
Builds the shared TypeScript library, server, and client bundle:
```bash
npm run build
npm start
```
Open **http://localhost:3000** in your browser.

---

## Testing

Run unit and integration test suites:
```bash
npm test
```
The test suite covers:
- Safe room code generation and uniqueness.
- Room creation, joining, capacity limits, and host migration.
- Player movement, gravity, jump grounding checks, and jetpack fuel drain/recharge.
- Weapon fire rates, ammo consumption, projectile trajectories, damage calculations, and respawn timers.
- Two-client real network integration test over simulated Socket.IO connections.

---

## Mobile Phone Testing (LAN)

To play on your mobile phone on the same Wi-Fi network:
1. Find your computer's local IP address (e.g. `192.168.1.50`).
2. Start the dev server (`npm run dev`) or production server (`npm start`).
3. Open your mobile browser (Safari on iPhone or Chrome on Android) and navigate to:
   - Dev mode: `http://<YOUR_IP>:5173`
   - Production: `http://<YOUR_IP>:3000`
4. Create a room on your computer and join with the 5-letter code or share link from your phone.

---

## Controls

### Desktop
| Action | Key / Input |
|---|---|
| Run Left / Right | `A` / `D` or Left / Right Arrows |
| Jump | `W` / Space (when on a platform) |
| Jetpack Boost | `Shift` (hold to fly upwards) |
| Aim | Mouse Cursor |
| Shoot | Left Mouse Button (hold for auto-fire) |
| Reload | `R` |
| Switch Weapon | `1` (Rifle), `2` (Shotgun), `3` (Rocket) |

### Mobile
- **Left Thumb**: Virtual joystick for horizontal movement and swipe up to jump.
- **Right Thumb**:
  - Drag to aim weapon.
  - Hold **BOOST** button for jetpack flight.
  - Tap/Hold **FIRE** button to shoot.
  - Tap **RELOAD** to refresh ammo.

---

## Weapons Arsenal

1. **Pulse Rifle**:
   - High rate of fire (7.7 rounds/sec)
   - 30-round magazine
   - Rapid cyan tracer bolts with tight spread
2. **Spread Cannon**:
   - 5 heavy pellets per blast
   - Wide tactical spread cone for close-quarters combat
   - 6-shell capacity
3. **Plasma Rocket**:
   - Heavy explosive projectile with fire trail
   - 85px radius splash damage with screen shake
   - 3-rocket magazine

---

## Project Structure

```
jetpack-arena/
├── shared/             # Shared TypeScript models, protocol, map, and constants
│   ├── src/constants.ts
│   ├── src/map.ts
│   ├── src/protocol.ts
│   └── src/types.ts
├── server/             # Authoritative Node.js + Express + Socket.IO server
│   ├── src/index.ts
│   ├── src/rooms/      # Room & RoomManager lifecycle
│   ├── src/game/       # Fixed-timestep physics, combat, & weapons
│   ├── src/networking/ # Socket event handlers & rate-limiting
│   └── src/validation/ # Zod payload validation
├── client/             # Mobile-first Phaser 3 + HTML5 frontend
│   ├── index.html      # Responsive HUD, lobby, & touch controls
│   ├── src/main.ts     # Client entry point & Socket wiring
│   ├── src/game/       # Phaser scenes, player sprites, & particle FX
│   ├── src/ui/         # Touch joystick, HUD, & lobby UI
│   └── src/audio/      # Zero-latency Web Audio sound synthesizer
├── tests/              # Vitest unit and integration tests
├── docs/               # Architecture, implementation plan, QA checklist
├── .env.example
├── package.json
└── README.md
```

---

## Production Deployment

### Single-Container / Platform (Render, Railway, Fly.io, Heroku, VPS)
The server is configured to serve both the Socket.IO WebSocket endpoints, `/health` endpoint, and the static built client from `client/dist`.

1. Set environment variables:
   ```env
   PORT=3000
   CORS_ORIGIN=*
   NODE_ENV=production
   ```
2. Build command:
   ```bash
   npm install && npm run build
   ```
3. Start command:
   ```bash
   npm start
   ```

### Health Check Endpoint
- `GET /health` returns JSON uptime and server status.
