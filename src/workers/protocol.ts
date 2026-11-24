export type Device = 'webgpu' | 'wasm';

export type WorkerRequest =
  | { id: number; type: 'load'; device: Device; model?: string }
  | { id: number; type: 'run'; payload: unknown };

export type WorkerEvent =
  | { type: 'progress'; file: string; loaded: number; total: number }
  /** Partial result for streaming runs (e.g. one sentence of audio). */
  | { id: number; type: 'chunk'; result: unknown }
  | { id: number; type: 'ok'; result: unknown }
  | { id: number; type: 'error'; message: string };

/** Same-origin ONNX runtime files (copied by scripts/copy-ort.mjs). */
export const ORT_WASM_PATH = `${import.meta.env.BASE_URL}ort/`;
