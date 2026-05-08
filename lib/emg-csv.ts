import type { SensorData } from './types';
import { calculateFFT, inferSampleRateHz } from '@/lib/signal-analysis';
import { rawEmgToMv } from '@/lib/emg-calibration';

const RMS_WIN = 20;
const FFT_MAX_WIN = 64;

function timestampOneField(ms: number): string {
  return new Date(ms).toISOString();
}

/**
 * Window AC RMS at row i (mV): voltage samples v_j = rawEmgToMv(x_j); subtract window mean μ; √(mean ((v − μ)^2)).
 */
function rollingAcRmsMv(data: SensorData[], i: number): number {
  const start = Math.max(0, i - RMS_WIN + 1);
  const slice = data.slice(start, i + 1);
  const mvs = slice.map((d) => rawEmgToMv(d.emg));
  const mu = mvs.reduce((a, b) => a + b, 0) / mvs.length;
  let sumSq = 0;
  for (const v of mvs) {
    const z = v - mu;
    sumSq += z * z;
  }
  return Math.round(Math.sqrt(sumSq / mvs.length) * 100) / 100;
}

function fftPeakMagnitudeMv(data: SensorData[], i: number, rateHz: number): number {
  const len = Math.min(FFT_MAX_WIN, i + 1);
  const start = i + 1 - len;
  const slice = data.slice(start, i + 1);
  if (slice.length < 8) return 0;
  const fft = calculateFFT(slice, rateHz);
  let peak = 0;
  for (let k = 1; k < fft.magnitudes.length; k++) {
    if (fft.magnitudes[k] > peak) peak = fft.magnitudes[k];
  }
  return Math.round(peak * 100) / 100;
}

/** Columns: timestamp, emg_mv, rms_mv, fft_magnitude_mv (all voltages derived from ADC counts → mV) */
export function buildEmgCsvWithAnalysis(data: SensorData[]): string {
  const rateHz = inferSampleRateHz(data);
  const header = 'timestamp,emg_mv,rms_mv,fft_magnitude_mv\n';

  const lines = data.map((d, i) => {
    const ts = timestampOneField(d.timestamp);
    const emgMv = Math.round(rawEmgToMv(d.emg) * 1000) / 1000;
    const rmsMv = rollingAcRmsMv(data, i);
    const fftMagMv = fftPeakMagnitudeMv(data, i, rateHz);
    return `${ts},${emgMv},${rmsMv},${fftMagMv}`;
  });

  return header + lines.join('\n');
}
