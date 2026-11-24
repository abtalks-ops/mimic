# ADR-0004: React + Vite + TypeScript frontend

- Status: Proposed
- Date: 2026-11-24
- Deciders: Akshay

## Context
The code must be easy to hand to a different developer or team.

## Decision
React 18, Vite, strict TypeScript, Zustand, vite-plugin-pwa, Vitest and Playwright. Details are in ARCHITECTURE.md.

## Alternatives considered
- **Svelte/SvelteKit:** smaller bundles, but a smaller hiring pool.
- **Next.js:** server features we don't need.

## Consequences
Widely known stack, plenty of tooling, and it is Capacitor-compatible.
