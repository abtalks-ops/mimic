// Copies the ONNX Runtime WASM files into public/ort so they are served from our own origin.
// Needed because (1) docs/PRIVACY.md limits network origins and (2) multi-threaded WASM under
// cross-origin isolation is more reliable when the runtime is same-origin.
import { cpSync, mkdirSync, readdirSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// Prefer the copy nested under transformers.js (the version it was built against), else the hoisted one.
const candidates = ['node_modules/@huggingface/transformers/node_modules/onnxruntime-web/dist', 'node_modules/onnxruntime-web/dist'];
const ortDist = candidates.find((d) => existsSync(d));
if (!ortDist) throw new Error('onnxruntime-web not found; run npm ci first');
const out = 'public/ort';
mkdirSync(out, { recursive: true });
const files = readdirSync(ortDist).filter((f) => /^ort-wasm-simd-threaded\.jsep\.(mjs|wasm)$/.test(f));
for (const f of files) cpSync(join(ortDist, f), join(out, f));
console.log(`copied ${files.join(', ')} -> ${out}`);
