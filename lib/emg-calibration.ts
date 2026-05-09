// ============================================
// EMG ADC → voltage (mV) for ESP32 12‑bit sampling
//
// Stored samples remain raw counts (`SensorData.emg`). All analysis / CSV /
// charts convert using these helpers.
//
// For EMG signals, the typical range is 0-5 mV after amplification.
// The ADC maps 0-4095 counts to 0-5 mV range.
// ============================================

/** Full-scale EMG range in millivolts (typical EMG signal range after amplification). */
export const EMG_ADC_FULL_SCALE_MV = 5;

const ADC_MAX_COUNT = 4095;

const MV_PER_LSB = EMG_ADC_FULL_SCALE_MV / ADC_MAX_COUNT;

/** Nominal bipolar zero (mid‑rail) in raw counts — used before EMG amplification. */
const ADC_MID_RAW = 2048;

/** Instantaneous waveform at the ADC pin, in mV, from raw count x. */
export function rawEmgToMv(x: number): number {
  return (x / ADC_MAX_COUNT) * EMG_ADC_FULL_SCALE_MV;
}

/** AC component relative to nominal mid‑rail (2048 LSB → 0), in mV — used as FFT input. */
export function rawEmgToAcMv(x: number): number {
  return ((x - ADC_MID_RAW) / ADC_MAX_COUNT) * EMG_ADC_FULL_SCALE_MV;
}
