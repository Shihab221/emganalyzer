// ============================================
// Database Operations (Prisma-backed)
// ============================================

import prisma from './prisma';
import { computeBmiKgM2 } from './patient-bmi';
import type { User, PatientProfile, SensorData, EMGSession, DoctorComment } from './types';

// ============================================
// User Operations
// ============================================

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { patientProfile: true },
  });
}

export async function createUser(data: {
  email: string;
  password: string;
  name: string;
  role: 'doctor' | 'patient';
  age?: number;
  gender?: 'male' | 'female' | 'other';
  heightM?: number;
  weightKg?: number;
}) {
  const { email, password, name, role, age, gender, heightM, weightKg } = data;
  
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password,
      name,
      role,
      patientProfile:
        role === 'patient' && age && gender && heightM && weightKg
          ? {
              create: {
                age,
                gender,
                heightM,
                weightKg,
                bmi: computeBmiKgM2(weightKg, heightM),
              },
            }
          : undefined,
    },
    include: { patientProfile: true },
  });

  return user;
}

export async function getAllPatients() {
  const patients = await prisma.user.findMany({
    where: { role: 'patient' },
    include: { patientProfile: true },
    orderBy: { createdAt: 'desc' },
  });

  const activeRecordings = await prisma.activeRecording.findMany();
  const activeMap = new Map(activeRecordings.map((r) => [r.patientId, r.sessionId]));

  return patients.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    age: p.patientProfile?.age,
    gender: p.patientProfile?.gender,
    heightM: p.patientProfile?.heightM,
    weightKg: p.patientProfile?.weightKg,
    bmi: p.patientProfile?.bmi,
    isRecording: activeMap.has(p.id),
    activeSessionId: activeMap.get(p.id) ?? null,
    createdAt: p.createdAt.getTime(),
  }));
}

export async function getPatientProfile(patientId: string) {
  const user = await prisma.user.findUnique({
    where: { id: patientId },
    include: { patientProfile: true },
  });

  if (!user || user.role !== 'patient') return null;

  return {
    name: user.name,
    email: user.email,
    age: user.patientProfile?.age,
    gender: user.patientProfile?.gender,
    heightM: user.patientProfile?.heightM,
    weightKg: user.patientProfile?.weightKg,
    bmi: user.patientProfile?.bmi,
  };
}

// ============================================
// Session Operations
// ============================================

export async function startRecording(patientId: string, patientName: string, profile?: {
  age?: number;
  gender?: string;
  heightM?: number;
  weightKg?: number;
  bmi?: number;
}) {
  // Check if there's already an active recording for this patient
  const existing = await prisma.activeRecording.findUnique({
    where: { patientId },
  });

  if (existing) {
    const session = await prisma.eMGSession.findUnique({
      where: { id: existing.sessionId },
    });
    if (session && session.isActive) {
      return session;
    }
  }

  // End any other active recording
  const otherActive = await prisma.activeRecording.findFirst({
    where: { NOT: { patientId } },
  });
  if (otherActive) {
    await endRecording(otherActive.patientId);
  }

  // Create new session
  const session = await prisma.eMGSession.create({
    data: {
      patientId,
      patientName,
      patientAge: profile?.age,
      patientGender: profile?.gender,
      patientHeightM: profile?.heightM,
      patientWeightKg: profile?.weightKg,
      patientBmi: profile?.bmi,
      isActive: true,
    },
  });

  // Track active recording
  await prisma.activeRecording.upsert({
    where: { patientId },
    create: { patientId, sessionId: session.id },
    update: { sessionId: session.id },
  });

  return session;
}

export async function endRecording(patientId: string) {
  const activeRecording = await prisma.activeRecording.findUnique({
    where: { patientId },
  });

  if (!activeRecording) return null;

  const session = await prisma.eMGSession.update({
    where: { id: activeRecording.sessionId },
    data: { isActive: false, endTime: new Date() },
  });

  await prisma.activeRecording.delete({
    where: { patientId },
  });

  return session;
}

export async function getRecordingState(patientId: string) {
  const activeRecording = await prisma.activeRecording.findUnique({
    where: { patientId },
  });

  if (!activeRecording) return null;

  return {
    patientId: activeRecording.patientId,
    sessionId: activeRecording.sessionId,
    startedAt: activeRecording.startedAt.getTime(),
  };
}

export async function getGlobalRecordingState() {
  const activeRecording = await prisma.activeRecording.findFirst();
  if (!activeRecording) return null;

  return {
    patientId: activeRecording.patientId,
    sessionId: activeRecording.sessionId,
    startedAt: activeRecording.startedAt.getTime(),
  };
}

export async function getSessionById(sessionId: string) {
  const session = await prisma.eMGSession.findUnique({
    where: { id: sessionId },
    include: {
      data: { orderBy: { timestamp: 'asc' } },
    },
  });

  if (!session) return null;

  return {
    id: session.id,
    patientId: session.patientId,
    patientName: session.patientName,
    patientAge: session.patientAge,
    patientGender: session.patientGender,
    patientHeightM: session.patientHeightM,
    patientWeightKg: session.patientWeightKg,
    patientBmi: session.patientBmi,
    startTime: session.startTime.getTime(),
    endTime: session.endTime?.getTime(),
    isActive: session.isActive,
    data: session.data.map((d) => ({
      emg: d.emg,
      timestamp: d.timestamp.getTime(),
    })),
  };
}

export async function getAllSessions() {
  const sessions = await prisma.eMGSession.findMany({
    orderBy: { startTime: 'desc' },
    include: { _count: { select: { data: true } } },
  });

  return sessions.map((s) => ({
    id: s.id,
    patientId: s.patientId,
    patientName: s.patientName,
    patientAge: s.patientAge,
    patientGender: s.patientGender,
    patientHeightM: s.patientHeightM,
    patientWeightKg: s.patientWeightKg,
    patientBmi: s.patientBmi,
    startTime: s.startTime.getTime(),
    endTime: s.endTime?.getTime(),
    isActive: s.isActive,
    dataCount: s._count.data,
  }));
}

export async function getPatientSessions(patientId: string) {
  const sessions = await prisma.eMGSession.findMany({
    where: { patientId },
    orderBy: { startTime: 'desc' },
    include: { _count: { select: { data: true } } },
  });

  return sessions.map((s) => ({
    id: s.id,
    patientId: s.patientId,
    patientName: s.patientName,
    patientAge: s.patientAge,
    patientGender: s.patientGender,
    startTime: s.startTime.getTime(),
    endTime: s.endTime?.getTime(),
    isActive: s.isActive,
    dataCount: s._count.data,
  }));
}

// ============================================
// Sensor Data Operations
// ============================================

export async function appendSensorData(sessionId: string, emg: number) {
  return prisma.sensorData.create({
    data: { sessionId, emg },
  });
}

export async function appendToActiveRecording(emg: number) {
  const activeRecording = await prisma.activeRecording.findFirst();
  if (!activeRecording) return null;

  return prisma.sensorData.create({
    data: { sessionId: activeRecording.sessionId, emg },
  });
}

// ============================================
// Live Sensor Buffer (for real-time display)
// ============================================

const MAX_LIVE_BUFFER = 500; // Keep last 500 samples for live display

export async function addLiveSensorSample(emg: number) {
  await prisma.liveSensorBuffer.create({
    data: { emg },
  });

  // Cleanup old samples
  const count = await prisma.liveSensorBuffer.count();
  if (count > MAX_LIVE_BUFFER + 100) {
    const oldSamples = await prisma.liveSensorBuffer.findMany({
      orderBy: { timestamp: 'asc' },
      take: count - MAX_LIVE_BUFFER,
      select: { id: true },
    });
    await prisma.liveSensorBuffer.deleteMany({
      where: { id: { in: oldSamples.map((s) => s.id) } },
    });
  }
}

export async function getLiveSensorHistory(limit: number = 300) {
  const samples = await prisma.liveSensorBuffer.findMany({
    orderBy: { timestamp: 'desc' },
    take: limit,
  });

  return samples.reverse().map((s) => ({
    emg: s.emg,
    timestamp: s.timestamp.getTime(),
  }));
}

export async function getLatestLiveSensorData() {
  const latest = await prisma.liveSensorBuffer.findFirst({
    orderBy: { timestamp: 'desc' },
  });

  if (!latest) return null;

  return {
    emg: latest.emg,
    timestamp: latest.timestamp.getTime(),
  };
}

// ============================================
// Comments Operations
// ============================================

export async function addComment(
  sessionId: string,
  doctorId: string,
  doctorName: string,
  content: string
) {
  return prisma.doctorComment.create({
    data: { sessionId, doctorId, doctorName, content },
  });
}

export async function getSessionComments(sessionId: string) {
  const comments = await prisma.doctorComment.findMany({
    where: { sessionId },
    orderBy: { timestamp: 'asc' },
  });

  return comments.map((c) => ({
    id: c.id,
    sessionId: c.sessionId,
    doctorId: c.doctorId,
    doctorName: c.doctorName,
    content: c.content,
    timestamp: c.timestamp.getTime(),
  }));
}

// ============================================
// Seed Demo Data
// ============================================

export async function seedDemoData() {
  const doctorEmail = 'doctor@demo.com';
  const patientEmail = 'patient@demo.com';

  const existingDoctor = await prisma.user.findUnique({ where: { email: doctorEmail } });
  if (!existingDoctor) {
    await prisma.user.create({
      data: {
        email: doctorEmail,
        password: 'doctor123',
        name: 'Dr. Smith',
        role: 'doctor',
      },
    });
  }

  const existingPatient = await prisma.user.findUnique({ where: { email: patientEmail } });
  if (!existingPatient) {
    await prisma.user.create({
      data: {
        email: patientEmail,
        password: 'patient123',
        name: 'John Doe',
        role: 'patient',
        patientProfile: {
          create: {
            age: 35,
            gender: 'male',
            heightM: 1.75,
            weightKg: 72,
            bmi: 23.5,
            medicalNotes: 'Demo patient for testing',
          },
        },
      },
    });
  }
}
