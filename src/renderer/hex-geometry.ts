import type { Edge, HexCoord } from '../game/hex';

export const HEX_SIZE = 32;   // circumradius in pixels; tunable

export type Point = { x: number; y: number };

// Pointy-top axial → pixel, screen y-down.
export function hexToPixel(h: HexCoord, size: number = HEX_SIZE): Point {
  const x = size * Math.sqrt(3) * (h.q + h.r / 2);
  const y = size * 1.5 * h.r;
  return { x, y };
}

// Edge midpoint in local tile coords (tile center at origin).
// Edge e midpoint is at angle (60 - 60*e) degrees from +x axis (math convention);
// y is flipped for screen-y-down.
export function edgeMidpoint(edge: Edge, size: number = HEX_SIZE): Point {
  const apothem = size * Math.sqrt(3) / 2;
  const angleRad = ((60 - 60 * edge) * Math.PI) / 180;
  return {
    x: apothem * Math.cos(angleRad),
    y: -apothem * Math.sin(angleRad),
  };
}
