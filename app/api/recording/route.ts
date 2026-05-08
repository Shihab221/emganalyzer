// ============================================
// API Route: /api/recording — patient Start / Stop buffering to session history
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  patientProfiles,
  startRecording,
  endRecording,
  getRecordingState,
  users,
} from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function findPatient(userIdOrEmail?: string): { ok: boolean; patientId?: string; name?: string; message?: string } {
  if (!userIdOrEmail) {
    return { ok: false, message: 'patientId required' };
  }
  let u = Array.from(users.values()).find((x) => x.id === userIdOrEmail);
  if (!u) {
    u = users.get(userIdOrEmail.toLowerCase());
  }
  if (!u || u.role !== 'patient') {
    return { ok: false, message: 'Patient not found' };
  }
  return { ok: true, patientId: u.id, name: u.name };
}

/** GET recording status */
export async function GET(request: NextRequest) {
  const patientId = request.nextUrl.searchParams.get('patientId');
  const found = findPatient(patientId || undefined);
  if (!patientId || !found.ok || !found.patientId) {
    return NextResponse.json({ success: false, recording: false, session: null });
  }

  const state = getRecordingState();
  const active =
    !!state &&
    state.patientId === found.patientId;

  return NextResponse.json({
    success: true,
    recording: active,
    startedAt: active ? state?.startedAt : null,
    sessionId: active ? state?.sessionId : null,
  });
}

/** POST body: { patientId: string, action: 'start' | 'stop' } */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const patientIdRaw = body.patientId as string | undefined;
    const action = body.action as string | undefined;

    const found = findPatient(patientIdRaw);
    if (!found.ok || !found.patientId || !found.name) {
      return NextResponse.json(
        { success: false, message: found.message || 'Patient not found' },
        { status: 400 }
      );
    }

    if (action !== 'start' && action !== 'stop') {
      return NextResponse.json(
        { success: false, message: 'action must be start or stop' },
        { status: 400 }
      );
    }

    if (action === 'start') {
      const profile = patientProfiles.get(found.patientId);
      const session = startRecording(found.patientId, found.name, profile);
      return NextResponse.json({
        success: true,
        recording: true,
        sessionId: session.id,
        startedAt: session.startTime,
        session,
      });
    }

    const session = endRecording(found.patientId);
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
