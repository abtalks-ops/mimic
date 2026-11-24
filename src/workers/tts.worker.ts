/// <reference lib="webworker" />
import { KokoroTTS } from 'kokoro-js';
import type { WorkerEvent, WorkerRequest } from './protocol';

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
let tts: KokoroTTS | undefined;
const post = (e: WorkerEvent, transfer: Transferable[] = []) => self.postMessage(e, transfer);

type RunPayload = { text: string; voice: string; speed: number };

self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  try {
    if (data.type === 'load') {
      tts = await KokoroTTS.from_pretrained(MODEL_ID, {
        device: data.device,
        // q8 (~90 MB) for CPU/WASM; WebGPU needs fp32 for correct output.
        dtype: data.device === 'webgpu' ? 'fp32' : 'q8',
        progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
          if (p.status === 'progress') post({ type: 'progress', file: `tts/${p.file}`, loaded: p.loaded ?? 0, total: p.total ?? 0 });
        },
      });
      post({ id: data.id, type: 'ok', result: MODEL_ID });
    } else {
      if (!tts) throw new Error('Voice model not loaded');
      const { text, voice, speed } = data.payload as RunPayload;
      const audio = await tts.generate(text, { voice: voice as never, speed });
      const samples = audio.audio as Float32Array;
      post({ id: data.id, type: 'ok', result: { samples, sampleRate: audio.sampling_rate } }, [samples.buffer]);
    }
  } catch (err) {
    post({ id: data.id, type: 'error', message: String((err as Error)?.message ?? err) });
  }
};
