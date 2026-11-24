# Product Requirements: Mimic MVP

| | |
|---|---|
| Owner | Akshay |
| Status | Draft v0.1 (2026-11-24) |
| Target | PWA MVP, later native app |

## 1. Problem and pitch

People love hearing their own words in a funny or famous-sounding voice. Mimic lets anyone speak a sentence and have a cute cartoon character say it straight back in a distinctive voice. It is instant, fun and shareable, and nothing leaves the phone.

## 2. Goals

1. A user can speak or type a phrase and hear it repeated in a character voice within ~2 seconds on a mid-range phone.
2. Two launch characters, each with a distinct voice and an animated 2D avatar that lip-syncs or reacts while talking.
3. 100% on-device processing and storage. No account, no server, no tracking.
4. Installable PWA that works offline after the first load.

## 3. Non-goals (MVP)

- Real celebrity voice clones or likenesses without written permission (see [VOICES-AND-CHARACTERS.md](VOICES-AND-CHARACTERS.md)).
- Cloud sync, accounts, social feed.
- Conversation or AI chat replies. Mimic **repeats** what you say; it does not answer.
- More than 2 characters.

## 4. Users

- **Primary:** casual users aged 13+ who want a quick laugh and something to share.
- **Secondary:** kids with a parent (this needs a COPPA/GDPR-K review before targeting under-13s).

## 5. User stories (MVP)

| ID | As a user I want to… | Acceptance criteria |
|---|---|---|
| US-1 | pick a character | Character picker shows 2 characters with name, preview clip and avatar |
| US-2 | hold a button and speak | Mic permission prompt appears once; recording up to 15 s; waveform shows I'm being heard |
| US-3 | hear my phrase in the character's voice | Playback starts ≤2 s after release on target devices; avatar animates during playback |
| US-4 | type instead of speaking | Text field up to 200 chars produces the same result |
| US-5 | replay and save clips | Last 50 clips kept locally; I can replay, delete, or delete all |
| US-6 | share a clip | Exports an audio file (or short video with avatar, as a stretch goal) via the Web Share API |
| US-7 | use it offline | After first load and model download, the app works in airplane mode |
| US-8 | control my data | Settings shows storage used, "Delete everything" and the privacy summary |

## 6. Non-functional requirements

- **Performance:** first load under 3 MB before models. Models are downloaded lazily with a progress bar. Target device is a mid-range 2022 Android phone or an iPhone 12.
- **Accessibility:** WCAG 2.2 AA, captions of spoken text shown on screen, full keyboard and screen-reader support.
- **Privacy:** see [PRIVACY.md](PRIVACY.md). No network calls except fetching static app assets and models.
- **Browsers:** latest 2 versions of Chrome, Safari (iOS 17+), Edge, Firefox and Samsung Internet.
- **Localization:** English at launch, with strings externalised from day one.

## 7. Success metrics

Because there is no analytics, we measure through opt-in local stats the user can choose to share, plus app store and PWA install feedback later:
- Time from release of the button to first audio (p50/p90, measured in dev builds)
- Usability test sessions: 5 of 5 testers complete US-1 to US-3 unaided

## 8. Open questions (product owner to decide)

| # | Question | Default assumed until decided |
|---|---|---|
| Q1 | Voice strategy: original "celebrity-inspired" voices, licensed voice actors, or real celebrities with permission? | Original inspired voices (e.g. "Max Blaze", an action-hero voice, and "Stella Vale", a film-star voice) |
| Q2 | Input mode: mic, text, or both? | Both |
| Q3 | Keep the user's exact words and timing (voice conversion) or re-speak the transcript (STT then TTS)? | STT then TTS for the MVP; evaluate voice conversion in Phase 2 |
| Q4 | Target age: is under-13 in scope? | 13+ only |
| Q5 | Monetisation (free, ads, premium characters)? | Free MVP, no ads |
| Q6 | License and code ownership if contractors join | Proprietary, contributors sign an IP assignment |
| Q7 | Character art: in-house, freelance illustrator, or generated and then refined? | Freelance illustrator, flat 2D style; original designs only |
