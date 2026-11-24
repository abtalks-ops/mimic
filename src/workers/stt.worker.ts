/// <reference lib="webworker" />
import { env, pipeline, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';
import { ORT_WASM_PATH, type WorkerEvent, type WorkerRequest } from './protocol';

const MODEL_ID = 'onnx-community/whisper-base.en';
env.backends.onnx.wasm!.wasmPaths = ORT_WASM_PATH;

let asr: AutomaticSpeechRecognitionPipeline | undefined;
// transformers.js's overloaded pipeline() type is too large for tsc; narrow it to the one task we use.
const createAsr = pipeline as unknown as (task: 'automatic-speech-recognition', model: string, options: object) => Promise<AutomaticSpeechRecognitionPipeline>;
const post = (e: WorkerEvent) => self.postMessage(e);
/** ONNX Runtime's default: min(4, cores/2) when cross-origin isolated, else 1. */
const wasmThreads = () =>
  self.crossOriginIsolated ? (env.backends.onnx.wasm!.numThreads ?? Math.min(4, Math.ceil((navigator.hardwareConcurrency || 1) / 2))) : 1;

self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  try {
    if (data.type === 'load') {
      asr = await createAsr('automatic-speech-recognition', MODEL_ID, {
        device: data.device,
        dtype: data.device === 'webgpu' ? { encoder_model: 'fp32', decoder_model_merged: 'q4' } : 'q8',
        progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
          if (p.status === 'progress') post({ type: 'progress', file: `stt/${p.file}`, loaded: p.loaded ?? 0, total: p.total ?? 0 });
        },
      });
      // Warm-up: the first inference compiles GPU shaders / WASM kernels. Pay that cost now, not on the user's first phrase.
      await asr(new Float32Array(16000));
      post({ id: data.id, type: 'ok', result: { model: MODEL_ID, threads: wasmThreads() } });
    } else {
      if (!asr) throw new Error('Speech model not loaded');
      const out = await asr(data.payload as Float32Array);
      const text = (Array.isArray(out) ? out[0].text : out.text).trim();
      post({ id: data.id, type: 'ok', result: text });
    }
  } catch (err) {
    post({ id: data.id, type: 'error', message: String((err as Error)?.message ?? err) });
  }
};
