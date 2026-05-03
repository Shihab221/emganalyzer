// ============================================
// Type definitions for EMG Analyzer
// ============================================

/**
 * Sensor data structure received from ESP32
 * - emg: Raw EMG sensor reading (0-4095 for 12-bit ADC)
 * - ax, ay, az: Accelerometer values in g (gravitational units)
 * - timestamp: Unix timestamp in milliseconds
 */
export interface SensorData {
  emg: number;
  ax: number;
  ay: number;
  az: number;
  timestamp: number;
}

/**
 * Data point for charts with formatted time
 */
export interface ChartDataPoint extends SensorData {
  time: string; // Formatted time for chart labels
}

/**
 * API response structure
 */
export interface ApiResponse {
  success: boolean;
  message?: string;
  data?: SensorData | SensorData[];
  latest?: SensorData | null;
  history?: SensorData[];
}
