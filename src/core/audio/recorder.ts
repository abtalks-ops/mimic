import { audioContext } from './player';
import { resample } from './resample';

export const STT_SAMPLE_RATE = 16000;
export const MAX_RECORDING_MS = 15000;

/**
 * AudioWorklet that forwards raw mic samples to the main thread. Inlined as a
 * Blob URL so it needs no extra build step. Capturing raw PCM avoids the
 * MediaRecorder encode -> decode round trip (~0.7 s on a mid-range phone).
 */
const WORKLET = `
class Capture extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) this.port.postMessage(ch.slice(0));
    return true;
  }
}
registerProcessor('mimic-capture', Capture);
`;
let workletReady: Promise<void> | undefined;

/**
 * Records from the microphone. The mic is requested only when start() is
 * called (docs/PRIVACY.md rule 7) and released on stop().
 */
export class Recorder {
  private stream?: MediaStream;
  private source?: MediaStreamAudioSourceNode;
  private node?: AudioWorkletNode;
  private chunks: Float32Array[] = [];
  private timeout?: number;

  async start(onAutoStop?: () => void): Promise<void> {
    const ctx = audioContext();
    workletReady ??= ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: 'text/javascript' })));
    const [stream] = await Promise.all([
      navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } }),
      workletReady,
    ]);
    this.stream = stream;
    this.chunks = [];
    this.source = ctx.createMediaStreamSource(stream);
    this.node = new AudioWorkletNode(ctx, 'mimic-capture');
    this.node.port.onmessage = (e: MessageEvent<Float32Array>) => this.chunks.push(e.data);
    // Connected to the output (silently; process() writes nothing) so every browser keeps pulling it.
    this.source.connect(this.node).connect(ctx.destination);
    this.timeout = window.setTimeout(() => onAutoStop?.(), MAX_RECORDING_MS);
  }

  /** Stops recording and returns mono PCM at 16 kHz. */
  async stop(): Promise<Float32Array> {
    window.clearTimeout(this.timeout);
    this.source?.disconnect();
    this.node?.port.close();
    this.node?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.source = this.node = this.stream = undefined;

    const length = this.chunks.reduce((n, c) => n + c.length, 0);
    const pcm = new Float32Array(length);
    let offset = 0;
    for (const c of this.chunks) {
      pcm.set(c, offset);
      offset += c.length;
    }
    this.chunks = [];
    return resample(pcm, audioContext().sampleRate, STT_SAMPLE_RATE);
  }
}
