# Changelog

All notable changes are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]
### Added (Phase 2)
- Four original characters: Max Blaze, Stella Vale, Rex Rumble and Pixie Pop, all from one CC BY 4.0 voice model (LibriTTS-R, 904 speakers).
- Settings → Voices: pick and preview a speaker per character.
- Import your own Piper voice (.onnx + .onnx.json), with a rights confirmation. Stored on the device only.
- Clips: the last 50 clips are saved on the device with FX baked in, and can be replayed, shared (Web Share, with a download fallback) or deleted.
- Settings → Privacy & storage: usage and "Delete everything". Credits with license attributions.
- First-run download screen with progress and tips. Returning users load straight from cache.
- Bottom navigation, keyboard hold-to-talk (Space), focus styles, a skip link and reduced-motion support.

### Changed (Phase 2)
- Replaced the ryan/amy voices (non-commercial or unclear licenses) with libritts_r (ADR-0006).

### Added
- Voice engine switch: Piper (lighter, for phones) alongside Kokoro.

### Removed
- Whisper size choice: Whisper tiny.en is now fixed (1.4 s p50 on the target phone, ADR-0005).
- Kokoro voice engine and the engine switch. Piper is now the only voice engine.

### Changed
- Faster spoken input: raw AudioWorklet mic capture instead of MediaRecorder, and a Whisper tiny/base choice (tiny by default on phones).
- Faster voice test build: model warm-up, multi-threaded WASM via a cross-origin-isolating service worker, same-origin ONNX runtime, WebGPU voices on desktop, and streamed playback.

### Added
- Phase 1 voice test build: hold-to-talk or type, on-device Whisper speech-to-text, Kokoro character voices with FX, animated avatars for Max Blaze and Stella Vale, latency readout and a GitHub Pages deploy workflow.
- Project foundation docs: PRD, roadmap, architecture, privacy, voice guardrails, ADRs 0001 to 0004, contributor guide and repo templates.
