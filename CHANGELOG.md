# Changelog

All notable changes are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]
### Added
- Voice engine switch: Piper (lighter, for phones) alongside Kokoro.

### Changed
- Faster voice test build: model warm-up, multi-threaded WASM via a cross-origin-isolating service worker, same-origin ONNX runtime, WebGPU voices on desktop, and streamed playback.

### Added
- Phase 1 voice test build: hold-to-talk or type, on-device Whisper speech-to-text, Kokoro character voices with FX, animated avatars for Max Blaze and Stella Vale, latency readout and a GitHub Pages deploy workflow.
- Project foundation docs: PRD, roadmap, architecture, privacy, voice guardrails, ADRs 0001 to 0004, contributor guide and repo templates.
