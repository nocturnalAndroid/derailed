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

const NON_ORIGIN_WEIGHTS: ReadonlyArray<readonly [TileType, number]> = [
  ['straight',    4],
  ['bend',        6],
  ['double-bend', 4],
  ['cross-2',     1],
  ['cross-3',     1],
];
const TOTAL_WEIGHT = NON_ORIGIN_WEIGHTS.reduce((s, [, w]) => s + w, 0);

function pickType(rng: () => number): TileType {
  let r = rng() * TOTAL_WEIGHT;
  for (const [type, w] of NON_ORIGIN_WEIGHTS) {
    r -= w;
    if (r < 0) return type;
  }
  return NON_ORIGIN_WEIGHTS[NON_ORIGIN_WEIGHTS.length - 1]![0];
}

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
      const type: TileType = isOrigin ? 'straight' : pickType(rng);
      const rotation = Math.floor(rng() * 6) as Edge;
      b.set({ q, r }, { type, rotation, locked: false });
    }
  }
  return b;
}
