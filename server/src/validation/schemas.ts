import { z } from 'zod';

export const callsignSchema = z
  .string()
  .trim()
  .min(1, 'Callsign cannot be empty')
  .max(16, 'Callsign cannot exceed 16 characters')
  .regex(/^[a-zA-Z0-9 _-]+$/, 'Callsign can only contain letters, numbers, spaces, underscores, and dashes');

export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(5, 'Room code must be exactly 5 characters')
  .regex(/^[A-HJ-NP-Z2-9]{5}$/, 'Invalid room code format');

export const inputFrameSchema = z.object({
  seq: z.number().int().nonnegative(),
  moveX: z.number().min(-1).max(1),
  jump: z.boolean(),
  boost: z.boolean(),
  aimAngle: z.number().min(-Math.PI * 2).max(Math.PI * 2),
  fire: z.boolean(),
  weaponType: z.enum(['rifle', 'shotgun', 'rocket', 'sniper', 'uzi', 'pistol']).optional(),
  reload: z.boolean().optional(),
});
