# Architecture Decision Records

We record every significant technical decision as a short ADR, using the format in [0000-template.md](0000-template.md).

- Number the files sequentially. Never edit an accepted ADR's decision; supersede it with a new one.
- Status values: Proposed, Accepted, Superseded by ADR-XXXX, Deprecated.

| ADR | Title | Status |
|---|---|---|
| [0001](0001-pwa-first-then-native.md) | PWA first, then a native wrapper via Capacitor | Proposed |
| [0002](0002-on-device-processing.md) | All processing and storage on-device | Proposed |
| [0003](0003-voice-strategy.md) | Voice strategy: original voices, STT then TTS for the MVP | Proposed |
| [0004](0004-frontend-stack.md) | React + Vite + TypeScript frontend | Proposed |
| [0005](0005-phase1-voice-spike.md) | Phase 1 voice spike: Whisper tiny + Piper on-device | Accepted |
| [0006](0006-voice-model-and-custom-voices.md) | One licensed multi-speaker voice model, plus user-imported voices | Accepted |
| [0007](0007-self-host-models.md) | Self-host the model files on our own site | Accepted |
