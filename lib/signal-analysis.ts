// ============================================
// Signal Analysis Utilities
// RMS and FFT calculations for EMG data
// ============================================

import { SensorData, RMSData, FFTData } from './types';

/**
 * Calculate RMS (Root Mean Square) of EMG signal
 */
export function calculateRMS(data: SensorData[], windowSize: number = 50): RMSData {
  if (data.length === 0) {
    return { value: 0, windowSize, timestamp: Date.now() };
  }

  const recentData = data.slice(-windowSize);
  const sumSquares = recentData.reduce((sum, d) => sum + d.emg * d.emg, 0);
  const rms = Math.sqrt(sumSquares / recentData.length);

  return {
    value: Math.round(rms * 100) / 100,
    windowSize: recentData.length,
    timestamp: Date.now(),
  };
}

/**
 * Simple FFT implementation using DFT
 * For a real production app, use a library like fft.js
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
  const emgValues = data.map(d => d.emg - 2048);

  const frequencies: number[] = [];
  const magnitudes: number[] = [];

  const numBins = Math.floor(n / 2);
  for (let k = 0; k < numBins; k++) {
    let real = 0;
    let imag = 0;

    for (let t = 0; t < n; t++) {
      const angle = (2 * Math.PI * k * t) / n;
      real += emgValues[t] * Math.cos(angle);
      imag -= emgValues[t] * Math.sin(angle);
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
 * Calculate moving average of EMG signal
 */
export function movingAverage(data: SensorData[], windowSize: number = 5): number[] {
  if (data.length < windowSize) {
    return data.map(d => d.emg);
  }

  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = data.slice(start, i + 1);
    const avg = window.reduce((sum, d) => sum + d.emg, 0) / window.length;
    result.push(Math.round(avg));
  }

  return result;
}

/**
 * Calculate signal statistics
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

  const values = data.map(d => d.emg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return {
    min,
    max,
    mean: Math.round(mean * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
  };
}
