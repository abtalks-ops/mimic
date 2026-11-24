# Privacy and data handling

Mimic's promise: **your voice never leaves your device.** Every contributor must follow these rules. A PR that breaks them is rejected.

## Rules

1. **No user data over the network.** Audio, transcripts, clips and settings are never sent to any server, including ours.
2. **Allowed network calls:** static app assets and model files only, fetched from our own origin or CDN. Every new origin must be added to the CSP allowlist and approved in review.
3. **No third-party analytics, ads SDKs, crash reporters or fonts loaded from third-party CDNs** unless they run fully on-device and are approved in an ADR.
4. **Storage:** IndexedDB and Cache Storage only. Raw recordings are deleted once a clip is produced, unless the user saves them.
5. **User control:** Settings must always offer "Delete everything", which clears IndexedDB, caches and localStorage.
6. **Imported voices** are stored only in IndexedDB on the device and are removed by "Delete everything".
7. **Retention:** the clip history is capped at 50 items by default, oldest removed first.
8. **Permissions:** request the microphone only when the user taps record, never at startup.
9. **Sharing** happens only through an explicit user action (the Web Share API or a file download).

## Enforcement

- Strict Content-Security-Policy, with `connect-src` limited to our origin and model CDN.
- An e2e test asserts that no network requests are made during record → play.
- Code review checklist item in the PR template.

## Store and legal notes (for Phase 3)

- App Store privacy label: "Data Not Collected".
- Play Data safety form: no data collected or shared.
- A privacy policy page is still required by the stores. Draft it from this file.
