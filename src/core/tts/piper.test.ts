import { describe, expect, it } from 'vitest';
import { joinClauses, phonemesToIds, validatePiperConfig, voiceLanguage } from './piper';

const map = { '^': [1], $: [2], _: [0], h: [10], 'ə': [11], l: [12], 'ˈ': [13], o: [14], ',': [15], '.': [16] };

describe('phonemesToIds', () => {
  it('wraps with BOS/EOS and intersperses padding', () => {
    expect(phonemesToIds('həl', map)).toEqual([1, 0, 10, 0, 11, 0, 12, 0, 2]);
  });
  it('skips unknown symbols', () => {
    expect(phonemesToIds('hXo', map)).toEqual([1, 0, 10, 0, 14, 0, 2]);
  });
  it('maps stress marks', () => {
    expect(phonemesToIds('ˈo', map)).toEqual([1, 0, 13, 0, 14, 0, 2]);
  });
});

describe('joinClauses', () => {
  it('keeps final punctuation', () => {
    expect(joinClauses(['a', 'b'], 'A, b!')).toBe('a, b!');
  });
  it('defaults to a full stop', () => {
    expect(joinClauses(['a'], 'A')).toBe('a.');
  });
});

describe('validatePiperConfig', () => {
  const ok = { audio: { sample_rate: 22050 }, phoneme_id_map: { a: [1] }, espeak: { voice: 'en-gb' } };
  it('accepts a Piper config', () => {
    expect(voiceLanguage(validatePiperConfig(ok))).toBe('en-gb');
  });
  it('rejects files without a phoneme map', () => {
    expect(() => validatePiperConfig({ audio: { sample_rate: 1 } })).toThrow(/phoneme_id_map/);
  });
  it('rejects non-espeak voices', () => {
    expect(() => validatePiperConfig({ ...ok, phoneme_type: 'text' })).toThrow(/espeak/);
  });
  it('defaults the language to en-us', () => {
    expect(voiceLanguage(validatePiperConfig({ audio: { sample_rate: 1 }, phoneme_id_map: {} }))).toBe('en-us');
  });
});
