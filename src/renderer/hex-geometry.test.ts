import { describe, it, expect } from 'vitest';
import { hexToPixel, edgeMidpoint, HEX_SIZE } from './hex-geometry';

describe('hexToPixel (pointy-top)', () => {
  it('origin hex at (0, 0) maps to (0, 0)', () => {
    const p = hexToPixel({ q: 0, r: 0 });
    expect(p.x).toBeCloseTo(0, 5);
    expect(p.y).toBeCloseTo(0, 5);
  });

  it('q offset moves by sqrt(3) * size horizontally', () => {
    const p = hexToPixel({ q: 1, r: 0 });
    expect(p.x).toBeCloseTo(Math.sqrt(3) * HEX_SIZE, 5);
    expect(p.y).toBeCloseTo(0, 5);
  });

  it('r offset moves diagonally', () => {
    const p = hexToPixel({ q: 0, r: 1 });
    expect(p.x).toBeCloseTo(Math.sqrt(3) * HEX_SIZE * 0.5, 5);
    expect(p.y).toBeCloseTo(1.5 * HEX_SIZE, 5);
  });
});

describe('edgeMidpoint (local tile coords, screen-y-down)', () => {
  const apothem = HEX_SIZE * Math.sqrt(3) / 2;

  it('edge 1 (right) is at (+apothem, 0)', () => {
    const m = edgeMidpoint(1);
    expect(m.x).toBeCloseTo(apothem, 5);
    expect(m.y).toBeCloseTo(0, 5);
  });

  it('edge 4 (left) is at (-apothem, 0)', () => {
    const m = edgeMidpoint(4);
    expect(m.x).toBeCloseTo(-apothem, 5);
    expect(m.y).toBeCloseTo(0, 5);
  });

  it('edge 0 (upper-right) has negative y (above center)', () => {
    const m = edgeMidpoint(0);
    expect(m.y).toBeLessThan(0);
    expect(m.x).toBeGreaterThan(0);
  });

  it('edge 3 (lower-left) has positive y (below center)', () => {
    const m = edgeMidpoint(3);
    expect(m.y).toBeGreaterThan(0);
    expect(m.x).toBeLessThan(0);
  });
});
