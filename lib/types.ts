// ============================================
// Type definitions for EMG Analyzer
// ============================================

/**
 * User roles
 */
export type UserRole = 'doctor' | 'patient';

/**
 * User authentication data
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: number;
}

/**
 * Patient profile information (for patients only)
 */
export interface PatientProfile {
  userId: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  /** Body height in meters */
  heightM: number;
  /** Body weight in kilograms */
  weightKg: number;
  /** Body mass index (kg/m²), computed at registration from height and weight */
  bmi: number;
  medicalNotes?: string;
}

/**
 * Sensor data structure received from ESP32
 * - emg: Raw 12‑bit ADC count (0–4095). Charts / RMS / FFT / CSV convert to millivolts via `lib/emg-calibration`.
 * - timestamp: Unix milliseconds (server wall-clock)
 */
export interface SensorData {
  emg: number;
  timestamp: number;
}

/**
 * Data point for charts with formatted time
 */
export interface ChartDataPoint extends SensorData {
  time: string;
}

/**
 * Session data for a patient's EMG recording
 */
export interface EMGSession {
  id: string;
  patientId: string;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  patientHeightM?: number;
  patientWeightKg?: number;
  patientBmi?: number;
  startTime: number;
  endTime?: number;
  data: SensorData[];
  isActive: boolean;
}

/**
 * Doctor's comment on a session
 */
export interface DoctorComment {
  id: string;
  sessionId: string;
  doctorId: string;
  doctorName: string;
  content: string;
  timestamp: number;
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

/**
 * Auth response structure
 */
export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
  token?: string;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Registration data
 */
export interface RegisterData extends LoginCredentials {
  name: string;
  role: UserRole;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  heightM?: number;
  weightKg?: number;
}

/**
 * CSV export data
 */
export interface CSVExportData {
  filename: string;
  data: string;
  timestamp: number;
}

/**
 * RMS (Root Mean Square) calculation result
 */
export interface RMSData {
  value: number;
  windowSize: number;
  timestamp: number;
}

/**
 * FFT (Fast Fourier Transform) result
 */
export interface FFTData {
  frequencies: number[];
  magnitudes: number[];
  dominantFrequency: number;
}
