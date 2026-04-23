import { describe, it, expect } from 'vitest';
import { computeNextStep, type Train } from './train';
import { createBoard } from './board';
import type { Tile } from './tiles';
import type { Edge } from './hex';

const makeTile = (type: Tile['type'], rotation: Edge = 0): Tile => ({
  type, rotation, locked: false,
});

// Train sitting on origin, ready to cross its exit edge (progress >= 1 implied by caller).
const trainOn = (tile: { q: number; r: number }, entryEdge: Edge, exitEdge: Edge): Train => ({
  tile, entryEdge, exitEdge, progress: 1, speed: 1,
});

describe('computeNextStep', () => {
  it('straight → straight: passes into neighbor with opposite entry edge', () => {
    const b = createBoard();
    // Origin is straight rotation 1 → connections [1,4]; train will exit via edge 1 (right).
    b.set({ q: 0, r: 0 }, makeTile('straight', 1));
    b.set({ q: 1, r: 0 }, makeTile('straight', 1));  // also [1,4]; entry at edge 4

    const next = computeNextStep(b, trainOn({ q: 0, r: 0 }, 4, 1));

    expect(next).not.toBeNull();
    expect(next!.tile).toEqual({ q: 1, r: 0 });
    expect(next!.entryEdge).toBe(4);   // opposite of exit 1
    expect(next!.exitEdge).toBe(1);
    expect(next!.progress).toBe(0);
    expect(next!.speed).toBe(1);
  });

  it('derails when neighbor cell is empty', () => {
    const b = createBoard();
    b.set({ q: 0, r: 0 }, makeTile('straight', 1));

    expect(computeNextStep(b, trainOn({ q: 0, r: 0 }, 4, 1))).toBeNull();
  });

  it('derails when neighbor has no matching edge', () => {
    const b = createBoard();
    b.set({ q: 0, r: 0 }, makeTile('straight', 1));  // [1,4]
    b.set({ q: 1, r: 0 }, makeTile('straight', 0));  // [0,3] — no edge 4

    expect(computeNextStep(b, trainOn({ q: 0, r: 0 }, 4, 1))).toBeNull();
  });

  it('cross-2: entry determines exit along matching pair (no turning)', () => {
    const b = createBoard();
    b.set({ q: 0, r: 0 }, makeTile('straight', 1));   // [1,4] exiting edge 1
    b.set({ q: 1, r: 0 }, makeTile('cross-2', 0));    // [0,3],[1,4]; entry 4 matches [1,4] → exit 1

    const next = computeNextStep(b, trainOn({ q: 0, r: 0 }, 4, 1));

    expect(next!.entryEdge).toBe(4);
    expect(next!.exitEdge).toBe(1);
  });

  it('bend: entry on one edge → exit on the paired edge', () => {
    const b = createBoard();
    // Origin straight rotation 2 → [2,5]; exit via edge 2 (lower-right) → neighbor (0,1).
    b.set({ q: 0, r: 0 }, makeTile('straight', 2));
    // Bend rotation 3 → [3,5]; entry must match edge 5 (opposite of exit 2).
    b.set({ q: 0, r: 1 }, makeTile('bend', 3));

    const next = computeNextStep(b, trainOn({ q: 0, r: 0 }, 5, 2));

    expect(next!.tile).toEqual({ q: 0, r: 1 });
    expect(next!.entryEdge).toBe(5);
    expect(next!.exitEdge).toBe(3);
  });
});
