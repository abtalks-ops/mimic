# Voices and characters: legal guardrails

> Not legal advice. Have a lawyer review before public launch.

## Why this matters

- **Right of publicity:** using a real person's recognisable voice or likeness commercially without consent is unlawful in many places (US states such as California and New York, Tennessee's ELVIS Act, and similar laws elsewhere).
- **Platform rules:** voice AI providers forbid cloning someone without their consent. Apple and Google reject apps that impersonate real people.
- **Trademark and copyright:** Duolingo's and Roblox's characters and styles are protected. We can be *inspired by* a flat, friendly 2D style, but must not copy their characters.

## Rules for this project

1. Characters are **original**: an original name, design and voice.
2. A voice may evoke an archetype (for example "action-hero swagger" or "old-Hollywood glamour") but must not be marketed as, named after, or advertised as a real person.
3. Every voice model needs a recorded provenance: who recorded the training data, the signed consent or license, and permitted uses. Keep it in `docs/licenses/<character-id>.md`.
4. Celebrity voices only with a **written license** from the person or their estate. This would need its own ADR.
5. Add a user safeguard: an on-screen note that voices are fictional characters.

## Launch characters

All four use the built-in LibriTTS-R voice model (CC BY 4.0) with different speakers and FX (ADR-0006).

| ID | Name | Archetype | Visual |
|---|---|---|---|
| max-blaze | Max Blaze | Action-hero swagger | Spiky hair, aviator shades |
| stella-vale | Stella Vale | Old-Hollywood glamour | Wavy golden hair, beauty mark |
| rex-rumble | Rex Rumble | Booming announcer | Commentator headset and mic |
| pixie-pop | Pixie Pop | Bubbly pop star | Pink space buns, star eye |

## User-imported voices
- Users may import their own Piper voice. Before import they must confirm they own it or have permission, and that they won't impersonate a real person without consent.
- Imported voices never leave the device and are never bundled or shared by us.
