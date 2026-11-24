import Dexie, { type Table } from 'dexie';
import type { PiperConfig } from '../tts/piper';

/** A generated clip. Lives only on this device (docs/PRIVACY.md). */
export interface Clip {
  id?: number;
  createdAt: number;
  characterId: string;
  text: string;
  wav: Blob;
  durationSec: number;
}

/** A Piper voice the user imported from their own files. */
export interface CustomVoice {
  id: string;
  name: string;
  onnx: Blob;
  config: PiperConfig;
  sizeBytes: number;
  addedAt: number;
  /** The user confirmed they have the rights to use this voice. */
  rightsConfirmedAt: number;
}

/** Which voice a character uses. */
export type VoiceChoice = { kind: 'builtin'; speaker: number } | { kind: 'custom'; voiceId: string };

interface Pref {
  key: string;
  value: unknown;
}

class MimicDB extends Dexie {
  clips!: Table<Clip, number>;
  voices!: Table<CustomVoice, string>;
  prefs!: Table<Pref, string>;
  constructor() {
    super('mimic');
    this.version(1).stores({ clips: '++id, createdAt', voices: 'id', prefs: 'key' });
  }
}

export const db = new MimicDB();

export const MAX_CLIPS = 50;

export async function addClip(clip: Omit<Clip, 'id'>): Promise<void> {
  await db.transaction('rw', db.clips, async () => {
    await db.clips.add(clip);
    const extra = (await db.clips.count()) - MAX_CLIPS;
    if (extra > 0) {
      const oldest = await db.clips.orderBy('createdAt').limit(extra).primaryKeys();
      await db.clips.bulkDelete(oldest);
    }
  });
}

export async function getPref<T>(key: string, fallback: T): Promise<T> {
  const row = await db.prefs.get(key);
  return row ? (row.value as T) : fallback;
}

export async function setPref(key: string, value: unknown): Promise<void> {
  await db.prefs.put({ key, value });
}

/**
 * "Delete everything": clips, imported voices, settings, cached models and
 * the runtime. Implements docs/PRIVACY.md rule 5.
 */
export async function deleteEverything(): Promise<void> {
  db.close();
  await Dexie.delete('mimic');
  if ('caches' in self) for (const key of await caches.keys()) await caches.delete(key);
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    // storage may be blocked; nothing to clear
  }
}
