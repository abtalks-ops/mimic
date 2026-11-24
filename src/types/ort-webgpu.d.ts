// onnxruntime-web's "./webgpu" export has no types entry; its API is onnxruntime-common's.
declare module 'onnxruntime-web/webgpu' {
  export * from 'onnxruntime-common';
}
