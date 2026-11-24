/// <reference lib="webworker" />
import { pipeline, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';
import type { WorkerEvent, WorkerRequest } from './protocol';

const MODEL_ID = 'onnx-community/whisper-base.en';
let asr: AutomaticSpeechRecognitionPipeline | undefined;
// transformers.js's overloaded pipeline() type is too large for tsc; narrow it to the one task we use.
const createAsr = pipeline as unknown as (task: 'automatic-speech-recognition', model: string, options: object) => Promise<AutomaticSpeechRecognitionPipeline>;
const post = (e: WorkerEvent) => self.postMessage(e);

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
      post({ id: data.id, type: 'ok', result: MODEL_ID });
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
