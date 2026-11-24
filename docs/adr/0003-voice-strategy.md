# ADR-0003: Voice strategy: original voices, STT then TTS for the MVP

- Status: Proposed (pending PRD Q1 and Q3)
- Date: 2026-11-24
- Deciders: Akshay

## Context
The concept is "say it back in a celebrity voice". Cloning real celebrities without consent creates legal and app-store risk (see VOICES-AND-CHARACTERS.md). Technically, we can either re-speak the transcript (STT then TTS) or convert the user's voice directly (voice conversion).

## Decision
- Use **original character voices**, trained or tuned from consenting voice actors or openly licensed voices.
- MVP pipeline: **STT then TTS**. It is simpler and more robust, it supports typed input, and the models are small.
- Evaluate **voice conversion** in Phase 2 for more natural "mimicry".

## Alternatives considered
- **Real celebrity clones:** rejected unless licensed.
- **Voice conversion only:** keeps prosody but is heavier, and doesn't support typed input.

## Consequences
- The output loses the user's exact intonation in the MVP.
- We need a voice provenance file for each character.
