import { useEffect, useRef, useState } from 'react';
import { Recorder } from '../core/audio/recorder';
import { audioContext, StreamPlayer } from '../core/audio/player';
import { formatReport, percentile, type RunMetrics, type SessionInfo } from '../core/metrics/metrics';
import { Avatar } from '../features/characters/Avatar';
import { CHARACTERS, type Character, type VoiceEngine } from '../features/characters/registry';
import { createPiper, createStt, createTts, detectWebGpu, isLikelyMobile, type AudioChunk } from '../workers/client';
import type { Device } from '../workers/protocol';

type Phase = 'idle' | 'loading' | 'ready' | 'recording' | 'thinking' | 'speaking' | 'error';

const stt = createStt();
const kokoro = createTts();
const piper = createPiper();

export function App() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const [character, setCharacter] = useState<Character>(CHARACTERS[0]);
  const [text, setText] = useState('');
  const [caption, setCaption] = useState('');
  const [mouth, setMouth] = useState(0);
  const [progress, setProgress] = useState<Record<string, { loaded: number; total: number }>>({});
  const [forceWasm, setForceWasm] = useState(false);
  const [engine, setEngine] = useState<VoiceEngine>(isLikelyMobile() ? 'piper' : 'kokoro');
  const tts = engine === 'piper' ? piper : kokoro;
  const [info, setInfo] = useState<SessionInfo>({ sttDevice: '-', ttsDevice: '-', downloadedMB: 0 });
  const [runs, setRuns] = useState<RunMetrics[]>([]);
  const [copied, setCopied] = useState(false);
  const recorder = useRef(new Recorder());
  const recording = useRef(false);

  useEffect(() => {
    const onProgress = (file: string, loaded: number, total: number) =>
      setProgress((p) => ({ ...p, [file]: { loaded, total } }));
    stt.onProgress = onProgress;
    kokoro.onProgress = onProgress;
    piper.onProgress = onProgress;
  }, []);

  const loaded = Object.values(progress).reduce((s, f) => s + f.loaded, 0);
  const total = Object.values(progress).reduce((s, f) => s + f.total, 0);

  async function loadModels() {
    audioContext(); // unlock audio inside the tap (iOS)
    setPhase('loading');
    setError('');
    try {
      const gpu = !forceWasm && (await detectWebGpu());
      const sttDevice: Device = gpu ? 'webgpu' : 'wasm';
      // Kokoro on WebGPU needs the 310 MB fp32 model, so phones stay on WASM q8 (~90 MB).
      const ttsDevice: Device = engine === 'kokoro' && gpu && !isLikelyMobile() ? 'webgpu' : 'wasm';
      const t0 = performance.now();
      // Load times include the warm-up run each worker does after loading.
      const sttDone = stt.load(sttDevice).then((r) => ({ ms: performance.now() - t0, r: r as { threads: number } }));
      const ttsDone = tts.load(ttsDevice).then(() => performance.now() - t0);
      const [sttRes, ttsLoadMs] = await Promise.all([sttDone, ttsDone]);
      setInfo({ engine, sttDevice, ttsDevice, sttLoadMs: sttRes.ms, ttsLoadMs, threads: sttRes.r.threads, downloadedMB: 0 });
      setPhase('ready');
    } catch (e) {
      fail(e);
    }
  }

  function fail(e: unknown) {
    setError(String((e as Error)?.message ?? e));
    setPhase('error');
  }

  async function speak(transcript: string, started: number, input: RunMetrics['input'], sttMs?: number) {
    if (!transcript) {
      setCaption('(I didn’t catch that. Try again.)');
      setPhase('ready');
      return;
    }
    setCaption(transcript);
    const t = performance.now();
    const player = new StreamPlayer(character.fx);
    let firstSound: number | undefined;
    let raf = 0;
    const tick = () => {
      setMouth(player.level());
      raf = requestAnimationFrame(tick);
    };
    await tts.stream<AudioChunk>({ text: transcript, voice: engine === 'piper' ? character.piperVoice : character.kokoroVoice, speed: character.speed }, (chunk) => {
      if (firstSound === undefined) {
        firstSound = performance.now();
        setPhase('speaking');
        tick();
      }
      player.enqueue(chunk.samples, chunk.sampleRate);
    });
    const ttsMs = performance.now() - t;
    player.finish();
    const totalMs = (firstSound ?? performance.now()) - started;
    setRuns((r) => [...r, { input, character: character.displayName, transcript, sttMs, ttsMs, totalMs }]);
    await player.done;
    cancelAnimationFrame(raf);
    setMouth(0);
    setPhase('ready');
  }

  async function startRecording() {
    if (phase !== 'ready') return;
    audioContext();
    try {
      await recorder.current.start(() => void stopRecording());
      recording.current = true;
      setPhase('recording');
    } catch (e) {
      fail(e);
    }
  }

  async function stopRecording() {
    if (!recording.current) return;
    recording.current = false;
    setPhase('thinking');
    const started = performance.now();
    try {
      const audio = await recorder.current.stop();
      if (audio.length < 1600) {
        setCaption('(Hold the button while you talk.)');
        setPhase('ready');
        return;
      }
      const t = performance.now();
      const transcript = await stt.run(audio, [audio.buffer]);
      await speak(transcript, started, 'mic', performance.now() - t);
    } catch (e) {
      fail(e);
    }
  }

  async function submitText(e: React.FormEvent) {
    e.preventDefault();
    if (phase !== 'ready' || !text.trim()) return;
    audioContext();
    setPhase('thinking');
    try {
      await speak(text.trim().slice(0, 200), performance.now(), 'text');
    } catch (err) {
      fail(err);
    }
  }

  async function copyReport() {
    await navigator.clipboard.writeText(formatReport({ ...info, downloadedMB: total / 1e6 }, runs));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const busy = phase === 'thinking' || phase === 'speaking';
  const totals = runs.map((r) => r.totalMs);

  return (
    <main className="app">
      <header>
        <h1>Mimic</h1>
        <p className="sub">Phase 1 test build: everything runs on this device.</p>
      </header>

      <section className="characters" aria-label="Choose a character">
        {CHARACTERS.map((c) => (
          <button
            key={c.id}
            className={`card ${c.id === character.id ? 'selected' : ''}`}
            onClick={() => setCharacter(c)}
            aria-pressed={c.id === character.id}
            disabled={busy}
          >
            <Avatar character={c} mouth={c.id === character.id ? mouth : 0} size={110} />
            <strong>{c.displayName}</strong>
            <span>{c.archetype}</span>
          </button>
        ))}
      </section>

      <p className="caption" aria-live="polite">{caption || ' '}</p>

      {(phase === 'idle' || phase === 'error') && (
        <section className="panel">
          <p>
            First, download the speech and voice models (about {downloadEstimateMB(engine)} MB, one time only). Use Wi-Fi.
            Nothing you say is ever uploaded.
          </p>
          <fieldset className="engine">
            <legend>Voice engine</legend>
            <label>
              <input type="radio" name="engine" checked={engine === 'kokoro'} onChange={() => setEngine('kokoro')} /> Kokoro
              (more natural, heavier)
            </label>
            <label>
              <input type="radio" name="engine" checked={engine === 'piper'} onChange={() => setEngine('piper')} /> Piper
              (lighter, faster on phones)
            </label>
          </fieldset>
          <label className="check">
            <input type="checkbox" checked={forceWasm} onChange={(e) => setForceWasm(e.target.checked)} /> Force CPU (WASM)
            instead of GPU
          </label>
          <button className="primary" onClick={loadModels}>
            Download voices
          </button>
          {error && <p className="error">Error: {error}</p>}
        </section>
      )}

      {phase === 'loading' && (
        <section className="panel">
          <p>
            {total && loaded >= total ? 'Warming up the voices…' : 'Loading models…'} {(loaded / 1e6).toFixed(0)} /{' '}
            {total ? (total / 1e6).toFixed(0) : '?'} MB
          </p>
          <progress value={loaded} max={total || 1} />
        </section>
      )}

      {['ready', 'recording', 'thinking', 'speaking'].includes(phase) && (
        <section className="panel">
          <button
            className={`talk ${phase === 'recording' ? 'live' : ''}`}
            onPointerDown={startRecording}
            onPointerUp={stopRecording}
            onPointerLeave={stopRecording}
            onPointerCancel={stopRecording}
            onContextMenu={(e) => e.preventDefault()}
            disabled={busy}
          >
            {phase === 'recording' ? 'Listening… release to hear it' : busy ? (phase === 'thinking' ? 'Thinking…' : 'Speaking…') : 'Hold to talk'}
          </button>
          <form onSubmit={submitText} className="type">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={200}
              placeholder="…or type something"
              aria-label="Text to say"
              disabled={busy}
            />
            <button type="submit" disabled={busy || !text.trim()}>
              Say it
            </button>
          </form>
        </section>
      )}

      <section className="panel metrics" aria-label="Test results">
        <h2>Test results</h2>
        <p>
          Speech model: {info.sttDevice} ({fmt(info.sttLoadMs)} to load) · Voice: {info.engine ?? '-'} on {info.ttsDevice} ({fmt(info.ttsLoadMs)}) ·
          Threads: {info.threads ?? '-'}
        </p>
        <p>
          Runs: {runs.length} · Time to first sound p50 <b>{fmt(percentile(totals, 50))}</b> · p90 <b>{fmt(percentile(totals, 90))}</b> ·
          target ≤ 2000 ms
        </p>
        {runs.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Input</th>
                <th>Speech→text</th>
                <th>Voice (all)</th>
                <th>First sound</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{r.input}</td>
                  <td>{fmt(r.sttMs)}</td>
                  <td>{fmt(r.ttsMs)}</td>
                  <td className={r.totalMs > 2000 ? 'slow' : 'fast'}>{fmt(r.totalMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button onClick={copyReport} disabled={!runs.length}>
          {copied ? 'Copied!' : 'Copy results to paste in chat'}
        </button>
      </section>
      <footer>Max Blaze and Stella Vale are original fictional characters.</footer>
    </main>
  );
}

function downloadEstimateMB(engine: VoiceEngine): number {
  const stt = 80; // whisper-base.en
  if (engine === 'piper') return stt + 130; // two medium Piper voices
  return stt + (isLikelyMobile() ? 90 : 310);
}

const fmt = (ms?: number) => (ms === undefined || Number.isNaN(ms) ? '-' : `${Math.round(ms)} ms`);
