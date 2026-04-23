import { describe, it, expect } from 'vitest';
import { createBoard } from './board';
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
