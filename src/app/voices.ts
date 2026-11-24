/** Which voice each character uses (Settings → Voices), persisted in IndexedDB. */
import { useSyncExternalStore } from 'react';
import { getPref, setPref, type VoiceChoice } from '../core/storage/db';
import { CHARACTERS, type Character } from '../features/characters/registry';

const KEY = 'voice-choices';
type Choices = Record<string, VoiceChoice>;

let choices: Choices = {};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

void getPref<Choices>(KEY, {}).then((c) => {
  choices = c;
  emit();
});

export function voiceFor(character: Character, all: Choices = choices): VoiceChoice {
  return all[character.id] ?? { kind: 'builtin', speaker: character.defaultSpeaker };
}

export async function setVoice(characterId: string, choice: VoiceChoice): Promise<void> {
  choices = { ...choices, [characterId]: choice };
  emit();
  await setPref(KEY, choices);
}

/** Points characters that used a deleted imported voice back to their default. */
export async function forgetCustomVoice(voiceId: string): Promise<void> {
  const next = { ...choices };
  for (const c of CHARACTERS) {
    const v = next[c.id];
    if (v?.kind === 'custom' && v.voiceId === voiceId) delete next[c.id];
  }
  choices = next;
  emit();
  await setPref(KEY, choices);
}

export function useVoiceChoices(): Choices {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => choices,
  );
}
