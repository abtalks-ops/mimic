import type { VoiceFx } from '../../features/characters/registry';
import { buildEq, detuneRate } from './fx';

let shared: AudioContext | undefined;
/** Must be called from a user gesture at least once (iOS unlock). */
export function audioContext(): AudioContext {
  shared ??= new AudioContext();
  if (shared.state === 'suspended') void shared.resume();
  return shared;
}

/**
 * Plays audio chunks back to back through the character's FX chain
 * (detune -> EQ -> analyser -> speakers) as they arrive from the voice model.
 */
export class StreamPlayer {
  private ctx = audioContext();
  private input: AudioNode;
  private analyser: AnalyserNode;
  private data: Uint8Array<ArrayBuffer>;
  private nextStart = 0;
  private pending = 0;
  private finished = false;
  private resolveDone!: () => void;
  readonly done = new Promise<void>((r) => (this.resolveDone = r));

  constructor(private fx: VoiceFx) {
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.data = new Uint8Array(this.analyser.fftSize);
    this.analyser.connect(this.ctx.destination);
    this.input = buildEq(this.ctx, fx, this.analyser);
  }

  enqueue(samples: Float32Array, sampleRate: number): void {
    const buffer = this.ctx.createBuffer(1, samples.length, sampleRate);
    buffer.getChannelData(0).set(samples);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.detune.value = this.fx.detuneCents;
    src.connect(this.input);
    const start = Math.max(this.ctx.currentTime + 0.02, this.nextStart);
    src.start(start);
    this.nextStart = start + buffer.duration / detuneRate(this.fx.detuneCents);
    this.pending++;
    src.onended = () => {
      this.pending--;
      this.maybeDone();
    };
  }

  /** Call when no more chunks will arrive. */
  finish(): void {
    this.finished = true;
    this.maybeDone();
  }

  private maybeDone() {
    if (this.finished && this.pending === 0) this.resolveDone();
  }

  /** 0..1 loudness, for driving the avatar's mouth. */
  level(): number {
    this.analyser.getByteTimeDomainData(this.data);
    let sum = 0;
    for (const v of this.data) sum += ((v - 128) / 128) ** 2;
    return Math.min(1, Math.sqrt(sum / this.data.length) * 4);
  }
}
