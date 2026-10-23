# Jetpack Arena — QA Checklist & Manual Verification Guide

## 1. Local & Desktop Browser Testing

### 1.1 Home Screen & Lobby
- [ ] Open `http://localhost:3000` (production) or `http://localhost:5173` (dev mode).
- [ ] Verify original logo **JETPACK ARENA** renders cleanly with neon gradients.
- [ ] Connection badge in top right displays `ONLINE` with a green indicator.
- [ ] Enter a custom callsign (e.g. `Viper_99`) and select an armor color.
- [ ] Click **CREATE ROOM**:
  - Should generate a unique 5-letter room code (omitting confusing characters like 0/O/1/I).
  - Transitions to the Room screen showing your callsign with the `(YOU)` and `HOST` badges.
- [ ] Click **SHARE LINK**:
  - Verification: Clipboard receives `http://localhost:3000/?room=ABCDE`.
  - Open an Incognito/second browser tab with the link; verify room code automatically populates in the input.

### 1.2 Two-Player Match Lifecycle
- [ ] In the second browser window, enter callsign `Ghost` and join the room.
- [ ] Both windows show updated player rosters (2 players connected).
- [ ] Player 2 clicks **READY UP** (badge turns green `READY`).
- [ ] Host clicks **START MATCH**:
  - Both screens show the 3.. 2.. 1.. GO! countdown overlay.
  - Both screens transition smoothly into the 2D arena without page reloads.

### 1.3 Desktop Controls & Combat Feel
- [ ] **A / D** or Left/Right arrows: character runs with smooth acceleration and ground friction.
- [ ] **W / Space**: jumps when grounded. Verify jumping is prevented in mid-air unless jetpack boost is active.
- [ ] **Shift**: Jetpack Boost applies smooth upward thrust, consuming jetpack fuel. Releasing allows fuel to recharge.
- [ ] **Mouse Aiming**: Character's arm and weapon dynamically track the cursor angle. Character body flips horizontally when aiming left or right.
- [ ] **Left Mouse Click**: Fires weapon.
  - Projectile tracers / bullets travel in the aiming trajectory.
  - Ammo count decrements in HUD.
  - Hits on opponent show damage feedback, camera shake, and health bar reduction.
- [ ] **Reload**: Press **R** or deplete magazine; verify `RELOADING...` prompt appears and resets ammo after cooldown.
- [ ] **Weapon Switching**: Press **1** (Pulse Rifle), **2** (Spread Cannon), **3** (Plasma Rocket). Verify weapon sprite and firing characteristics change.

---

## 2. Mobile Browser & Touch Testing

### 2.1 Orientation & Viewport Adaptation
- [ ] Hold phone in portrait mode:
  - Verify **ROTATE DEVICE** guidance overlay appears requesting landscape orientation.
- [ ] Rotate phone to landscape:
  - Game fits viewport cleanly without horizontal or vertical page scrolling.
  - Safe-area insets respected on notched devices (iPhone dynamic island, Android punch hole).

### 2.2 Multi-Touch Controls
- [ ] Left thumb on left side of screen: virtual floating joystick appears and controls running left/right.
- [ ] Hold right thumb on **BOOST** button while continuing to run:
  - Jetpack activates and fuels upward thrust simultaneously.
- [ ] Drag right thumb in aim zone and tap **FIRE**:
  - Aim angle rotates towards touch direction.
  - Bullets fire while moving and boosting.
- [ ] Release one thumb while keeping the other pressed:
  - Verify pointer identity isolation prevents releasing one finger from canceling the other!

---

## 3. Network Resilience & Edge Cases

- [ ] **Disconnect / Reconnect**:
  - Disconnect network or toggle Airplane mode: connection status badge switches to `RECONNECTING...` or `DISCONNECTED`.
  - Re-enable network: client reconnects cleanly.
- [ ] **Invalid Code**:
  - Enter `ZZZZZ` in join room input; error toast displays `Room "ZZZZZ" does not exist`.
- [ ] **Room Capacity**:
  - Attempting to join a room with 8 players displays `Room is already full`.
- [ ] **Host Migration**:
  - Host closes browser tab: room host automatically transfers to remaining player in lobby.
- [ ] **Audio Mute**:
  - Tap **SOUND ON/OFF** toggle; verify setting persists in `localStorage` across page refreshes.
