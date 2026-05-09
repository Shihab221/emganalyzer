// ============================================
// In-Memory Data Store
// ============================================

import { User, PatientProfile, SensorData, EMGSession, DoctorComment } from './types';

interface StoredUser extends User {
  password: string;
}

export const users: Map<string, StoredUser> = new Map();
export const patientProfiles: Map<string, PatientProfile> = new Map();
export const sessions: Map<string, EMGSession> = new Map();
export const comments: Map<string, DoctorComment[]> = new Map();

/** While a patient recording is active: patientId -> sessionId */
export const activeSessions: Map<string, string> = new Map();

const MAX_LIVE = 150;
export let sensorHistory: SensorData[] = [];
export let latestData: SensorData | null = null;

export interface RecordingStateSnapshot {
  patientId: string;
  sessionId: string;
  startedAt: number;
}

let recordingState: RecordingStateSnapshot | null = null;

export function getRecordingState(): RecordingStateSnapshot | null {
  return recordingState;
}

export function initializeDemoData() {
  const doctorId = 'doctor-demo-001';
  users.set('doctor@demo.com', {
    id: doctorId,
    email: 'doctor@demo.com',
    name: 'Dr. Smith',
    role: 'doctor',
    password: 'doctor123',
    createdAt: Date.now(),
  });

  const patientId = 'patient-demo-001';
  users.set('patient@demo.com', {
    id: patientId,
    email: 'patient@demo.com',
    name: 'John Doe',
    role: 'patient',
    password: 'patient123',
    createdAt: Date.now(),
  });

  patientProfiles.set(patientId, {
    userId: patientId,
    age: 35,
    gender: 'male',
    heightCm: 175,
    weightKg: 72,
    medicalNotes: 'Demo patient for testing',
  });
}

export function resetLiveSensorData() {
  sensorHistory = [];
  latestData = null;
}

/** Live stream buffer (ESP32 → server → dashboard poll) */
export function addLiveSensorSample(sample: SensorData) {
  latestData = sample;
  sensorHistory.push(sample);
  if (sensorHistory.length > MAX_LIVE) {
    sensorHistory.shift();
  }
}

/** Append copies to active recording session, if any */
export function appendToActiveRecording(sample: SensorData) {
  if (!recordingState) return;
  const session = sessions.get(recordingState.sessionId);
  if (!session || !session.isActive) return;
  session.data.push({ emg: sample.emg, timestamp: sample.timestamp });
}

export function getSensorHistory(): SensorData[] {
  return [...sensorHistory];
}

export function getLatestData(): SensorData | null {
  return latestData;
}

export function getSessionById(sessionId: string): EMGSession | undefined {
  return sessions.get(sessionId);
}

/**
 * Starts a new recording session. Only one ESP stream is modeled; starting another patient's
 * recording finalizes any other active recording automatically.
 */
export function startRecording(
  patientId: string,
  patientName: string,
  profile?: PatientProfile
): EMGSession {
  if (recordingState && recordingState.patientId !== patientId) {
    endRecording(recordingState.patientId);
  }

  if (recordingState && recordingState.patientId === patientId) {
    const existingId = recordingState.sessionId;
    const existing = sessions.get(existingId);
    if (existing && existing.isActive) {
      return existing;
    }
  }

  const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const session: EMGSession = {
    id: sessionId,
    patientId,
    patientName,
    patientAge: profile?.age,
    patientGender: profile?.gender,
    patientHeightCm: profile?.heightCm,
    patientWeightKg: profile?.weightKg,
    startTime: Date.now(),
    data: [],
    isActive: true,
  };

  sessions.set(sessionId, session);
  activeSessions.set(patientId, sessionId);
  recordingState = { patientId, sessionId, startedAt: session.startTime };
  return session;
}

export function endRecording(patientId: string): EMGSession | null {
  if (!recordingState || recordingState.patientId !== patientId) {
    return null;
  }
  const session = sessions.get(recordingState.sessionId);
  recordingState = null;
  activeSessions.delete(patientId);

  if (session) {
    session.isActive = false;
    session.endTime = Date.now();
  }
  return session ?? null;
}

export function getAllSessions(): EMGSession[] {
  return Array.from(sessions.values()).sort((a, b) => b.startTime - a.startTime);
}

export function getPatientSessions(patientId: string): EMGSession[] {
  return Array.from(sessions.values())
    .filter((s) => s.patientId === patientId)
    .sort((a, b) => b.startTime - a.startTime);
}

export function addComment(
  sessionId: string,
  doctorId: string,
  doctorName: string,
  content: string
): DoctorComment {
  const comment: DoctorComment = {
    id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    sessionId,
    doctorId,
    doctorName,
    content,
    timestamp: Date.now(),
  };

  const sessionComments = comments.get(sessionId) || [];
  sessionComments.push(comment);
  comments.set(sessionId, sessionComments);

  return comment;
}

export function getSessionComments(sessionId: string): DoctorComment[] {
  return comments.get(sessionId) || [];
}

initializeDemoData();
