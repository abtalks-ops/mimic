import type { Device, WorkerEvent, WorkerRequest } from './protocol';

export type ProgressFn = (file: string, loaded: number, total: number) => void;

/** Promise-based wrapper around a model worker. */
export class ModelWorker<In, Out> {
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  onProgress?: ProgressFn;

  constructor(private worker: Worker) {
    worker.onmessage = ({ data }: MessageEvent<WorkerEvent>) => {
      if (data.type === 'progress') return this.onProgress?.(data.file, data.loaded, data.total);
      const p = this.pending.get(data.id);
      if (!p) return;
      this.pending.delete(data.id);
      if (data.type === 'ok') p.resolve(data.result);
      else p.reject(new Error(data.message));
    };
  }

  private send(msg: WorkerRequest extends infer R ? (R extends WorkerRequest ? Omit<R, 'id'> : never) : never, transfer: Transferable[] = []): Promise<unknown> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ ...msg, id }, transfer);
    });
  }

  load(device: Device) {
    return this.send({ type: 'load', device }) as Promise<string>;
  }
  run(payload: In, transfer: Transferable[] = []) {
    return this.send({ type: 'run', payload }, transfer) as Promise<Out>;
  }
}

export const createStt = () =>
  new ModelWorker<Float32Array, string>(new Worker(new URL('./stt.worker.ts', import.meta.url), { type: 'module' }));

export const createTts = () =>
  new ModelWorker<{ text: string; voice: string; speed: number }, { samples: Float32Array; sampleRate: number }>(
    new Worker(new URL('./tts.worker.ts', import.meta.url), { type: 'module' }),
  );

export async function detectWebGpu(): Promise<boolean> {
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    return !!(gpu && (await gpu.requestAdapter()));
  } catch {
    return false;
  }
}
