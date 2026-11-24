import { downmix, resample } from './resample';

export const STT_SAMPLE_RATE = 16000;
export const MAX_RECORDING_MS = 15000;

/**
 * Records from the microphone. The mic is requested only when start() is
 * called (see docs/PRIVACY.md rule 7) and released on stop().
 */
export class Recorder {
  private stream?: MediaStream;
  private recorder?: MediaRecorder;
  private chunks: Blob[] = [];
  private timeout?: number;

  async start(onAutoStop?: () => void): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    this.chunks = [];
    this.recorder = new MediaRecorder(this.stream);
    this.recorder.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.recorder.start();
    this.timeout = window.setTimeout(() => onAutoStop?.(), MAX_RECORDING_MS);
  }

  /** Stops recording and returns mono PCM at 16 kHz. */
  async stop(): Promise<Float32Array> {
    window.clearTimeout(this.timeout);
    const rec = this.recorder;
    if (!rec) return new Float32Array();
    const stopped = new Promise<void>((resolve) => (rec.onstop = () => resolve()));
    if (rec.state !== 'inactive') rec.stop();
    await stopped;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.recorder = undefined;

    const blob = new Blob(this.chunks, { type: rec.mimeType });
    const ctx = new AudioContext();
    try {
      const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
      const channels = Array.from({ length: decoded.numberOfChannels }, (_, i) => decoded.getChannelData(i));
      return resample(downmix(channels), decoded.sampleRate, STT_SAMPLE_RATE);
    } finally {
      void ctx.close();
    }
  }
}
