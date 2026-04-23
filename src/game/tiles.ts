import type { Edge } from './hex';

export type TileType =
  | 'straight'
  | 'bend'
  | 'double-bend'
  | 'cross-2'
  | 'cross-3';

export type Connection = {
  edges: [Edge, Edge];
  length: number;
};

export type Tile = {
  type: TileType;
  rotation: Edge;
  locked: boolean;
};

const BASE: Record<TileType, ReadonlyArray<Connection>> = {
  'straight':    [{ edges: [0, 3], length: 1.00 }],
  'bend':        [{ edges: [0, 2], length: 1.05 }],
  'double-bend': [{ edges: [0, 2], length: 1.05 },
                  { edges: [3, 5], length: 1.05 }],
  'cross-2':     [{ edges: [0, 3], length: 1.00 },
                  { edges: [1, 4], length: 1.00 }],
  'cross-3':     [{ edges: [0, 3], length: 1.00 },
                  { edges: [1, 4], length: 1.00 },
                  { edges: [2, 5], length: 1.00 }],
};

function shift(e: Edge, r: number): Edge {
  return ((((e + r) % 6) + 6) % 6) as Edge;
}

export function connections(tile: Tile): Connection[] {
  return BASE[tile.type].map(c => ({
    edges: [shift(c.edges[0], tile.rotation), shift(c.edges[1], tile.rotation)],
    length: c.length,
  }));
}
