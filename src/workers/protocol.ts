export type Device = 'webgpu' | 'wasm';

export type WorkerRequest =
  | { id: number; type: 'load'; device: Device }
  | { id: number; type: 'run'; payload: unknown };

export type WorkerEvent =
  | { type: 'progress'; file: string; loaded: number; total: number }
  | { id: number; type: 'ok'; result: unknown }
  | { id: number; type: 'error'; message: string };
