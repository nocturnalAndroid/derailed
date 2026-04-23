import { describe, it, expect } from 'vitest';
import { createBoard, seedBoard } from './board';
import type { Tile } from './tiles';

const tile = (): Tile => ({ type: 'straight', rotation: 0, locked: false });

describe('Board — basic API', () => {
  it('set and get round-trip', () => {
    const b = createBoard();
    b.set({ q: 2, r: -1 }, tile());
    expect(b.get({ q: 2, r: -1 })?.type).toBe('straight');
  });

  it('get on empty cell returns undefined', () => {
    const b = createBoard();
    expect(b.get({ q: 0, r: 0 })).toBeUndefined();
  });

  it('has returns true when set, false otherwise', () => {
    const b = createBoard();
    b.set({ q: 0, r: 0 }, tile());
    expect(b.has({ q: 0, r: 0 })).toBe(true);
    expect(b.has({ q: 1, r: 0 })).toBe(false);
  });

  it('rotate increments rotation modulo 6 on unlocked tiles', () => {
    const b = createBoard();
    b.set({ q: 0, r: 0 }, { type: 'straight', rotation: 5, locked: false });
    b.rotate({ q: 0, r: 0 });
    expect(b.get({ q: 0, r: 0 })?.rotation).toBe(0);
  });

  it('rotate is a no-op on locked tiles', () => {
    const b = createBoard();
    b.set({ q: 1, r: 0 }, { type: 'straight', rotation: 2, locked: true });
    b.rotate({ q: 1, r: 0 });
    expect(b.get({ q: 1, r: 0 })?.rotation).toBe(2);
  });

  it('lock sets the locked flag', () => {
    const b = createBoard();
    b.set({ q: 0, r: 0 }, tile());
    b.lock({ q: 0, r: 0 });
    expect(b.get({ q: 0, r: 0 })?.locked).toBe(true);
  });

  it('cells() yields all set cells', () => {
    const b = createBoard();
    b.set({ q: 0, r: 0 }, tile());
    b.set({ q: 1, r: 0 }, tile());
    const all = [...b.cells()];
    expect(all).toHaveLength(2);
  });
});

describe('seedBoard', () => {
  it('generates 1 + 3R(R+1) cells for radius R', () => {
    const b2 = seedBoard({ radius: 2, rng: () => 0 });
    expect([...b2.cells()]).toHaveLength(19);   // 1 + 3*2*3

    const b3 = seedBoard({ radius: 3, rng: () => 0 });
    expect([...b3.cells()]).toHaveLength(37);   // 1 + 3*3*4
  });

  it('origin (0,0) is a straight tile, unlocked', () => {
    const b = seedBoard({ radius: 3, rng: () => 0.5 });
    const origin = b.get({ q: 0, r: 0 });
    expect(origin).toBeDefined();
    expect(origin!.type).toBe('straight');
    expect(origin!.locked).toBe(false);
  });

  it('covers all axial cells within radius', () => {
    const b = seedBoard({ radius: 2, rng: () => 0 });
    for (const h of [
      { q:  2, r:  0 }, { q: -2, r:  0 },
      { q:  0, r:  2 }, { q:  0, r: -2 },
      { q:  2, r: -2 }, { q: -2, r:  2 },
    ]) {
      expect(b.has(h)).toBe(true);
    }
  });

  it('does not cover cells outside the radius', () => {
    const b = seedBoard({ radius: 2, rng: () => 0 });
    expect(b.has({ q: 3, r:  0 })).toBe(false);
    expect(b.has({ q: 0, r: -3 })).toBe(false);
    expect(b.has({ q: 3, r: -1 })).toBe(false);
  });
});
