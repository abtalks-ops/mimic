// Downloads the exact model files Mimic needs into a folder that is published
// with the app, so phones fetch models from our own site instead of Hugging Face
// (docs/PRIVACY.md rule 2, ADR-0007).
//
// Usage: node scripts/fetch-models.mjs [outDir=public/models]
// Runs in the deploy workflow. Local dev keeps using Hugging Face unless this has been run
// and the app is built with VITE_SELF_HOSTED_MODELS=1.
import { createWriteStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const OUT = process.argv[2] ?? 'public/models';
const HF = 'https://huggingface.co';

/**
 * Each entry: a Hugging Face repo, the revision to pin, and which files to take.
 * Revisions are pinned for reproducible builds; bump them deliberately.
 */
const MODELS = [
  {
    repo: 'onnx-community/whisper-tiny.en',
    revision: process.env.WHISPER_REVISION ?? 'main',
    // Config/tokenizer files, plus the two ONNX variants the app loads:
    // WebGPU = fp32 encoder + q4 decoder; WASM = q8 ("quantized") for both.
    include: (f) =>
      (/^[^/]+\.(json|txt)$/.test(f) && !/^(README|\.gitattributes)/.test(f)) ||
      ['onnx/encoder_model.onnx', 'onnx/decoder_model_merged_q4.onnx', 'onnx/encoder_model_quantized.onnx', 'onnx/decoder_model_merged_quantized.onnx'].includes(f),
    dest: 'onnx-community/whisper-tiny.en',
  },
  {
    repo: 'rhasspy/piper-voices',
    revision: process.env.PIPER_REVISION ?? 'main',
    include: (f) => /^en\/en_US\/libritts_r\/medium\/(en_US-libritts_r-medium\.onnx(\.json)?|MODEL_CARD)$/.test(f),
    // Keep Piper's folder layout so the worker's URL scheme stays the same.
    dest: 'piper',
  },
];

async function json(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.json();
}

async function download(url, file, expectedSize) {
  if (existsSync(file) && (!expectedSize || statSync(file).size === expectedSize)) return 'cached';
  mkdirSync(dirname(file), { recursive: true });
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`${res.status} for ${url}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(file));
  const size = statSync(file).size;
  if (expectedSize && size !== expectedSize) throw new Error(`Size mismatch for ${file}: ${size} != ${expectedSize}`);
  return 'downloaded';
}

const manifest = [];
for (const m of MODELS) {
  const info = await json(`${HF}/api/models/${m.repo}/revision/${m.revision}?blobs=true`);
  const files = info.siblings.filter((s) => m.include(s.rfilename));
  if (!files.length) throw new Error(`No files matched in ${m.repo}`);
  for (const s of files) {
    const url = `${HF}/${m.repo}/resolve/${info.sha}/${s.rfilename}`;
    const file = join(OUT, m.dest, s.rfilename);
    const state = await download(url, file, s.size);
    console.log(`${state.padEnd(10)} ${file} (${((s.size ?? 0) / 1e6).toFixed(1)} MB)`);
    manifest.push({ repo: m.repo, revision: info.sha, file: s.rfilename, bytes: s.size });
  }
}
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({ fetchedAt: new Date().toISOString(), files: manifest }, null, 2));
const total = manifest.reduce((n, f) => n + (f.bytes ?? 0), 0);
console.log(`\n${manifest.length} files, ${(total / 1e6).toFixed(0)} MB -> ${OUT}`);
