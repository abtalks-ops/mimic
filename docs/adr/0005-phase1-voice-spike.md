# ADR-0005: Phase 1 voice spike: Whisper base.en + Kokoro-82M in the browser

- Status: Proposed (awaiting results from real phones)
- Date: 2026-11-24
- Deciders: Akshay

## Context
Before building the MVP we need proof that speech-to-text and character voices can run fully on a mid-range phone within the ≤2 s target (PRD §2).

## Decision (what the spike tests)
| Part | Choice | Size | Notes |
|---|---|---|---|
| STT | `onnx-community/whisper-base.en` via transformers.js v3 | ~80 MB (q8) | WebGPU when available, else WASM |
| TTS | `onnx-community/Kokoro-82M-v1.0-ONNX` via kokoro-js | ~90 MB (q8) | WASM; WebGPU would need the 300 MB fp32 model |
| Voices | Kokoro `am_fenrir` (Max Blaze), `af_bella` (Stella Vale) | | Apache-2.0 model; FX chain adds character |
| FX | Web Audio detune + low/high shelf EQ | | Detune also changes speed slightly (spike shortcut) |

Both models run in Web Workers. The test build shows load time, speech-to-text time, voice time and total time per run, and a "Copy results" button.

## Known spike shortcuts (fix before MVP)
- **Model hosting:** models are fetched from huggingface.co. docs/PRIVACY.md rule 2 requires our own origin/CDN, so we self-host before MVP. No user data is sent either way; only model files are downloaded.
- **Single-threaded WASM:** GitHub Pages can't send COOP/COEP headers, so `crossOriginIsolated` is false and ONNX runs on one thread. A production host with those headers should be faster.
- **Pitch shift:** replace detune with a proper pitch shifter (e.g. an AudioWorklet phase vocoder) if detune sounds off.

## Results
_Fill in from the "Copy results" output on each test device._

| Device | Browser | STT device | Load time | p50 total | p90 total | Verdict |
|---|---|---|---|---|---|---|
| | | | | | | |

## Decision rule
- p50 ≤ 2 s on the target devices: accept this stack for the MVP.
- Otherwise try, in order: whisper-tiny.en, streaming TTS (play the first sentence early), WebGPU TTS on capable devices, then the browser's built-in speech recognition as an opt-in fallback.
