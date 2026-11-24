# Roadmap

Draft plan for review. Each phase ends with a demo and a go/no-go decision.

## Phase 0: Foundations (this phase)
- Product, architecture, privacy and legal docs (this repo)
- Decide the open questions in [PRD.md §8](PRD.md#8-open-questions-product-owner-to-decide)
- Create the GitHub repo, enable branch protection and CI
- **Exit:** docs approved, repo live, Q1 to Q3 answered

## Phase 1: Technical spike ✅ done (2026-11-24)
- Prove on-device speech-to-text and character text-to-speech in the browser on a real mid-range phone
- Measure latency, model size and memory; record results in an ADR
- **Exit:** ≤2 s end-to-end on target devices, or a documented fallback. **Met: 1.4 s p50 for spoken phrases on an Android phone (ADR-0005).**

## Phase 2: PWA MVP (in progress)
- Character picker, record/type, playback, local clip history, share, settings, offline support
- 4 characters with avatar animation ✅ (Max, Stella, Rex, Pixie)
- Clip history and sharing ✅ · Settings with voice picker, voice import and delete everything ✅ · First-run download screen ✅
- Self-host model files · legal review of espeak-ng (GPL) · Android-only testing for now (no iPhone available)
- Unit, e2e and accessibility tests in CI
- **Exit:** all PRD user stories pass; usability test with 5 people

## Phase 3: Native apps (2 to 3 weeks)
- Wrap with Capacitor; native mic and share plugins; app store assets and privacy labels
- **Exit:** TestFlight and Play internal testing builds approved
