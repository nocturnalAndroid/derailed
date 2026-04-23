import { hexKey, type Edge, type HexCoord } from './hex';
import type { Tile, TileType } from './tiles';

export type Board = {
  get(h: HexCoord): Tile | undefined;
  set(h: HexCoord, t: Tile): void;
  has(h: HexCoord): boolean;
  rotate(h: HexCoord): void;
  lock(h: HexCoord): void;
  cells(): IterableIterator<[HexCoord, Tile]>;
};

export function createBoard(): Board {
  const cells = new Map<string, { hex: HexCoord; tile: Tile }>();

  return {
    get(h) {
      return cells.get(hexKey(h))?.tile;
    },
    set(h, t) {
      cells.set(hexKey(h), { hex: { q: h.q, r: h.r }, tile: t });
    },
    has(h) {
      return cells.has(hexKey(h));
    },
    rotate(h) {
      const entry = cells.get(hexKey(h));
      if (!entry || entry.tile.locked) return;
      entry.tile.rotation = (((entry.tile.rotation + 1) % 6) as Edge);
    },
    lock(h) {
      const entry = cells.get(hexKey(h));
      if (!entry) return;
      entry.tile.locked = true;
    },
    *cells() {
      for (const { hex, tile } of cells.values()) {
        yield [hex, tile];
      }
    },
  };
}

const NON_ORIGIN_TYPES: ReadonlyArray<TileType> = [
  'straight', 'bend', 'double-bend', 'cross-2', 'cross-3',
];

export type SeedOptions = {
  radius: number;
  rng?: () => number;   // defaults to Math.random
};

export function seedBoard(opts: SeedOptions): Board {
  const rng = opts.rng ?? Math.random;
  const b = createBoard();
  const R = opts.radius;

  for (let q = -R; q <= R; q++) {
    const rMin = Math.max(-R, -q - R);
    const rMax = Math.min(R,  -q + R);
    for (let r = rMin; r <= rMax; r++) {
      const isOrigin = q === 0 && r === 0;
      const type: TileType = isOrigin
        ? 'straight'
        : NON_ORIGIN_TYPES[Math.floor(rng() * NON_ORIGIN_TYPES.length)]!;
      const rotation = Math.floor(rng() * 6) as Edge;
      b.set({ q, r }, { type, rotation, locked: false });
    }
  }
  return b;
}
