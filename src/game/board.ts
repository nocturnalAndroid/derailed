import { hexKey, type Edge, type HexCoord } from './hex';
import type { Tile } from './tiles';

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
