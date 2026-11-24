# ADR-0005: Phase 1 voice spike: on-device speech-to-text and voices in the browser

- Status: **Accepted** (2026-11-24): Whisper tiny.en + Piper, both on-device
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

### Round 1 (build `cfb54f0`, 2026-11-24)
| Device | Browser | STT device | TTS device | Threads | p50 total | p90 total | Verdict |
|---|---|---|---|---|---|---|---|
| Windows PC, 12 cores, 8 GB | Chrome 158 | WebGPU | WASM | 1 (not isolated) | 8.2 s | 10.6 s | ❌ 4× over target |

Findings:
- The first voice run per session was ~3× slower (9 to 10.6 s) than later ones (~3 s): one-off kernel compilation.
- The voice step ran single-threaded because the page wasn't cross-origin isolated.
- Speech-to-text on WebGPU took 3 to 4.4 s for 3 to 5 words, again inflated by first-use compilation.

### Round 2 changes (Phase 1b)
1. **Warm-up:** both workers run one dummy inference during "Download voices".
2. **Cross-origin isolation:** a custom service worker (`src/sw.ts`) adds COOP/COEP headers, so ONNX Runtime runs on up to 4 threads. Verified in headless Chromium: `crossOriginIsolated` is true and a test model runs on 4 threads.
3. **Same-origin runtime:** the ONNX Runtime files are served from `/ort/` instead of jsDelivr (closer to PRIVACY.md rule 2).
4. **GPU voices on desktop:** Kokoro uses WebGPU (fp32, ~310 MB) where available on non-mobile devices.
5. **Streaming:** text is split at sentence ends and commas. The first part plays while the rest generates, and "total" now means time to first sound.

### Round 2 results
| Device | Browser | STT device | TTS device | Threads | p50 first sound | p90 first sound | Verdict |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

## Decision rule
- p50 ≤ 2 s on the target devices: accept this stack for the MVP.
- Otherwise try, in order: whisper-tiny.en, streaming TTS (play the first sentence early), WebGPU TTS on capable devices, then the browser's built-in speech recognition as an opt-in fallback.

### Round 1b: Android phone (build `cfb54f0`, before the Phase 1b fixes)
| Device | Browser | STT device | TTS device | Threads | p50 total | p90 total | Verdict |
|---|---|---|---|---|---|---|---|
| Android 10 phone, 8 cores, 8 GB | Chrome 156 | WebGPU | WASM | 1 | 9.7 s | 12.8 s | ❌ voice step 7.7 to 9.7 s |

Speech-to-text on the phone's GPU was acceptable once warm (1.3 s). Kokoro on one CPU thread is the bottleneck. Multi-threading is expected to give roughly 2 to 3× but probably not enough for phones.

### Phase 1c: Piper as a lighter engine
Added a **voice engine switch**. Piper (VITS, ~63 MB per medium voice) runs through onnxruntime-web, with the same espeak-ng phonemizer. It defaults on for phones so both engines can be compared on the same device.
- Max Blaze: `en_US-ryan-medium`; Stella Vale: `en_US-amy-medium` (from rhasspy/piper-voices). **Check each voice's dataset license before any public release.**

### Round 3: Android phone, Piper engine (build `105c67e`)
| Device | Browser | STT | TTS | Threads | Typed: first sound | Spoken: first sound | Verdict |
|---|---|---|---|---|---|---|---|
| Android 10 phone, 8 cores, 8 GB | Chrome 156 | whisper-base.en, WebGPU (~1.3 s) | Piper, WASM | 4 (isolated ✅) | 0.3 to 0.6 s | 2.5 to 3.0 s | ✅ typed, ❌ spoken |

The spoken path had ~0.7 s of overhead between releasing the button and speech-to-text starting, from MediaRecorder encoding and then decoding the clip.

### Phase 1d changes
- **Raw mic capture:** an AudioWorklet collects PCM directly, so no encode/decode is needed. In headless Chromium with a fake mic, stopping a 1.5 s recording now takes ~5 ms.
- **Whisper size option:** tiny.en (~40 MB, the default on phones) or base.en (~80 MB, the default on desktop).
- Expected spoken first sound: ~1.2 to 1.5 s on the same phone.

### Decision: Piper only (2026-11-24)
On the phone, Kokoro got stuck on "Thinking…" even with 4 threads, while Piper reached first sound for typed phrases in 0.3 to 0.6 s. The product owner chose to **drop Kokoro** and optimise Piper. Removed: the Kokoro worker, the `kokoro-js` dependency and the engine switch. `phonemizer` is now a direct dependency.

### Round 4: Android phone, Piper only, Whisper tiny vs base (build `ca6cfe3`)
| STT model | Runs | p50 first sound | p90 first sound | STT time | Verdict |
|---|---|---|---|---|---|
| whisper-tiny.en (WebGPU) | 5 spoken, 1 typed | **1.43 s** | **1.88 s** | 0.83 to 1.06 s | ✅ meets ≤2 s |
| whisper-base.en (WebGPU) | 5 spoken | 1.88 s | 2.05 s | 1.06 to 1.42 s | borderline |

Typed input: 0.5 s. Downloads: ~250 MB in total with tiny. The product owner judged tiny's accuracy "good enough".

## Final decision
**For the MVP, use Whisper tiny.en (WebGPU, with a WASM fallback) for speech-to-text and Piper medium voices (WASM, 4 threads) for character voices.** Both run entirely on-device, inside a cross-origin-isolated PWA.

Progress on the target phone (Android, 8 cores), time to first sound for spoken phrases: 9.7 s (round 1) → 2.5 to 3.0 s (Piper + threads) → **1.4 s** (raw mic capture + tiny).

### Carried into Phase 2
- ~~Self-host the model files (PRIVACY.md rule 2)~~ Done in ADR-0007.
- Check the licenses of the Piper `ryan` and `amy` voice datasets, or train or licence original character voices.
- Replace detune with a proper pitch shifter if the character effect sounds off.
- Load time (~7 to 11 s per model on first use, then cached) needs a friendly onboarding screen.
- Test on iPhone Safari (WebGPU/WASM behaviour differs).
