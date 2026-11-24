import { describe, expect, it } from 'vitest';
import { percentile } from './metrics';

describe('percentile', () => {
  it('handles empty input', () => expect(percentile([], 50)).toBeNaN());
  it('computes p50 and p90 (nearest rank)', () => {
    const v = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
    expect(percentile(v, 50)).toBe(500);
    expect(percentile(v, 90)).toBe(900);
  });
  it('does not mutate the input', () => {
    const v = [3, 1, 2];
    percentile(v, 50);
    expect(v).toEqual([3, 1, 2]);
  });
});
