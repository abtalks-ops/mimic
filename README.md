# Mimic

Mimic is a playful "repeat-after-me" voice app. You speak (or type), and a cartoon character says the same thing back in its own character voice.

- **Platform:** Progressive Web App (PWA) first. Wrapped as native iOS/Android apps later (see [ADR-0001](docs/adr/0001-pwa-first-then-native.md)).
- **Privacy:** All user data, recordings and settings stay on the user's device. There is no backend and no analytics by default (see [PRIVACY.md](docs/PRIVACY.md)).
- **Launch scope:** 2 characters, each with its own voice and a flat 2D animated avatar.

> Status: **Pre-development.** The docs below define the product and the technical baseline. No application code exists yet.

## Documentation map

| Doc | What it answers |
|---|---|
| [docs/PRD.md](docs/PRD.md) | What we are building, for whom, and what "done" means for the MVP |
| [docs/ROADMAP.md](docs/ROADMAP.md) | The phased delivery plan and milestones |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Tech stack, on-device audio pipeline, folder layout |
| [docs/PRIVACY.md](docs/PRIVACY.md) | Data handling rules every contributor must follow |
| [docs/VOICES-AND-CHARACTERS.md](docs/VOICES-AND-CHARACTERS.md) | Legal guardrails for voices and character art |
| [docs/adr/](docs/adr/) | Architecture Decision Records (why we chose what we chose) |
| [docs/GLOSSARY.md](docs/GLOSSARY.md) | Shared vocabulary |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to set up, branch, commit, test and open PRs |
| [SECURITY.md](SECURITY.md) | How to report vulnerabilities |
| [CHANGELOG.md](CHANGELOG.md) | Release history |

## Quick start (once code exists)

```bash
nvm use            # Node version pinned in .nvmrc
npm ci
npm run dev        # local dev server with HTTPS for mic access
npm test           # unit tests
npm run e2e        # Playwright end-to-end tests
```

## Ownership

| Area | Owner |
|---|---|
| Product | Akshay |
| Tech lead | _TBD_ |

## License

Proprietary, all rights reserved, until a license is chosen (see the open questions in [PRD.md](docs/PRD.md)).
