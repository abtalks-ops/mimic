# ADR-0006: One licensed multi-speaker voice model, plus user-imported voices

- Status: Accepted
- Date: 2026-11-24
- Deciders: Akshay

## Context
Phase 1 used the Piper voices `en_US-ryan-medium` and `en_US-amy-medium`. A license check (MODEL_CARDs on rhasspy/piper-voices, and piper discussion #271) found:

| Voice | Dataset license | Commercial use |
|---|---|---|
| ryan | CC BY-NC-SA 4.0 | ❌ |
| hfc_male | CC BY-NC-SA 4.0 | ❌ |
| amy | "See URL" (mimic3-voices), unclear | ⚠️ |
| lessac | Blizzard corpus, research only (community reading) | ❌ |
| ljspeech | Public domain | ✅ (1 female voice) |
| **libritts_r** | **CC BY 4.0**, 904 speakers | ✅ with attribution |

The product owner also wants 4 personalities, and wants users who own a voice to be able to use it.

## Decision
1. **Built-in voices:** `en_US-libritts_r-medium`, a single ~75 MB download. Each character uses a different speaker id (`sid`). An attribution line appears in Settings → Credits.
2. **Speaker picking:** Settings → Voices lets the user step through all 904 speakers and preview them per character. Choices are stored in IndexedDB. The registry defaults are provisional until the product owner picks final speakers by ear.
3. **Bring your own voice:** users can import a Piper voice (`.onnx` + `.onnx.json`, espeak phonemes only). The config is validated, the user must confirm they have the rights, and the files are stored only in IndexedDB on the device. Imported voices are loaded lazily by the voice worker.

## Consequences
- Roughly the same download size as before, but 4 characters instead of 2, and all license-clean.
- **Open legal item:** espeak-ng (via `phonemizer`) is GPL-3.0. Its effect on distributing the app (especially in app stores) needs legal review before launch. The alternative is a non-GPL phonemizer.
- Voice quality now depends on picking good speakers, which can only be done by ear.
