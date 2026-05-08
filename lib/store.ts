// ============================================
// In-Memory Data Store
// Simulates a database for development/demo
// In production, replace with a real database
// ============================================

import { User, PatientProfile, SensorData, EMGSession, DoctorComment } from './types';

// User storage (in production, use a real database with hashed passwords)
interface StoredUser extends User {
  password: string;
}

export const users: Map<string, StoredUser> = new Map();
export const patientProfiles: Map<string, PatientProfile> = new Map();
export const sessions: Map<string, EMGSession> = new Map();
export const comments: Map<string, DoctorComment[]> = new Map();

// Current active sessions per patient
export const activeSessions: Map<string, string> = new Map();

// Sensor data buffer (latest data for currently connected patient)
export let currentPatientId: string | null = null;
export let sensorHistory: SensorData[] = [];
export let latestData: SensorData | null = null;

// Initialize with demo users
export function initializeDemoData() {
  // Demo doctor
  const doctorId = 'doctor-demo-001';
  users.set('doctor@demo.com', {
    id: doctorId,
    email: 'doctor@demo.com',
    name: 'Dr. Smith',
    role: 'doctor',
    password: 'doctor123',
    createdAt: Date.now(),
  });

  // Demo patient
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
    medicalNotes: 'Demo patient for testing',
  });
}

// Reset sensor data
export function resetSensorData() {
  sensorHistory = [];
  latestData = null;
}

// Update current patient
export function setCurrentPatient(patientId: string | null) {
  if (currentPatientId !== patientId) {
    currentPatientId = patientId;
    resetSensorData();
  }
}

// Add sensor data
export function addSensorData(data: SensorData) {
  latestData = data;
  sensorHistory.push(data);
  if (sensorHistory.length > 1000) {
    sensorHistory.shift();
  }
}

// Get sensor history
export function getSensorHistory(): SensorData[] {
  return [...sensorHistory];
}

// Get latest data
export function getLatestData(): SensorData | null {
  return latestData;
}

// Create or get active session for patient
export function getOrCreateSession(patientId: string, patientName: string, profile?: PatientProfile): EMGSession {
  const existingSessionId = activeSessions.get(patientId);
  if (existingSessionId) {
    const session = sessions.get(existingSessionId);
    if (session && session.isActive) {
      return session;
    }
  }

  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const session: EMGSession = {
    id: sessionId,
    patientId,
    patientName,
    patientAge: profile?.age,
    patientGender: profile?.gender,
    startTime: Date.now(),
    data: [],
    isActive: true,
  };

  sessions.set(sessionId, session);
  activeSessions.set(patientId, sessionId);
  return session;
}

// End session
export function endSession(patientId: string) {
  const sessionId = activeSessions.get(patientId);
  if (sessionId) {
    const session = sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      session.endTime = Date.now();
      session.data = [...sensorHistory];
    }
    activeSessions.delete(patientId);
  }
}

// Get all sessions
export function getAllSessions(): EMGSession[] {
  return Array.from(sessions.values()).sort((a, b) => b.startTime - a.startTime);
}

// Get patient sessions
export function getPatientSessions(patientId: string): EMGSession[] {
  return Array.from(sessions.values())
    .filter(s => s.patientId === patientId)
    .sort((a, b) => b.startTime - a.startTime);
}

// Add comment to session
export function addComment(sessionId: string, doctorId: string, doctorName: string, content: string): DoctorComment {
  const comment: DoctorComment = {
    id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

// Get comments for session
export function getSessionComments(sessionId: string): DoctorComment[] {
  return comments.get(sessionId) || [];
}

// Initialize on module load
initializeDemoData();
