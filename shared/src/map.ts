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
  theme: 'industrial' | 'bunker' | 'citadel';
  width: number;
  height: number;
  deathY: number;
  skyGradient: [number, number, number, number];
  platforms: BoxCollider[];
  spawnPoints: Point[];
}

export const MAP_OUTPOST_DELTA: MapData = {
  id: 'outpost_delta',
  name: 'Outpost Delta',
  theme: 'industrial',
  width: WORLD_WIDTH,
  height: WORLD_HEIGHT,
  deathY: DEATH_Y,
  skyGradient: [0x070b14, 0x070b14, 0x0f172a, 0x1e293b],
  platforms: [
    // Bottom main ground
    { x: 100, y: 1180, w: 700, h: 80, label: 'west_ground' },
    { x: 950, y: 1200, w: 700, h: 80, label: 'central_ground' },
    { x: 1800, y: 1180, w: 700, h: 80, label: 'east_ground' },

    // Lower tier
    { x: 280, y: 980, w: 340, h: 26, label: 'west_lower' },
    { x: 1100, y: 1000, w: 400, h: 26, label: 'central_lower' },
    { x: 1980, y: 980, w: 340, h: 26, label: 'east_lower' },

    // Mid catwalks
    { x: 140, y: 780, w: 300, h: 24, label: 'west_mid' },
    { x: 580, y: 800, w: 360, h: 24, label: 'west_bridge' },
    { x: 1060, y: 760, w: 480, h: 28, label: 'central_deck' },
    { x: 1660, y: 800, w: 360, h: 24, label: 'east_bridge' },
    { x: 2160, y: 780, w: 300, h: 24, label: 'east_mid' },

    // High sniper towers & sky decks
    { x: 420, y: 550, w: 260, h: 22, label: 'west_high' },
    { x: 880, y: 500, w: 280, h: 22, label: 'high_deck_left' },
    { x: 1440, y: 500, w: 280, h: 22, label: 'high_deck_right' },
    { x: 1920, y: 550, w: 260, h: 22, label: 'east_high' },
    { x: 1160, y: 320, w: 280, h: 24, label: 'apex_tower' },

    // Boundary walls
    { x: 0, y: 80, w: 40, h: 1250, label: 'boundary_left' },
    { x: 2560, y: 80, w: 40, h: 1250, label: 'boundary_right' },
  ],
  spawnPoints: [
    { x: 300, y: 1100 },
    { x: 460, y: 920 },
    { x: 1300, y: 700 },
    { x: 1300, y: 1120 },
    { x: 2100, y: 1100 },
    { x: 2100, y: 920 },
    { x: 1020, y: 440 },
    { x: 1580, y: 440 },
  ],
};

export const MAP_CYBER_BUNKER: MapData = {
  id: 'cyber_bunker',
  name: 'Cyber Bunker',
  theme: 'bunker',
  width: WORLD_WIDTH,
  height: WORLD_HEIGHT,
  deathY: DEATH_Y,
  skyGradient: [0x050508, 0x0c0a1a, 0x161233, 0x241442],
  platforms: [
    // Sub-level base floor
    { x: 80, y: 1220, w: 2440, h: 80, label: 'bunker_floor' },

    // Multi-level subterranean floors
    { x: 160, y: 1020, w: 600, h: 26, label: 'sub_l1' },
    { x: 1000, y: 1020, w: 600, h: 26, label: 'reactor_floor' },
    { x: 1840, y: 1020, w: 600, h: 26, label: 'sub_r1' },

    // Middle defense galleries
    { x: 320, y: 820, w: 500, h: 26, label: 'gallery_l' },
    { x: 1050, y: 800, w: 500, h: 30, label: 'reactor_core' },
    { x: 1780, y: 820, w: 500, h: 26, label: 'gallery_r' },

    // High command catwalks
    { x: 160, y: 600, w: 550, h: 24, label: 'cmd_l' },
    { x: 880, y: 560, w: 320, h: 24, label: 'vent_l' },
    { x: 1400, y: 560, w: 320, h: 24, label: 'vent_r' },
    { x: 1890, y: 600, w: 550, h: 24, label: 'cmd_r' },

    // Roof sniper perches
    { x: 500, y: 380, w: 350, h: 22, label: 'roof_l' },
    { x: 1100, y: 340, w: 400, h: 24, label: 'apex_bridge' },
    { x: 1750, y: 380, w: 350, h: 22, label: 'roof_r' },

    // Outer boundaries
    { x: 0, y: 80, w: 40, h: 1250, label: 'boundary_left' },
    { x: 2560, y: 80, w: 40, h: 1250, label: 'boundary_right' },
  ],
  spawnPoints: [
    { x: 350, y: 960 },
    { x: 1300, y: 960 },
    { x: 2150, y: 960 },
    { x: 500, y: 760 },
    { x: 2000, y: 760 },
    { x: 300, y: 540 },
    { x: 2200, y: 540 },
    { x: 1300, y: 280 },
  ],
};

export const MAP_SKY_CITADEL: MapData = {
  id: 'sky_citadel',
  name: 'Sky Citadel',
  theme: 'citadel',
  width: WORLD_WIDTH,
  height: WORLD_HEIGHT,
  deathY: DEATH_Y,
  skyGradient: [0x0f2b48, 0x184c78, 0x2b78b5, 0x64b5f6],
  platforms: [
    // Lower floating islands (wide abyss below!)
    { x: 200, y: 1140, w: 500, h: 40, label: 'island_lower_l' },
    { x: 1050, y: 1160, w: 500, h: 40, label: 'island_lower_mid' },
    { x: 1900, y: 1140, w: 500, h: 40, label: 'island_lower_r' },

    // Mid aerial sky bridges
    { x: 450, y: 900, w: 420, h: 26, label: 'bridge_l' },
    { x: 1120, y: 920, w: 360, h: 26, label: 'pod_mid' },
    { x: 1730, y: 900, w: 420, h: 26, label: 'bridge_r' },

    // Upper floating temples
    { x: 200, y: 680, w: 480, h: 26, label: 'sky_temple_l' },
    { x: 950, y: 660, w: 700, h: 30, label: 'grand_sanctuary' },
    { x: 1920, y: 680, w: 480, h: 26, label: 'sky_temple_r' },

    // High clouds / spire perches
    { x: 550, y: 440, w: 320, h: 22, label: 'spire_l' },
    { x: 1140, y: 400, w: 320, h: 24, label: 'citadel_apex' },
    { x: 1730, y: 440, w: 320, h: 22, label: 'spire_r' },

    // Boundaries
    { x: 0, y: 80, w: 40, h: 1250, label: 'boundary_left' },
    { x: 2560, y: 80, w: 40, h: 1250, label: 'boundary_right' },
  ],
  spawnPoints: [
    { x: 350, y: 1080 },
    { x: 1300, y: 1100 },
    { x: 2050, y: 1080 },
    { x: 600, y: 840 },
    { x: 1850, y: 840 },
    { x: 380, y: 620 },
    { x: 1300, y: 600 },
    { x: 2080, y: 620 },
  ],
};

export const ALL_MAPS: Record<string, MapData> = {
  outpost_delta: MAP_OUTPOST_DELTA,
  cyber_bunker: MAP_CYBER_BUNKER,
  sky_citadel: MAP_SKY_CITADEL,
};
