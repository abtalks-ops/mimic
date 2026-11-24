import type { Device, WorkerEvent, WorkerRequest } from './protocol';

export type ProgressFn = (file: string, loaded: number, total: number) => void;

/** Promise-based wrapper around a model worker. */
export class ModelWorker<In, Out> {
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void; onChunk?: (c: unknown) => void }>();
  onProgress?: ProgressFn;

  constructor(private worker: Worker) {
    worker.onmessage = ({ data }: MessageEvent<WorkerEvent>) => {
      if (data.type === 'progress') return this.onProgress?.(data.file, data.loaded, data.total);
      const p = this.pending.get(data.id);
      if (!p) return;
      if (data.type === 'chunk') return p.onChunk?.(data.result);
      this.pending.delete(data.id);
      if (data.type === 'ok') p.resolve(data.result);
      else p.reject(new Error(data.message));
    };
  }

  private send(
    msg: WorkerRequest extends infer R ? (R extends WorkerRequest ? Omit<R, 'id'> : never) : never,
    transfer: Transferable[] = [],
    onChunk?: (c: unknown) => void,
  ): Promise<unknown> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, onChunk });
      this.worker.postMessage({ ...msg, id }, transfer);
    });
  }

  load(device: Device) {
    return this.send({ type: 'load', device });
  }
  run(payload: In, transfer: Transferable[] = []) {
    return this.send({ type: 'run', payload }, transfer) as Promise<Out>;
  }
  /** Runs a streaming job; onChunk is called for each partial result before the promise resolves. */
  stream<C>(payload: In, onChunk: (chunk: C) => void) {
    return this.send({ type: 'run', payload }, [], onChunk as (c: unknown) => void) as Promise<Out>;
  }
}

export const createStt = () =>
  new ModelWorker<Float32Array, string>(new Worker(new URL('./stt.worker.ts', import.meta.url), { type: 'module' }));

export const createTts = () =>
  new ModelWorker<{ text: string; voice: string; speed: number }, { parts: number }>(
    new Worker(new URL('./tts.worker.ts', import.meta.url), { type: 'module' }),
  );

export const createPiper = () =>
  new ModelWorker<{ text: string; voice: string; speed: number }, { parts: number }>(
    new Worker(new URL('./piper.worker.ts', import.meta.url), { type: 'module' }),
  );

export async function detectWebGpu(): Promise<boolean> {
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    return !!(gpu && (await gpu.requestAdapter()));
  } catch {
    return false;
  }
}

export interface AudioChunk {
  samples: Float32Array;
  sampleRate: number;
}

/** WebGPU is common on desktops but the fp32 voice model is a 310 MB download, so phones default to WASM. */
export function isLikelyMobile(): boolean {
  return /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent);
}
