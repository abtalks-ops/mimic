# ADR-0001: PWA first, then a native wrapper via Capacitor

- Status: Proposed
- Date: 2026-11-24
- Deciders: Akshay

## Context
We want to ship fast, test with real users, and later be on the App Store and Play Store without rewriting.

## Decision
Build a PWA with standard web APIs. In Phase 3, wrap the same build with Capacitor and replace web APIs with native plugins only where needed (mic on iOS, share, file storage).

## Alternatives considered
- **React Native / Flutter from day one:** better native performance, but slower iteration and on-device ML in the browser couldn't be reused.
- **Native Swift/Kotlin:** two codebases; too costly for an MVP.

## Consequences
- One codebase. Keep `core/` free of DOM-only assumptions where possible.
- iOS Safari PWA limits (background audio, storage eviction) must be tested early.
