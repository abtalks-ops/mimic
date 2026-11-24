/**
 * Launch characters. Characters are data, not code (docs/ARCHITECTURE.md §5).
 * All four are ORIGINAL characters; see docs/VOICES-AND-CHARACTERS.md.
 */
export interface VoiceFx {
  /** Pitch shift in cents. Note: on a plain buffer source this also changes speed slightly. */
  detuneCents: number;
  bassDb: number;
  trebleDb: number;
}

export type AvatarLook = 'shades' | 'glam' | 'headset' | 'popstar';

export interface Character {
  id: string;
  displayName: string;
  archetype: string;
  /** Default LibriTTS-R speaker index (0-903), picked by ear by the product owner on 2026-11-24. */
  defaultSpeaker: number;
  speed: number;
  fx: VoiceFx;
  look: AvatarLook;
  colors: { skin: string; accent: string; hair: string };
}

export const CHARACTERS: Character[] = [
  {
    id: 'max-blaze',
    displayName: 'Max Blaze',
    archetype: 'Action-hero swagger',
    defaultSpeaker: 21,
    speed: 0.95,
    fx: { detuneCents: -120, bassDb: 6, trebleDb: -2 },
    look: 'shades',
    colors: { skin: '#f2c094', accent: '#ff6b35', hair: '#3b2a1a' },
  },
  {
    id: 'stella-vale',
    displayName: 'Stella Vale',
    archetype: 'Old-Hollywood glamour',
    defaultSpeaker: 60,
    speed: 0.92,
    fx: { detuneCents: 0, bassDb: 2, trebleDb: 3 },
    look: 'glam',
    colors: { skin: '#f6d2b8', accent: '#e63973', hair: '#f2b134' },
  },
  {
    id: 'rex-rumble',
    displayName: 'Rex Rumble',
    archetype: 'Booming announcer',
    defaultSpeaker: 841,
    speed: 0.9,
    fx: { detuneCents: -200, bassDb: 8, trebleDb: 0 },
    look: 'headset',
    colors: { skin: '#c68b59', accent: '#2a9d8f', hair: '#1d1d1d' },
  },
  {
    id: 'pixie-pop',
    displayName: 'Pixie Pop',
    archetype: 'Bubbly pop star',
    defaultSpeaker: 869,
    speed: 1.08,
    fx: { detuneCents: 150, bassDb: -2, trebleDb: 4 },
    look: 'popstar',
    colors: { skin: '#ffd9c2', accent: '#9b5de5', hair: '#ff70a6' },
  },
];

/**
 * Built-in voice model: LibriTTS-R (CC BY 4.0, 904 speakers) — one ~75 MB
 * download serves every character. Chosen in ADR-0006 for its license.
 */
export const BUILTIN_VOICE = {
  id: 'en_US-libritts_r-medium',
  speakers: 904,
  sizeMB: 75,
  attribution:
    'Voices: Piper "libritts_r" model, trained on LibriTTS-R (Koizumi et al., 2023), licensed CC BY 4.0. https://www.openslr.org/141/',
} as const;

/**
 * Speech-to-text model. Tiny was chosen over Base after phone tests (ADR-0005):
 * ~0.4 s faster per phrase and accurate enough for short phrases.
 */
export const STT_MODEL = { id: 'onnx-community/whisper-tiny.en', name: 'whisper-tiny.en', sizeMB: 40 } as const;

export const characterById = (id: string) => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
