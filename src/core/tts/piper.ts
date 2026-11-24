/**
 * Piper (VITS) helpers. Piper models expect espeak-ng IPA phonemes mapped to
 * integer ids with the model's phoneme_id_map, in the layout
 *   [BOS, PAD, p1, PAD, p2, PAD, ..., EOS]
 * (same as piper-phonemize with interspersed padding).
 */
export interface PiperConfig {
  audio: { sample_rate: number };
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
