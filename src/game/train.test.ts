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

  it('station self-loop: exitEdge equals entryEdge, returns to previous tile', () => {
    const b = createBoard();
    // Train at (1,-1) exiting edge 3 → neighbor is (0,0).
    // Station at (0,0) rotation 0 → self-loop [0,0]. Entry edge = opposite(3) = 0. Matches [0,0]. Exit = 0.
    b.set({ q: 1, r: -1 }, makeTile('straight', 0));
    b.set({ q: 0, r: 0 }, { type: 'station', rotation: 0, locked: false } as Tile);

    const next = computeNextStep(b, trainOn({ q: 1, r: -1 }, 0, 3));

    expect(next).not.toBeNull();
    expect(next!.tile).toEqual({ q: 0, r: 0 });
    expect(next!.entryEdge).toBe(0);
    expect(next!.exitEdge).toBe(0);
  });

  it('switch-l state A: train follows exit edge 2 (shifted by rotation)', () => {
    const b = createBoard();
    // Train at (1,-1) exits edge 3 → neighbor (0,0). Entry = opposite(3) = 0.
    // switch-l rotation 0 state A → [0,2]. Entry 0 matches. Exit = 2.
    b.set({ q: 1, r: -1 }, makeTile('straight', 0));
    b.set({ q: 0, r: 0 }, { type: 'switch-l', rotation: 0, locked: false, switchState: 'A' } as Tile);

    const next = computeNextStep(b, trainOn({ q: 1, r: -1 }, 0, 3));

    expect(next).not.toBeNull();
    expect(next!.entryEdge).toBe(0);
    expect(next!.exitEdge).toBe(2);
  });

  it('switch-l state B: train follows exit edge 3', () => {
    const b = createBoard();
    b.set({ q: 1, r: -1 }, makeTile('straight', 0));
    b.set({ q: 0, r: 0 }, { type: 'switch-l', rotation: 0, locked: false, switchState: 'B' } as Tile);

    const next = computeNextStep(b, trainOn({ q: 1, r: -1 }, 0, 3));

    expect(next).not.toBeNull();
    expect(next!.entryEdge).toBe(0);
    expect(next!.exitEdge).toBe(3);
  });

  it('switch-l: entering from non-stem edge routes to stem', () => {
    const b = createBoard();
    // Train at (-1,1) exits edge 0 → neighbor (0,0). Entry = opposite(0) = 3.
    // switch-l rotation 0 → [0,2] and [0,3]. Entry 3 matches [0,3], exit = 0 (stem).
    b.set({ q: -1, r: 1 }, makeTile('straight', 0));
    b.set({ q: 0, r: 0 }, { type: 'switch-l', rotation: 0, locked: false, switchState: 'A' } as Tile);

    const next = computeNextStep(b, trainOn({ q: -1, r: 1 }, 0, 0));

    expect(next).not.toBeNull();
    expect(next!.entryEdge).toBe(3);
    expect(next!.exitEdge).toBe(0);
  });
});
