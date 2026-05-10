// ============================================
// Feature vector for fatigue_model.pkl (3 inputs)
// Order: [AC RMS mV, dominant frequency Hz, instantaneous σ mV]
// Must stay aligned with how the model was trained.
// ============================================

import type { SensorData } from '@/lib/types';
import { calculateFFT, calculateRMS, calculateStats, inferSampleRateHz } from '@/lib/signal-analysis';

const MIN_SAMPLES_FFT = 4;

export interface FatigueFeatures {
  rmsMv: number;
  dominantFreqHz: number;
  stdMv: number;
}

/**
 * Builds the 3-D feature vector from session EMG samples (raw ADC counts).
 * Returns null if there is not enough data for spectral analysis.
 */
export function computeFatigueFeatures(data: SensorData[]): FatigueFeatures | null {
  if (data.length < MIN_SAMPLES_FFT) return null;

  const window = Math.min(500, Math.max(1, data.length));
  const rmsMv = calculateRMS(data, window).value;
  const sampleRate = inferSampleRateHz(data);
  const dominantFreqHz = calculateFFT(data, sampleRate).dominantFrequency;
  const stdMv = calculateStats(data).stdDev;

  return { rmsMv, dominantFreqHz, stdMv };
}
