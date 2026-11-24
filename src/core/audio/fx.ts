import type { VoiceFx } from '../../features/characters/registry';

/** Playback-rate factor caused by detune (detune changes speed as well as pitch). */
export const detuneRate = (cents: number) => 2 ** (cents / 1200);

/** Builds the character's EQ chain. Returns its input node; the output is connected to `destination`. */
export function buildEq(ctx: BaseAudioContext, fx: VoiceFx, destination: AudioNode): AudioNode {
  const low = ctx.createBiquadFilter();
  low.type = 'lowshelf';
  low.frequency.value = 250;
  low.gain.value = fx.bassDb;
  const high = ctx.createBiquadFilter();
  high.type = 'highshelf';
  high.frequency.value = 3500;
  high.gain.value = fx.trebleDb;
  low.connect(high).connect(destination);
  return low;
}

/** Renders the character FX offline so saved and shared clips sound like playback. */
export async function renderWithFx(samples: Float32Array, sampleRate: number, fx: VoiceFx): Promise<Float32Array> {
  const length = Math.ceil(samples.length / detuneRate(fx.detuneCents));
  const ctx = new OfflineAudioContext(1, length, sampleRate);
  const buffer = ctx.createBuffer(1, samples.length, sampleRate);
  buffer.getChannelData(0).set(samples);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.detune.value = fx.detuneCents;
  src.connect(buildEq(ctx, fx, ctx.destination));
  src.start();
  const rendered = await ctx.startRendering();
  return rendered.getChannelData(0);
}
