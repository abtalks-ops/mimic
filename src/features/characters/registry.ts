/**
 * Launch characters. Characters are data, not code (docs/ARCHITECTURE.md §5).
 * Both are ORIGINAL characters; see docs/VOICES-AND-CHARACTERS.md.
 * Base voices are Piper voices (rhasspy/piper-voices); the FX gives each its flavour.
 */
export interface VoiceFx {
  /** Pitch shift in cents. Note: on a plain buffer source this also changes speed slightly. */
  detuneCents: number;
  bassDb: number;
  trebleDb: number;
}

export interface Character {
  id: string;
  displayName: string;
  archetype: string;
  /** Piper voice id from rhasspy/piper-voices. */
  piperVoice: string;
  speed: number;
  fx: VoiceFx;
  colors: { skin: string; accent: string; hair: string };
}

export const CHARACTERS: Character[] = [
  {
    id: 'max-blaze',
    displayName: 'Max Blaze',
    archetype: 'Action-hero swagger',
    piperVoice: 'en_US-ryan-medium',
    speed: 0.95,
    fx: { detuneCents: -120, bassDb: 6, trebleDb: -2 },
    colors: { skin: '#f2c094', accent: '#ff6b35', hair: '#3b2a1a' },
  },
  {
    id: 'stella-vale',
    displayName: 'Stella Vale',
    archetype: 'Old-Hollywood glamour',
    piperVoice: 'en_US-amy-medium',
    speed: 0.92,
    fx: { detuneCents: 0, bassDb: 2, trebleDb: 3 },
    colors: { skin: '#f6d2b8', accent: '#e63973', hair: '#f2b134' },
  },
];

export const PIPER_VOICES = CHARACTERS.map((c) => c.piperVoice);

/**
 * Speech-to-text model. Tiny was chosen over Base after phone tests (ADR-0005):
 * ~0.4 s faster per phrase and accurate enough for short phrases.
 */
export const STT_MODEL = { id: 'onnx-community/whisper-tiny.en', name: 'whisper-tiny.en', sizeMB: 40 } as const;
