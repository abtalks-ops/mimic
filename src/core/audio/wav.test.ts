import { describe, expect, it } from 'vitest';
import { concat, encodeWav } from './wav';

describe('encodeWav', () => {
  it('writes a valid 16-bit mono header and clamps samples', async () => {
    const blob = encodeWav(new Float32Array([0, 1, -1, 2]), 22050);
    const view = new DataView(await blob.arrayBuffer());
    expect(blob.size).toBe(44 + 8);
    expect(String.fromCharCode(...new Uint8Array(await blob.slice(0, 4).arrayBuffer()))).toBe('RIFF');
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(22050);
    expect(view.getInt16(44, true)).toBe(0);
    expect(view.getInt16(46, true)).toBe(0x7fff);
    expect(view.getInt16(48, true)).toBe(-0x8000);
    expect(view.getInt16(50, true)).toBe(0x7fff); // 2 clamped to 1
  });
});

describe('concat', () => {
  it('joins chunks in order', () => {
    expect(Array.from(concat([new Float32Array([1, 2]), new Float32Array([3])]))).toEqual([1, 2, 3]);
  });
});
