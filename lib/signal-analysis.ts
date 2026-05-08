// ============================================
// Signal Analysis Utilities (EMG scaled to mV)
// ============================================

import { SensorData, RMSData, FFTData } from './types';
import { rawEmgToMv, rawEmgToAcMv } from '@/lib/emg-calibration';

/**
 * Infer average sample rate (Hz) from consecutive sample timestamps (server wall-clock).
 */
export function inferSampleRateHz(data: SensorData[]): number {
  if (data.length < 2) return 2;
  let sum = 0;
  let n = 0;
  for (let i = 1; i < data.length; i++) {
    const dt = (data[i].timestamp - data[i - 1].timestamp) / 1000;
    if (dt > 0.001 && dt < 10) {
      sum += dt;
      n++;
    }
  }
  if (n === 0) return 2;
  const hz = sum / n > 0 ? 1 / (sum / n) : 2;
  return Math.round(hz * 100) / 100;
}

/**
 * Windowed AC RMS (mV): convert counts → mV, subtract window mean, then RMS.
 */
export function calculateRMS(data: SensorData[], windowSize: number = 50): RMSData {
  if (data.length === 0) {
    return { value: 0, windowSize, timestamp: Date.now() };
  }

  const recent = data.slice(-windowSize);
  const mvs = recent.map((d) => rawEmgToMv(d.emg));
  const mu = mvs.reduce((a, b) => a + b, 0) / mvs.length;
  let sumSq = 0;
  for (const v of mvs) {
    const z = v - mu;
    sumSq += z * z;
  }
  const rms = Math.sqrt(sumSq / mvs.length);

  return {
    value: Math.round(rms * 100) / 100,
    windowSize: mvs.length,
    timestamp: Date.now(),
  };
}

/**
 * DFT on AC signal in mV: x'_t = (x_t − 2048)·(V_ref / 4095), then same DFT bins as counts would give, scaled linearly → magnitudes are in millivolt-like units (/N normalization).
 */
export function calculateFFT(data: SensorData[], sampleRate: number = 2): FFTData {
  if (data.length < 4) {
    return {
      frequencies: [],
      magnitudes: [],
      dominantFrequency: 0,
    };
  }

  const n = data.length;
  const samples = data.map((d) => rawEmgToAcMv(d.emg));

  const frequencies: number[] = [];
  const magnitudes: number[] = [];

  const numBins = Math.floor(n / 2);
  for (let k = 0; k < numBins; k++) {
    let real = 0;
    let imag = 0;

    for (let t = 0; t < n; t++) {
      const angle = (2 * Math.PI * k * t) / n;
      real += samples[t] * Math.cos(angle);
      imag -= samples[t] * Math.sin(angle);
    }

    const magnitude = Math.sqrt(real * real + imag * imag) / n;
    const frequency = (k * sampleRate) / n;

    frequencies.push(Math.round(frequency * 100) / 100);
    magnitudes.push(Math.round(magnitude * 100) / 100);
  }

  let maxMagnitude = 0;
  let dominantFrequency = 0;
  for (let i = 1; i < magnitudes.length; i++) {
    if (magnitudes[i] > maxMagnitude) {
      maxMagnitude = magnitudes[i];
      dominantFrequency = frequencies[i];
    }
  }

  return {
    frequencies,
    magnitudes,
    dominantFrequency,
  };
}

/**
 * Moving average of measured voltage at ADC (absolute mV from raw counts).
 */
export function movingAverage(data: SensorData[], windowSize: number = 5): number[] {
  const mvs = data.map((d) => rawEmgToMv(d.emg));
  if (mvs.length < windowSize) {
    return mvs;
  }

  const result: number[] = [];
  for (let i = 0; i < mvs.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = mvs.slice(start, i + 1);
    const avg = window.reduce((sum, v) => sum + v, 0) / window.length;
    result.push(Math.round(avg * 100) / 100);
  }

  return result;
}

/**
 * Statistics on absolute ADC voltage waveform (each sample scaled to mV).
 */
export function calculateStats(data: SensorData[]): {
  min: number;
  max: number;
  mean: number;
  stdDev: number;
} {
  if (data.length === 0) {
    return { min: 0, max: 0, mean: 0, stdDev: 0 };
  }

  const values = data.map((d) => rawEmgToMv(d.emg));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return {
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
    mean: Math.round(mean * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
  };
}
