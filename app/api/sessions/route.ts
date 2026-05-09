// ============================================
// API Route: /api/sessions
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getAllSessions,
  getPatientSessions,
  getSessionById,
} from '@/lib/db';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (sessionId) {
      const session = await getSessionById(sessionId);
      if (!session) {
        return NextResponse.json({ success: false, message: 'Session not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, session });
    }

    const patientId = searchParams.get('patientId');

    let sessionList;
    if (patientId) {
      sessionList = await getPatientSessions(patientId);
    } else {
      sessionList = await getAllSessions();
    }

    const activeRecordings = await prisma.activeRecording.findMany();
    const activePatientIds = activeRecordings.map((r) => r.patientId);

    return NextResponse.json({
      success: true,
      sessions: sessionList,
      activePatients: activePatientIds,
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch sessions' }, { status: 500 });
  }
}
