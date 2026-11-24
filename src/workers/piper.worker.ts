/// <reference lib="webworker" />
/**
 * Piper (VITS) voice engine. Runs onnxruntime-web directly; phonemes come
 * from the espeak-ng `phonemizer` package.
 */
import * as ort from 'onnxruntime-web/webgpu';
import { phonemize } from 'phonemizer';
import { joinClauses, phonemesToIds, type PiperConfig } from '../core/tts/piper';
import { PIPER_VOICES } from '../features/characters/registry';
import { ORT_WASM_PATH, type WorkerEvent, type WorkerRequest } from './protocol';

ort.env.wasm.wasmPaths = ORT_WASM_PATH;

const BASE = 'https://huggingface.co/rhasspy/piper-voices/resolve/main';
const CACHE = 'mimic-piper-v1';
const SPLIT = /(?<=[.!?,;:])\s+/;

interface Voice {
  session: ort.InferenceSession;
  config: PiperConfig;
}
const voices = new Map<string, Voice>();
const post = (e: WorkerEvent, transfer: Transferable[] = []) => self.postMessage(e, transfer);

/** e.g. en_US-ryan-medium -> en/en_US/ryan/medium/en_US-ryan-medium */
function voicePath(id: string): string {
  const [locale, name, quality] = id.split('-');
  return `${BASE}/${locale.split('_')[0]}/${locale}/${name}/${quality}/${id}`;
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

async function synth(voice: Voice, text: string, speed: number): Promise<Float32Array> {
  const clauses = await phonemize(text, 'en-us');
  const ids = phonemesToIds(joinClauses(clauses, text), voice.config.phoneme_id_map);
  const inf = voice.config.inference ?? {};
  const feeds: Record<string, ort.Tensor> = {
    input: new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
    input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
    scales: new ort.Tensor('float32', Float32Array.from([inf.noise_scale ?? 0.667, (inf.length_scale ?? 1) / speed, inf.noise_w ?? 0.8]), [3]),
  };
  if ((voice.config.num_speakers ?? 1) > 1) feeds.sid = new ort.Tensor('int64', BigInt64Array.from([0n]), [1]);
  const out = await voice.session.run(feeds);
  return (out.output ?? Object.values(out)[0]).data as Float32Array;
}

self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  try {
    if (data.type === 'load') {
      for (const id of PIPER_VOICES) {
        const [model, config] = await Promise.all([
          fetchCached(`${voicePath(id)}.onnx`, `piper/${id}.onnx`),
          fetchCached(`${voicePath(id)}.onnx.json`, `piper/${id}.json`),
        ]);
        // VITS uses ops that are poorly supported on WebGPU; WASM is fast enough for this model size.
        const session = await ort.InferenceSession.create(new Uint8Array(model), { executionProviders: ['wasm'] });
        const voice = { session, config: JSON.parse(new TextDecoder().decode(config)) as PiperConfig };
        voices.set(id, voice);
        await synth(voice, 'Hi.', 1); // warm-up
      }
      post({ id: data.id, type: 'ok', result: 'piper' });
    } else {
      const { text, voice: voiceId, speed } = data.payload as { text: string; voice: string; speed: number };
      const voice = voices.get(voiceId);
      if (!voice) throw new Error(`Voice ${voiceId} not loaded`);
      let parts = 0;
      for (const part of text.split(SPLIT).filter((s) => s.trim())) {
        const samples = await synth(voice, part, speed);
        post({ id: data.id, type: 'chunk', result: { samples, sampleRate: voice.config.audio.sample_rate } }, [samples.buffer]);
        parts++;
      }
      post({ id: data.id, type: 'ok', result: { parts } });
    }
  } catch (err) {
    post({ id: data.id, type: 'error', message: String((err as Error)?.message ?? err) });
  }
};
