// ============================================
// API Route: /api/sessions
// Handles patient sessions management
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getAllSessions, getPatientSessions, sessions, activeSessions } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/sessions
 * Get all sessions or sessions for a specific patient
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
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
    return NextResponse.json(
      { success: false, message: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
