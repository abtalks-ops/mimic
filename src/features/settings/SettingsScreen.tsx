import { useEffect, useState } from 'react';
import { speak, useEngine } from '../../app/engine';
import { forgetCustomVoice, setVoice, useVoiceChoices, voiceFor } from '../../app/voices';
import { audioContext } from '../../core/audio/player';
import { formatReport, percentile } from '../../core/metrics/metrics';
import { db, deleteEverything, type CustomVoice, type VoiceChoice } from '../../core/storage/db';
import { validatePiperConfig } from '../../core/tts/piper';
import { Avatar } from '../characters/Avatar';
import { BUILTIN_VOICE, CHARACTERS, STT_MODEL, type Character } from '../characters/registry';

export function SettingsScreen() {
  const [voices, setVoices] = useState<CustomVoice[]>([]);
  const refreshVoices = () => db.voices.toArray().then(setVoices);
  useEffect(() => void refreshVoices(), []);

  return (
    <>
      <VoicesSection voices={voices} />
      <ImportSection voices={voices} onChange={refreshVoices} />
      <StorageSection />
      <CreditsSection />
      <PerformanceSection />
    </>
  );
}

function VoicesSection({ voices }: { voices: CustomVoice[] }) {
  const choices = useVoiceChoices();
  const engine = useEngine();
  const [previewing, setPreviewing] = useState<string>();

  async function preview(c: Character, voice: VoiceChoice) {
    audioContext();
    setPreviewing(c.id);
    try {
      await speak({ text: `Hi! I'm ${c.displayName}. How do I sound?`, character: c, voice });
    } finally {
      setPreviewing(undefined);
    }
  }

  return (
    <section className="panel" aria-labelledby="voices-h">
      <h2 id="voices-h">Voices</h2>
      <p className="muted">
        Pick a voice for each character. The built-in model has {BUILTIN_VOICE.speakers} speakers. Step through them and
        press Preview to listen.
      </p>
      {CHARACTERS.map((c) => {
        const v = voiceFor(c, choices);
        const sourceValue = v.kind === 'builtin' ? 'builtin' : v.voiceId;
        return (
          <div key={c.id} className="voice-row">
            <Avatar character={c} mouth={0} size={44} />
            <div className="voice-controls">
              <label>
                <strong>{c.displayName}</strong>
                <select
                  value={sourceValue}
                  onChange={(e) =>
                    void setVoice(
                      c.id,
                      e.target.value === 'builtin' ? { kind: 'builtin', speaker: c.defaultSpeaker } : { kind: 'custom', voiceId: e.target.value },
                    )
                  }
                  aria-label={`Voice source for ${c.displayName}`}
                >
                  <option value="builtin">Built-in voices</option>
                  {voices.map((iv) => (
                    <option key={iv.id} value={iv.id}>
                      Imported: {iv.name}
                    </option>
                  ))}
                </select>
              </label>
              {v.kind === 'builtin' && (
                <div className="stepper" role="group" aria-label={`Speaker for ${c.displayName}`}>
                  <button onClick={() => void setVoice(c.id, { kind: 'builtin', speaker: (v.speaker + BUILTIN_VOICE.speakers - 1) % BUILTIN_VOICE.speakers })} aria-label="Previous speaker">
                    −
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={BUILTIN_VOICE.speakers - 1}
                    value={v.speaker}
                    onChange={(e) => {
                      const n = Math.max(0, Math.min(BUILTIN_VOICE.speakers - 1, Number(e.target.value) || 0));
                      void setVoice(c.id, { kind: 'builtin', speaker: n });
                    }}
                    aria-label="Speaker number"
                  />
                  <button onClick={() => void setVoice(c.id, { kind: 'builtin', speaker: (v.speaker + 1) % BUILTIN_VOICE.speakers })} aria-label="Next speaker">
                    +
                  </button>
                  <button onClick={() => void setVoice(c.id, { kind: 'builtin', speaker: Math.floor(Math.random() * BUILTIN_VOICE.speakers) })} aria-label="Random speaker">
                    🎲
                  </button>
                </div>
              )}
              <button className="secondary" onClick={() => void preview(c, v)} disabled={engine.status !== 'ready' || previewing !== undefined}>
                {previewing === c.id ? 'Playing…' : 'Preview'}
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function ImportSection({ voices, onChange }: { voices: CustomVoice[]; onChange: () => void }) {
  const [onnx, setOnnx] = useState<File>();
  const [json, setJson] = useState<File>();
  const [name, setName] = useState('');
  const [rights, setRights] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function importVoice(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setStatus('');
    if (!onnx || !json) return setError('Choose both files: the .onnx model and its .onnx.json config.');
    if (!rights) return setError('Please confirm you have the rights to use this voice.');
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await json.text());
      } catch {
        throw new Error('The .json file could not be read. Is it the voice’s .onnx.json file?');
      }
      const config = validatePiperConfig(parsed);
      const id = crypto.randomUUID();
      const now = Date.now();
      await db.voices.add({
        id,
        name: name.trim() || onnx.name.replace(/\.onnx$/, ''),
        onnx,
        config,
        sizeBytes: onnx.size,
        addedAt: now,
        rightsConfirmedAt: now,
      });
      setStatus('Voice imported. Choose it for a character under Voices, then press Preview.');
      setOnnx(undefined);
      setJson(undefined);
      setName('');
      setRights(false);
      (e.target as HTMLFormElement).reset();
      onChange();
    } catch (err) {
      setError(String((err as Error).message ?? err));
    }
  }

  async function remove(v: CustomVoice) {
    await db.voices.delete(v.id);
    await forgetCustomVoice(v.id);
    onChange();
  }

  return (
    <section className="panel" aria-labelledby="import-h">
      <h2 id="import-h">Import your own voice</h2>
      <p className="muted">
        Have a Piper voice you’re allowed to use? A Piper voice is two files: <code>name.onnx</code> (the model) and{' '}
        <code>name.onnx.json</code> (its settings). They stay on this phone and are never uploaded.
      </p>
      <form onSubmit={importVoice} className="import">
        <label>
          Voice model (.onnx)
          <input type="file" accept=".onnx" onChange={(e) => setOnnx(e.target.files?.[0])} />
        </label>
        <label>
          Voice settings (.onnx.json)
          <input type="file" accept=".json,application/json" onChange={(e) => setJson(e.target.files?.[0])} />
        </label>
        <label>
          Name (optional)
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="e.g. My narrator" />
        </label>
        <label className="check">
          <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} />
          <span>
            I own this voice or have permission to use it. I won’t use it to impersonate a real person without their consent.
          </span>
        </label>
        <button type="submit" className="primary">
          Import voice
        </button>
        {status && (
          <p className="notice" role="status">
            {status}
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </form>
      {voices.length > 0 && (
        <ul className="imported">
          {voices.map((v) => (
            <li key={v.id}>
              <span>
                {v.name} · {(v.sizeBytes / 1e6).toFixed(0)} MB
              </span>
              <button onClick={() => void remove(v)} aria-label={`Delete imported voice ${v.name}`}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StorageSection() {
  const [usage, setUsage] = useState<string>('…');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    void navigator.storage?.estimate?.().then((e) => setUsage(e.usage !== undefined ? `${(e.usage / 1e6).toFixed(0)} MB` : 'unknown'));
  }, []);

  async function wipe() {
    await deleteEverything();
    location.reload();
  }

  return (
    <section className="panel" aria-labelledby="storage-h">
      <h2 id="storage-h">Privacy & storage</h2>
      <ul className="facts">
        <li>🔒 Your voice, words and clips never leave this device.</li>
        <li>📦 Mimic is using {usage} on this device (mostly the voice and speech models).</li>
      </ul>
      {!confirming ? (
        <button className="danger" onClick={() => setConfirming(true)}>
          Delete everything
        </button>
      ) : (
        <div className="confirm" role="alertdialog" aria-labelledby="wipe-q">
          <p id="wipe-q">
            Delete all clips, imported voices, settings and downloaded models? You’ll need to download the models again.
          </p>
          <button className="danger" onClick={() => void wipe()}>
            Yes, delete everything
          </button>
          <button onClick={() => setConfirming(false)}>Cancel</button>
        </div>
      )}
    </section>
  );
}

function CreditsSection() {
  return (
    <section className="panel" aria-labelledby="credits-h">
      <h2 id="credits-h">Credits</h2>
      <ul className="facts small">
        <li>{BUILTIN_VOICE.attribution}</li>
        <li>Speech engine: Piper (MIT).</li>
        <li>Speech recognition: OpenAI Whisper ({STT_MODEL.name}, MIT) via Transformers.js (Apache-2.0).</li>
        <li>Pronunciation: espeak-ng (GPL-3.0) via the phonemizer package.</li>
        <li>Max Blaze, Stella Vale, Rex Rumble and Pixie Pop are original fictional characters.</li>
      </ul>
    </section>
  );
}

function PerformanceSection() {
  const { info, runs, total } = useEngine();
  const [copied, setCopied] = useState(false);
  const totals = runs.map((r) => r.totalMs);
  const fmt = (ms?: number) => (ms === undefined || Number.isNaN(ms) ? '-' : `${Math.round(ms)} ms`);
  return (
    <details className="panel">
      <summary>
        <h2>Performance (for testing)</h2>
      </summary>
      <p className="muted">
        Speech: {info.sttModel ?? '-'} on {info.sttDevice} ({fmt(info.sttLoadMs)}) · Voice: piper on {info.ttsDevice} (
        {fmt(info.ttsLoadMs)}) · Threads: {info.threads ?? '-'}
      </p>
      <p className="muted">
        Runs: {runs.length} · First sound p50 <b>{fmt(percentile(totals, 50))}</b> · p90 <b>{fmt(percentile(totals, 90))}</b>
      </p>
      <button
        disabled={!runs.length}
        onClick={async () => {
          await navigator.clipboard.writeText(formatReport({ ...info, downloadedMB: total / 1e6 }, runs));
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? 'Copied!' : 'Copy results'}
      </button>
    </details>
  );
}
