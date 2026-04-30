import { describe, it, expect } from 'vitest';
import {
  connections,
  type Tile,
  type TileType,
} from './tiles';
import type { Edge } from './hex';

const makeTile = (type: TileType, rotation: Edge): Tile => ({
  type,
  rotation,
  locked: false,
});

describe('connections — rotation 0 (base table)', () => {
  it('straight → [0,3] length 1.0', () => {
    expect(connections(makeTile('straight', 0))).toEqual([
      { edges: [0, 3], length: 1.0 },
    ]);
  });

  it('bend → [0,2] length 1.05', () => {
    expect(connections(makeTile('bend', 0))).toEqual([
      { edges: [0, 2], length: 1.05 },
    ]);
  });

  it('double-bend → [0,2] and [3,5]', () => {
    expect(connections(makeTile('double-bend', 0))).toEqual([
      { edges: [0, 2], length: 1.05 },
      { edges: [3, 5], length: 1.05 },
    ]);
  });

  it('cross-2 → [0,3] and [1,4]', () => {
    expect(connections(makeTile('cross-2', 0))).toEqual([
      { edges: [0, 3], length: 1.0 },
      { edges: [1, 4], length: 1.0 },
    ]);
  });

  it('cross-3 → [0,3], [1,4], [2,5]', () => {
    expect(connections(makeTile('cross-3', 0))).toEqual([
      { edges: [0, 3], length: 1.0 },
      { edges: [1, 4], length: 1.0 },
      { edges: [2, 5], length: 1.0 },
    ]);
  });
});

describe('connections — rotation shifts edges by +rotation mod 6', () => {
  it('straight rotation 1 → [1,4]', () => {
    expect(connections(makeTile('straight', 1))[0]!.edges).toEqual([1, 4]);
  });

  it('straight rotation 5 → [5,2]', () => {
    expect(connections(makeTile('straight', 5))[0]!.edges).toEqual([5, 2]);
  });

  it('bend rotation 3 → [3,5]', () => {
    expect(connections(makeTile('bend', 3))[0]!.edges).toEqual([3, 5]);
  });

  it('cross-2 rotation 2 → [2,5] and [3,0]', () => {
    expect(connections(makeTile('cross-2', 2)).map(c => c.edges)).toEqual([
      [2, 5],
      [3, 0],
    ]);
  });
});

describe('connections — station', () => {
  it('station rotation 0 → self-loop [0,0] length 2.0', () => {
    const tile: Tile = { type: 'station', rotation: 0, locked: false };
    expect(connections(tile)).toEqual([
      { edges: [0, 0], length: 2.0 },
    ]);
  });

  it('station rotation 3 → self-loop [3,3]', () => {
    const tile: Tile = { type: 'station', rotation: 3, locked: false };
    expect(connections(tile)).toEqual([
      { edges: [3, 3], length: 2.0 },
    ]);
  });
});

describe('connections — switch-l', () => {
  it('switch-l state A → both paths, [0,2] active', () => {
    const tile: Tile = { type: 'switch-l', rotation: 0, locked: false, switchState: 'A' };
    expect(connections(tile)).toEqual([
      { edges: [0, 2], length: 1.0, active: true },
      { edges: [0, 3], length: 1.0, active: false },
    ]);
  });

  it('switch-l state B → both paths, [0,3] active', () => {
    const tile: Tile = { type: 'switch-l', rotation: 0, locked: false, switchState: 'B' };
    expect(connections(tile)).toEqual([
      { edges: [0, 2], length: 1.0, active: false },
      { edges: [0, 3], length: 1.0, active: true },
    ]);
  });

  it('switch-l state A rotation 2 → [2,4] active, [2,5] inactive', () => {
    const tile: Tile = { type: 'switch-l', rotation: 2, locked: false, switchState: 'A' };
    expect(connections(tile)).toEqual([
      { edges: [2, 4], length: 1.0, active: true },
      { edges: [2, 5], length: 1.0, active: false },
    ]);
  });
});

describe('connections — switch-r', () => {
  it('switch-r state A → both paths, [0,3] active', () => {
    const tile: Tile = { type: 'switch-r', rotation: 0, locked: false, switchState: 'A' };
    expect(connections(tile)).toEqual([
      { edges: [0, 3], length: 1.0, active: true },
      { edges: [0, 4], length: 1.0, active: false },
    ]);
  });

  it('switch-r state B → both paths, [0,4] active', () => {
    const tile: Tile = { type: 'switch-r', rotation: 0, locked: false, switchState: 'B' };
    expect(connections(tile)).toEqual([
      { edges: [0, 3], length: 1.0, active: false },
      { edges: [0, 4], length: 1.0, active: true },
    ]);
  });

  it('switch-r state A rotation 1 → [1,4] active, [1,5] inactive', () => {
    const tile: Tile = { type: 'switch-r', rotation: 1, locked: false, switchState: 'A' };
    expect(connections(tile)).toEqual([
      { edges: [1, 4], length: 1.0, active: true },
      { edges: [1, 5], length: 1.0, active: false },
    ]);
  });
});
