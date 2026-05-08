import type { SensorData } from './types';
import { calculateFFT, inferSampleRateHz } from './signal-analysis';

const RMS_WIN = 20;
const FFT_MAX_WIN = 64;

function rollingRmsAt(data: SensorData[], i: number): number {
  const start = Math.max(0, i - RMS_WIN + 1);
  const slice = data.slice(start, i + 1);
  const sq = slice.reduce((sum, d) => sum + d.emg * d.emg, 0);
  return Math.round(Math.sqrt(sq / slice.length) * 100) / 100;
}

function fftAtIndex(
  data: SensorData[],
  i: number,
  rateHz: number
): { dominantHz: number; peakMag: number } {
  const len = Math.min(FFT_MAX_WIN, i + 1);
  const start = i + 1 - len;
  const slice = data.slice(start, i + 1);
  if (slice.length < 8) {
    return { dominantHz: 0, peakMag: 0 };
  }
  const fft = calculateFFT(slice, rateHz);
  let peakMag = 0;
  for (let k = 0; k < fft.magnitudes.length; k++) {
    if (fft.magnitudes[k] > peakMag) peakMag = fft.magnitudes[k];
  }
  return {
    dominantHz: Math.round(fft.dominantFrequency * 100) / 100,
    peakMag: Math.round(peakMag * 100) / 100,
  };
}

/** CSV with real wall-clock timestamps and per-row RMS + FFT-derived columns */
export function buildEmgCsvWithAnalysis(data: SensorData[]): string {
  const rateHz = inferSampleRateHz(data);
  const header =
    'datetime_iso,local_date,local_time,unix_ms,emg,rolling_rms,fft_dominant_hz,fft_peak_magnitude\n';

  const lines = data.map((d, i) => {
    const date = new Date(d.timestamp);
    const iso = date.toISOString();
    const localDate = date.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const localTime = `${date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })}.${String(date.getMilliseconds()).padStart(3, '0')}`;
    const rms = rollingRmsAt(data, i);
    const { dominantHz, peakMag } = fftAtIndex(data, i, rateHz);
    return `${iso},${localDate},${localTime},${d.timestamp},${d.emg},${rms},${dominantHz},${peakMag}`;
  });

  return header + lines.join('\n');
}
