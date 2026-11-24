/**
 * Piper (VITS) helpers. Piper models expect espeak-ng IPA phonemes mapped to
 * integer ids with the model's phoneme_id_map, in the layout
 *   [BOS, PAD, p1, PAD, p2, PAD, ..., EOS]
 * (same as piper-phonemize with interspersed padding).
 */
export interface PiperConfig {
  audio: { sample_rate: number };
  espeak?: { voice?: string };
  phoneme_id_map: Record<string, number[]>;
  inference?: { noise_scale?: number; length_scale?: number; noise_w?: number };
  num_speakers?: number;
}

const BOS = '^';
const EOS = '$';
const PAD = '_';

export function phonemesToIds(phonemes: string, idMap: Record<string, number[]>): number[] {
  const pad = idMap[PAD] ?? [0];
  const ids = [...(idMap[BOS] ?? []), ...pad];
  // Iterate by code point so combining IPA characters map individually, as Piper does.
  for (const ph of Array.from(phonemes.normalize('NFD'))) {
    const id = idMap[ph];
    if (!id) continue; // unknown symbols are skipped, as in piper-phonemize
    ids.push(...id, ...pad);
  }
  ids.push(...(idMap[EOS] ?? []));
  return ids;
}

/** Joins phonemizer output (one string per clause) and keeps the chunk's final punctuation for prosody. */
export function joinClauses(clauses: string[], sourceText: string): string {
  const end = sourceText.trim().match(/[.!?,;:]$/)?.[0] ?? '.';
  return clauses.join(', ') + end;
}

/**
 * Checks a user-imported Piper `.onnx.json` and explains what is wrong in
 * plain words. Only espeak-phoneme Piper voices are supported.
 */
export function validatePiperConfig(json: unknown): PiperConfig {
  const c = json as Partial<PiperConfig> & { phoneme_type?: string };
  if (!c || typeof c !== 'object') throw new Error('The .json file is not a Piper voice config.');
  if (!c.phoneme_id_map || typeof c.phoneme_id_map !== 'object')
    throw new Error('The .json file has no "phoneme_id_map", so it is not a Piper voice config.');
  if (!c.audio || typeof c.audio.sample_rate !== 'number')
    throw new Error('The .json file has no "audio.sample_rate".');
  if (c.phoneme_type && c.phoneme_type !== 'espeak')
    throw new Error(`This voice uses "${c.phoneme_type}" phonemes; only espeak voices are supported.`);
  return c as PiperConfig;
}

/** espeak language for a voice, e.g. "en-us". */
export const voiceLanguage = (c: PiperConfig) => c.espeak?.voice ?? 'en-us';
