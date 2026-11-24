/// <reference lib="webworker" />
/**
 * Piper (VITS) voice engine. Runs onnxruntime-web directly; phonemes come
 * from the espeak-ng `phonemizer` package.
 *
 * Voices: the built-in multi-speaker LibriTTS-R model (one download, 904
 * speakers) plus any voices the user imported (stored in IndexedDB).
 */
import * as ort from 'onnxruntime-web/webgpu';
import { phonemize } from 'phonemizer';
import { db, type VoiceChoice } from '../core/storage/db';
import { joinClauses, phonemesToIds, voiceLanguage, type PiperConfig } from '../core/tts/piper';
import { BUILTIN_VOICE } from '../features/characters/registry';
import { PIPER_BASE } from './models';
import { ORT_WASM_PATH, type WorkerEvent, type WorkerRequest } from './protocol';

ort.env.wasm.wasmPaths = ORT_WASM_PATH;

const CACHE = 'mimic-piper-v2';
const SPLIT = /(?<=[.!?,;:])\s+/;

interface Voice {
  session: ort.InferenceSession;
  config: PiperConfig;
}
let builtin: Voice | undefined;
const custom = new Map<string, Voice>();
const post = (e: WorkerEvent, transfer: Transferable[] = []) => self.postMessage(e, transfer);

export interface SpeakPayload {
  text: string;
  voice: VoiceChoice;
  speed: number;
}

/** e.g. en_US-ryan-medium -> en/en_US/ryan/medium/en_US-ryan-medium */
function voicePath(id: string): string {
  const [locale, name, quality] = id.split('-');
  return `${PIPER_BASE}/${locale.split('_')[0]}/${locale}/${name}/${quality}/${id}`;
}

/** Fetch with Cache Storage and progress reporting. */
async function fetchCached(url: string, label: string): Promise<ArrayBuffer> {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(url);
  if (hit) {
    const buf = await hit.arrayBuffer();
    post({ type: 'progress', file: label, loaded: buf.byteLength, total: buf.byteLength });
    return buf;
  }
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Download failed (${res.status}) for ${label}`);
  const total = Number(res.headers.get('content-length')) || 0;
  const reader = res.body.getReader();
  const parts: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    loaded += value.length;
    post({ type: 'progress', file: label, loaded, total: total || loaded });
  }
  const buf = new Uint8Array(loaded);
  let o = 0;
  for (const p of parts) {
    buf.set(p, o);
    o += p.length;
  }
  await cache.put(url, new Response(buf));
  return buf.buffer;
}

// VITS uses ops that are poorly supported on WebGPU; WASM with 4 threads is fast enough (ADR-0005).
const createSession = (model: ArrayBuffer | Uint8Array) =>
  ort.InferenceSession.create(model instanceof Uint8Array ? model : new Uint8Array(model), { executionProviders: ['wasm'] });

async function voiceFor(choice: VoiceChoice): Promise<{ voice: Voice; speaker: number }> {
  if (choice.kind === 'builtin') {
    if (!builtin) throw new Error('Voice model not loaded');
    return { voice: builtin, speaker: Math.max(0, Math.min(BUILTIN_VOICE.speakers - 1, choice.speaker)) };
  }
  let voice = custom.get(choice.voiceId);
  if (!voice) {
    const row = await db.voices.get(choice.voiceId);
    // Don't hold the database open from this worker, or "Delete everything" would be blocked.
    db.close();
    if (!row) throw new Error('That imported voice was deleted. Pick another voice in Settings.');
    voice = { session: await createSession(await row.onnx.arrayBuffer()), config: row.config };
    custom.set(choice.voiceId, voice);
  }
  return { voice, speaker: 0 };
}

async function synth(voice: Voice, speaker: number, text: string, speed: number): Promise<Float32Array> {
  const clauses = await phonemize(text, voiceLanguage(voice.config));
  const ids = phonemesToIds(joinClauses(clauses, text), voice.config.phoneme_id_map);
  const inf = voice.config.inference ?? {};
  const feeds: Record<string, ort.Tensor> = {
    input: new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
    input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
    scales: new ort.Tensor('float32', Float32Array.from([inf.noise_scale ?? 0.667, (inf.length_scale ?? 1) / speed, inf.noise_w ?? 0.8]), [3]),
  };
  if ((voice.config.num_speakers ?? 1) > 1) feeds.sid = new ort.Tensor('int64', BigInt64Array.from([BigInt(speaker)]), [1]);
  const out = await voice.session.run(feeds);
  return (out.output ?? Object.values(out)[0]).data as Float32Array;
}

self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  try {
    if (data.type === 'load') {
      const path = voicePath(BUILTIN_VOICE.id);
      const [model, config] = await Promise.all([
        fetchCached(`${path}.onnx`, 'voice/model'),
        fetchCached(`${path}.onnx.json`, 'voice/config'),
      ]);
      builtin = { session: await createSession(model), config: JSON.parse(new TextDecoder().decode(config)) as PiperConfig };
      await synth(builtin, 0, 'Hi.', 1); // warm-up
      post({ id: data.id, type: 'ok', result: { speakers: builtin.config.num_speakers ?? 1 } });
    } else {
      const { text, voice: choice, speed } = data.payload as SpeakPayload;
      const { voice, speaker } = await voiceFor(choice);
      let parts = 0;
      for (const part of text.split(SPLIT).filter((s) => s.trim())) {
        const samples = await synth(voice, speaker, part, speed);
        post({ id: data.id, type: 'chunk', result: { samples, sampleRate: voice.config.audio.sample_rate } }, [samples.buffer]);
        parts++;
      }
      post({ id: data.id, type: 'ok', result: { parts } });
    }
  } catch (err) {
    post({ id: data.id, type: 'error', message: String((err as Error)?.message ?? err) });
  }
};
