# Architecture

Status: proposed baseline. Changes go through a new ADR in [adr/](adr/).

## 1. Principles

1. **Local-first, no backend.** The app is static files on a CDN. All computation happens in the browser.
2. **Platform-agnostic core.** Audio, models and storage logic live in plain TypeScript modules with no UI imports, so the native wrapper can reuse them.
3. **Lazy and replaceable models.** Speech-to-text (STT) and text-to-speech (TTS) engines sit behind interfaces, so a model can be swapped without touching the UI.

## 2. Tech stack

| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript (strict) | Type safety for a team handoff |
| UI | React 18 + Vite | Large hiring pool, fast builds |
| Styling | CSS Modules + design tokens | No runtime cost, easy to theme |
| State | Zustand | Small, simple and testable |
| PWA | vite-plugin-pwa (Workbox) | Service worker, offline caching, install manifest |
| STT (on-device) | Whisper tiny/base via transformers.js (WebGPU, WASM fallback) | Runs fully in the browser |
| TTS (on-device) | Piper or Kokoro voices via onnxruntime-web | Small and fast, custom voices can be trained |
| Voice character FX | Web Audio API (pitch, formant, EQ) | Adds flavour on top of the base TTS voice |
| Avatar animation | Rive (or Lottie) with mouth shapes driven by audio amplitude | Light, designer-friendly |
| Storage | IndexedDB via Dexie; Cache Storage for models | Large blobs, offline |
| Testing | Vitest, Testing Library, Playwright, axe-core | Unit, e2e and accessibility |
| Lint/format | ESLint + Prettier, Husky + lint-staged | Consistent code |
| Native (later) | Capacitor | Reuses the PWA code as is |
| Hosting | Static host (Cloudflare Pages / Netlify / Vercel) | HTTPS is required for the mic |

## 3. Audio pipeline (MVP)

```
Mic (MediaRecorder / AudioWorklet)
   │  PCM 16 kHz
   ▼
STT worker ──► transcript text ──► TTS worker (character voice model)
                                     │  PCM
                                     ▼
                         Web Audio FX chain (pitch/EQ per character)
                                     │
                         ┌───────────┴───────────┐
                         ▼                       ▼
                  Speaker playback      Amplitude → avatar mouth
                         │
                         ▼
                  Clip saved to IndexedDB (audio + transcript)
```

- Heavy models run in **Web Workers** so the UI stays smooth.
- Typed input skips the STT step.
- **Phase 2 option:** replace STT then TTS with direct voice conversion (an RVC-style ONNX model). This keeps the user's timing and emotion. See [ADR-0003](adr/0003-voice-strategy.md).

## 4. Proposed folder layout

```
src/
  app/            routes, providers, layout
  features/
    characters/   picker, character registry (config-driven)
    recorder/     mic capture, waveform
    playback/     player, avatar sync
    history/      saved clips list
    settings/     storage usage, delete all, privacy
  core/           no React imports
    audio/        capture, FX chain, encoders
    stt/          SpeechToText interface + whisper adapter
    tts/          TextToSpeech interface + piper adapter
    storage/      Dexie schema, migrations
  workers/        stt.worker.ts, tts.worker.ts
  ui/             shared components, design tokens
  i18n/           string catalogs
public/
  characters/<id>/  avatar.riv, voice.onnx (or a CDN URL), meta.json
tests/e2e/
```

## 5. Character registry

Characters are data, not code. Adding a character means adding a folder and a JSON entry:

```json
{
  "id": "max-blaze",
  "displayName": "Max Blaze",
  "voiceModel": "characters/max-blaze/voice.onnx",
  "fx": { "pitchSemitones": -2, "eq": "warm" },
  "avatar": "characters/max-blaze/avatar.riv",
  "license": "docs/licenses/max-blaze.md"
}
```

## 6. Environments

| Env | Branch | URL |
|---|---|---|
| Preview | every PR | auto preview deployment |
| Staging | `main` | staging URL |
| Production | tag `v*` | production URL |

## 7. Key risks

| Risk | Mitigation |
|---|---|
| Model size slows first use | Lazy download with progress, cache, quantised models |
| iOS Safari WebGPU/WASM limits | WASM fallback; test on real iPhones early (Phase 1) |
| Latency over 2 s on low-end phones | Smaller models, streaming TTS, a "lite" mode |
| Legal exposure over voices and likeness | Original characters only; see VOICES-AND-CHARACTERS.md |
