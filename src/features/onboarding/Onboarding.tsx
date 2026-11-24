import { useState } from 'react';
import { loadModels, useEngine } from '../../app/engine';
import { audioContext } from '../../core/audio/player';
import { Avatar } from '../characters/Avatar';
import { BUILTIN_VOICE, CHARACTERS, STT_MODEL } from '../characters/registry';

const TIPS = [
  'Hold the big button, talk, then let go.',
  'You can type instead of talking.',
  'Every clip is saved under Clips, ready to share.',
  'Pick a different voice for each character in Settings.',
];

/** First-run screen: explains the one-time download and shows friendly progress. */
export function Onboarding({ returning }: { returning: boolean }) {
  const { status, error, loaded, total } = useEngine();
  const [forceWasm, setForceWasm] = useState(false);
  const pct = total ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
  const downloading = status === 'loading';
  const tip = TIPS[Math.floor(pct / 26) % TIPS.length];

  return (
    <section className="onboarding" aria-labelledby="ob-h">
      <div className="cast" aria-hidden="true">
        {CHARACTERS.map((c, i) => (
          <Avatar key={c.id} character={c} mouth={downloading ? ((pct + i * 25) % 50) / 50 : 0} size={64} />
        ))}
      </div>
      {!downloading && status !== 'error' && (
        <>
          <h2 id="ob-h">{returning ? 'Welcome back!' : 'Meet the cast'}</h2>
          <p>
            Say anything, and Max, Stella, Rex or Pixie will say it right back in their own voice. Everything happens
            on your phone, so nothing you say is uploaded.
          </p>
          <p className="muted">
            {returning
              ? 'Getting the voices ready…'
              : `First, a one-time download of about ${STT_MODEL.sizeMB + BUILTIN_VOICE.sizeMB} MB. Wi-Fi recommended. After that, Mimic opens instantly and works offline.`}
          </p>
          <button
            className="primary"
            onClick={() => {
              audioContext(); // unlock audio inside the tap (iOS)
              void loadModels(forceWasm);
            }}
          >
            {returning ? 'Start' : 'Download voices'}
          </button>
          <details className="advanced">
            <summary>Having trouble?</summary>
            <label className="check">
              <input type="checkbox" checked={forceWasm} onChange={(e) => setForceWasm(e.target.checked)} /> Don’t use the
              graphics chip (slower, but works on more phones)
            </label>
          </details>
        </>
      )}
      {downloading && (
        <>
          <h2 id="ob-h">{pct >= 100 ? 'Warming up the voices…' : 'Downloading voices…'}</h2>
          <progress value={loaded} max={total || 1} aria-label="Download progress" />
          <p className="muted" aria-live="polite">
            {pct}% · {(loaded / 1e6).toFixed(0)} of {total ? (total / 1e6).toFixed(0) : '…'} MB
          </p>
          <p className="tip">💡 {tip}</p>
        </>
      )}
      {status === 'error' && (
        <>
          <h2 id="ob-h">Something went wrong</h2>
          <p className="error" role="alert">
            {navigator.onLine ? error : 'You seem to be offline. Connect to the internet for the one-time download.'}
          </p>
          <button className="primary" onClick={() => location.reload()}>
            Try again
          </button>
        </>
      )}
    </section>
  );
}
