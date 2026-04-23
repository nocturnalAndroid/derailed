import { describe, it, expect } from 'vitest';
import { neighbor, opposite, hexKey, type HexCoord, type Edge } from './hex';

describe('neighbor (pointy-top, axial)', () => {
  const origin: HexCoord = { q: 0, r: 0 };
  const cases: Array<[Edge, HexCoord]> = [
    [0, { q:  1, r: -1 }],   // upper-right
    [1, { q:  1, r:  0 }],   // right
    [2, { q:  0, r:  1 }],   // lower-right
    [3, { q: -1, r:  1 }],   // lower-left
    [4, { q: -1, r:  0 }],   // left
    [5, { q:  0, r: -1 }],   // upper-left
  ];

  it.each(cases)('edge %i → neighbor %j', (edge, expected) => {
    expect(neighbor(origin, edge)).toEqual(expected);
  });

  it('offsets from a non-origin hex', () => {
    expect(neighbor({ q: 3, r: 5 }, 1)).toEqual({ q: 4, r: 5 });
  });
});

describe('opposite', () => {
  it.each([[0, 3], [1, 4], [2, 5], [3, 0], [4, 1], [5, 2]] as const)(
    'opposite(%i) = %i',
    (input, expected) => {
      expect(opposite(input as Edge)).toBe(expected);
    },
  );
});

describe('hexKey', () => {
  it('produces stable "q,r" strings', () => {
    expect(hexKey({ q: 0, r: 0 })).toBe('0,0');
    expect(hexKey({ q: -3, r: 2 })).toBe('-3,2');
  });
});
