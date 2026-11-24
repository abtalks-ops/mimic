/**
 * The voice engine: speech-to-text and Piper workers, model loading and
 * performance metrics. A small external store so any screen can use it.
 */
import { useSyncExternalStore } from 'react';
import { StreamPlayer } from '../core/audio/player';
import { concat } from '../core/audio/wav';
import type { RunMetrics, SessionInfo } from '../core/metrics/metrics';
import type { VoiceChoice } from '../core/storage/db';
import { STT_MODEL, type Character } from '../features/characters/registry';
import { createPiper, createStt, detectWebGpu, type AudioChunk } from '../workers/client';
import type { Device } from '../workers/protocol';

export type EngineStatus = 'idle' | 'loading' | 'ready' | 'error';

interface EngineState {
  status: EngineStatus;
  error: string;
  loaded: number;
  total: number;
  info: SessionInfo;
  runs: RunMetrics[];
}

const READY_FLAG = 'mimic-models-ready';
const stt = createStt();
const tts = createPiper();
const files: Record<string, { loaded: number; total: number }> = {};

let state: EngineState = {
  status: 'idle',
  error: '',
  loaded: 0,
  total: 0,
  info: { sttDevice: '-', ttsDevice: '-', downloadedMB: 0 },
  runs: [],
};
const listeners = new Set<() => void>();
function set(patch: Partial<EngineState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

const onProgress = (file: string, loaded: number, total: number) => {
  files[file] = { loaded, total };
  const all = Object.values(files);
  set({ loaded: all.reduce((s, f) => s + f.loaded, 0), total: all.reduce((s, f) => s + f.total, 0) });
};
stt.onProgress = onProgress;
tts.onProgress = onProgress;

export function useEngine(): EngineState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

/** True once models were downloaded on this device, so later visits load straight from cache. */
export function modelsWereDownloaded(): boolean {
  try {
    return localStorage.getItem(READY_FLAG) === '1';
  } catch {
    return false;
  }
}

export async function loadModels(forceWasm = false): Promise<void> {
  if (state.status === 'loading' || state.status === 'ready') return;
  set({ status: 'loading', error: '' });
  try {
    // Ask the browser not to evict our cached models under storage pressure.
    void navigator.storage?.persist?.();
    const gpu = !forceWasm && (await detectWebGpu());
    const sttDevice: Device = gpu ? 'webgpu' : 'wasm';
    const t0 = performance.now();
    const sttDone = stt.load(sttDevice, STT_MODEL.id).then((r) => ({ ms: performance.now() - t0, threads: (r as { threads: number }).threads }));
    const ttsDone = tts.load('wasm').then(() => performance.now() - t0);
    const [s, ttsLoadMs] = await Promise.all([sttDone, ttsDone]);
    set({
      status: 'ready',
      info: { engine: 'piper', sttModel: STT_MODEL.name, sttDevice, ttsDevice: 'wasm', sttLoadMs: s.ms, ttsLoadMs, threads: s.threads, downloadedMB: state.total / 1e6 },
    });
    try {
      localStorage.setItem(READY_FLAG, '1');
    } catch {
      // private mode: we'll just show the download screen again next time
    }
  } catch (e) {
    set({ status: 'error', error: String((e as Error)?.message ?? e) });
  }
}

export const transcribe = (pcm: Float32Array) => stt.run(pcm, [pcm.buffer]);

export interface SpeakResult {
  samples: Float32Array;
  sampleRate: number;
}

/**
 * Speaks `text` in a character's voice, streaming clause by clause.
 * Records a metrics row when `metrics` is given (timing starts at `metrics.started`).
 */
export async function speak(opts: {
  text: string;
  character: Character;
  voice: VoiceChoice;
  onLevel?: (level: number) => void;
  onFirstSound?: () => void;
  metrics?: { started: number; input: RunMetrics['input']; sttMs?: number };
}): Promise<SpeakResult> {
  const { text, character, voice, onLevel, onFirstSound, metrics } = opts;
  const player = new StreamPlayer(character.fx);
  const chunks: Float32Array[] = [];
  let sampleRate = 22050;
  let firstSound: number | undefined;
  let raf = 0;
  const tick = () => {
    onLevel?.(player.level());
    raf = requestAnimationFrame(tick);
  };
  const t = performance.now();
  try {
    await tts.stream<AudioChunk>({ text, voice, speed: character.speed }, (chunk) => {
      if (firstSound === undefined) {
        firstSound = performance.now();
        onFirstSound?.();
        tick();
      }
      sampleRate = chunk.sampleRate;
      // Copy before handing the buffer to Web Audio, so we can also save the clip.
      chunks.push(chunk.samples.slice());
      player.enqueue(chunk.samples, chunk.sampleRate);
    });
    const ttsMs = performance.now() - t;
    player.finish();
    if (metrics) {
      const row: RunMetrics = {
        input: metrics.input,
        character: character.displayName,
        transcript: text,
        sttMs: metrics.sttMs,
        ttsMs,
        totalMs: (firstSound ?? performance.now()) - metrics.started,
      };
      set({ runs: [...state.runs, row] });
    }
    await player.done;
  } finally {
    cancelAnimationFrame(raf);
    onLevel?.(0);
  }
  return { samples: concat(chunks), sampleRate };
}

/**
 * Dev-only hook for browser tests: loads just the voice model (speech-to-text
 * models can't be faked) and marks the engine ready. Stripped from production.
 */
if (import.meta.env.DEV) {
  (self as unknown as { __mimicDev: object }).__mimicDev = {
    loadVoiceOnly: async () => {
      await tts.load('wasm');
      set({ status: 'ready' });
    },
  };
}
