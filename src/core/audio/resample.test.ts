import { describe, expect, it } from 'vitest';
import { downmix, resample } from './resample';

describe('resample', () => {
  it('returns the input when rates match', () => {
    const a = new Float32Array([1, 2, 3]);
    expect(resample(a, 16000, 16000)).toBe(a);
  });
  it('halves the length when downsampling 2:1', () => {
    const a = new Float32Array(48000);
    expect(resample(a, 48000, 24000).length).toBe(24000);
  });
  it('48k to 16k keeps duration', () => {
    expect(resample(new Float32Array(48000), 48000, 16000).length).toBe(16000);
  });
  it('interpolates between samples', () => {
    const out = resample(new Float32Array([0, 1, 2, 3]), 2, 4);
    expect(Array.from(out)).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3, 3]);
  });
});

describe('downmix', () => {
  it('averages channels', () => {
    const out = downmix([new Float32Array([1, 0]), new Float32Array([0, 1])]);
    expect(Array.from(out)).toEqual([0.5, 0.5]);
  });
});
