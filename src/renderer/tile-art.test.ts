import { describe, it, expect } from 'vitest';
import { tracksFor } from './tile-art';

describe('tracksFor', () => {
  it('straight: one path across edges [0, 3]', () => {
    const paths = tracksFor('straight');
    expect(paths).toHaveLength(1);
    expect(paths[0]!.edges).toEqual([0, 3]);
    expect(paths[0]!.d).toMatch(/^M/);
  });

  it('bend: one path across edges [0, 2]', () => {
    const paths = tracksFor('bend');
    expect(paths).toHaveLength(1);
    expect(paths[0]!.edges).toEqual([0, 2]);
  });

  it('double-bend: two paths with edges [0,2] and [3,5]', () => {
    expect(tracksFor('double-bend').map(p => p.edges)).toEqual([[0, 2], [3, 5]]);
  });

  it('cross-2: two paths', () => {
    expect(tracksFor('cross-2')).toHaveLength(2);
  });

  it('cross-3: three paths', () => {
    expect(tracksFor('cross-3')).toHaveLength(3);
  });
});
