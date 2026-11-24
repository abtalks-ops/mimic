/// <reference lib="webworker" />
import { env, KokoroTTS } from 'kokoro-js';
import { ORT_WASM_PATH, type WorkerEvent, type WorkerRequest } from './protocol';

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
env.wasmPaths = ORT_WASM_PATH;

let tts: KokoroTTS | undefined;
const post = (e: WorkerEvent, transfer: Transferable[] = []) => self.postMessage(e, transfer);

type RunPayload = { text: string; voice: string; speed: number };
/** Split at sentence ends and commas so the first part can play while the rest is generated. */
const SPLIT = /(?<=[.!?,;:])\s+/;

self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  try {
    if (data.type === 'load') {
      tts = await KokoroTTS.from_pretrained(MODEL_ID, {
        device: data.device,
        // q8 (~90 MB) for CPU/WASM; WebGPU needs fp32 (~310 MB) for correct output.
        dtype: data.device === 'webgpu' ? 'fp32' : 'q8',
        progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
          if (p.status === 'progress') post({ type: 'progress', file: `tts/${p.file}`, loaded: p.loaded ?? 0, total: p.total ?? 0 });
        },
      });
      // Warm-up with both launch voices so their style files are fetched and kernels compiled.
      for (const voice of ['am_fenrir', 'af_bella'] as const) await tts.generate('Hi.', { voice });
      post({ id: data.id, type: 'ok', result: MODEL_ID });
    } else {
      if (!tts) throw new Error('Voice model not loaded');
      const { text, voice, speed } = data.payload as RunPayload;
      let parts = 0;
      for await (const { audio } of tts.stream(text, { voice: voice as never, speed, split_pattern: SPLIT })) {
        const samples = audio.audio as Float32Array;
        post({ id: data.id, type: 'chunk', result: { samples, sampleRate: audio.sampling_rate } }, [samples.buffer]);
        parts++;
      }
      post({ id: data.id, type: 'ok', result: { parts } });
    }
  } catch (err) {
    post({ id: data.id, type: 'error', message: String((err as Error)?.message ?? err) });
  }
};
