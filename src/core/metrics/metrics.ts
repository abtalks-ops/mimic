export interface RunMetrics {
  input: 'mic' | 'text';
  character: string;
  transcript: string;
  audioSeconds: number;
  sttMs?: number;
  ttsMs: number;
  /** From end of input (button release / submit) to first sound. */
  totalMs: number;
}

export interface SessionInfo {
  sttDevice: string;
  ttsDevice: string;
  sttLoadMs?: number;
  ttsLoadMs?: number;
  downloadedMB: number;
}

export function percentile(values: number[], p: number): number {
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

export function environmentSummary(): Record<string, string> {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  return {
    userAgent: nav.userAgent,
    cores: String(nav.hardwareConcurrency ?? '?'),
    deviceMemoryGB: String(nav.deviceMemory ?? '?'),
    jsHeapMB: mem ? (mem.usedJSHeapSize / 1e6).toFixed(0) : 'n/a',
    crossOriginIsolated: String(self.crossOriginIsolated),
  };
}

export function formatReport(info: SessionInfo, runs: RunMetrics[]): string {
  const totals = runs.map((r) => r.totalMs);
  const lines = [
    '## Mimic Phase 1 results',
    ...Object.entries(environmentSummary()).map(([k, v]) => `- ${k}: ${v}`),
    `- STT device: ${info.sttDevice}, load ${fmt(info.sttLoadMs)}`,
    `- TTS device: ${info.ttsDevice}, load ${fmt(info.ttsLoadMs)}`,
    `- Downloaded: ${info.downloadedMB.toFixed(0)} MB`,
    `- Runs: ${runs.length}, total p50 ${fmt(percentile(totals, 50))}, p90 ${fmt(percentile(totals, 90))}`,
    '',
    '| # | input | character | words | STT | TTS | total |',
    '|---|---|---|---|---|---|---|',
    ...runs.map(
      (r, i) =>
        `| ${i + 1} | ${r.input} | ${r.character} | ${r.transcript.split(/\s+/).filter(Boolean).length} | ${fmt(r.sttMs)} | ${fmt(r.ttsMs)} | ${fmt(r.totalMs)} |`,
    ),
  ];
  return lines.join('\n');
}

const fmt = (ms?: number) => (ms === undefined || Number.isNaN(ms) ? '-' : `${Math.round(ms)} ms`);
