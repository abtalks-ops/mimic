import { useEffect, useRef, useState } from 'react';
import { speak, transcribe } from '../../app/engine';
import { useVoiceChoices, voiceFor } from '../../app/voices';
import { audioContext } from '../../core/audio/player';
import { renderWithFx } from '../../core/audio/fx';
import { Recorder } from '../../core/audio/recorder';
import { encodeWav } from '../../core/audio/wav';
import { addClip } from '../../core/storage/db';
import { Avatar } from '../characters/Avatar';
import { CHARACTERS, type Character } from '../characters/registry';

type Phase = 'ready' | 'recording' | 'thinking' | 'speaking';

export function HomeScreen() {
  const [phase, setPhase] = useState<Phase>('ready');
  const [character, setCharacter] = useState<Character>(CHARACTERS[0]);
  const [text, setText] = useState('');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState('');
  const [mouth, setMouth] = useState(0);
  const choices = useVoiceChoices();
  const recorder = useRef(new Recorder());
  const recording = useRef(false);
  const busy = phase === 'thinking' || phase === 'speaking';

  async function sayBack(transcript: string, started: number, input: 'mic' | 'text', sttMs?: number) {
    if (!transcript) {
      setCaption('I didn’t catch that. Try again!');
      setPhase('ready');
      return;
    }
    setCaption(transcript);
    const { samples, sampleRate } = await speak({
      text: transcript,
      character,
      voice: voiceFor(character, choices),
      onLevel: setMouth,
      onFirstSound: () => setPhase('speaking'),
      metrics: { started, input, sttMs },
    });
    setPhase('ready');
    // Save the clip in the background, with the character FX baked in so shares sound the same.
    void renderWithFx(samples, sampleRate, character.fx).then((rendered) =>
      addClip({
        createdAt: Date.now(),
        characterId: character.id,
        text: transcript,
        wav: encodeWav(rendered, sampleRate),
        durationSec: rendered.length / sampleRate,
      }),
    );
  }

  function fail(e: unknown) {
    const msg = String((e as Error)?.message ?? e);
    setError(/Permission|NotAllowed/i.test(msg) ? 'Mimic needs microphone access to hear you. Allow it in your browser settings, or type instead.' : msg);
    setPhase('ready');
  }

  async function startRecording() {
    if (phase !== 'ready') return;
    setError('');
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
        setCaption('Hold the button while you talk.');
        setPhase('ready');
        return;
      }
      const t = performance.now();
      const transcript = await transcribe(audio);
      await sayBack(transcript, started, 'mic', performance.now() - t);
    } catch (e) {
      fail(e);
    }
  }

  async function submitText(e: React.FormEvent) {
    e.preventDefault();
    if (phase !== 'ready' || !text.trim()) return;
    setError('');
    audioContext();
    setPhase('thinking');
    try {
      await sayBack(text.trim().slice(0, 200), performance.now(), 'text');
      setText('');
    } catch (err) {
      fail(err);
    }
  }

  // Keyboard: hold Space on the talk button (it's a real button, so Enter/Space focus works too).
  const onKey = (down: boolean) => (e: React.KeyboardEvent) => {
    if (e.key !== ' ' || e.repeat) return;
    e.preventDefault();
    void (down ? startRecording() : stopRecording());
  };

  // Release the mic if the user leaves the screen mid-recording.
  useEffect(() => {
    const rec = recorder.current;
    return () => {
      if (recording.current) void rec.stop();
    };
  }, []);

  return (
    <>
      <section className="characters" aria-label="Choose a character">
        {CHARACTERS.map((c) => (
          <button
            key={c.id}
            className={`card ${c.id === character.id ? 'selected' : ''}`}
            onClick={() => setCharacter(c)}
            aria-pressed={c.id === character.id}
            disabled={busy}
          >
            <Avatar character={c} mouth={c.id === character.id ? mouth : 0} size={88} />
            <strong>{c.displayName}</strong>
            <span>{c.archetype}</span>
          </button>
        ))}
      </section>

      <p className="caption" aria-live="polite">
        {caption || `Say something and ${character.displayName} will say it back!`}
      </p>

      <section className="panel">
        <button
          className={`talk ${phase === 'recording' ? 'live' : ''}`}
          onPointerDown={startRecording}
          onPointerUp={stopRecording}
          onPointerLeave={stopRecording}
          onPointerCancel={stopRecording}
          onKeyDown={onKey(true)}
          onKeyUp={onKey(false)}
          onContextMenu={(e) => e.preventDefault()}
          disabled={busy}
          aria-label={phase === 'recording' ? 'Listening. Release to hear it back.' : 'Hold to talk'}
        >
          {phase === 'recording' ? '🎙️ Listening… let go to hear it' : phase === 'thinking' ? 'Thinking…' : phase === 'speaking' ? `${character.displayName} is talking…` : '🎙️ Hold to talk'}
        </button>
        <form onSubmit={submitText} className="type">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={200}
            placeholder="…or type something"
            aria-label="Text for the character to say"
            disabled={busy}
          />
          <button type="submit" disabled={busy || !text.trim()}>
            Say it
          </button>
        </form>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>
    </>
  );
}
