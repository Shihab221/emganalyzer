// ============================================
// API Route: /api/recording — patient Start / Stop buffering to session history
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  startRecording,
  endRecording,
  getRecordingState,
} from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function findPatient(userIdOrEmail?: string) {
  if (!userIdOrEmail) {
    return { ok: false, message: 'patientId required' };
  }

  let user = await prisma.user.findUnique({
    where: { id: userIdOrEmail },
    include: { patientProfile: true },
  });

  if (!user) {
    user = await prisma.user.findUnique({
      where: { email: userIdOrEmail.toLowerCase() },
      include: { patientProfile: true },
    });
  }

  if (!user || user.role !== 'patient') {
    return { ok: false, message: 'Patient not found' };
  }

  return { ok: true, user };
}

/** GET recording status */
export async function GET(request: NextRequest) {
  const patientId = request.nextUrl.searchParams.get('patientId');
  const found = await findPatient(patientId || undefined);
  
  if (!patientId || !found.ok || !found.user) {
    return NextResponse.json({ success: false, recording: false, session: null });
  }

  const state = await getRecordingState(found.user.id);

  return NextResponse.json({
    success: true,
    recording: !!state,
    startedAt: state?.startedAt ?? null,
    sessionId: state?.sessionId ?? null,
  });
}

/** POST body: { patientId: string, action: 'start' | 'stop' } */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const patientIdRaw = body.patientId as string | undefined;
    const action = body.action as string | undefined;

    const found = await findPatient(patientIdRaw);
    if (!found.ok || !found.user) {
      return NextResponse.json(
        { success: false, message: found.message || 'Patient not found' },
        { status: 400 }
      );
    }

    const user = found.user;

    if (action !== 'start' && action !== 'stop') {
      return NextResponse.json(
        { success: false, message: 'action must be start or stop' },
        { status: 400 }
      );
    }

    if (action === 'start') {
      const profile = user.patientProfile;
      const session = await startRecording(user.id, user.name, profile ? {
        age: profile.age,
        gender: profile.gender,
        heightM: profile.heightM,
        weightKg: profile.weightKg,
        bmi: profile.bmi,
      } : undefined);

      return NextResponse.json({
        success: true,
        recording: true,
        sessionId: session.id,
        startedAt: session.startTime instanceof Date ? session.startTime.getTime() : session.startTime,
        session,
      });
    }

    const session = await endRecording(user.id);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'No active recording for this patient' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      recording: false,
      sessionId: session.id,
      session,
    });
  } catch (e) {
    console.error('recording route error:', e);
    return NextResponse.json({ success: false, message: 'Recording request failed' }, { status: 500 });
  }
}
