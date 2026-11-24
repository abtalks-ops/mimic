# ADR-0002: All processing and storage on-device

- Status: Proposed
- Date: 2026-11-24
- Deciders: Akshay

## Context
The product promise is privacy: user data stays on the user's device.

## Decision
No backend. STT, TTS and audio FX run in the browser (WebGPU/WASM in Web Workers). Data lives in IndexedDB. The only network traffic is static assets and model downloads.

## Alternatives considered
- **Cloud TTS/STT APIs:** better quality and simpler, but they send voice data off the device, which breaks the promise.
- **Hybrid with opt-in cloud:** possible later as an explicit user setting, which would need a new ADR.

## Consequences
- Model size and device performance become the main engineering constraints.
- No server costs, and a simpler compliance story.
- No remote crash reporting; we rely on testing and user-submitted feedback.
