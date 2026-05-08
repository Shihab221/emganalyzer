// ============================================
// API Route: /api/sessions
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getAllSessions,
  getPatientSessions,
  activeSessions,
  getSessionById,
} from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (sessionId) {
      const session = getSessionById(sessionId);
      if (!session) {
        return NextResponse.json({ success: false, message: 'Session not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, session });
    }

    const patientId = searchParams.get('patientId');

    let sessionList;
    if (patientId) {
      sessionList = getPatientSessions(patientId);
    } else {
      sessionList = getAllSessions();
    }

    const activePatientIds = Array.from(activeSessions.keys());

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
