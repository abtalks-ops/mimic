# ADR-0007: Self-host the model files on our own site

- Status: Accepted
- Date: 2026-11-24
- Deciders: Akshay

## Context
The app downloaded Whisper tiny.en and the Piper libritts_r voice from huggingface.co. No user data was sent, but:
- Hugging Face could see which devices downloaded the models (an extra network origin, against docs/PRIVACY.md rule 2).
- If those files changed or disappeared upstream, new installs would break or change without us noticing.

## Decision
- `scripts/fetch-models.mjs` downloads **only the files the app loads**, pinned to the resolved commit SHA. It checks each file's size and writes `models/manifest.json` recording the repo, revision and file of everything published.
- The **deploy workflow** runs it before the build (cached by script hash) and builds with `VITE_SELF_HOSTED_MODELS=1`. The files are published with the app under `<site>/models/`. A workflow step fails the deploy if Piper URLs still point at Hugging Face.
- In self-hosted mode the app sets transformers.js `allowRemoteModels = false` and `localModelPath = <base>/models/`. Piper URLs use the same layout as rhasspy/piper-voices under `<base>/models/piper/`.
- Local `npm run dev` still uses Hugging Face, so developers don't need ~180 MB of models.

Licenses allow redistribution: LibriTTS-R voice CC BY 4.0 (attribution shown in Settings → Credits and kept in the published MODEL_CARD), Whisper MIT.

## Consequences
- The phone only talks to our own site, so the PRIVACY.md network rule is now met in production.
- The site grows by roughly 180 MB, well within GitHub Pages' 1 GB site limit. Pages has a soft 100 GB/month bandwidth limit, which is about 1,000 or more first-time installs a month. If usage grows past that, move `/models/` to a CDN or bucket (only `MODELS_BASE` changes).
- Model updates are explicit: set `WHISPER_REVISION` / `PIPER_REVISION`, or change the script.
