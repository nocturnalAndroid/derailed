export type HexCoord = { q: number; r: number };
export type Edge = 0 | 1 | 2 | 3 | 4 | 5;

// Pointy-top axial neighbors, clockwise starting from upper-right.
const DIRECTIONS: ReadonlyArray<{ dq: number; dr: number }> = [
  { dq:  1, dr: -1 },  // 0 upper-right
  { dq:  1, dr:  0 },  // 1 right
  { dq:  0, dr:  1 },  // 2 lower-right
  { dq: -1, dr:  1 },  // 3 lower-left
  { dq: -1, dr:  0 },  // 4 left
  { dq:  0, dr: -1 },  // 5 upper-left
];

export function neighbor(h: HexCoord, edge: Edge): HexCoord {
  const d = DIRECTIONS[edge]!;
  return { q: h.q + d.dq, r: h.r + d.dr };
}

export function opposite(edge: Edge): Edge {
  return ((edge + 3) % 6) as Edge;
}

export function hexKey(h: HexCoord): string {
  return `${h.q},${h.r}`;
}
