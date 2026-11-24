/**
 * Where model files come from (ADR-0007).
 * - Production (deploy workflow): our own site, under `<base>/models/`.
 * - Local dev: Hugging Face, unless built with VITE_SELF_HOSTED_MODELS=1
 *   after running `node scripts/fetch-models.mjs`.
 */
export const SELF_HOSTED = import.meta.env.VITE_SELF_HOSTED_MODELS === '1';
export const MODELS_BASE = `${import.meta.env.BASE_URL}models/`;

/** Root URL for Piper voice files, mirroring rhasspy/piper-voices' layout. */
export const PIPER_BASE = SELF_HOSTED ? `${MODELS_BASE}piper` : 'https://huggingface.co/rhasspy/piper-voices/resolve/main';
