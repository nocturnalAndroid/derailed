import type { Edge } from './hex';

export type TileType =
  | 'straight'
  | 'bend'
  | 'double-bend'
  | 'cross-2'
  | 'cross-3'
  | 'station'
  | 'switch-l'
  | 'switch-r';

export type Connection = {
  edges: [Edge, Edge];
  length: number;
  active?: boolean;
};

export type Tile = {
  type: TileType;
  rotation: Edge;
  locked: boolean;
  switchState?: 'A' | 'B';
};

type BaseTileType = Exclude<TileType, 'switch-l' | 'switch-r'>;

const BASE: Record<BaseTileType, ReadonlyArray<Connection>> = {
  'straight':    [{ edges: [0, 3], length: 1.00 }],
  'bend':        [{ edges: [0, 2], length: 1.05 }],
  'double-bend': [{ edges: [0, 2], length: 1.05 },
                  { edges: [3, 5], length: 1.05 }],
  'cross-2':     [{ edges: [0, 3], length: 1.00 },
                  { edges: [1, 4], length: 1.00 }],
  'cross-3':     [{ edges: [0, 3], length: 1.00 },
                  { edges: [1, 4], length: 1.00 },
                  { edges: [2, 5], length: 1.00 }],
  'station':     [{ edges: [0, 0], length: 2.00 }],
};

function shift(e: Edge, r: number): Edge {
  return ((((e + r) % 6) + 6) % 6) as Edge;
}

export function connections(tile: Tile): Connection[] {
  if (tile.type === 'switch-l') {
    const r = tile.rotation;
    const stateA = tile.switchState !== 'B';
    return [
      { edges: [shift(0, r), shift(2, r)], length: 1.0, active: stateA },
      { edges: [shift(0, r), shift(3, r)], length: 1.0, active: !stateA },
    ];
  }
  if (tile.type === 'switch-r') {
    const r = tile.rotation;
    const stateA = tile.switchState !== 'B';
    return [
      { edges: [shift(0, r), shift(3, r)], length: 1.0, active: stateA },
      { edges: [shift(0, r), shift(4, r)], length: 1.0, active: !stateA },
    ];
  }
  return BASE[tile.type as BaseTileType].map(c => ({
    edges: [shift(c.edges[0], tile.rotation), shift(c.edges[1], tile.rotation)],
    length: c.length,
  }));
}
