import type { VoiceFx } from '../../features/characters/registry';

export interface PlaybackHandle {
  /** 0..1 loudness, for driving the avatar's mouth. */
  level(): number;
  done: Promise<void>;
}

let shared: AudioContext | undefined;
/** Must be called from a user gesture at least once (iOS unlock). */
export function audioContext(): AudioContext {
  shared ??= new AudioContext();
  if (shared.state === 'suspended') void shared.resume();
  return shared;
}

/** Plays PCM through the character's FX chain: detune -> EQ -> analyser -> speakers. */
export function play(samples: Float32Array, sampleRate: number, fx: VoiceFx): PlaybackHandle {
  const ctx = audioContext();
  const buffer = ctx.createBuffer(1, samples.length, sampleRate);
  buffer.getChannelData(0).set(samples);

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.detune.value = fx.detuneCents;

  const low = ctx.createBiquadFilter();
  low.type = 'lowshelf';
  low.frequency.value = 250;
  low.gain.value = fx.bassDb;

  const high = ctx.createBiquadFilter();
  high.type = 'highshelf';
  high.frequency.value = 3500;
  high.gain.value = fx.trebleDb;

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  const data = new Uint8Array(analyser.fftSize);

  src.connect(low).connect(high).connect(analyser).connect(ctx.destination);
  const done = new Promise<void>((resolve) => (src.onended = () => resolve()));
  src.start();

  return {
    done,
    level() {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) sum += ((v - 128) / 128) ** 2;
      return Math.min(1, Math.sqrt(sum / data.length) * 4);
    },
  };
}
