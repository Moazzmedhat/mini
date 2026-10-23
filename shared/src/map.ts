import { WORLD_WIDTH, WORLD_HEIGHT, DEATH_Y } from './constants.js';

export interface BoxCollider {
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
  label?: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface MapData {
  id: string;
  name: string;
  width: number;
  height: number;
  deathY: number;
  platforms: BoxCollider[];
  spawnPoints: Point[];
}

export const MAP_OUTPOST_DELTA: MapData = {
  id: 'outpost_delta',
  name: 'Outpost Delta',
  width: WORLD_WIDTH,
  height: WORLD_HEIGHT,
  deathY: DEATH_Y,
  platforms: [
    // Bottom main ground sections (with tactical gaps/hazards)
    { x: 100, y: 1100, w: 600, h: 80, label: 'west_ground' },
    { x: 800, y: 1120, w: 800, h: 80, label: 'central_ground' },
    { x: 1700, y: 1100, w: 600, h: 80, label: 'east_ground' },

    // Low-tier platforms
    { x: 250, y: 920, w: 320, h: 26, label: 'west_lower' },
    { x: 1050, y: 940, w: 300, h: 26, label: 'central_lower' },
    { x: 1830, y: 920, w: 320, h: 26, label: 'east_lower' },

    // Mid-tier catwalks
    { x: 120, y: 740, w: 260, h: 24, label: 'west_mid' },
    { x: 520, y: 760, w: 320, h: 24, label: 'west_bridge' },
    { x: 980, y: 720, w: 440, h: 28, label: 'central_deck' },
    { x: 1560, y: 760, w: 320, h: 24, label: 'east_bridge' },
    { x: 2020, y: 740, w: 260, h: 24, label: 'east_mid' },

    // High sniper towers & sky platforms
    { x: 380, y: 530, w: 240, h: 22, label: 'west_high' },
    { x: 820, y: 480, w: 260, h: 22, label: 'high_deck_left' },
    { x: 1320, y: 480, w: 260, h: 22, label: 'high_deck_right' },
    { x: 1780, y: 530, w: 240, h: 22, label: 'east_high' },
    { x: 1070, y: 320, w: 260, h: 24, label: 'apex_tower' },

    // Outer boundary walls (safety buffers)
    { x: 0, y: 100, w: 40, h: 1100, label: 'boundary_left' },
    { x: 2360, y: 100, w: 40, h: 1100, label: 'boundary_right' },
  ],
  spawnPoints: [
    { x: 260, y: 1040 },
    { x: 420, y: 860 },
    { x: 1200, y: 660 },
    { x: 1200, y: 1060 },
    { x: 1980, y: 1040 },
    { x: 1980, y: 860 },
    { x: 950, y: 420 },
    { x: 1450, y: 420 },
  ],
};
