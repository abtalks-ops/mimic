# Contributing to Mimic

## Before you start
Read the [PRD](docs/PRD.md), [ARCHITECTURE](docs/ARCHITECTURE.md) and **[PRIVACY](docs/PRIVACY.md)**. The privacy rules are not optional.

## Setup
- Node: version in `.nvmrc` (`nvm use`)
- `npm ci`, then `npm run dev` (serves over HTTPS on localhost so the mic works)
- Recommended editor: VS Code with the ESLint, Prettier and EditorConfig extensions

## Branching
- `main` is always deployable and protected (PR plus 1 approval plus green CI).
- Branch names: `feat/<short-desc>`, `fix/<short-desc>`, `chore/…`, `docs/…`.
- Keep PRs small (aim for under 400 changed lines).

## Commits
[Conventional Commits](https://www.conventionalcommits.org/): `feat(recorder): add waveform`, `fix(tts): handle empty text`.

## Code standards
- TypeScript `strict`; no `any` without a comment explaining why.
- `core/` must not import React or UI code.
- New characters are added through the registry plus a license file. Never hard-code a character.
- User-facing strings go through `i18n/`.
- Every new UI component gets an accessibility check (axe in tests).

## Testing
| Command | What |
|---|---|
| `npm test` | Vitest unit tests |
| `npm run e2e` | Playwright on Chromium, WebKit and Firefox |
| `npm run lint` / `npm run typecheck` | Static checks |

New logic needs unit tests. New user flows need an e2e test.

## Decisions
Significant technical choices need an ADR in `docs/adr/`, using the template.

## Releases
Semantic versioning. Update `CHANGELOG.md` under "Unreleased" in your PR. A release is cut by tagging `vX.Y.Z` on `main`.
